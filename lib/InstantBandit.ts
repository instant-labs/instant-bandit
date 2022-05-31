import * as constants from "./constants"
import { Algorithm, Algorithms, AlgorithmResults, SessionDescriptor, TimerLike, SelectionArgs, Providers, SessionProvider, Selection, MetricsProvider } from "./types"
import { Experiment, MetricsSample, Site, Variant } from "./models"
import { LoadState } from "./types"
import { RandomVariant } from "./algos/RandomVariant"
import { exists, env, getBaseUrl, isBrowserEnvironment, deepFreeze } from "./utils"
import { DEFAULT_ALGO_RESULTS, DEFAULT_EXPERIMENT, DEFAULT_SITE, DEFAULT_VARIANT } from "./defaults"


/**
 * Handles concerns around fault-tolerant loading, configuration, and variant selection.
 * This facility is isomorphic and runs in the browser and in Node.
 */
export class InstantBandit {
  protected _state: LoadState = LoadState.PRELOAD
  protected _error: Error | null = null
  protected _options: InstantBanditOptions = Object.assign({}, DEFAULT_BANDIT_OPTS)
  protected _metrics: MetricsSample[] = []
  protected _timer: TimerLike | null = null
  protected _session: SessionDescriptor | null = null
  protected _site: Site = DEFAULT_SITE as Site
  protected _experiment = DEFAULT_EXPERIMENT as Experiment
  protected _variant = DEFAULT_VARIANT as Variant


  get error() {
    return this._error
  }

  get origin() {
    if (isBrowserEnvironment) {
      return location.origin
    } else {
      return constants.DEFAULT_ORIGIN
    }
  }

  get site() {
    return this._site ?? DEFAULT_SITE
  }

  get experiment() {
    return this._experiment ?? DEFAULT_EXPERIMENT
  }

  get variant() {
    return this._variant ?? DEFAULT_VARIANT
  }

  get session() {
    return this._options.providers.session
  }

  get state() {
    return this._state
  }


  constructor(opts: Partial<InstantBanditOptions> = {}) {
    Object.assign(this._options, opts)
    Object.freeze(this._options)
    Object.seal(this._options.algorithms)
    Object.seal(this._options.providers)
  }

  /**
   * Returns a site from the configured endpoint.
   * If a variant has been set in the session, the variant is requested.
   * @param variant 
   * @returns 
   */
  async load(variant?: string): Promise<Site> {
    let siteUrl = ""
    try {
      const { baseUrl, sitePath } = this._options

      const url = new URL(sitePath, baseUrl)
      siteUrl = url.toString()

      const headers = new Headers()
      if (this._options.appendTimestamp === true) {
        url.searchParams.append(PARAM_TIMESTAMP, new Date().getTime() + "")
      }
      if (exists(variant)) {
        url.searchParams.append(PARAM_SELECT, variant!)
      }
      if (exists(this._session)) {
        const session = this._session!
        if (exists(session.sid)) {
          headers.append(constants.HEADER_SESSION_ID, session.sid!)
        }
      }

      siteUrl = url.toString()
      this._state = LoadState.WAIT

      const resp = await fetch(siteUrl)
      const site = await resp.json() as Site

      this._site = await this.init(site, variant)

    } catch (err) {
      this._error = err
      console.warn(`[IB] An error occurred while loading from '${siteUrl}': ${err}. Default site will be used.`)

      // Re-init w/ builtins
      await this.init(DEFAULT_SITE, variant)

    } finally {
      this._state = LoadState.READY
      return this._site
    }
  }

  /**
  * Initializes from a site object provided locally
  * @param site
  * @param select
  * @returns 
  */
  async init(site: Site, select?: string): Promise<Site> {
    try {
      if (!site || typeof site !== "object") {
        throw new Error(`Invalid site configuration`)
      }

      this._error = null
      this._state = LoadState.SELECTING

      // TODO: deep clone rather than shallow
      this._site = Object.assign({}, site)

      const { experiment, variant } = await this.select(select)

      this._experiment = Object.assign({}, experiment)
      this._variant = Object.assign({}, variant)

      this._session = await this.getOrCreateSession(site.name)
      this._state = LoadState.READY

      return this._site
    } catch (err) {
      this._error = err
      this._site = DEFAULT_SITE
      this._experiment = DEFAULT_EXPERIMENT
      this._variant = DEFAULT_VARIANT
      console.warn(`[IB] Error initializing. Default site will be used. Error was: ${err}`)
    } finally {
      this._state = LoadState.READY
    }

    // Just to be safe
    if (!this._site) {
      this._site = DEFAULT_SITE
      this._experiment = DEFAULT_EXPERIMENT
      this._variant = DEFAULT_VARIANT
    }

    return this._site
  }

  /**
   * Selects a winning variant using a specific algorithm
   * @param algoName
   * @param params
   * @returns
   */
  async runAlgorithm<TAlgoParams = unknown>(algoName: string, params: TAlgoParams | null = null): Promise<AlgorithmResults> {
    const site = this._site
    const factory = this._options.algorithms[algoName]

    if (typeof factory !== "function") {
      console.warn(`[IB] Could not find implementation for selection algorithm '${algoName}'`)
      return DEFAULT_ALGO_RESULTS
    }

    try {
      const algo = factory()
      const experiment = this._getActiveExperiment() ?? DEFAULT_EXPERIMENT
      const { variants } = experiment
      const args: SelectionArgs<TAlgoParams> = {
        site,
        algo: algoName,
        params,
        variants,
      }

      return algo.select(args)
    } catch (err) {
      this._error = err
      console.warn(`[IB] There was an error selecting a variant: ${err}`)
      return DEFAULT_ALGO_RESULTS
    }
  }

  /**
   * Invokes the session provider to get or lazily create a new user session.
   * The user session is used to store which experiments and variants the user
   * has been exposed to.
   * @param siteName 
   * @param props 
   * @returns 
   */
  async getOrCreateSession(siteName: string, props?: Partial<SessionDescriptor>): Promise<SessionDescriptor> {
    try {
      if (!exists(this._options.providers.session)) {
        return DEFAULT_SESSION
      }

      return this._options.providers.session.getOrCreateSession(siteName)
    } catch (err) {
      this._error = err
      console.warn(`[IB] Error loading/saving session: ${err}`)
      return DEFAULT_SESSION
    }
  }

  /**
   * Selects the appropriate experiment and variant given a site.
   * 
   * If the "select" property of the site model is set, it indicates that selection
   * was performed server-side.
   * 
   * If the site has no active experiment, the default will be used.
   * 
   * When running in a browser environment, the variant is saved in the session.
   * 
   * @param selectVariant
   */
  async select(selectVariant?: string): Promise<Selection> {
    try {
      const { site } = this

      // Selection precedence:
      // 1. Explicit (i.e. specified on props)
      // 2. Specified in site object (via the "select" field)
      // 3. Algorithmic (e.g. multi-armed bandit)
      // 4. Fallback to default variant in configured experiment (should one exist)
      // 5. Fallback to default variant in builtin experiment

      let selection = selectVariant ?? site.select ?? undefined
      let experiment =
        this._getActiveExperiment(selection) ??
        this._getDefaultExperiment() ??
        DEFAULT_EXPERIMENT

      let variant: Variant | null = null

      if (exists(selection)) {
        const result = this.selectSpecific(experiment, selection!)
        experiment = result.experiment
        variant = result.variant
      } else {
        variant = await this.selectWithAlgorithm(site)
      }

      if (!variant) {
        variant = DEFAULT_VARIANT
      }

      this._experiment = experiment
      this._variant = variant

      // Save the chosen variant into the user session
      try {
        await this.session.persistVariant(site.name, experiment.id, variant.name)
      } catch (err) {
        this._error = err
        console.warn(`[IB] Error encountered while persisting variant '${selectVariant}': ${err}`)
      }

      return { experiment, variant }

    } catch (err) {
      this._error = err
      this._site = DEFAULT_SITE
      this._experiment = DEFAULT_EXPERIMENT
      this._variant = DEFAULT_VARIANT

      console.warn(`[IB] Error encountered while selecting variant '${selectVariant}': ${err}`)
      return { experiment: DEFAULT_EXPERIMENT, variant: DEFAULT_VARIANT }
    }

  }

  /**
  * Performs variant selection using an algorithm such as a multi-armed bandit.
  * Returns the default variant if not found.
  * Does not save the variant in the session.
  * @param args 
  * @param algo 
  * @returns 
  */
  async selectWithAlgorithm<TArgs = unknown>(args?: TArgs, algo: string = DEFAULT_BANDIT_OPTS.defaultAlgo): Promise<Variant> {
    const timeStart = new Date().getTime()
    try {
      const { metrics, pValue, winner } = await this.runAlgorithm(algo, args)
      return winner
    } finally {
      const timeEnd = new Date().getTime()
      const elapsed = timeEnd - timeStart

      // console.info(`[IB] Ran algorithm '${algo}' in ${elapsed} ms`)
    }
  }

  /**
   * Selects a specific variant from the given experiment.
   * If it does not exist, the variant will be searched for in a configured default experiment.
   * If no variant match is found, the default variant in the default experiment is returned.
   * @param experiment 
   * @param variant 
   * @returns 
   */
  selectSpecific(experiment: Experiment, variant: string): Selection {
    const site = this._site
    let configuredDefaultExperiment: Experiment | undefined

    // Check in the specified experiment
    let selected = experiment.variants.find(v => v.name === variant)
    if (selected) {
      return { experiment, variant: selected! }
    } else {

      // Check in an explicitly configured default experiment, should one exist
      configuredDefaultExperiment = site.experiments.find(e => e.id === DEFAULT_EXPERIMENT.id)
      selected = configuredDefaultExperiment?.variants.find(v => v.name === DEFAULT_VARIANT.name)
    }

    // If the variant was found in the configured default, use the default variant, configured default experiment
    if (configuredDefaultExperiment && !selected) {
      return { experiment: configuredDefaultExperiment, variant: DEFAULT_VARIANT }
    } else if (selected) {
      return { experiment, variant: selected }

    } else {
      // Otherwise, fall back to the inbuilt default experiment + variant
      return { experiment: DEFAULT_EXPERIMENT, variant: DEFAULT_VARIANT }
    }
  }

  protected _getActiveExperiment(variant?: string): Experiment {
    const { site } = this
    let experiment = (site.experiments ?? [])
      .filter(exp => !exists(variant) ? true : exp.variants.some(v => v.name === variant))
      .filter(exp => exp.inactive !== true)[0]

    // No active experiment? Look for an explicit default, falling back to the implicit default
    // The implicit default is always considered active if we have no other alternative
    if (!experiment) {
      experiment = site.experiments.filter(exp => exp.id === constants.DEFAULT_EXPERIMENT_ID)?.[0]
    }

    return experiment ?? null
  }

  protected _getDefaultExperiment(): Experiment {
    const { site } = this
    return site.experiments.filter(e => e.id === DEFAULT_EXPERIMENT.id)?.[0] ?? DEFAULT_EXPERIMENT
  }
}

export const PARAM_TIMESTAMP = "ts"
export const PARAM_SELECT = "select"

/**
 * Initialization options.
 */
export interface InstantBanditOptions {
  baseUrl: string
  sitePath: string
  metricsPath: string
  appendTimestamp: boolean
  batchSize: number
  flushInterval: number
  defaultAlgo: Algorithm | string
  providers: Providers
  algorithms: Algorithms
}



// STUB
class StubSessionProvider implements SessionProvider {
  async getOrCreateSession(site: string, props?: Partial<SessionDescriptor>): Promise<SessionDescriptor> {
    const session = {
      site,
      origin: constants.DEFAULT_ORIGIN,
      variants: {},
    }
    return session
  }
  persistVariant(site: string, experiment: string, variant: string) {
  }
  hasSeen(site: string, experiment: string, variant: string) {
    return false
  }
}

// STUB
class StubMetricsProvider implements MetricsProvider {
  push(metric: MetricsSample): void {
    return
  }
  async flush() {
    return
  }
}

//
// Default base options
// Will pull from Node/Next.js env vars on the server if present.
//
export const DEFAULT_BANDIT_OPTS: InstantBanditOptions = {
  baseUrl: getBaseUrl(),
  sitePath: env(constants.VARNAME_SITE_PATH) ?? constants.DEFAULT_SITE_PATH,
  metricsPath: env(constants.VARNAME_METRICS_PATH) ?? constants.DEFAULT_METRICS_PATH,
  appendTimestamp: false,
  batchSize: 10,
  flushInterval: 50,
  defaultAlgo: Algorithm.RANDOM,

  // NOTE: These will need to be isomorphic for SSR
  providers: {
    session: new StubSessionProvider(),
    metrics: new StubMetricsProvider(),
  },
  algorithms: {
    [Algorithm.RANDOM]: () => new RandomVariant(),

    // MAB goes here
    // [Algorithm.MAB_EPSILON_GREEDY]: () => new EpsilonGreedyBanditAlgo(),
  },
} as const
deepFreeze(DEFAULT_BANDIT_OPTS)


// Shape of default session
const DEFAULT_SESSION: SessionDescriptor = {
  origin: constants.DEFAULT_ORIGIN,
  site: constants.DEFAULT_SITE_NAME,
  variants: {},
}
deepFreeze(DEFAULT_SESSION)

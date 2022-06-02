/**
 * @jest-environment jsdom
 */
import { DEFAULT_BANDIT_OPTIONS } from "../../lib/contexts"
import { getLocalStorageSessionProvider, getLocalStorageKey } from "../../lib/providers/session"
import { SessionProvider } from "../../lib/types"


describe("browser session provider", () => {
  let site: string = ""
  let provider: SessionProvider
  let windowSpy

  beforeEach(() => {
    site = "test-site"
    provider = getLocalStorageSessionProvider(DEFAULT_BANDIT_OPTIONS)
  })

  beforeEach(() => {
    windowSpy = jest.spyOn(window, "window", "get");
    localStorage.clear()
  })

  afterEach(() => {
    windowSpy.mockRestore();
  })

  describe("getOrCreateSession", () => {
    it("saves a new session into local storage", async () => {
      const newSession = await provider.getOrCreateSession(site, {})
      expect(newSession).toStrictEqual({
        site,
        variants: {},
      })

      const k = getLocalStorageKey(site)
      const storedJson = localStorage.getItem(k) ?? "{}"
      const storedSession = JSON.parse(storedJson)

      expect(storedSession).toStrictEqual(newSession)
    })

    it("retrieves a session from local storage", async () => {
      const newSession = await provider.getOrCreateSession(site, { uid: "1001" })
      expect(newSession).toStrictEqual({
        site,
        uid: "1001",
        variants: {},
      })
      const storedSession = await provider.getOrCreateSession(site)
      expect(storedSession).toStrictEqual(newSession)
    })
  })

  describe("hasSeen", () => {
    it("returns true when seen and false when not", async () => {
      const sesh = await provider.getOrCreateSession(site)
      await provider.persistVariant(site, "A", "a")
      expect(await provider.hasSeen(site, "A", "a")).toBe(true)
      expect(await provider.hasSeen(site, "A", "b")).toBe(false)
      expect(await provider.hasSeen(site, "B", "a")).toBe(false)
      expect(await provider.hasSeen("fake-site", "B", "a")).toBe(false)
    })
  })

  describe("persistVariant", () => {
    it("persists a variant", async () => {
      let sesh = await provider.getOrCreateSession(site, {})
      expect(sesh.variants).toStrictEqual({})

      await provider.persistVariant(site, "experiment-1", "a")
      sesh = await provider.getOrCreateSession(site)

      expect(sesh).toStrictEqual({
        site,
        variants: {
          "experiment-1": [
            "a",
          ]
        },
      })
    })

    it("doesn't persist duplicates", async () => {
      let sesh = await provider.getOrCreateSession(site, {})
      expect(sesh.variants).toStrictEqual({})

      await Promise.all([
        provider.persistVariant(site, "experiment-1", "a"),
        provider.persistVariant(site, "experiment-1", "a"),
        provider.persistVariant(site, "experiment-1", "a"),
      ])

      sesh = await provider.getOrCreateSession(site)

      expect(sesh).toStrictEqual({
        site,
        variants: {
          "experiment-1": [
            "a",
          ]
        },
      })
    })

    it("persists exposures across multiple experiments and variants", async () => {
      let sesh = await provider.getOrCreateSession(site, {})
      expect(sesh.variants).toStrictEqual({})

      await provider.persistVariant("A", "experiment-1", "a")
      await provider.persistVariant("A", "experiment-2", "b")
      await provider.persistVariant("A", "experiment-3", "c")
      await provider.persistVariant("B", "experiment-1", "a")
      await provider.persistVariant("B", "experiment-2", "b")
      await provider.persistVariant("B", "experiment-3", "c")
      await provider.persistVariant("C", "experiment-1", "a")
      await provider.persistVariant("C", "experiment-2", "b")
      await provider.persistVariant("C", "experiment-3", "c")

      let a = await provider.getOrCreateSession("A")
      let b = await provider.getOrCreateSession("B")
      let c = await provider.getOrCreateSession("C")

      expect([a, b, c]).toStrictEqual([
        {
          site: "A",
          variants: {
            "experiment-1": ["a"],
            "experiment-2": ["b"],
            "experiment-3": ["c"],
          },
        },
        {
          site: "B",
          variants: {
            "experiment-1": ["a"],
            "experiment-2": ["b"],
            "experiment-3": ["c"],
          },
        },
        {
          site: "C",
          variants: {
            "experiment-1": ["a"],
            "experiment-2": ["b"],
            "experiment-3": ["c"],
          },
        },
      ])
    })
  })
})

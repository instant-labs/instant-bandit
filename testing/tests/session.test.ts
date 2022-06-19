/**
 * @jest-environment jsdom
 */
import { InstantBanditContext } from "../../lib/contexts";
import { Site } from "../../lib/models";
import { getLocalStorageSessionProvider, getLocalStorageKey } from "../../lib/providers/session";
import { SessionProvider } from "../../lib/types";
import { makeNewSession } from "../../lib/utils";
import { TEST_SITE_AB } from "../sites";


describe("browser session provider", () => {
  let site: Site;
  let provider: SessionProvider;
  let windowSpy;
  let ctx: InstantBanditContext;

  beforeEach(() => {
    site = TEST_SITE_AB;
    provider = getLocalStorageSessionProvider();
    ctx = {
      site,
    } as InstantBanditContext;
  });

  beforeEach(() => {
    windowSpy = jest.spyOn(window, "window", "get");
    localStorage.clear();
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  describe("getOrCreateSession", () => {
    it("saves a new session into local storage", async () => {
      const newSession = await provider.getOrCreateSession(ctx, {});
      expect(newSession).toStrictEqual({
        sid: "",
        selections: {},
      });

      const k = getLocalStorageKey();
      const storedJson = localStorage.getItem(k) ?? "{}";
      const storedSession = JSON.parse(storedJson);

      expect(storedSession).toStrictEqual(newSession);
    });

    it("retrieves a session from local storage", async () => {
      const newSession = await provider.getOrCreateSession(ctx, { sid: "1001" });
      expect(newSession).toStrictEqual({
        sid: "1001",
        selections: {},
      });
      const storedSession = await provider.getOrCreateSession(ctx);
      expect(storedSession).toStrictEqual(newSession);
    });
  });

  describe("hasSeen", () => {
    it("returns true when seen and false when not", async () => {
      await provider.getOrCreateSession(ctx);
      await provider.persistVariant(ctx, "A", "a");
      expect(await provider.hasSeen(ctx, "A", "a")).toBe(true);
      expect(await provider.hasSeen(ctx, "A", "b")).toBe(false);
      expect(await provider.hasSeen(ctx, "B", "a")).toBe(false);
    });
  });

  describe("persistVariant", () => {
    it("persists a variant", async () => {
      let sesh = await provider.getOrCreateSession(ctx, {});
      await provider.persistVariant(ctx, "experiment-1", "a");
      sesh = await provider.getOrCreateSession(ctx);

      expect(sesh).toStrictEqual({
        sid: "",
        selections: {
          [site.name]: {
            "experiment-1": [
              "a",
            ],
          },
        },
      });
    });

    it("doesn't persist duplicates", async () => {
      let sesh = await provider.getOrCreateSession(ctx, {});

      await provider.persistVariant(ctx, "experiment-1", "a");
      await provider.persistVariant(ctx, "experiment-1", "a");
      await provider.persistVariant(ctx, "experiment-1", "a");

      sesh = await provider.getOrCreateSession(ctx);

      expect(sesh).toStrictEqual({
        sid: "",
        selections: {
          [site.name]: {
            "experiment-1": [
              "a",
            ],
          },
        },
      });
    });

    it("persists exposures across multiple experiments and variants", async () => {
      let sesh = await provider.getOrCreateSession(ctx, {});

      await provider.persistVariant(ctx, "experiment-1", "a");
      await provider.persistVariant(ctx, "experiment-2", "b");
      await provider.persistVariant(ctx, "experiment-3", "c");

      sesh = await provider.getOrCreateSession(ctx);

      expect(sesh).toStrictEqual({
        sid: "",
        selections: {
          [site.name]: {
            "experiment-1": ["a"],
            "experiment-2": ["b"],
            "experiment-3": ["c"],
          },
        },
      });
    });
  });

  describe("save", () => {
    it("sets the id on the provider", async () => {
      const oldSession = makeNewSession();
      const newSession = makeNewSession("000");
      provider.save(ctx, oldSession);
      let saved = provider.getOrCreateSession(ctx);
      expect(saved.sid).toBe("");
      provider.save(ctx, newSession);
      saved = provider.getOrCreateSession(ctx);
      expect(saved.sid).toBe("000");
    });
  });
});

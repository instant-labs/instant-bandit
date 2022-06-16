import { HEADER_SESSION_ID } from "../../lib/constants";
import { deepFreeze, exists, getCookie } from "../../lib/utils";


describe("utils", () => {
  describe("defined", () => {
    it("returns false for null", () => expect(exists(null)).toStrictEqual(false));
    it("returns false for undefined", () => expect(exists(undefined)).toStrictEqual(false));
    it("returns true for an empty string", () => expect(exists("")).toStrictEqual(true));
    it("returns true for 0", () => expect(exists(0)).toStrictEqual(true));
    it("returns true for NaN", async () => expect(exists(0)).toStrictEqual(true));
  });

  describe("deepFreeze", () => {
    let obj: { a: { b: { c } } };
    beforeEach(() => obj = { a: { b: { c: {} } } });

    it("freezes nested objects", () => {
      const froze = deepFreeze(obj);
      expect(Object.isFrozen(froze)).toBe(true);
      expect(froze).toStrictEqual({ a: { b: { c: {} } } });
      expect(Object.isFrozen(froze.a)).toBe(true);
      expect(Object.isFrozen(froze.a.b)).toBe(true);
      expect(Object.isFrozen(froze.a.b.c)).toBe(true);
    });

    it("handles cycles", () => {
      obj.a.b.c = obj;
      const froze = deepFreeze(obj);
      expect(Object.isFrozen(froze.a.b.c)).toBe(true);
    });
  });

  describe("getCookie", () => {
    const nullUuid = "00000000-0000-0000-0000-000000000000";
    const cookieStr = "   cookie-1=foo;cookie-2=baz      ;cookie-3=bar;;;";
    const multipleCookies = "foo=1;foo=2;foo=3";
    const sessionCookie = `;${HEADER_SESSION_ID}=${nullUuid}`;

    it("trims leading whitespace", () => expect(getCookie("cookie-1", cookieStr)).toBe("foo"));
    it("trims trailing whitespace", () => expect(getCookie("cookie-2", cookieStr)).toBe("baz"));
    it("fetches all 3 cookies", () => expect(getCookie("cookie-3", cookieStr)).toBe("bar"));
    it("takes the last cookie value when there are multiple", () => {
      expect(getCookie("foo", multipleCookies)).toBe("3");
    });
    it("reads a session cookie", () => {
      expect(getCookie(HEADER_SESSION_ID, sessionCookie)).toBe(nullUuid);
    });
  });
});

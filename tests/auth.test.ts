import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
} from "@/lib/auth";
import { EnvError, getServerEnv } from "@/lib/env";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { middleware } from "@/middleware";

const SECRET = "test-secret-0123456789abcdef0123456789";
const PASSWORD = "dogru-sifre";

function loginRequest(body: string): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("session token", () => {
  it("imzala → doğrula geçerli", async () => {
    const token = await signSession(SECRET);
    expect(await verifySession(token, SECRET)).toBe(true);
  });

  it("kurcalanmış imza reddedilir", async () => {
    const token = await signSession(SECRET);
    const last = token.at(-1) === "A" ? "B" : "A";
    expect(await verifySession(token.slice(0, -1) + last, SECRET)).toBe(false);
  });

  it("kurcalanmış zaman damgası reddedilir", async () => {
    const token = await signSession(SECRET, 1_000_000);
    const [, sig] = token.split(".");
    expect(await verifySession(`2000000.${sig}`, SECRET, 2_000_000)).toBe(false);
  });

  it("süresi geçmiş token reddedilir", async () => {
    const now = Date.now();
    const token = await signSession(SECRET, now - SESSION_MAX_AGE_SECONDS * 1000 - 1);
    expect(await verifySession(token, SECRET, now)).toBe(false);
  });

  it("farklı secret reddedilir", async () => {
    const token = await signSession(SECRET);
    expect(await verifySession(token, `${SECRET}-baska`)).toBe(false);
  });

  it("boş / bozuk token reddedilir", async () => {
    expect(await verifySession(undefined, SECRET)).toBe(false);
    expect(await verifySession("", SECRET)).toBe(false);
    expect(await verifySession("abc", SECRET)).toBe(false);
    expect(await verifySession("123.!!!", SECRET)).toBe(false);
  });

  it("passwordMatches", async () => {
    expect(await passwordMatches(PASSWORD, PASSWORD)).toBe(true);
    expect(await passwordMatches("yanlis", PASSWORD)).toBe(false);
  });
});

describe("getServerEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ADMIN_PASSWORD yoksa değişken adını içeren EnvError fırlatır", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("SESSION_SECRET", SECRET);
    expect(() => getServerEnv()).toThrow(EnvError);
    expect(() => getServerEnv()).toThrow(/ADMIN_PASSWORD/);
  });

  it("kısa SESSION_SECRET reddedilir", () => {
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
    vi.stubEnv("SESSION_SECRET", "kisa");
    expect(() => getServerEnv()).toThrow(/SESSION_SECRET/);
  });

  it("PLACES_MOCK=1 → true", () => {
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("PLACES_MOCK", "1");
    expect(getServerEnv().placesMock).toBe(true);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
    vi.stubEnv("SESSION_SECRET", SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("doğru şifre → 200 + imzalı httpOnly cookie", async () => {
    const res = await login(loginRequest(JSON.stringify({ password: PASSWORD })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { ok: true } });

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=2592000/);
    expect(setCookie).not.toMatch(/Secure/i);

    const token = res.cookies.get(SESSION_COOKIE)?.value;
    expect(await verifySession(token, SECRET)).toBe(true);
  });

  it("yanlış şifre → 401 INVALID_PASSWORD, cookie yok", async () => {
    const res = await login(loginRequest(JSON.stringify({ password: "yanlis" })));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { statusCode: number; code: string } };
    expect(body.error.statusCode).toBe(401);
    expect(body.error.code).toBe("INVALID_PASSWORD");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("eksik / bozuk body → 400 VALIDATION_ERROR", async () => {
    for (const raw of ["{}", "not-json", JSON.stringify({ password: 123 })]) {
      const res = await login(loginRequest(raw));
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("POST /api/auth/logout", () => {
  it("200 + cookie silinir", async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { ok: true } });
    expect(res.headers.get("set-cookie") ?? "").toMatch(new RegExp(`${SESSION_COOKIE}=;.*Max-Age=0`, "i"));
  });
});

describe("middleware", () => {
  beforeEach(() => vi.stubEnv("SESSION_SECRET", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  async function run(path: string, token?: string): Promise<Response> {
    const req = new NextRequest(`http://localhost${path}`);
    if (token) req.cookies.set(SESSION_COOKIE, token);
    return middleware(req);
  }

  it("cookie'siz /api/* → 401 UNAUTHORIZED", async () => {
    const res = await run("/api/businesses");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("cookie'siz sayfa → /login?next=<path+query>", async () => {
    const res = await run("/businesses?status=NEW");
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/businesses?status=NEW");
  });

  it("login endpoint ve /login açık", async () => {
    expect((await run("/api/auth/login")).headers.get("x-middleware-next")).toBe("1");
    expect((await run("/login")).headers.get("x-middleware-next")).toBe("1");
  });

  it("geçerli oturum → geçer; /login → / redirect", async () => {
    const token = await signSession(SECRET);
    expect((await run("/api/businesses", token)).headers.get("x-middleware-next")).toBe("1");
    const res = await run("/login", token);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/");
  });

  it("farklı secret ile imzalı cookie → 401", async () => {
    const token = await signSession(`${SECRET}-baska`);
    expect((await run("/api/businesses", token)).status).toBe(401);
  });
});

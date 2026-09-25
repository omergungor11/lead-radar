import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/photo/route";

const savedEnv = { ...process.env };

function setEnv(extra: Record<string, string | undefined>): void {
  process.env.ADMIN_PASSWORD = "x";
  process.env.SESSION_SECRET = "s".repeat(32);
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function get(query: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/photo?${query}`));
}

afterEach(() => {
  process.env = { ...savedEnv };
  vi.unstubAllGlobals();
});

describe("GET /api/photo (mock mod)", () => {
  beforeEach(() => setEnv({ PLACES_MOCK: "1", GOOGLE_PLACES_API_KEY: undefined }));

  it.each([
    ["name yok", ""],
    ["yol geçişi", "name=places/../../etc/passwd"],
    ["dış URL", `name=${encodeURIComponent("https://evil.example.com/x")}`],
    ["sorgu enjeksiyonu", `name=${encodeURIComponent("places/a/photos/b?key=x")}`],
    ["genişlik aralık dışı", "name=mock/photo-1&w=5000"],
    ["genişlik sayı değil", "name=mock/photo-1&w=abc"],
  ])("%s → 400", async (_label, query) => {
    const res = await get(query);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("mock ad → 200 deterministik SVG, ağ çağrısı yok", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const a = await get("name=mock%2Fphoto-3&w=200");
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toContain("image/svg+xml");
    expect(a.headers.get("cache-control")).toBe("private, max-age=3600");
    const svgA = await a.text();
    expect(svgA).toContain('width="200"');
    expect(svgA).toContain('height="150"');

    const again = await (await get("name=mock%2Fphoto-3&w=200")).text();
    const other = await (await get("name=mock%2Fphoto-4&w=200")).text();
    expect(again).toBe(svgA);
    expect(other).not.toBe(svgA);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("GET /api/photo (gerçek mod)", () => {
  it("anahtar sunucuda kalır → 302 anahtarsız photoUri", async () => {
    setEnv({ PLACES_MOCK: undefined, GOOGLE_PLACES_API_KEY: "AIzaTEST-KEY" });
    const fetchSpy = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ photoUri: "https://lh3.googleusercontent.com/p/abc=w400" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const res = await get(`name=${encodeURIComponent("places/ChIJabc/photos/Xyz_1-2")}`);

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toBe("https://lh3.googleusercontent.com/p/abc=w400");
    expect(location).not.toContain("AIza");
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "https://places.googleapis.com/v1/places/ChIJabc/photos/Xyz_1-2/media?maxWidthPx=400&skipHttpRedirect=true",
    );
  });

  it("gerçek modda mock adı SVG döner (seed işletmeleri kırık görünmesin); anahtar yoksa 503", async () => {
    setEnv({ PLACES_MOCK: undefined, GOOGLE_PLACES_API_KEY: "AIzaTEST" });
    const mockRes = await get("name=mock%2Fphoto-1");
    expect(mockRes.status).toBe(200);
    expect(mockRes.headers.get("Content-Type")).toContain("image/svg+xml");

    setEnv({ PLACES_MOCK: undefined, GOOGLE_PLACES_API_KEY: "" });
    const res = await get(`name=${encodeURIComponent("places/a/photos/b")}`);
    expect(res.status).toBe(503);
  });
});

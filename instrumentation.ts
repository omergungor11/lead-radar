// Sunucu açılışında bir kez çalışır: zorunlu env eksikse uygulama net hatayla açılmaz.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getServerEnv } = await import("./lib/env");
  getServerEnv();
}

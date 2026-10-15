/**
 * Validate a post-OAuth return destination against the configured application
 * origin. This prevents OAuth state from becoming an open redirect.
 */
export function safeAppReturnUrl(value: unknown, appUrl: string | undefined): URL | null {
  if (typeof value !== "string" || !appUrl) return null;

  try {
    const app = new URL(appUrl);
    const target = new URL(value);

    const isAllowedProtocol = (url: URL) =>
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"));

    if (!isAllowedProtocol(app) || !isAllowedProtocol(target)) return null;
    if (app.username || app.password || target.username || target.password) return null;
    if (target.origin !== app.origin) return null;

    return target;
  } catch {
    return null;
  }
}

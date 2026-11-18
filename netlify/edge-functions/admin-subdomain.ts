import type { Config } from "@netlify/edge-functions";

const ADMIN_HOSTNAME = "admin.alfasystemstcr.com";

export default async (request: Request) => {
  const url = new URL(request.url);

  // Only rewrite the root URL on the dedicated admin hostname.
  // All main-store requests and all non-root paths pass through unchanged.
  if (url.hostname.toLowerCase() === ADMIN_HOSTNAME && url.pathname === "/") {
    return new URL("/admin.html", url);
  }

  return;
};

export const config: Config = {
  path: "/",
};

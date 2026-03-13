import { headers } from "next/headers";
import { absoluteUrl, getSiteOriginFromHeaders } from "../../lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const headerBag = await headers();
  const origin = getSiteOriginFromHeaders(headerBag);

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml", origin)}`
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

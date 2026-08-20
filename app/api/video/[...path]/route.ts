import { issueSignedToken, presignUrl } from "@vercel/blob";
import { NextResponse } from "next/server";

/**
 * Opens a customer's video for whoever is working the support case.
 *
 * The blob store is private, so the storage URL itself returns 403 — a link
 * straight to it would be useless in a ticket. This mints a short-lived signed
 * URL on each visit and redirects to it, which means the link in the ticket
 * keeps working for as long as the video exists and stops the moment the
 * retention job deletes it.
 *
 * There's no password: the ticket is where the link lives, and the pathname
 * carries a random suffix, so knowing the URL is the credential. Reads are
 * confined to the support-video prefix, so this can never be turned into a way
 * to fetch the run PDFs that share the same store.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "support-video/";
const LINK_TTL_MS = 5 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathname = path.map(decodeURIComponent).join("/");

  if (!pathname.startsWith(PREFIX) || pathname.includes("..")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const token = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil: Date.now() + LINK_TTL_MS,
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: "private",
    });
    // Never cached: the target URL expires, and a cached redirect would send
    // the next viewer to a dead link.
    return NextResponse.redirect(presignedUrl, {
      status: 302,
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    console.error("[video] link failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }
}

import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/cors";

/**
 * Hands the browser a short-lived, tightly-scoped URL so it can upload video
 * STRAIGHT to blob storage, bypassing this server entirely.
 *
 * That detour is the whole point. Video used to be posted through /api/support
 * with the rest of the form, and a phone or drone clip is large enough to kill
 * the request outright — the customer answered every question and then got
 * "we couldn't send your request". Serverless request bodies are a few
 * megabytes; an upload straight to storage has no such ceiling.
 *
 * Presigned URLs rather than client tokens: issueSignedToken authenticates with
 * the store credentials Vercel already injects (VERCEL_OIDC_TOKEN +
 * BLOB_STORE_ID), so this needs no separate read-write token in the
 * environment. Only a signature is issued here — the bytes never touch this
 * function.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
  "video/x-matroska",
  "video/3gpp",
];

// Long enough for a drone clip, low enough that this isn't free file hosting.
const MAX_BYTES = 500 * 1024 * 1024;

// The signature only has to survive the upload it was issued for.
const VALID_FOR_MS = 60 * 60 * 1000;

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadPresignedBody;

    const result = await handleUploadPresigned({
      request,
      body,
      getSignedToken: async (pathname) => ({
        // Scoped to this one pathname and to writes only, so a leaked
        // signature can't be used to read or overwrite anything else.
        token: await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_BYTES,
          validUntil: Date.now() + VALID_FOR_MS,
        }),
        urlOptions: {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_BYTES,
          // The resulting URL is public and these are pictures of someone's
          // kitchen — a random suffix keeps it from being guessable.
          addRandomSuffix: true,
        },
      }),
      // Nothing to record on completion — the URL travels with the support
      // case, which is the only thing that ever references it.
    });

    return withCors(NextResponse.json(result), request);
  } catch (e) {
    // A failure here is not fatal to the customer: the guide marks the video as
    // not uploaded and the ticket tells the agent to ask for it.
    console.error(
      "[video-upload] failed:",
      e instanceof Error ? e.message : e,
    );
    return withCors(
      NextResponse.json({ error: "upload_failed" }, { status: 400 }),
      request,
    );
  }
}

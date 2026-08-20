"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { apiUrl } from "@/lib/apiBase";

// Uploading video from the browser straight to blob storage.
//
// It starts the moment the customer picks the file, not at submit: a large clip
// takes minutes, and making someone stare at a spinner on the final screen is
// how you lose the ticket they already did the work for. They carry on
// answering questions while it uploads in the background.

export type VideoStatus = "uploading" | "done" | "failed";

export interface VideoUpload {
  name: string;
  size: number;
  status: VideoStatus;
  /** 0-100 while uploading. */
  progress: number;
  /** Set once the upload finishes — this is what the agent clicks. */
  url?: string;
}

export const isVideo = (f: File): boolean => f.type.startsWith("video/");

export async function uploadVideo(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<string> {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const result = await uploadPresigned(`support-video/${Date.now()}-${safe}`, file, {
    access: "public",
    handleUploadUrl: apiUrl("/api/video-upload"),
    contentType: file.type || "video/mp4",
    onUploadProgress: ({ percentage }) => onProgress(percentage),
  });
  return result.url;
}

/** The agent-facing block naming each video and where to watch it. */
export function videoLinksNote(videos: VideoUpload[]): string {
  if (videos.length === 0) return "";
  const lines = ["", "VIDEO FROM THE CUSTOMER"];
  for (const v of videos) {
    if (v.status === "done" && v.url) {
      lines.push(`- ${v.name}`, `  ${v.url}`);
    } else {
      lines.push(`- ${v.name} — upload did not finish; ask them to send it`);
    }
  }
  return lines.join("\n");
}

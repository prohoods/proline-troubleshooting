"use client";

import { useRef } from "react";
import type { Option } from "@/lib/flow/types";
import { isVideo, uploadVideo, type VideoUpload } from "@/lib/support/videoUpload";

/**
 * Photo/video picker.
 *
 * Photos are held as File objects and attached to the support case at the end.
 * Video takes a different path: it starts uploading to storage the instant it's
 * picked, and only the resulting link travels with the case. Sending video
 * bytes through the form is what used to break submissions outright — a phone
 * clip is far larger than a serverless request body allows, so the customer
 * answered everything and then got an error.
 *
 * Uploading here rather than at submit also means the wait overlaps with the
 * questions they still have to answer, instead of stalling the final screen.
 */
export function UploadStub({
  options,
  files = [],
  videos = [],
  onFilesChange,
  onVideosChange,
  onChange,
}: {
  options?: Option[];
  value?: string[];
  files?: File[];
  videos?: VideoUpload[];
  onFilesChange?: (files: File[]) => void;
  onVideosChange?: (updater: (prev: VideoUpload[]) => VideoUpload[]) => void;
  onChange: (value: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Names of everything picked, video included, so the run answer reflects what
  // the customer believes they sent.
  const commit = (nextFiles: File[], nextVideoNames: string[]) => {
    onFilesChange?.(nextFiles);
    onChange([...nextFiles.map((f) => f.name), ...nextVideoNames]);
  };

  const videoNames = (list: VideoUpload[]) => list.map((v) => v.name);

  const patch = (name: string, change: Partial<VideoUpload>) =>
    onVideosChange?.((prev) =>
      prev.map((v) => (v.name === name ? { ...v, ...change } : v)),
    );

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    const images = picked.filter((f) => !isVideo(f));
    const clips = picked.filter(isVideo);

    const nextFiles = [...files, ...images];
    const started: VideoUpload[] = clips.map((f) => ({
      name: f.name,
      size: f.size,
      status: "uploading",
      progress: 0,
    }));
    const nextVideos = [...videos, ...started];

    onVideosChange?.(() => nextVideos);
    commit(nextFiles, videoNames(nextVideos));

    for (const clip of clips) {
      void uploadVideo(clip, (p) => patch(clip.name, { progress: p }))
        .then((url) => patch(clip.name, { status: "done", progress: 100, url }))
        .catch((e) => {
          console.error("[upload] video failed:", e);
          patch(clip.name, { status: "failed" });
        });
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFileAt = (i: number) => {
    const nextFiles = files.filter((_, idx) => idx !== i);
    commit(nextFiles, videoNames(videos));
  };

  const removeVideo = (name: string) => {
    const nextVideos = videos.filter((v) => v.name !== name);
    onVideosChange?.(() => nextVideos);
    commit(files, videoNames(nextVideos));
  };

  const uploading = videos.some((v) => v.status === "uploading");

  return (
    <div>
      {options?.length ? (
        <div className="mb-3 rounded-xl bg-mist p-4 text-sm">
          <p className="font-semibold text-ink">Please include:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {options.map((o) => (
              <li key={o.value}>{o.label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-white px-4 py-7 text-center transition hover:border-sky/60"
      >
        <span className="font-semibold text-ink">Choose photos or video</span>
        <span className="text-xs text-muted">
          Both are sent to our team. Video keeps uploading while you answer the
          rest.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-sm text-ink"
            >
              <span className="max-w-[224px] truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeFileAt(i)}
                className="text-muted hover:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {videos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {videos.map((v) => (
            <li
              key={v.name}
              className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-ink">{v.name}</span>
                <span
                  className={
                    v.status === "failed"
                      ? "shrink-0 text-xs font-semibold text-danger"
                      : "shrink-0 text-xs font-semibold text-muted"
                  }
                >
                  {v.status === "done"
                    ? "Uploaded"
                    : v.status === "failed"
                      ? "Upload failed"
                      : `${Math.round(v.progress)}%`}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${v.name}`}
                  onClick={() => removeVideo(v.name)}
                  className="shrink-0 text-muted hover:text-ink"
                >
                  ×
                </button>
              </div>
              {v.status === "uploading" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                  <div
                    className="h-full rounded-full bg-sky transition-all"
                    style={{ width: `${Math.max(3, Math.round(v.progress))}%` }}
                  />
                </div>
              )}
              {v.status === "failed" && (
                <p className="mt-1 text-xs text-muted">
                  You can still send your request — remove this and our team will
                  ask for the video by email.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {uploading && (
        <p className="mt-2 text-xs text-muted">
          Keep going — the video finishes uploading in the background.
        </p>
      )}
    </div>
  );
}

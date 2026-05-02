/**
 * Reusable attachment preview surface.
 *
 * Until now every place in the app that surfaced uploaded files (staff
 * notifications, manager-side announcements, scheduled-shift attachments,
 * task evidence) rendered them as a plain bulleted list of blue underlined
 * links. Managers reported "Attached files are only shown as links, which
 * reduces usability" — they want to see what they're about to open without
 * having to click through to a new tab first.
 *
 * This component classifies an attachment by its MIME type (or filename
 * extension as a fallback) and renders it the right way:
 *
 *   - **image**  thumbnail tile with hover-zoom + click-to-lightbox.
 *   - **audio**  inline `<audio controls>` player with the filename above.
 *   - **video**  inline `<video controls>` player capped at a sensible size.
 *   - **pdf / doc / sheet / code / archive / other**  a dense file-card
 *                with a kind-coloured icon, name, kind badge, optional size,
 *                and ALWAYS a primary "Open" affordance plus a secondary
 *                Download icon button. The whole card is keyboard-friendly.
 *
 * Use `AttachmentList` when you have an array — it splits images into a
 * responsive gallery grid and stacks the rest as cards, so a mixed list
 * (3 photos + 1 PDF) reads cleanly without bespoke layout glue at the
 * call site.
 */
import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileVideo,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Loose attachment shape — every back-end serializer that surfaces a file
 * uses a slightly different field name combination (``url`` /
 * ``original_name`` / ``filename`` / ``content_type`` / ``mime_type`` /
 * ``size``). Accept all of them as optional and resolve at render time so
 * a single component covers every call site.
 */
export interface AttachmentLike {
  url?: string | null;
  name?: string | null;
  original_name?: string | null;
  filename?: string | null;
  content_type?: string | null;
  mime_type?: string | null;
  size?: number | null;
}

type AttachmentKind =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "doc"
  | "sheet"
  | "code"
  | "archive"
  | "other";

function resolveName(a: AttachmentLike, fallback?: string): string {
  return (
    a.name?.trim() ||
    a.original_name?.trim() ||
    a.filename?.trim() ||
    fallback ||
    "Attachment"
  );
}

function resolveMime(a: AttachmentLike): string {
  return (a.content_type || a.mime_type || "").toLowerCase();
}

function extensionOf(name: string): string {
  // Strip URL query/hash before extracting the extension — uploads served
  // from S3 etc. often append signed-URL params after the filename.
  const clean = name.split(/[?#]/)[0];
  const m = clean.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function classifyKind(a: AttachmentLike): AttachmentKind {
  const mime = resolveMime(a);
  const ext = extensionOf(resolveName(a)) || extensionOf(a.url || "");

  if (
    mime.startsWith("image/") ||
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "svg",
      "bmp",
      "heic",
      "heif",
      "avif",
    ].includes(ext)
  )
    return "image";
  if (
    mime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "opus", "aac", "flac"].includes(ext)
  )
    return "audio";
  if (
    mime.startsWith("video/") ||
    ["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)
  )
    return "video";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mime.includes("wordprocessingml") ||
    mime.includes("msword") ||
    ["docx", "doc", "odt", "rtf", "txt", "md"].includes(ext)
  )
    return "doc";
  if (
    mime.includes("spreadsheetml") ||
    mime.includes("excel") ||
    ["xlsx", "xls", "ods", "csv", "tsv"].includes(ext)
  )
    return "sheet";
  if (
    [
      "json",
      "yaml",
      "yml",
      "xml",
      "html",
      "js",
      "ts",
      "tsx",
      "jsx",
      "py",
      "go",
      "rs",
      "sh",
      "sql",
    ].includes(ext)
  )
    return "code";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archive";
  return "other";
}

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"] as const;
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  // 1 decimal once we leave the byte range so "1.5 MB" reads better than "1 MB".
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function kindLabel(kind: AttachmentKind): string {
  if (kind === "other") return "FILE";
  if (kind === "doc") return "DOC";
  if (kind === "sheet") return "SHEET";
  return kind.toUpperCase();
}

function tonesForKind(kind: AttachmentKind): string {
  // Coordinated icon-bg / icon-text pair so each file type reads as its
  // own visual lane (red PDFs, green sheets, sky docs, etc.) — same
  // language as the dashboard category widgets for consistency.
  switch (kind) {
    case "pdf":
      return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400";
    case "sheet":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "doc":
      return "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400";
    case "code":
      return "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400";
    case "archive":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400";
    case "audio":
      return "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400";
    case "video":
      return "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300";
  }
}

function IconForKind({
  kind,
  className,
}: {
  kind: AttachmentKind;
  className?: string;
}) {
  // Fall back to a generic "file" icon for anything we don't have a
  // dedicated lucide glyph for — we want a visual signal even for
  // unknown types, never an empty box.
  switch (kind) {
    case "pdf":
    case "doc":
      return <FileText className={className} aria-hidden />;
    case "sheet":
      return <FileSpreadsheet className={className} aria-hidden />;
    case "audio":
      return <FileAudio className={className} aria-hidden />;
    case "video":
      return <FileVideo className={className} aria-hidden />;
    case "archive":
      return <FileArchive className={className} aria-hidden />;
    case "code":
      return <FileCode className={className} aria-hidden />;
    default:
      return <FileIcon className={className} aria-hidden />;
  }
}

/**
 * Lightweight image lightbox. We don't pull in a 3rd-party lib — the only
 * features the app actually needs are "fill the screen" + "click outside
 * or hit Escape to close" + "tap the image without it closing".
 */
function ImageLightbox({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
    >
      <img
        src={url}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-md shadow-2xl cursor-default"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close preview"
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg hover:bg-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Generic file card — kind-tinted icon, filename, kind badge + size, and
 * an Open + Download button pair. Used for everything that isn't an
 * image, audio file, or video — i.e. the long tail of PDFs, docs,
 * sheets, archives and unknown blobs.
 */
function FileCard({
  url,
  name,
  kind,
  sizeLabel,
  className,
}: {
  url: string;
  name: string;
  kind: AttachmentKind;
  sizeLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/40",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
          tonesForKind(kind),
        )}
      >
        <IconForKind kind={kind} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground" title={name}>
          {name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold tracking-wider">
            {kindLabel(kind)}
          </span>
          {sizeLabel ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{sizeLabel}</span>
            </>
          ) : null}
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={`Open ${name} in a new tab`}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Open
      </a>
      <a
        href={url}
        download={name}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={`Download ${name}`}
        title={`Download ${name}`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}

export function AttachmentPreview({
  attachment,
  fallbackName,
  className,
}: {
  attachment: AttachmentLike;
  /** Used when the attachment has no resolvable name (e.g. legacy rows). */
  fallbackName?: string;
  className?: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const url = attachment.url?.trim();
  if (!url) return null;
  const name = resolveName(attachment, fallbackName);
  const kind = classifyKind(attachment);
  const sizeLabel = formatSize(attachment.size);

  if (kind === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Open ${name} in full size`}
          className={cn(
            "group relative block w-full overflow-hidden rounded-lg border border-border bg-muted/40 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
            className,
          )}
        >
          <img
            src={url}
            alt={name}
            loading="lazy"
            className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          {/* Overlay caption — subtle gradient + truncated filename + size */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-[11px] font-medium text-white">
            <span className="truncate" title={name}>
              {name}
            </span>
            {sizeLabel ? (
              <span className="shrink-0 tabular-nums opacity-75">
                {sizeLabel}
              </span>
            ) : null}
          </div>
        </button>
        {lightboxOpen ? (
          <ImageLightbox
            url={url}
            alt={name}
            onClose={() => setLightboxOpen(false)}
          />
        ) : null}
      </>
    );
  }

  if (kind === "audio") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/30 p-3",
          className,
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-sm">
          <FileAudio
            className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400"
            aria-hidden
          />
          <span className="truncate font-medium text-foreground" title={name}>
            {name}
          </span>
          {sizeLabel ? (
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
              {sizeLabel}
            </span>
          ) : null}
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls preload="metadata" src={url} className="h-9 w-full" />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-muted/30 p-2",
          className,
        )}
      >
        <video
          controls
          preload="metadata"
          src={url}
          className="w-full max-h-72 rounded-md bg-black"
        >
          <track kind="captions" />
        </video>
        <div className="mt-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <FileVideo className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate" title={name}>
            {name}
          </span>
          {sizeLabel ? (
            <span className="ml-auto shrink-0 tabular-nums">{sizeLabel}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <FileCard
      url={url}
      name={name}
      kind={kind}
      sizeLabel={sizeLabel}
      className={className}
    />
  );
}

export function AttachmentList({
  attachments,
  className,
  emptyMessage,
}: {
  attachments: AttachmentLike[] | undefined | null;
  className?: string;
  /** Shown when ``attachments`` is empty — pass ``null`` to render nothing. */
  emptyMessage?: string | null;
}) {
  const safe = (attachments || []).filter((a) => !!a?.url);
  if (safe.length === 0) {
    if (emptyMessage === null) return null;
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {emptyMessage ?? "No attachments"}
      </p>
    );
  }
  // Split images out into a gallery grid; everything else stacks beneath
  // as cards. Mixed lists (e.g. 3 photos + 1 invoice PDF) read much
  // better when the photos cluster instead of interrupting the cards.
  const images: AttachmentLike[] = [];
  const others: AttachmentLike[] = [];
  for (const a of safe) {
    if (classifyKind(a) === "image") images.push(a);
    else others.push(a);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {images.length > 0 ? (
        <div
          className={cn(
            "grid gap-2",
            images.length === 1
              ? "grid-cols-1 sm:max-w-sm"
              : images.length === 2
              ? "grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {images.map((a, i) => (
            <AttachmentPreview
              key={(a.url || "") + i}
              attachment={a}
              fallbackName={`Image ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
      {others.length > 0 ? (
        <div className="space-y-2">
          {others.map((a, i) => (
            <AttachmentPreview
              key={(a.url || "") + i}
              attachment={a}
              fallbackName={`File ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

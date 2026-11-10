import piexif from "piexifjs";

export interface CompressedImage {
  dataUrl: string; // base64 JPEG
  blob: Blob;
  size: number; // bytes
}

// Compress a canvas image to <= maxBytes using JPEG quality ramp-down
export async function compressCanvasToJPEG(
  canvas: HTMLCanvasElement,
  maxBytes = 500 * 1024,
  initialQuality = 0.92,
  minQuality = 0.5
): Promise<CompressedImage> {
  let quality = initialQuality;
  // Helper to get blob
  const toBlob = (q: number) =>
    new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", q));
  let blob = await toBlob(quality);
  // Iteratively reduce quality until under maxBytes or minQuality
  while (blob.size > maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.08);
    blob = await toBlob(quality);
  }
  const dataUrl = await blobToDataURL(blob);
  return { dataUrl, blob, size: blob.size };
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Embed EXIF DateTimeOriginal into a base64 JPEG data URL
// date should be in format "YYYY:MM:DD HH:MM:SS" per EXIF spec
export function embedExifTimestamp(dataUrl: string, dateTimeOriginal: string, userComment?: string): string {
  try {
    const jpeg = dataUrl.split(",")[1];
    const exifObj: any = { "0th": {}, Exif: {}, GPS: {} };
    exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = dateTimeOriginal;
    if (userComment) {
      exifObj.Exif[piexif.ExifIFD.UserComment] = userComment;
    }
    const exifBytes = piexif.dump(exifObj);
    const inserted = piexif.insert(exifBytes, dataUrl);
    return inserted;
  } catch (e) {
    // If EXIF embedding fails, return original dataUrl
    return dataUrl;
  }
}

export function formatExifDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}:${mm}:${dd} ${hh}:${mi}:${ss}`;
}
/**
 * Phone photos (3–10 MB) shrunk to a sharp JPEG under ~900 KB before upload: the API refused anything over 1 MB
 * (prod, Nov 2026: "pictures can't be uploaded for the staff file"), and it is lighter on mobile data. Non-images,
 * GIFs, small files and formats the browser can't decode (HEIC outside Safari) go up unchanged.
 */
export async function shrinkPhoto(file: File, maxSide = 2400, maxBytes = 900 * 1024): Promise<File> {
  if (!file || !file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }
  if (file.size <= maxBytes || typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    let side = maxSide;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      // Quality first; a very detailed photo that stays too heavy is drawn smaller.
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = (await compressCanvasToJPEG(canvas, maxBytes, 0.88, 0.55)).blob;
      if (blob && blob.size <= maxBytes) break;
      side = Math.round(side * 0.75);
    }
    bitmap.close?.();
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

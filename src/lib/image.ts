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
import { orientation as readExifOrientation } from 'exifr';
import imageCompression from 'browser-image-compression';

/**
 * ==========================================
 * UPLOAD NORMALIZATION — orientation + compression
 * ==========================================
 * Both free, open-source (MIT), pure client-side (WASM/canvas + a Web
 * Worker) — no server, no new bill.
 *
 * Normalizes an uploaded reference photo before it's used anywhere in the
 * app or sent to the Wavespeed API:
 *  - Reads the file's own EXIF orientation tag (exifr.orientation — a
 *    small, focused parse that only reads that one tag rather than the
 *    whole EXIF block) and hands it to browser-image-compression's
 *    `exifOrientation` option, so a photo shot sideways/upside-down on a
 *    phone gets its pixels correctly rotated instead of just carrying a
 *    tag that a downstream, non-browser image decoder may or may not
 *    respect. (browser-image-compression can infer this itself when the
 *    option is omitted, but reading it explicitly means this app owns and
 *    can verify that correctness rather than depending on an unannounced
 *    internal default.)
 *  - Resizes to `maxWidthOrHeight` and recompresses, cutting upload size/
 *    latency to the Wavespeed API — replaces the old hand-rolled canvas
 *    resize this app used to do inline.
 *  - As a side effect of the canvas-based re-encode, ALL other EXIF
 *    metadata (GPS location, camera/device identifiers, timestamps, ...)
 *    is stripped from what actually gets uploaded — a real privacy win for
 *    photos handed to a third-party inference API, not just an
 *    orientation fix.
 *
 * Fails open: if anything here throws (corrupt file, decode failure,
 * worker unavailable), the ORIGINAL file is returned untouched rather than
 * blocking the upload — same fail-open contract as this app's MediaPipe
 * helpers (bodySegmentation.ts, etc.).
 */
export async function normalizeUploadedImage(file: File, maxWidthOrHeight = 1536): Promise<File> {
  try {
    const orientation = await readExifOrientation(file).catch(() => undefined);
    return await imageCompression(file, {
      maxWidthOrHeight,
      maxSizeMB: 8,
      useWebWorker: true,
      initialQuality: 0.9,
      exifOrientation: orientation,
    });
  } catch (err) {
    console.warn('Image normalization failed — using the original file as-is', err);
    return file;
  }
}

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getBodySegmentMask, imagePointFromClient, paintSlot, slotAt, type BodySegmentMask, type SegmentSlot } from '../lib/bodySegmentation';
import { createCoalescedRunner, paintHit, segmentAt } from '../lib/interactiveSegment';
import { FACE_REGION_LABELS, faceRegionAt, getFaceRegions, paintFaceRegion, type FaceRegionSet } from '../lib/faceRegions';

// Finds the actual <img> under a client point via elementFromPoint, rather
// than guessing "the biggest visible image on the page" up front. That
// matters on screens like the history lightbox, which keeps several
// neighboring carousel slides' <img> elements mounted at once (rotated
// off to the side, faded out, pointer-events: none) around the centered
// one — a size-based global scan can lock onto one of those occluded,
// non-interactive neighbors instead of the image actually under the
// cursor. elementFromPoint naturally skips pointer-events: none elements,
// so it always resolves to whatever the user could actually click.
function imgAtPoint(clientX: number, clientY: number): HTMLImageElement | null {
  const el = document.elementFromPoint(clientX, clientY);
  const img = el?.closest('img') as HTMLImageElement | null;
  if (!img) return null;
  if (img.closest('[data-arx-lib],[data-arx-region-ui]')) return null;
  const r = img.getBoundingClientRect();
  if (r.width < 180 || r.height < 180) return null;
  return img;
}

const maskCache = new Map<string, BodySegmentMask | null>();
async function maskFor(url: string) {
  if (maskCache.has(url)) return maskCache.get(url) || null;
  const m = await getBodySegmentMask(url);
  maskCache.set(url, m);
  return m;
}

const faceCache = new Map<string, FaceRegionSet | null>();
async function facesFor(url: string) {
  if (faceCache.has(url)) return faceCache.get(url) || null;
  const f = await getFaceRegions(url);
  faceCache.set(url, f);
  return f;
}

/**
 * A resolved hover/click point, in priority order (most specific first):
 *  1. A named facial feature (left eye, lips, ...) from faceRegions.ts —
 *     paints its exact landmark polygon and carries a real name.
 *  2. Otherwise the coarse body-segmenter bucket (hair/body/face/clothes/
 *     other/background) — paints that class's silhouette. The in-editor
 *     work canvas additionally refines this with the class-agnostic
 *     interactive point segmenter (see workSegmentRunner below); the
 *     pre-open hover overlay does not, to keep page-wide hover cheap.
 */
interface Resolved {
  img: HTMLImageElement;
  label: string;
  mask: BodySegmentMask | null;
  paint: (canvas: HTMLCanvasElement) => void;
}

async function resolveAt(clientX: number, clientY: number, maskRef: React.MutableRefObject<BodySegmentMask | null>, srcRef: React.MutableRefObject<string>): Promise<Resolved | null> {
  const img = imgAtPoint(clientX, clientY);
  if (!img) return null;
  const point = imagePointFromClient(img, clientX, clientY);
  if (!point) return null;
  const url = img.currentSrc || img.src;

  let mask = maskRef.current;
  let faces: FaceRegionSet | null;
  if (!mask || srcRef.current !== url) {
    const [m, f] = await Promise.all([maskFor(url), facesFor(url)]);
    mask = m;
    faces = f;
    maskRef.current = m;
    srcRef.current = url;
  } else {
    faces = await facesFor(url); // already resolved/cached — this awaits instantly
  }

  const faceHit = faces ? faceRegionAt(faces, point.nx, point.ny) : null;
  if (faceHit) {
    return {
      img,
      label: FACE_REGION_LABELS[faceHit.name],
      mask,
      paint: (canvas) => paintFaceRegion(canvas, faceHit.polygon, img),
    };
  }
  if (!mask) return null;
  const slot = slotAt(mask, point.nx, point.ny);
  return { img, label: slot, mask, paint: (canvas) => paintSlot(canvas, mask!, slot, img) };
}

export default function RegionEditRoot() {
  const hoverRef = useRef<HTMLCanvasElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState('');
  const [note, setNote] = useState('');
  const [portrait, setPortrait] = useState(true);
  // Free-text label for the locked selection. Seeded from whatever
  // resolveAt found (a named facial feature when there's a match, else the
  // coarse body-segmenter bucket), but the actual selectable region can be
  // anything a precise mask covers — an eye, a single clothing item, a
  // prop, etc. — so the name is editable to match.
  const [regionName, setRegionName] = useState('clothes');
  const [guess, setGuess] = useState<string | null>(null);
  const maskRef = useRef<BodySegmentMask | null>(null);
  const srcRef = useRef('');

  // Remembers the last resolved hit, so a window resize (e.g. a phone
  // rotation) can reposition and repaint the overlay against the new
  // layout even though the pointer itself hasn't moved — otherwise the
  // highlight would sit stranded at its old screen position.
  const lastHoverRef = useRef<Resolved | null>(null);

  useEffect(() => {
    const paintHover = (resolved: Resolved, canvas: HTMLCanvasElement) => {
      const rect = resolved.img.getBoundingClientRect();
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      resolved.paint(canvas);
    };
    const onMove = async (e: PointerEvent) => {
      if (open) return;
      const canvas = hoverRef.current;
      if (!canvas) return;
      // resolveAt deliberately never reads `hovered` — see onClick below.
      const resolved = await resolveAt(e.clientX, e.clientY, maskRef, srcRef);
      if (!resolved) {
        lastHoverRef.current = null;
        setHovered(null);
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      lastHoverRef.current = resolved;
      setHovered(resolved.label);
      paintHover(resolved, canvas);
    };
    // Fully resolves an image + region at the click's own point, from
    // scratch — deliberately never reads the `hovered` state. A click
    // doesn't need a preceding pointermove over the same element: touch
    // taps have no hover phase at all, and even with a mouse, clicking
    // "Expand Data" opens the lightbox at the cursor's current (unmoved)
    // position, so an immediate follow-up click could otherwise pair a
    // freshly-found lightbox image with `hovered`'s stale value from
    // whatever was under the cursor *before* the lightbox existed — a real
    // mismatch, not a coordinate bug. Resolving independently here closes
    // that gap.
    const onClick = async (e: PointerEvent) => {
      if (open) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      const resolved = await resolveAt(e.clientX, e.clientY, maskRef, srcRef);
      if (!resolved) return;
      const { img, label } = resolved;
      const rect = img.getBoundingClientRect();
      setSrc(img.currentSrc || img.src);
      setPortrait((img.naturalHeight || rect.height) >= (img.naturalWidth || rect.width));
      setRegionName(label);
      setGuess(label);
      setOpen(true);
    };
    // A layout reflow (window resize, or a phone rotation) can move/resize
    // the hovered image without any pointer event to trigger a repaint —
    // re-derive the overlay's position from the image's new rect using the
    // same already-resolved hit, rather than leaving it stranded at its
    // old screen position (or requiring the user to nudge the pointer).
    const onResize = () => {
      const canvas = hoverRef.current;
      const resolved = lastHoverRef.current;
      if (open || !canvas || !resolved || !resolved.img.isConnected) return;
      paintHover(resolved, canvas);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // Runs the class-agnostic interactive segmenter on the hovered point,
  // coalesced so a fast-moving pointer never queues up overlapping model
  // calls — it always converges on the latest position. Falls back to the
  // coarse body-segmenter silhouette if the interactive model isn't
  // available (e.g. offline / still loading).
  const workSegmentRunner = useRef(
    createCoalescedRunner(async (arg: { img: HTMLImageElement; canvas: HTMLCanvasElement; nx: number; ny: number; mask: BodySegmentMask | null }) => {
      const hit = await segmentAt(arg.img, arg.nx, arg.ny);
      if (hit) {
        paintHit(arg.canvas, hit, arg.img);
      } else if (arg.mask) {
        paintSlot(arg.canvas, arg.mask, slotAt(arg.mask, arg.nx, arg.ny), arg.img);
      }
    }),
  ).current;

  // While the editor is open, a resize (e.g. a phone rotation) invalidates
  // the work canvas's size/position relative to its <img>. There's no
  // cached "last precise hit" to redraw against the new layout the way the
  // pre-open hover overlay does, so just clear it — safer than leaving a
  // highlight sized/positioned for a layout that no longer exists. The
  // next hover repaints it against the current one.
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const canvas = workRef.current;
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  const onWorkMove = async (e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = e.currentTarget.querySelector('img') as HTMLImageElement | null;
    const canvas = workRef.current;
    if (!wrap || !canvas) return;
    const point = imagePointFromClient(wrap, e.clientX, e.clientY);
    if (!point) return;

    let mask = maskRef.current;
    if (!mask) {
      mask = await maskFor(src);
      maskRef.current = mask;
    }
    const faces = await facesFor(src);
    const faceHit = faces ? faceRegionAt(faces, point.nx, point.ny) : null;

    if (faceHit) {
      setGuess(FACE_REGION_LABELS[faceHit.name]);
      paintFaceRegion(canvas, faceHit.polygon, wrap);
      return; // already maximally precise + named — skip the point segmenter
    }
    if (mask) setGuess(slotAt(mask, point.nx, point.ny));
    workSegmentRunner({ img: wrap, canvas, nx: point.nx, ny: point.ny, mask });
  };

  const applyPrompt = () => {
    if (!note.trim()) return;
    const label = regionName.trim() || guess || 'selected';
    const prompt = `Only edit the highlighted ${label} region of the subject. Follow the exact segmented outline shown. Do not change any other region. ${note.trim()}`;
    const box = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (box) {
      box.value = prompt;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toast.success(`Editing ${label}`);
    setOpen(false);
  };

  return (
    <>
      <canvas ref={hoverRef} className="pointer-events-none fixed z-[80]" />
      {hovered && !open && (
        <div className="fixed z-[90] left-1/2 -translate-x-1/2 top-3 px-3 py-1 rounded-md bg-zinc-950/90 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-widest text-emerald-400 pointer-events-none">
          {hovered}
        </div>
      )}
      {open && (
        <div data-arx-region-ui className="fixed inset-0 z-[10050] bg-black/90 flex">
          <div className={`flex w-full h-full ${portrait ? 'flex-row' : 'flex-col'}`}>
            <div className={`relative bg-black flex items-center justify-center ${portrait ? 'flex-1 min-w-0' : 'flex-[1.4] min-h-0'}`} onPointerMove={onWorkMove}>
              {src && <img src={src} alt="" className="max-h-full max-w-full object-contain" />}
              <canvas ref={workRef} className="pointer-events-none absolute inset-0" />
            </div>
            <div className={`${portrait ? 'w-[340px] max-w-[42vw] border-l' : 'w-full border-t'} border-zinc-800 bg-zinc-950 p-4 space-y-3`}>
              <p className="text-[11px] text-zinc-400">Hover paints a precise silhouette of whatever's under the cursor — a named facial feature (eye, eyebrow, lips), a strand of hair, a single clothing item, or any other object. Not a fixed category or a circle.</p>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Selected region</label>
                <input
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder="Name this region (nose, jacket, necklace…)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm px-3 py-2 outline-none"
                />
                {guess && <p className="text-[10px] text-zinc-500">Looks like: {guess}</p>}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={`What to change on ${regionName || 'this region'}`} rows={5} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm px-3 py-2 outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 min-h-[44px] rounded-xl border border-zinc-700 text-[10px] uppercase tracking-widest text-zinc-400">Close</button>
                <button type="button" onClick={applyPrompt} className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-widest">Paste region prompt</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

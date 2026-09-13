import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getBodySegmentMask, imagePointFromClient, paintSlot, slotAt, type BodySegmentMask, type SegmentSlot } from '../lib/bodySegmentation';
import { createCoalescedRunner, paintHit, segmentAt } from '../lib/interactiveSegment';

function findPreviewImg(): HTMLImageElement | null {
  const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
  const visible = imgs.filter((img) => {
    if (img.closest('[data-arx-lib],[data-arx-region-ui]')) return false;
    const r = img.getBoundingClientRect();
    return r.width > 180 && r.height > 180 && r.bottom > 40 && r.top < window.innerHeight - 40;
  });
  visible.sort((a, b) => {
    const aa = a.getBoundingClientRect();
    const bb = b.getBoundingClientRect();
    return bb.width * bb.height - aa.width * aa.height;
  });
  return visible[0] || null;
}

const cache = new Map<string, BodySegmentMask | null>();

async function maskFor(url: string) {
  if (cache.has(url)) return cache.get(url) || null;
  const m = await getBodySegmentMask(url);
  cache.set(url, m);
  return m;
}

export default function RegionEditRoot() {
  const hoverRef = useRef<HTMLCanvasElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState<SegmentSlot | null>(null);
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState('');
  const [note, setNote] = useState('');
  const [portrait, setPortrait] = useState(true);
  // Free-text label for the locked selection. MediaPipe's body segmenter
  // only knows 6 broad buckets (background/hair/body/face/clothes/other),
  // so it seeds this as a starting guess, but the actual selectable region
  // — painted via the class-agnostic interactive point segmenter below —
  // can be anything: an eye, the nose, a single clothing item, a prop, etc.
  // The name is editable so the user can call it what it actually is.
  const [regionName, setRegionName] = useState('clothes');
  const [guess, setGuess] = useState<SegmentSlot | null>(null);
  const maskRef = useRef<BodySegmentMask | null>(null);
  const srcRef = useRef('');

  useEffect(() => {
    const onMove = async (e: PointerEvent) => {
      if (open) return;
      const img = findPreviewImg();
      const canvas = hoverRef.current;
      if (!img || !canvas) return;
      const rect = img.getBoundingClientRect();
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const point = imagePointFromClient(img, e.clientX, e.clientY);
      if (!point) {
        setHovered(null);
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const url = img.currentSrc || img.src;
      let mask = maskRef.current;
      if (!mask || srcRef.current !== url) {
        mask = await maskFor(url);
        maskRef.current = mask;
        srcRef.current = url;
      }
      if (!mask) return;
      const slot = slotAt(mask, point.nx, point.ny);
      setHovered(slot);
      paintSlot(canvas, mask, slot, img);
    };
    const onClick = (e: PointerEvent) => {
      if (open) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      const img = findPreviewImg();
      if (!img || !hovered) return;
      const rect = img.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) return;
      setSrc(img.currentSrc || img.src);
      setPortrait((img.naturalHeight || rect.height) >= (img.naturalWidth || rect.width));
      setRegionName(hovered);
      setGuess(hovered);
      setOpen(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [open, hovered]);

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
              <p className="text-[11px] text-zinc-400">Hover paints a precise silhouette of whatever's under the cursor — an eye, the nose, a strand of hair, a single clothing item, or any other object. Not a fixed category or a circle.</p>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Selected region</label>
                <input
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder="Name this region (eyes, nose, jacket, necklace…)"
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

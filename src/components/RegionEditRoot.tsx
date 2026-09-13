import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { paintHit, segmentAt, type SegmentHit } from '../lib/interactiveSegment';

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

function contain(maxW: number, maxH: number, natW: number, natH: number) {
  const s = Math.min(maxW / Math.max(natW, 1), maxH / Math.max(natH, 1));
  return { w: Math.max(1, natW * s), h: Math.max(1, natH * s) };
}

export default function RegionEditRoot() {
  const workCanvas = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const lastT = useRef(0);
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState('');
  const [note, setNote] = useState('');
  const [portrait, setPortrait] = useState(true);
  const [box, setBox] = useState({ w: 400, h: 600 });
  const [hit, setHit] = useState<SegmentHit | null>(null);

  const layout = () => {
    const pane = paneRef.current;
    const img = imgRef.current;
    if (!pane || !img) return;
    const pr = pane.getBoundingClientRect();
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    setBox(contain(pr.width, pr.height, natW, natH));
    setPortrait(natH >= natW);
  };

  useEffect(() => {
    if (!open) return;
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, [open, src]);

  useEffect(() => {
    const onClick = (e: PointerEvent) => {
      if (open) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      const img = findPreviewImg();
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) return;
      setSrc(img.currentSrc || img.src);
      setPortrait((img.naturalHeight || 1) >= (img.naturalWidth || 1));
      setOpen(true);
    };
    window.addEventListener('pointerdown', onClick);
    return () => window.removeEventListener('pointerdown', onClick);
  }, [open]);

  const onWorkMove = async (e: React.PointerEvent) => {
    const img = imgRef.current;
    const canvas = workCanvas.current;
    if (!img || !canvas) return;
    const now = Date.now();
    if (now - lastT.current < 90) return;
    lastT.current = now;
    const rect = img.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
    try {
      const next = await segmentAt(img, nx, ny);
      if (!next) return;
      setHit(next);
      paintHit(canvas, next, Math.round(rect.width), Math.round(rect.height));
    } catch {
      /* model loading */
    }
  };

  const applyPrompt = () => {
    if (!note.trim()) return;
    const prompt = `Only edit the highlighted segmented region under the cursor. Do not change pixels outside that mask. ${note.trim()}`;
    const boxEl = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (boxEl) {
      boxEl.value = prompt;
      boxEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toast.success('Region prompt pasted');
    setOpen(false);
  };

  return (
    <>
      {open && (
        <div data-arx-region-ui className="fixed inset-0 z-[10050] bg-black/92 flex">
          <div className={`flex w-full h-full ${portrait ? 'flex-row' : 'flex-col'}`}>
            <div ref={paneRef} className={`relative bg-black flex items-center justify-center overflow-hidden ${portrait ? 'flex-1 min-w-0' : 'flex-[1.4] min-h-0'}`}>
              <div className="relative" style={{ width: box.w, height: box.h }} onPointerMove={onWorkMove}>
                {src && (
                  <img
                    ref={imgRef}
                    src={src}
                    alt=""
                    crossOrigin="anonymous"
                    onLoad={layout}
                    className="block w-full h-full"
                    style={{ objectFit: 'fill' }}
                  />
                )}
                <canvas ref={workCanvas} className="pointer-events-none absolute inset-0 w-full h-full" />
              </div>
            </div>
            <div className={`${portrait ? 'w-[340px] max-w-[42vw] border-l' : 'w-full border-t'} border-zinc-800 bg-zinc-950 p-4 space-y-3`}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Click-to-segment</p>
              <p className="text-[11px] text-zinc-400">Hover the photo. Green fill is the Interactive Segmenter mask for that object or body part — aligned to the image, not the black bars.</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change in this region only" rows={5} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm px-3 py-2 outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 min-h-[44px] rounded-xl border border-zinc-700 text-[10px] uppercase tracking-widest text-zinc-400">Close</button>
                <button type="button" onClick={applyPrompt} disabled={!hit} className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-widest disabled:opacity-40">Paste region prompt</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

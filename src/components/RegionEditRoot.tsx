import React, { useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import { paintMask, segmentAt, type SegmentHit } from '../lib/interactiveSegment';

interface Target {
  img: HTMLImageElement;
  src: string;
}

function isGalleryImg(el: Element): el is HTMLImageElement {
  if (!(el instanceof HTMLImageElement)) return false;
  if (el.closest('[data-arx-lib]')) return false;
  if (el.closest('header')) return false;
  const w = el.naturalWidth || el.width;
  const h = el.naturalHeight || el.height;
  return w > 80 && h > 80 && !!el.src;
}

export default function RegionEditRoot() {
  const hoverCanvas = useRef<HTMLCanvasElement | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [locked, setLocked] = useState<SegmentHit | null>(null);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const lastHit = useRef<SegmentHit | null>(null);

  useEffect(() => {
    const onMove = async (e: PointerEvent) => {
      if (sheet) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !isGalleryImg(el)) {
        hoverCanvas.current?.getContext('2d')?.clearRect(0, 0, hoverCanvas.current.width, hoverCanvas.current.height);
        return;
      }
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
      const canvas = hoverCanvas.current;
      if (!canvas) return;
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      try {
        const hit = await segmentAt(el, nx, ny);
        if (!hit) return;
        lastHit.current = hit;
        paintMask(canvas, hit);
        setTarget({ img: el, src: el.currentSrc || el.src });
      } catch { /* model loading */ }
    };
    const onClick = (e: PointerEvent) => {
      if (sheet) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !isGalleryImg(el) || !lastHit.current) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      e.preventDefault();
      e.stopPropagation();
      setLocked(lastHit.current);
      setSheet(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick, { capture: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick, true);
    };
  }, [sheet]);

  const applyPrompt = () => {
    if (!note.trim()) return;
    const prompt = `Only edit the highlighted masked region. Do not change anything outside the mask. ${note.trim()}`;
    window.dispatchEvent(new CustomEvent('arx-region-edit', { detail: { prompt, imageSrc: target?.src, mask: locked } }));
    const box = document.querySelector('textarea, [contenteditable="true"]') as HTMLTextAreaElement | null;
    if (box && 'value' in box) {
      box.value = prompt;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toast.success('Region prompt pasted');
    setSheet(false);
  };

  return (
    <>
      <canvas ref={hoverCanvas} className="pointer-events-none fixed z-[80] mix-blend-screen" style={{ left: 0, top: 0 }} />
      <Drawer.Root open={sheet} onOpenChange={setSheet}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/50" />
          <Drawer.Content data-arx-region-ui className="fixed inset-x-0 bottom-0 z-[91] rounded-t-2xl border border-cyan-400/30 bg-zinc-950 p-4">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700" />
            <Drawer.Title className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">Edit highlighted region only</Drawer.Title>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change in this patch only" rows={3} className="mt-3 w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 px-3 py-2 outline-none" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setSheet(false)} className="flex-1 min-h-[44px] rounded-xl border border-zinc-700 text-[10px] uppercase tracking-widest text-zinc-400">Cancel</button>
              <button type="button" onClick={applyPrompt} className="flex-1 min-h-[44px] rounded-xl bg-cyan-400 text-zinc-950 text-[10px] font-semibold uppercase tracking-widest">Paste region prompt</button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

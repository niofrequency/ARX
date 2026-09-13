import React, { useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';

function findLightboxImg(): HTMLImageElement | null {
  const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
  const visible = imgs.filter((img) => {
    if (img.closest('[data-arx-lib]')) return false;
    const r = img.getBoundingClientRect();
    const onScreen = r.width > 200 && r.height > 200 && r.bottom > 80 && r.top < window.innerHeight - 80;
    return onScreen;
  });
  visible.sort((a, b) => {
    const aa = a.getBoundingClientRect();
    const bb = b.getBoundingClientRect();
    return bb.width * bb.height - aa.width * aa.height;
  });
  return visible[0] || null;
}

function paintBrush(canvas: HTMLCanvasElement, nx: number, ny: number, radius = 0.1) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const x = nx * canvas.width;
  const y = ny * canvas.height;
  const r = Math.max(canvas.width, canvas.height) * radius;
  const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
  g.addColorStop(0, 'rgba(0,242,255,0.6)');
  g.addColorStop(1, 'rgba(0,242,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.strokeStyle = '#00F2FF';
  ctx.lineWidth = 3;
  ctx.ellipse(x, y, r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export default function RegionEditRoot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasLightbox, setHasLightbox] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const last = useRef({ nx: 0.5, ny: 0.5 });

  useEffect(() => {
    const tick = () => setHasLightbox(!!findLightboxImg());
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hasLightbox) return;
    const onMove = (e: PointerEvent) => {
      const img = findLightboxImg();
      const canvas = canvasRef.current;
      if (!img || !canvas) return;
      const rect = img.getBoundingClientRect();
      canvas.style.position = 'fixed';
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.style.zIndex = '9999';
      canvas.width = Math.max(1, Math.round(rect.width));
      canvas.height = Math.max(1, Math.round(rect.height));
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx < 0 || ny < 0 || nx > 1 || ny > 1) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      last.current = { nx, ny };
      paintBrush(canvas, nx, ny);
    };
    const onClick = (e: PointerEvent) => {
      if (sheet) return;
      const img = findLightboxImg();
      if (!img) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      const rect = img.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) return;
      setSheet(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [hasLightbox, sheet]);

  const applyPrompt = () => {
    if (!note.trim()) return;
    const { nx, ny } = last.current;
    const prompt = `Only edit the highlighted region around the selected spot (normalized ${nx.toFixed(2)}, ${ny.toFixed(2)}). Do not change anything outside that patch. ${note.trim()}`;
    const box = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (box) {
      box.value = prompt;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toast.success('Region prompt pasted');
    setSheet(false);
  };

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none fixed" style={{ zIndex: 9999 }} />
      {hasLightbox && (
        <div data-arx-region-ui className="fixed z-[10000] left-1/2 -translate-x-1/2 top-3 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-cyan-400/50 text-[10px] uppercase tracking-widest text-cyan-300">
          Hover a spot · click to edit that patch
        </div>
      )}
      <Drawer.Root open={sheet} onOpenChange={setSheet}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[10001] bg-black/50" />
          <Drawer.Content data-arx-region-ui className="fixed inset-x-0 bottom-0 z-[10002] rounded-t-2xl border border-cyan-400/30 bg-zinc-950 p-4">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700" />
            <Drawer.Title className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">Edit this patch only</Drawer.Title>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change in the highlighted area" rows={3} className="mt-3 w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 px-3 py-2 outline-none" />
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

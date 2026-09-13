import React, { useEffect, useRef, useState } from 'react';

function findLightboxImg(): HTMLImageElement | null {
  const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
  const visible = imgs.filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width > 220 && r.height > 220 && r.top >= 0 && r.bottom <= window.innerHeight + 40;
  });
  visible.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height);
  return visible[0] || null;
}

function paintBrush(canvas: HTMLCanvasElement, nx: number, ny: number, radius = 0.12) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const x = nx * canvas.width;
  const y = ny * canvas.height;
  const r = Math.max(canvas.width, canvas.height) * radius;
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, 'rgba(0,242,255,0.55)');
  g.addColorStop(1, 'rgba(0,242,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0,242,255,0.95)';
  ctx.lineWidth = 3;
  ctx.ellipse(x, y, r * 0.72, r * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export default function RegionEditRoot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [hasLightbox, setHasLightbox] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const last = useRef({ nx: 0.5, ny: 0.5 });

  useEffect(() => {
    const tick = () => setHasLightbox(!!findLightboxImg());
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const onMove = (e: PointerEvent) => {
      const img = findLightboxImg();
      const canvas = canvasRef.current;
      if (!img || !canvas) return;
      const rect = img.getBoundingClientRect();
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
      last.current = { nx, ny };
      paintBrush(canvas, nx, ny);
    };
    const onClick = (e: PointerEvent) => {
      const img = findLightboxImg();
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      e.preventDefault();
      e.stopPropagation();
      setSheet(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick, { capture: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick, true);
    };
  }, [armed]);

  const paste = () => {
    const { nx, ny } = last.current;
    const prompt = `Only edit the highlighted region around the selected spot (normalized ${nx.toFixed(2)}, ${ny.toFixed(2)}). Do not change anything outside that patch. ${note.trim()}`;
    const box = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (box) {
      box.value = prompt;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setSheet(false);
    setArmed(false);
  };

  if (!hasLightbox && !armed && !sheet) return null;

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none fixed z-[80]" />
      {hasLightbox && (
        <button
          type="button"
          data-arx-region-ui
          onClick={() => setArmed((v) => !v)}
          className={`fixed z-[95] left-1/2 -translate-x-1/2 bottom-6 min-h-[44px] px-4 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${
            armed ? 'bg-cyan-400 text-zinc-950 border-cyan-300' : 'bg-zinc-950/90 text-cyan-300 border-cyan-400/40'
          }`}
        >
          {armed ? 'Region edit on — tap the spot' : 'Region edit'}
        </button>
      )}
      {sheet && (
        <div data-arx-region-ui className="fixed inset-x-0 bottom-0 z-[96] p-3">
          <div className="mx-auto max-w-lg rounded-2xl border border-cyan-400/30 bg-zinc-950 p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">Edit this patch only</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change in the highlighted area" rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm px-3 py-2 outline-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setSheet(false)} className="flex-1 min-h-[44px] rounded-xl border border-zinc-700 text-[10px] uppercase tracking-widest text-zinc-400">Cancel</button>
              <button type="button" onClick={paste} className="flex-1 min-h-[44px] rounded-xl bg-cyan-400 text-zinc-950 text-[10px] font-semibold uppercase tracking-widest">Paste region prompt</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

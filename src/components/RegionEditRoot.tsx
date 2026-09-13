import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const GREEN = '#22c55e';

function findPreviewImg(): HTMLImageElement | null {
  const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
  const visible = imgs.filter((img) => {
    if (img.closest('[data-arx-lib]')) return false;
    if (img.closest('[data-arx-region-ui]')) return false;
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

function paintGreen(canvas: HTMLCanvasElement, nx: number, ny: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const x = nx * canvas.width;
  const y = ny * canvas.height;
  const r = Math.max(canvas.width, canvas.height) * 0.08;
  ctx.beginPath();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.ellipse(x, y, r * 0.85, r * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(34,197,94,0.18)';
  ctx.ellipse(x, y, r * 0.85, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
}

export default function RegionEditRoot() {
  const hoverRef = useRef<HTMLCanvasElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const [src, setSrc] = useState('');
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [portrait, setPortrait] = useState(true);
  const last = useRef({ nx: 0.5, ny: 0.5 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (open) return;
      const img = findPreviewImg();
      const canvas = hoverRef.current;
      if (!img || !canvas) return;
      const rect = img.getBoundingClientRect();
      canvas.style.left = `${rect.left}px`;
      canvas.style.top = `${rect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.max(1, Math.round(rect.width));
      canvas.height = Math.max(1, Math.round(rect.height));
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx < 0 || ny < 0 || nx > 1 || ny > 1) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      last.current = { nx, ny };
      paintGreen(canvas, nx, ny);
    };
    const onClick = (e: PointerEvent) => {
      if (open) return;
      if ((e.target as HTMLElement).closest('[data-arx-region-ui]')) return;
      const img = findPreviewImg();
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) return;
      const w = img.naturalWidth || rect.width;
      const h = img.naturalHeight || rect.height;
      setPortrait(h >= w);
      setSrc(img.currentSrc || img.src);
      setOpen(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [open]);

  const onWorkMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = e.currentTarget.querySelector('img');
    const canvas = workRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
    last.current = { nx, ny };
    paintGreen(canvas, nx, ny);
  };

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
    setOpen(false);
  };

  const editor = (
    <div className="flex flex-col gap-3 p-4 min-h-[220px]" data-arx-region-ui>
      <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Edit highlighted patch only</p>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to change in this spot" rows={4} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 px-3 py-2 outline-none" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 min-h-[44px] rounded-xl border border-zinc-700 text-[10px] uppercase tracking-widest text-zinc-400">Close</button>
        <button type="button" onClick={applyPrompt} className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-widest">Paste region prompt</button>
      </div>
    </div>
  );

  return (
    <>
      <canvas ref={hoverRef} className="pointer-events-none fixed z-[80]" />
      {open && (
        <div data-arx-region-ui className="fixed inset-0 z-[10050] bg-black/85 flex items-stretch">
          <div className={`flex w-full h-full ${portrait ? 'flex-row' : 'flex-col'}`}>
            <div className={`relative bg-black flex items-center justify-center ${portrait ? 'flex-1 min-w-0' : 'flex-[1.4] min-h-0'}`} onPointerMove={onWorkMove}>
              {src && <img src={src} alt="" className="max-h-full max-w-full object-contain" />}
              <canvas ref={workRef} className="pointer-events-none absolute inset-0" />
            </div>
            <div className={`${portrait ? 'w-[360px] max-w-[42vw] border-l' : 'w-full border-t'} border-zinc-800 bg-zinc-950 overflow-y-auto`}>
              {editor}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { toast } from 'sonner';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <Command className="w-full max-w-lg rounded-2xl border border-cyan-400/30 bg-zinc-950 text-zinc-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Command.Input placeholder="Jump to…" className="w-full bg-transparent px-4 py-3 text-sm outline-none border-b border-zinc-800" />
        <Command.List className="max-h-72 overflow-y-auto p-2 text-sm">
          <Command.Item className="px-3 py-2 rounded-lg data-[selected=true]:bg-cyan-400/15 cursor-pointer" onSelect={() => { document.querySelector('textarea')?.scrollIntoView({ behavior: 'smooth' }); setOpen(false); toast('Prompt box'); }}>Prompt box</Command.Item>
          <Command.Item className="px-3 py-2 rounded-lg data-[selected=true]:bg-cyan-400/15 cursor-pointer" onSelect={() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); setOpen(false); toast('Gallery'); }}>Gallery</Command.Item>
        </Command.List>
      </Command>
    </div>
  );
}

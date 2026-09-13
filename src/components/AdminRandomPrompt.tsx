import React, { useState } from 'react';
import { Dices, Copy, Check } from 'lucide-react';
import {
  CHARACTERS,
  SHOTS,
  assembleAdminPrompt,
  pickRandomCharacter,
  type ShotType,
  type TitSize,
  type FaceMess,
  type CharacterDef,
} from '../lib/adminPromptBuilder';

interface Props {
  onApply: (prompt: string) => void;
}

const pill = (active: boolean) =>
  `px-2.5 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-widest border transition-all ${
    active
      ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-100'
  }`;

export default function AdminRandomPrompt({ onApply }: Props) {
  const [open, setOpen] = useState(true);
  const [shot, setShot] = useState<ShotType>('closeup');
  const [titSize, setTitSize] = useState<TitSize>('big');
  const [thickCellulite, setThickCellulite] = useState(true);
  const [plumpStomach, setPlumpStomach] = useState(true);
  const [hairyPussy, setHairyPussy] = useState(false);
  const [faceMess, setFaceMess] = useState<FaceMess>('bukkake_drool');
  const [pussyCumPuddle, setPussyCumPuddle] = useState(true);
  const [lockCharacter, setLockCharacter] = useState(false);
  const [character, setCharacter] = useState<CharacterDef>(CHARACTERS[6]);
  const [last, setLast] = useState<ReturnType<typeof assembleAdminPrompt> | null>(null);
  const [copied, setCopied] = useState(false);

  const roll = () => {
    const nextChar = lockCharacter ? character : pickRandomCharacter(character?.id);
    setCharacter(nextChar);
    const built = assembleAdminPrompt({
      character: nextChar,
      shot,
      titSize,
      thickCellulite,
      plumpStomach,
      hairyPussy,
      faceMess,
      pussyCumPuddle,
    });
    setLast(built);
    onApply(built.prompt);
  };

  const copyOut = async () => {
    if (!last) return;
    await navigator.clipboard.writeText(last.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-3 bg-emerald-500/5 p-4 border border-emerald-500/20 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
          Admin · Random scene
        </span>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Shot</p>
            <div className="flex flex-wrap gap-2">
              {SHOTS.map((s) => (
                <button key={s.id} type="button" onClick={() => setShot(s.id)} className={pill(shot === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Tits</p>
            <div className="flex flex-wrap gap-2">
              {(['small', 'medium', 'big', 'huge'] as TitSize[]).map((t) => (
                <button key={t} type="button" onClick={() => setTitSize(t)} className={pill(titSize === t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Body</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setThickCellulite((v) => !v)} className={pill(thickCellulite)}>
                Cellulite thighs
              </button>
              <button type="button" onClick={() => setPlumpStomach((v) => !v)} className={pill(plumpStomach)}>
                Plump stomach
              </button>
              <button type="button" onClick={() => setHairyPussy((v) => !v)} className={pill(hairyPussy)}>
                Hairy pussy
              </button>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Face mess</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFaceMess('clean')} className={pill(faceMess === 'clean')}>
                Clean
              </button>
              <button type="button" onClick={() => setFaceMess('drool')} className={pill(faceMess === 'drool')}>
                Drool only
              </button>
              <button type="button" onClick={() => setFaceMess('bukkake')} className={pill(faceMess === 'bukkake')}>
                Bukkake
              </button>
              <button type="button" onClick={() => setFaceMess('bukkake_drool')} className={pill(faceMess === 'bukkake_drool')}>
                Bukkake + drool
              </button>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Pussy / floor</p>
            <button type="button" onClick={() => setPussyCumPuddle((v) => !v)} className={pill(pussyCumPuddle)}>
              Cum + puddle
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Character</p>
              <button type="button" onClick={() => setLockCharacter((v) => !v)} className={pill(lockCharacter)}>
                {lockCharacter ? 'Locked' : 'Random each roll'}
              </button>
            </div>
            <select
              value={character.id}
              onChange={(e) => {
                const found = CHARACTERS.find((c) => c.id === e.target.value);
                if (found) setCharacter(found);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none"
            >
              {CHARACTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={roll}
            className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-400"
          >
            <Dices className="w-3.5 h-3.5" />
            Generate random prompt
          </button>

          {last && (
            <div className="space-y-2 text-[11px] leading-relaxed">
              <p className="text-emerald-300 font-mono uppercase tracking-widest text-[9px]">{last.summary}</p>
              <p className="text-zinc-300">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Image 1 · </span>
                {last.image1}
              </p>
              <p className="text-zinc-300">
                <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Image 2 · </span>
                {last.image2}
              </p>
              <button
                type="button"
                onClick={copyOut}
                className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy prompt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

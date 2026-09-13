import React, { useEffect, useState } from 'react';
import { Dices, Copy, Check } from 'lucide-react';
import {
  CHARACTERS, POSES, POSE_FAMILIES, assembleAdminPrompt, pickRandomCharacter, pickRandomPose,
  type ShotType, type AngleType, type TitSize, type FaceMess, type CharacterDef, type PoseDef, type PoseFamily,
} from '../lib/adminPromptBuilder';
import { expandCustomCharacter, expandCustomPose } from '../lib/grok';
import { getFreshIdToken } from '../lib/firebase';
import { deletePoseRef, listPoseRefFamilies, loadPoseRef, savePoseRef } from '../lib/poseRefStore';

interface Props {
  onApply: (prompt: string) => void;
  onApplyImage2?: (file: File) => void;
  currentImage2?: File | null;
}

const pill = (active: boolean) =>
  `px-2.5 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-widest border transition-all ${
    active ? 'bg-zinc-100 border-zinc-100 text-zinc-950' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-100'
  }`;

export default function AdminRandomPrompt({ onApply, onApplyImage2, currentImage2 }: Props) {
  const [open, setOpen] = useState(true);
  const [shot, setShot] = useState<ShotType>('closeup');
  const [angle, setAngle] = useState<AngleType>('low');
  const [titSize, setTitSize] = useState<TitSize>('big');
  const [thickCellulite, setThickCellulite] = useState(true);
  const [plumpStomach, setPlumpStomach] = useState(true);
  const [hairyPussy, setHairyPussy] = useState(false);
  const [faceMess, setFaceMess] = useState<FaceMess>('face_only');
  const [pussyCumPuddle, setPussyCumPuddle] = useState(true);
  const [lockCharacter, setLockCharacter] = useState(true);
  const [lockPose, setLockPose] = useState(true);
  const [useCustom, setUseCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customHair, setCustomHair] = useState('');
  const [customCostume, setCustomCostume] = useState('');
  const [character, setCharacter] = useState<CharacterDef>(CHARACTERS[6]);
  const [pose, setPose] = useState<PoseDef>(POSES[0]);
  const [family, setFamily] = useState<PoseFamily>('front');
  const [customPose, setCustomPose] = useState('');
  const [boundFamilies, setBoundFamilies] = useState<PoseFamily[]>([]);
  const [refNote, setRefNote] = useState('');
  const [last, setLast] = useState<ReturnType<typeof assembleAdminPrompt> | null>(null);
  const [copied, setCopied] = useState(false);
  const [filling, setFilling] = useState<'char' | 'pose' | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const familyPoses = POSES.filter((p) => p.family === family);
  const refreshBounds = async () => { try { setBoundFamilies(await listPoseRefFamilies()); } catch { /* ignore */ } };
  useEffect(() => { refreshBounds(); }, []);

  const applyFamilyRef = async (nextFamily: PoseFamily) => {
    if (!onApplyImage2) return;
    const file = await loadPoseRef(nextFamily);
    if (file) { onApplyImage2(file); setRefNote(`Image 2 → ${nextFamily} ref`); }
    else setRefNote(`No saved ${nextFamily} ref yet`);
  };
  const selectPose = async (next: PoseDef) => { setPose(next); setFamily(next.family); setLockPose(true); await applyFamilyRef(next.family); };
  const selectFamily = async (id: PoseFamily) => {
    setFamily(id);
    const first = POSES.find((p) => p.family === id);
    if (first) { setPose(first); setLockPose(true); }
    await applyFamilyRef(id);
  };
  const saveCurrentAsFamily = async () => {
    if (!currentImage2) { setRefNote('Put a photo in Reference 2 first, then save it.'); return; }
    await savePoseRef(family, currentImage2); await refreshBounds(); setRefNote(`Saved current Reference 2 as ${family}`);
  };
  const uploadFamilyRef = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    await savePoseRef(family, file); await refreshBounds(); onApplyImage2?.(file); setRefNote(`Saved and loaded ${family} ref`);
  };
  const clearFamilyRef = async () => { await deletePoseRef(family); await refreshBounds(); setRefNote(`Cleared ${family} ref`); };

  const fillChar = async () => {
    if (!customName.trim()) { setFillError('Type a character name first.'); return; }
    setFilling('char'); setFillError(null);
    try {
      const token = await getFreshIdToken();
      const expanded = await expandCustomCharacter(token, customName, customHair, customCostume);
      setCustomName(expanded.name); setCustomHair(expanded.hair); setCustomCostume(expanded.costume);
    } catch (err: any) { setFillError(err.message || 'Grok fill failed.'); }
    finally { setFilling(null); }
  };
  const fillPose = async () => {
    if (!customPose.trim()) { setFillError('Type a pose first.'); return; }
    setFilling('pose'); setFillError(null);
    try { const token = await getFreshIdToken(); setCustomPose(await expandCustomPose(token, customPose)); }
    catch (err: any) { setFillError(err.message || 'Grok pose fill failed.'); }
    finally { setFilling(null); }
  };
  const roll = async () => {
    const nextChar = useCustom
      ? { id: 'custom', name: customName.trim() || 'custom character', hair: customHair.trim() || 'keep her hair from image 1', costume: customCostume.trim() || 'accurate tight character clothing, wrecked and half-on' }
      : lockCharacter ? character : pickRandomCharacter(character?.id);
    if (!useCustom) setCharacter(nextChar);
    const nextPose = lockPose ? pose : pickRandomPose(pose.id);
    if (!lockPose) { setPose(nextPose); setFamily(nextPose.family); await applyFamilyRef(nextPose.family); }
    const built = assembleAdminPrompt({ character: nextChar, poseId: nextPose.id, customPose, shot, angle, titSize, thickCellulite, plumpStomach, hairyPussy, faceMess, pussyCumPuddle });
    setLast(built); onApply(built.prompt);
  };

  return (
    <div className="space-y-3 bg-emerald-500/5 p-4 border border-emerald-500/20 rounded-2xl">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Admin · Scene</span>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Pose family</p>
              <button type="button" onClick={() => setLockPose((v) => !v)} className={pill(lockPose)}>{lockPose ? 'Pose locked' : 'Random pose'}</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {POSE_FAMILIES.map((f) => (
                <button key={f.id} type="button" onClick={() => selectFamily(f.id)} className={pill(family === f.id)}>{f.label}{boundFamilies.includes(f.id) ? ' ●' : ''}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {familyPoses.map((p) => (
                <button key={p.id} type="button" onClick={() => selectPose(p)} className={pill(pose.id === p.id)}>{p.label}</button>
              ))}
            </div>
            {pose.id === 'custom' && (
              <div className="space-y-2 mt-2">
                <textarea value={customPose} onChange={(e) => setCustomPose(e.target.value)} placeholder="Custom pose" rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none" />
                <button type="button" onClick={fillPose} className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">{filling === 'pose' ? 'Grok…' : 'Expand pose with Grok'}</button>
              </div>
            )}
            <div className="mt-3 space-y-2 rounded-xl border border-zinc-800 p-3">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Image 2 for {family}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveCurrentAsFamily} className={pill(false)}>Save current Ref 2</button>
                <label className={`${pill(false)} cursor-pointer`}>Upload family ref<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFamilyRef(f); e.target.value = ''; }} /></label>
                <button type="button" onClick={clearFamilyRef} className={pill(false)}>Clear</button>
              </div>
              {refNote && <p className="text-[10px] text-emerald-400">{refNote}</p>}
              <p className="text-[10px] text-zinc-500">Dot on a family means a photo is saved. Clicking a pose loads that photo into Reference 2.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Shot</p>
              <div className="flex flex-wrap gap-2">{(['closeup', 'medium', 'far'] as ShotType[]).map((s) => (<button key={s} type="button" onClick={() => setShot(s)} className={pill(shot === s)}>{s}</button>))}</div>
            </div>
            <div>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Angle</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setAngle('low')} className={pill(angle === 'low')}>Low</button>
                <button type="button" onClick={() => setAngle('eye')} className={pill(angle === 'eye')}>Eye</button>
                <button type="button" onClick={() => setAngle('high')} className={pill(angle === 'high')}>High</button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Body / mess</p>
            <div className="flex flex-wrap gap-2">
              {(['small', 'medium', 'big', 'huge'] as TitSize[]).map((t) => (<button key={t} type="button" onClick={() => setTitSize(t)} className={pill(titSize === t)}>{t} tits</button>))}
              <button type="button" onClick={() => setThickCellulite((v) => !v)} className={pill(thickCellulite)}>Cellulite</button>
              <button type="button" onClick={() => setPlumpStomach((v) => !v)} className={pill(plumpStomach)}>Plump</button>
              <button type="button" onClick={() => setHairyPussy((v) => !v)} className={pill(hairyPussy)}>Hairy</button>
              <button type="button" onClick={() => setFaceMess('clean')} className={pill(faceMess === 'clean')}>Clean face</button>
              <button type="button" onClick={() => setFaceMess('drool')} className={pill(faceMess === 'drool')}>Drool</button>
              <button type="button" onClick={() => setFaceMess('face_only')} className={pill(faceMess === 'face_only')}>Face only</button>
              <button type="button" onClick={() => setFaceMess('bukkake')} className={pill(faceMess === 'bukkake')}>Bukkake</button>
              <button type="button" onClick={() => setFaceMess('bukkake_drool')} className={pill(faceMess === 'bukkake_drool')}>Bukkake+drool</button>
              <button type="button" onClick={() => setPussyCumPuddle((v) => !v)} className={pill(pussyCumPuddle)}>Puddle</button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Character</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setUseCustom((v) => !v)} className={pill(useCustom)}>{useCustom ? 'Custom on' : 'Custom'}</button>
                {!useCustom && <button type="button" onClick={() => setLockCharacter((v) => !v)} className={pill(lockCharacter)}>{lockCharacter ? 'Locked' : 'Random each roll'}</button>}
              </div>
            </div>
            {useCustom ? (
              <div className="space-y-2">
                <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Character name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none" />
                <input value={customHair} onChange={(e) => setCustomHair(e.target.value)} placeholder="Hair" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none" />
                <textarea value={customCostume} onChange={(e) => setCustomCostume(e.target.value)} placeholder="Costume" rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none" />
                <button type="button" onClick={fillChar} className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">{filling === 'char' ? 'Grok…' : 'Fill with Grok'}</button>
              </div>
            ) : (
              <select value={character.id} onChange={(e) => { const found = CHARACTERS.find((c) => c.id === e.target.value); if (found) { setCharacter(found); setLockCharacter(true); } }} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none">
                {CHARACTERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          {fillError && <p className="text-[10px] text-rose-400">{fillError}</p>}
          <button type="button" onClick={roll} className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-400">
            <Dices className="w-3.5 h-3.5" /> Generate and paste prompt
          </button>
          {last && (
            <div className="space-y-2 text-[11px] leading-relaxed">
              <p className="text-emerald-300 font-mono uppercase tracking-widest text-[9px]">{last.summary}</p>
              <p className="text-zinc-300"><span className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Image 1 · </span>{last.image1}</p>
              <p className="text-zinc-300"><span className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono">Image 2 · </span>{last.image2}</p>
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(last.prompt); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="text-[9px] flex items-center gap-1.5 text-zinc-400 uppercase tracking-widest font-mono">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy prompt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

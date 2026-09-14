import React, { useEffect, useRef, useState } from 'react';
import { Dices, Loader2 } from 'lucide-react';
import {
  CHARACTERS, POSES, POSE_FAMILIES, assembleAdminPrompt, pickRandomCharacter, pickRandomPose,
  type ShotType, type AngleType, type TitSize, type FaceMess, type CharacterDef, type PoseDef, type PoseFamily,
} from '../lib/adminPromptBuilder';
import { expandCustomCharacter, expandCustomPose } from '../lib/grok';
import { getFreshIdToken } from '../lib/firebase';
import { setCanvasRefsHidden, setReference1File, setReference2File } from '../lib/setRef2';
import { detectPoseFromFile, type PoseGuess } from '../lib/poseDetect';
import { filterLibrary, formatBytes, prepareRefImage } from '../lib/prepareRefImage';
import {
  deleteLibraryRef, ensureNameLower, fetchLibraryPage, listPoseRefFamilies, loadLibraryFile, loadPoseRef,
  renameLibraryRef, saveLibraryRef, savePoseRef, searchLibraryByName, type LibraryRefMeta,
} from '../lib/poseRefStore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

const POSE_NAMES: Record<string, string> = {
  unknown: 'Unnamed pose', face_closeup: 'Face close-up', facial_closeup: 'Facial close-up', ahegao: 'Ahegao',
  doggy: 'Doggystyle', ass: 'Ass shot', front_spread: 'Legs spread', front_body: 'Front body', front_pussy: 'Front pussy',
  kneeling_chest: 'Kneeling / chest', kneeling_bj: 'Kneeling face', standing: 'Standing', spread: 'On back, spread',
  missionary: 'Missionary', cowgirl: 'Cowgirl', reverse_cowgirl: 'Reverse cowgirl', titjob: 'Titjob', bent_over: 'Bent over',
};
function prettyPoseName(label?: string, fallback?: string) {
  if (fallback && fallback.trim() && fallback !== 'unknown') return fallback.trim();
  if (!label || label === 'unknown') return '';
  return POSE_NAMES[label] || label.replace(/_/g, ' ');
}
interface Props { onApply: (prompt: string) => void; onApplyImage1?: (file: File) => void; onApplyImage2?: (file: File) => void; currentImage2?: File | null; }
const pill = (active: boolean) =>
  `px-3 py-2 rounded-lg text-[10px] font-medium uppercase tracking-widest border min-h-[44px] ${
    active ? 'bg-zinc-100 border-zinc-100 text-zinc-950' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
  }`;

export default function AdminRandomPrompt({ onApply, onApplyImage1, onApplyImage2 }: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'scene' | 'library'>('library');
  const [hideRefs, setHideRefs] = useState(false);
  const [faceName, setFaceName] = useState('');
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
  // Library grid — paginated (see fetchLibraryPage in poseRefStore.ts)
  // rather than fetching every saved face/pose at once, which got slower
  // and heavier to render the larger someone's library grew. `library`
  // holds everything loaded SO FAR (both faces and poses are split back
  // out of this one accumulated list below), grown a page at a time by
  // scrolling or the "Load more" button.
  const [library, setLibrary] = useState<(LibraryRefMeta & { previewUrl?: string })[]>([]);
  const [libraryCursor, setLibraryCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreLibrary, setHasMoreLibrary] = useState(true);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const libraryEndRef = useRef<HTMLDivElement>(null);
  const [guess, setGuess] = useState<PoseGuess | null>(null);
  const [refNote, setRefNote] = useState('');
  const [poseName, setPoseName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [last, setLast] = useState<ReturnType<typeof assembleAdminPrompt> | null>(null);
  const [filling, setFilling] = useState<'char' | 'pose' | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [libQuery, setLibQuery] = useState('');
  const familyPoses = POSES.filter((p) => p.family === family);
  const faces = filterLibrary(library.filter((item) => (item.slot || 'pose') === 'face'), libQuery);
  const poses = filterLibrary(library.filter((item) => (item.slot || 'pose') !== 'face'), libQuery);
  const setImage2 = (file: File) => { onApplyImage2?.(file); setReference2File(file); };
  const setImage1 = (file: File) => { onApplyImage1?.(file); setReference1File(file); };

  // Merges a batch of items into `library` by id (later entries win),
  // shared by pagination and server-side search below so a name that's
  // already loaded doesn't show up twice once search also finds it.
  const mergeIntoLibrary = (incoming: (LibraryRefMeta & { previewUrl?: string })[]) => {
    setLibrary((prev) => {
      const merged = [...prev, ...incoming];
      return Array.from(new Map(merged.map((item) => [item.id, item])).values());
    });
  };
  // Self-healing backfill for legacy docs saved before nameLower existed
  // (see ensureNameLower's doc comment) — fire-and-forget, never blocks
  // rendering.
  const backfillMissingNames = (items: LibraryRefMeta[]) => {
    items.forEach((item) => { if (!item.nameLower) ensureNameLower(item); });
  };

  const loadInitialLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      await listPoseRefFamilies().catch(() => {}); // unrelated per-family lookups — a failure here shouldn't block the library grid
      const { items, lastDoc, hasMore } = await fetchLibraryPage(null);
      setLibrary(items);
      setLibraryCursor(lastDoc);
      setHasMoreLibrary(hasMore);
      backfillMissingNames(items);
    } catch (err: any) {
      setRefNote(err.message || 'Could not load library. Sign in first.');
    } finally {
      setIsLoadingLibrary(false);
    }
  };
  const loadMoreLibrary = async () => {
    if (isLoadingLibrary || !hasMoreLibrary) return;
    setIsLoadingLibrary(true);
    try {
      const { items, lastDoc, hasMore } = await fetchLibraryPage(libraryCursor);
      mergeIntoLibrary(items);
      setLibraryCursor(lastDoc);
      setHasMoreLibrary(hasMore);
      backfillMissingNames(items);
    } catch (err: any) {
      setRefNote(err.message || 'Could not load more of the library.');
    } finally {
      setIsLoadingLibrary(false);
    }
  };
  useEffect(() => { loadInitialLibrary(); }, []);
  useEffect(() => { setCanvasRefsHidden(hideRefs); }, [hideRefs]);

  // Infinite-scroll: auto-load the next library page once the sentinel at
  // the bottom of the grid scrolls into view — same pattern as the main
  // history gallery's loadMoreHistory/loadMoreSentinelRef in App.tsx.
  useEffect(() => {
    const el = libraryEndRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreLibrary();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreLibrary, isLoadingLibrary, libraryCursor]);

  // Server-side name search (debounced): the plain substring filter below
  // (faces/poses via filterLibrary) only ever sees what's already loaded
  // client-side. This reaches further back into a library that hasn't been
  // fully paginated in yet — a Firestore prefix (starts-with) query against
  // nameLower, so it's necessarily narrower than the substring-anywhere
  // local filter (see searchLibraryByName's doc comment for why: no paid
  // full-text index service, so prefix match is the free ceiling here).
  // Purely additive — results merge into the same `library` list pagination
  // already fills, so nothing about the existing local filtering changes.
  useEffect(() => {
    const q = libQuery.trim();
    if (!q) return;
    const timer = setTimeout(async () => {
      setIsSearchingServer(true);
      try {
        const results = await searchLibraryByName(q);
        mergeIntoLibrary(results);
        backfillMissingNames(results);
      } catch {
        // Best-effort — the local substring filter over already-loaded
        // items still works even if this fails (offline, signed out, ...).
      } finally {
        setIsSearchingServer(false);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libQuery]);

  const applyFamilyRef = async (nextFamily: PoseFamily) => {
    const fromLib = poses.find((item) => item.family === nextFamily);
    if (fromLib) {
      const file = await loadLibraryFile(fromLib as LibraryRefMeta);
      if (file) { setImage2(file); setRefNote(`Image 2 → ${fromLib.name}`); return; }
    }
    const file = await loadPoseRef(nextFamily);
    if (file) setImage2(file);
  };
  const selectPose = async (next: PoseDef) => { setPose(next); setFamily(next.family); setLockPose(true); await applyFamilyRef(next.family); };
  const selectFamily = async (id: PoseFamily) => {
    setFamily(id);
    const first = POSES.find((p) => p.family === id);
    if (first) { setPose(first); setLockPose(true); }
    await applyFamilyRef(id);
  };
  const runDetect = async (file: File) => {
    try {
      const next = await detectPoseFromFile(file);
      setGuess(next); setFamily(next.family);
      const pretty = prettyPoseName(next.label);
      if (pretty) setPoseName((c) => c.trim() ? c : pretty);
      return next;
    } catch (err: any) { setRefNote(err.message || 'Detect failed'); return null; }
  };
  const saveToLibrary = async (file: File, detected?: PoseGuess | null) => {
    const tagged = detected || guess || { family, label: pose.id, confidence: 0, reason: 'manual' };
    const name = poseName.trim() || prettyPoseName(tagged.label) || `Pose ${poses.length + 1}`;
    const meta = await saveLibraryRef({ name, slot: 'pose', family: tagged.family, detectedLabel: tagged.label === 'unknown' ? name : tagged.label, type: file.type || 'image/jpeg', blob: file });
    await savePoseRef(tagged.family, file);
    // Newest first, so it belongs at the front of the already-loaded list —
    // no need to re-fetch the whole (possibly large, paginated) library.
    setLibrary((prev) => [{ ...meta, previewUrl: meta.url || '' }, ...prev]);
    setPoseName(''); setRefNote(`Saved ${name}`);
  };
  const addFilesToLibrary = async (files: FileList | File[]) => {
    for (const raw of Array.from(files)) {
      if (!raw.type.startsWith('image/')) continue;
      const prepared = await prepareRefImage(raw);
      setImage2(prepared.file);
      await saveToLibrary(prepared.file, await runDetect(prepared.file));
      setRefNote((n) => `${n} · ${formatBytes(prepared.beforeBytes)} → ${formatBytes(prepared.afterBytes)}`);
    }
  };
  const saveFace = async (file: File) => {
    const name = faceName.trim() || `Face ${faces.length + 1}`;
    const meta = await saveLibraryRef({ name, slot: 'face', family: 'face', detectedLabel: 'face', type: file.type || 'image/jpeg', blob: file });
    setImage1(file);
    setLibrary((prev) => [{ ...meta, previewUrl: meta.url || '' }, ...prev]);
    setFaceName(''); setRefNote(`Saved face ${name}`);
  };
  const addFaces = async (files: FileList | File[]) => {
    for (const raw of Array.from(files)) {
      if (!raw.type.startsWith('image/')) continue;
      const prepared = await prepareRefImage(raw);
      await saveFace(prepared.file);
      setRefNote((n) => `${n} · ${formatBytes(prepared.beforeBytes)} → ${formatBytes(prepared.afterBytes)}`);
    }
  };
  const loadLibItem = async (item: LibraryRefMeta) => {
    setUsingId(item.id);
    try {
      const file = await loadLibraryFile(item);
      if (!file) throw new Error('Could not download that reference.');
      if ((item.slot || 'pose') === 'face') { setImage1(file); setRefNote(`Using ${item.name || 'face'} as Image 1`); }
      else { setImage2(file); setFamily(item.family); setRefNote(`Using ${item.name || 'pose'} as Image 2`); }
    } catch (err: any) {
      setRefNote(err.message || 'Could not use that image.');
    } finally { setUsingId(null); }
  };
  const commitRename = async (id: string) => {
    const next = editingName.trim(); setEditingId(null);
    if (!next) return;
    await renameLibraryRef(id, next);
    setLibrary((prev) => prev.map((item) => (item.id === id ? { ...item, name: next } : item)));
  };
  const fillChar = async () => {
    if (!customName.trim()) return;
    setFilling('char');
    try {
      const token = await getFreshIdToken();
      const expanded = await expandCustomCharacter(token, customName, customHair, customCostume);
      setCustomName(expanded.name); setCustomHair(expanded.hair); setCustomCostume(expanded.costume);
    } catch (err: any) { setFillError(err.message || 'Grok fill failed.'); }
    finally { setFilling(null); }
  };
  const fillPose = async () => {
    if (!customPose.trim()) return;
    setFilling('pose');
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
  const card = (item: LibraryRefMeta & { previewUrl?: string }, square?: boolean) => {
    const isFace = (item.slot || 'pose') === 'face';
    return (
      <div key={item.id} className={`rounded-xl border overflow-hidden ${usingId === item.id ? 'border-emerald-400' : 'border-zinc-800'}`}>
        <button type="button" onClick={() => loadLibItem(item)} className="block w-full relative min-h-[44px] touch-manipulation">
          {item.previewUrl ? <img src={item.previewUrl} alt={item.name} draggable={false} loading="lazy" className={`w-full ${square ? 'aspect-square' : 'aspect-[3/4]'} object-cover bg-zinc-950 pointer-events-none`} /> : <div className={`w-full ${square ? 'aspect-square' : 'aspect-[3/4]'} bg-zinc-950`} />}
          <span className="absolute bottom-2 left-2 right-2 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-widest">
            {usingId === item.id ? 'Loading…' : isFace ? 'Use as Image 1' : 'Use as Image 2'}
          </span>
        </button>
        <div className="p-2 space-y-1.5">
          {editingId === item.id ? (
            <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={() => commitRename(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(item.id); }} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-[11px] text-zinc-100 px-2 py-1 outline-none" />
          ) : (
            <button type="button" onClick={() => { setEditingId(item.id); setEditingName(item.name || 'Untitled'); }} className="w-full text-left text-[11px] text-zinc-100 truncate min-h-[32px]">{item.name || prettyPoseName(item.detectedLabel) || 'Untitled'}</button>
          )}
          <button type="button" onClick={() => deleteLibraryRef(item.id).then(() => setLibrary((prev) => prev.filter((x) => x.id !== item.id)))} className="text-[10px] text-zinc-500 min-h-[32px]">Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 bg-emerald-500/5 p-3 sm:p-4 border border-emerald-500/20 rounded-2xl">
      <div className="flex items-center justify-between gap-2 min-h-[44px]">
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Admin</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setHideRefs((v) => !v)} className={pill(hideRefs)}>{hideRefs ? 'Refs hidden' : 'Hide refs'}</button>
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{open ? 'Min' : 'Open'}</button>
        </div>
      </div>
      {open && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTab('library')} className={pill(tab === 'library')}>Library</button>
            <button type="button" onClick={() => setTab('scene')} className={pill(tab === 'scene')}>Scene</button>
          </div>
          {tab === 'library' && (
            <div className="space-y-4">
              <div className="relative">
                <input value={libQuery} onChange={(e) => setLibQuery(e.target.value)} placeholder="Search faces and poses" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 px-3 py-2.5 pr-9 outline-none" />
                {isSearchingServer && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>
              {libQuery.trim() && (
                <p className="text-[10px] text-zinc-500 -mt-2">Matches by exact substring in what's loaded ({library.length}), plus names starting with "{libQuery.trim()}" pulled in from the rest of your library.</p>
              )}
              <div className="space-y-3 rounded-xl border border-zinc-800 p-3">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Faces · Image 1</p>
                <input value={faceName} onChange={(e) => setFaceName(e.target.value)} placeholder="Name this face" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 px-3 py-2.5 outline-none" />
                <label className={`${pill(false)} cursor-pointer text-center block`}>Add faces<input type="file" accept="image/*" multiple data-arx-lib="true" className="hidden" onChange={(e) => { if (e.target.files?.length) addFaces(e.target.files); e.target.value = ''; }} /></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{faces.map((item) => card(item, true))}</div>
              </div>
              <div className="space-y-3 rounded-xl border border-zinc-800 p-3">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Poses · Image 2</p>
                <input value={poseName} onChange={(e) => setPoseName(e.target.value)} placeholder="Name this pose" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 px-3 py-2.5 outline-none" />
                <label className={`${pill(false)} cursor-pointer text-center block`}>Add poses<input type="file" accept="image/*" multiple data-arx-lib="true" className="hidden" onChange={(e) => { if (e.target.files?.length) addFilesToLibrary(e.target.files); e.target.value = ''; }} /></label>
                {guess && <p className="text-[10px] text-zinc-300">Guess: {prettyPoseName(guess.label) || guess.label}</p>}
                {refNote && <p className="text-[10px] text-emerald-400 break-words">{refNote}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{poses.map((item) => card(item))}</div>
              </div>
              {/* Pagination sentinel (auto-loads on scroll, same pattern as
                  the main history gallery) plus an explicit button for
                  anyone who'd rather click than scroll. */}
              <div ref={libraryEndRef} />
              {hasMoreLibrary && (
                <button
                  type="button"
                  onClick={loadMoreLibrary}
                  disabled={isLoadingLibrary}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-400 disabled:opacity-50"
                >
                  {isLoadingLibrary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isLoadingLibrary ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
          {tab === 'scene' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">{POSE_FAMILIES.map((f) => (<button key={f.id} type="button" onClick={() => selectFamily(f.id)} className={pill(family === f.id)}>{f.label}</button>))}</div>
              <div className="flex flex-wrap gap-2">{familyPoses.map((p) => (<button key={p.id} type="button" onClick={() => selectPose(p)} className={pill(pose.id === p.id)}>{p.label}</button>))}</div>
              {pose.id === 'custom' && (
                <div className="space-y-2">
                  <textarea value={customPose} onChange={(e) => setCustomPose(e.target.value)} placeholder="Custom pose" rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none" />
                  <button type="button" onClick={fillPose} className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">{filling === 'pose' ? 'Grok…' : 'Expand pose with Grok'}</button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">{(['closeup', 'medium', 'far'] as ShotType[]).map((s) => (<button key={s} type="button" onClick={() => setShot(s)} className={pill(shot === s)}>{s}</button>))}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setAngle('low')} className={pill(angle === 'low')}>Low</button>
                <button type="button" onClick={() => setAngle('eye')} className={pill(angle === 'eye')}>Eye</button>
                <button type="button" onClick={() => setAngle('high')} className={pill(angle === 'high')}>High</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['small', 'medium', 'big', 'huge'] as TitSize[]).map((t) => (<button key={t} type="button" onClick={() => setTitSize(t)} className={pill(titSize === t)}>{t}</button>))}
                <button type="button" onClick={() => setThickCellulite((v) => !v)} className={pill(thickCellulite)}>Cellulite</button>
                <button type="button" onClick={() => setPlumpStomach((v) => !v)} className={pill(plumpStomach)}>Plump</button>
                <button type="button" onClick={() => setHairyPussy((v) => !v)} className={pill(hairyPussy)}>Hairy</button>
                <button type="button" onClick={() => setFaceMess('clean')} className={pill(faceMess === 'clean')}>Clean</button>
                <button type="button" onClick={() => setFaceMess('drool')} className={pill(faceMess === 'drool')}>Drool</button>
                <button type="button" onClick={() => setFaceMess('face_only')} className={pill(faceMess === 'face_only')}>Face only</button>
                <button type="button" onClick={() => setFaceMess('bukkake')} className={pill(faceMess === 'bukkake')}>Bukkake</button>
                <button type="button" onClick={() => setPussyCumPuddle((v) => !v)} className={pill(pussyCumPuddle)}>Puddle</button>
              </div>
              {useCustom ? (
                <div className="space-y-2">
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Character name" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none" />
                  <button type="button" onClick={fillChar} className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">{filling === 'char' ? 'Grok…' : 'Fill with Grok'}</button>
                </div>
              ) : (
                <select value={character.id} onChange={(e) => { const found = CHARACTERS.find((c) => c.id === e.target.value); if (found) { setCharacter(found); setLockCharacter(true); } }} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 px-3 py-2 outline-none">
                  {CHARACTERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <button type="button" onClick={() => setUseCustom((v) => !v)} className={pill(useCustom)}>Custom character</button>
            </div>
          )}
          {fillError && <p className="text-[10px] text-rose-400">{fillError}</p>}
          <button type="button" onClick={roll} className="w-full py-3.5 rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-2 min-h-[48px]">
            <Dices className="w-3.5 h-3.5" /> Generate and paste prompt
          </button>
          {last && <p className="text-emerald-300 font-mono uppercase tracking-widest text-[9px]">{last.summary}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * @license 
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateRandomIdea } from './lib/grok';
import { uploadToFirebase, getFreshIdToken } from './lib/firebase';
import { useAuth } from './lib/AuthContext';
import { BrandMark, BrandLoader } from './components/BrandMark';
import InstallAppButton from './components/InstallAppButton';
import {
  saveFailedTaskSnapshot,
  deleteFailedTaskSnapshot,
  loadFailedTaskSnapshots,
  type FailedTaskSnapshot,
} from './lib/failedTaskCache';
import {
  createPendingPayment,
  subscribeToWalletBalance,
  reserveCredits,
  refundCredits,
} from './lib/payments';
import {
  fetchHistoryPage,
  addHistoryDoc,
  deleteHistoryDoc,
  deleteAllHistory,
  fetchSavedPrompts,
  addSavedPromptDoc,
  deleteSavedPromptDoc,
  createPendingJob,
} from './lib/userData';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Sparkles, Settings, Loader2, Download,
  Image as ImageIcon, X, History, ChevronLeft, ChevronRight,
  Trash2, Maximize, SlidersHorizontal, Box, Layers,
  Bookmark, BookmarkPlus, Plus, Dices,
  UserCircle, Wand2, Film, LogOut, RefreshCw, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Rewrites a wavespeed.ai URL (including ones handed back live by their API,
// e.g. `urls.get`) to go through our own authenticated serverless proxy so the
// real Wavespeed API key never has to live in the browser.
const WAVESPEED_ORIGIN = 'https://api.wavespeed.ai/api/v3/';
const toProxyUrl = (url: string): string => {
  if (!url) return url;
  return url.replace(WAVESPEED_ORIGIN, '/api/wavespeed/');
};

// Lets Wavespeed notify our server directly when a job finishes, instead of
// relying solely on the browser tab staying open/foregrounded to poll for
// it — background/locked phones would otherwise silently lose track of
// in-flight generations. Falls back to empty locally where there's no
// publicly-reachable HTTPS URL for Wavespeed to call (client-side polling
// still works fine there as the only path).
const getWebhookUrl = (): string => {
  if (typeof window === 'undefined') return '';
  if (!window.location.origin.startsWith('https://')) return '';
  return `${window.location.origin}/api/wavespeed-webhook`;
};

const attachWebhook = (endpoint: string): string => {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return endpoint;
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}webhook=${encodeURIComponent(webhookUrl)}`;
};

// --- Utilities: convert a generated result (base64 data URI or a hosted
// URL from Wavespeed) into a Blob we can hand to Firebase Storage / use for
// local preview / download. ---
const urlToBlob = async (url: string): Promise<Blob> => {
  if (url.startsWith('data:')) {
    const contentType = url.substring(5, url.indexOf(';')) || 'application/octet-stream';
    return base64ToBlob(url, contentType);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch the generated asset.');
  return res.blob();
};

// --- Reusable Components ---
const UploadZone = ({ label, file, preview, onClear, onProcess, icon: Icon = Upload }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div 
      onClick={() => !file && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onProcess(f); }}
      className={`relative group cursor-pointer border transition-all duration-300 overflow-hidden h-full flex flex-col items-center justify-center min-h-[140px] rounded-2xl ${
        isDragging ? 'border-zinc-400 bg-zinc-800/50 scale-[1.02] p-4' : file ? 'bg-zinc-900 border-zinc-800/80 p-0' : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-600 p-4 sm:p-6'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); e.target.value = ''; }} className="hidden" accept="image/*" />
      
      {preview ? (
        <div 
          className="relative w-full h-full flex items-center justify-center group/preview"
          onClick={(e) => {
            e.stopPropagation();
            if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) {
              setShowMobileMenu(!showMobileMenu);
            } else {
              fileInputRef.current?.click();
            }
          }}
        >
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
          
          <div className={`absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] transition-all flex items-center justify-center z-10 ${showMobileMenu ? 'opacity-100' : 'opacity-0 md:group-hover/preview:opacity-100'}`}>
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setShowMobileMenu(false); }} className="text-zinc-100 text-[10px] sm:text-xs font-medium uppercase tracking-widest bg-zinc-900/90 px-5 py-2.5 rounded-full border border-zinc-700 shadow-xl hover:bg-zinc-800 transition-colors">
              Replace
            </button>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); setShowMobileMenu(false); }} 
            className={`absolute top-3 right-3 p-2 bg-zinc-900/90 text-zinc-400 hover:text-red-400 hover:bg-red-950/50 rounded-full border border-zinc-700/50 transition-all shadow-xl z-20 ${showMobileMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 md:group-hover/preview:opacity-100 md:group-hover/preview:scale-100'}`}
            title="Remove Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ${isDragging ? 'bg-zinc-100 text-zinc-900 scale-110' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:scale-110 group-hover:border-zinc-600 group-hover:text-zinc-100'}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p className="text-[10px] sm:text-xs font-medium text-zinc-100 mb-1 tracking-wide">{label}</p>
        </div>
      )}
    </div>
  );
};

// --- Types ---
type AppMode = 'editor' | 'upscaler' | 'angles' | 'video';
type EditorModel = 'wan-2.6' | 'wan-2.7' | 'qwen-2.0' | 'qwen-lora' | 'seedream';
type Resolution = '2k' | '4k' | '8k';
type VideoEngine = 'wavespeed-wan' | 'wavespeed-wan2i2v' | 'wavespeed-pruna' | 'wavespeed-seedance';

// What we charge the user per generation — set at 2x Wavespeed's own cost
// for every model, so margin scales correctly no matter what mix of
// (cheap image edits vs. expensive video) a given user actually runs.
const EDITOR_MODEL_PRICES: Record<EditorModel, number> = {
  'wan-2.6': 0.07,
  'wan-2.7': 0.06,
  'qwen-2.0': 0.06,
  'qwen-lora': 0.05,
  'seedream': 0.09,
};
const VIDEO_ENGINE_PRICES: Record<VideoEngine, number> = {
  'wavespeed-seedance': 0.12,
  'wavespeed-pruna': 0.20,
  'wavespeed-wan2i2v': 0.10,
  'wavespeed-wan': 0.10,
};
const ANGLES_PRICE = 0.05;
const UPSCALE_PRICE = 0.02;

// Public-facing names — deliberately decoupled from the internal
// editorModel/videoEngine values (which stay as-is everywhere else in the
// code) so the underlying Wavespeed models we're wrapping aren't exposed
// anywhere in the UI, copy, history, or saved data.
const EDITOR_MODEL_DISPLAY_NAMES: Record<EditorModel, string> = {
  'qwen-lora': 'Lumen',
  'wan-2.7': 'Vero',
  'qwen-2.0': 'Nova',
  'wan-2.6': 'Aurum',
  'seedream': 'Platinum',
};
const VIDEO_ENGINE_DISPLAY_NAMES: Record<VideoEngine, string> = {
  'wavespeed-wan2i2v': 'Celer',
  'wavespeed-wan': 'Motus',
  'wavespeed-seedance': 'Fluxus',
  'wavespeed-pruna': 'Magnum',
};
const ANGLES_DISPLAY_NAME = 'Prisma';
const UPSCALE_DISPLAY_NAME = 'Amplus';

interface HistoryItem { id: string; prompt: string; url: string; storagePath?: string; date: string; modelInfo?: string; mode?: AppMode; }
interface SavedPrompt { id: string; name: string; prompt: string; }
interface QueueTask { 
  id: string; 
  mode: AppMode; 
  prompt: string; 
  progress: number; 
  message: string; 
  pollUrl: string; 
  targetResultUrl: string; 
  modelInfo: string; 
}
interface FailedTask {
  id: string;
  mode: AppMode;
  prompt: string;
  modelInfo: string;
  errorMessage: string;
  retry: () => void;
}
interface ActiveLora { id: string; name: string; strength: number; }

const RATIO_OPTIONS = [
  { label: '1:1', qwen: '1024*1024', seedream: '1:1' },
  { label: '9:16', qwen: '720*1280', seedream: '9:16' },
  { label: '16:9', qwen: '1280*720', seedream: '16:9' },
  { label: '4:3', qwen: '1024*768', seedream: '4:3' },
  { label: '3:4', qwen: '768*1024', seedream: '3:4' },
  { label: '21:9', qwen: '1280*720', seedream: '21:9' }
];

const horizontalOptions = [ { v: 0, l: 'Front' }, { v: 45, l: '3/4 Right' }, { v: 90, l: 'Side' }, { v: 135, l: '3/4 Left' }];
const verticalOptions = [ { v: 0, l: 'Eye Level' }, { v: -30, l: 'Low Angle' }, { v: 30, l: 'High Angle' }];
const distanceOptions = [ { v: 1, l: 'Close' }, { v: 2, l: 'Medium' }, { v: 3, l: 'Far' }];

// --- Utilities ---
const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.startsWith('data:video') || 
         cleanUrl.endsWith('.mp4') || 
         cleanUrl.endsWith('.webm') || 
         cleanUrl.endsWith('.mov') || 
         url.includes('video/mp4');
};

const base64ToBlob = (base64Data: string, contentType: string = 'image/png'): Blob => {
  const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const byteCharacters = atob(base64String);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const cleanAndPadBase64 = (base64Str: string) => {
  let cleanStr = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
  while (cleanStr.length % 4 !== 0) {
    cleanStr += '=';
  }
  return cleanStr;
};

export default function App() {
  const { user, signOut } = useAuth();

  // Cosmetic-only client-side flag (shows "Unlimited" instead of a dollar
  // balance, skips the pre-flight balance check below) — this changes
  // nothing security-relevant, since the actual bypass is enforced
  // server-side in api/credits.ts against the verified Firebase ID token's
  // email. Someone editing this list in devtools gains nothing; the server
  // independently checks the real, authenticated email on every request.
  const ADMIN_EMAILS = ['mpigome44@gmail.com'];
  const isAdminUser = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [mode, setMode] = useState<AppMode>('editor');
  const [editorModel, setEditorModel] = useState<EditorModel>('wan-2.7');
  const [videoEngine, setVideoEngine] = useState<VideoEngine>('wavespeed-seedance');
  
  // These no longer hold real third-party secrets. They hold the current
  // user's Firebase ID token, which our /api/wavespeed and /api/grok
  // serverless routes verify server-side before touching the real,
  // server-only Wavespeed/Grok API keys. Kept as `wavespeedKey`/`grokKey`
  // so the existing request call sites below don't need to change.
  const [wavespeedKey, setWavespeedKey] = useState<string>('');
  const [grokKey, setGrokKey] = useState<string>('');
  
  const [prompt, setPrompt] = useState<string>('');
  const [isRandomizing, setIsRandomizing] = useState(false);
  
  const [wavespeedBalance, setWavespeedBalance] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [creatingInvoicePack, setCreatingInvoicePack] = useState<string | null>(null);

  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [horizontalAngle, setHorizontalAngle] = useState<number>(0);
  const [verticalAngle, setVerticalAngle] = useState<number>(0);
  const [distance, setDistance] = useState<number>(1);
  const [selectedRatio, setSelectedRatio] = useState<string>('16:9');

  const [activeLoras, setActiveLoras] = useState<ActiveLora[]>([]);
  
  const [videoSeed, setVideoSeed] = useState<number>(-1);
  const [apiVideoDuration, setApiVideoDuration] = useState<number>(5);
  const [apiVideoResolution, setApiVideoResolution] = useState<'480p' | '720p' | '1080p'>('720p');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile2, setSelectedFile2] = useState<File | null>(null);
  const [previewUrl2, setPreviewUrl2] = useState<string | null>(null);
  const [selectedFile3, setSelectedFile3] = useState<File | null>(null);
  const [previewUrl3, setPreviewUrl3] = useState<string | null>(null);
  
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [queueBatchTotal, setQueueBatchTotal] = useState(0);
  const [failedTasks, setFailedTasks] = useState<FailedTask[]>([]);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChaining, setIsChaining] = useState<AppMode | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistoryOnce, setHasLoadedHistoryOnce] = useState(false);
  const [galleryModeFilter, setGalleryModeFilter] = useState<AppMode | null>(null);
  const [gallerySortDir, setGallerySortDir] = useState<'asc' | 'desc'>('desc');
  const [gallerySelectMode, setGallerySelectMode] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [isDeletingAllHistory, setIsDeletingAllHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showLoadPrompt, setShowLoadPrompt] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [promptToSave, setPromptToSave] = useState('');

  const [sliderPosition, setSliderPosition] = useState(50);
  const resultRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // Loads the first page of the signed-in user's history from Firestore.
  // Called on sign-in, after bulk-deletes, and whenever the mode filter or
  // sort direction changes (those need a fresh query, not just more pages of
  // the old one). Individual add/delete actions update local state directly
  // instead of re-fetching.
  const loadInitialHistory = async (uid: string, filter: { mode?: AppMode | null; sortDir?: 'asc' | 'desc' } = {}) => {
    setIsLoadingHistory(true);
    try {
      const { items, lastDoc, hasMore } = await fetchHistoryPage(uid, null, filter);
      setHistory(items);
      setHistoryCursor(lastDoc);
      setHasMoreHistory(hasMore);
    } catch (e) {
      console.error('Failed to load history from Firebase', e);
    } finally {
      setIsLoadingHistory(false);
      setHasLoadedHistoryOnce(true);
    }
  };

  // Loads the next page of history (pagination), so a user with hundreds or
  // thousands of generations doesn't have their whole gallery load at once.
  const loadMoreHistory = async () => {
    if (!user || isLoadingHistory || !hasMoreHistory) return;
    setIsLoadingHistory(true);
    try {
      const { items, lastDoc, hasMore } = await fetchHistoryPage(user.uid, historyCursor, {
        mode: galleryModeFilter,
        sortDir: gallerySortDir,
      });
      setHistory(prev => {
        const merged = [...prev, ...items];
        return Array.from(new Map(merged.map(item => [item.id, item])).values());
      });
      setHistoryCursor(lastDoc);
      setHasMoreHistory(hasMore);
    } catch (e) {
      console.error('Failed to load more history from Firebase', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Loads the initial page whenever the signed-in user changes, or whenever
  // the filter/sort changes (those need a fresh query, not just more pages
  // of the old one).
  useEffect(() => {
    if (!user) return;
    setGallerySelectMode(false);
    setSelectedGalleryIds(new Set());
    loadInitialHistory(user.uid, { mode: galleryModeFilter, sortDir: gallerySortDir });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, galleryModeFilter, gallerySortDir]);

  // Live credit balance — updates automatically the instant the NOWPayments
  // webhook credits a completed top-up, no manual refresh needed.
  useEffect(() => {
    if (!user) {
      setCreditBalance(0);
      return;
    }
    const unsubscribe = subscribeToWalletBalance(user.uid, setCreditBalance);
    return () => unsubscribe();
  }, [user]);

  const handleTopUp = async (packId: 'tiny' | 'small' | 'medium' | 'large') => {
    if (!user || creatingInvoicePack) return;
    setCreatingInvoicePack(packId);
    setError(null);
    try {
      const orderId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const amountUsd = packId === 'tiny' ? 5 : packId === 'small' ? 10 : packId === 'medium' ? 25 : 50;

      await createPendingPayment(user.uid, orderId, amountUsd);

      const idToken = await getFreshIdToken();
      const res = await fetch('/api/nowpayments-create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ packId, orderId }),
      });

      const data = await res.json();
      if (!res.ok || !data.invoiceUrl) {
        throw new Error(data.error || 'Failed to create payment invoice.');
      }

      window.open(data.invoiceUrl, '_blank');
      setShowTopUp(false);
    } catch (e: any) {
      console.error('Failed to start top-up', e);
      setError(e.message || 'Could not start checkout. Please try again.');
    } finally {
      setCreatingInvoicePack(null);
    }
  };

  // Keep a fresh Firebase ID token in state at all times while signed in, and
  // use it to kick off the initial Wavespeed cloud sync / balance fetch, and
  // load this user's own history + saved prompts from Firestore. Tokens are
  // refreshed on a timer since Firebase ID tokens expire after ~1 hour.
  useEffect(() => {
    if (!user) {
      setWavespeedKey('');
      setGrokKey('');
      setHistory([]);
      setHistoryCursor(null);
      setHasMoreHistory(true);
      setSavedPrompts([]);
      return;
    }
    let active = true;
    const refreshToken = async (forceRefresh = false) => {
      const token = await getFreshIdToken(forceRefresh);
      if (!active) return;
      setWavespeedKey(token);
      setGrokKey(token);
      return token;
    };
    refreshToken().then((token) => {
      if (token) {
        fetchWavespeedBalance(token);
      }
    });
    fetchSavedPrompts(user.uid).then(setSavedPrompts).catch(e => console.error('Failed to load saved prompts', e));
    const interval = setInterval(() => refreshToken(true), 45 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  useEffect(() => {
    const savedMode = localStorage.getItem('arx_mode') as AppMode;
    const savedVidEngine = localStorage.getItem('arx_video_engine') as VideoEngine;
    
    // Ensure mode doesn't load a deprecated option like 'runpod'
    if (savedMode && ['editor', 'upscaler', 'angles', 'video'].includes(savedMode)) {
        setMode(savedMode);
    } else {
        setMode('editor');
    }
    
    if (savedVidEngine && savedVidEngine !== 'runpod' as any) {
        setVideoEngine(savedVidEngine);
    } else {
        setVideoEngine('wavespeed-seedance');
    }
    
    setEditorModel((localStorage.getItem('arx_editor_model') as EditorModel) || 'wan-2.7');
    // No longer loading a saved LoRA chain from localStorage — there's no UI
    // left to view/edit it, so silently resurrecting an old list would just
    // be confusing. activeLoras now only ever comes from a failed-task retry
    // snapshot, and is otherwise always empty.
  }, []);

  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('arx_video_engine', videoEngine); }, [videoEngine]);
  useEffect(() => { localStorage.setItem('arx_editor_model', editorModel); }, [editorModel]);

  // Reset the queue batch counter once every queued item has finished, so the
  // next round of generations starts a fresh "1/N" count instead of
  // continuing to climb.
  useEffect(() => {
    if (queue.length === 0 && queueBatchTotal !== 0) {
      setQueueBatchTotal(0);
    }
  }, [queue.length, queueBatchTotal]);

  // Infinite-scroll: automatically load the next page of history when the
  // sentinel div at the bottom of the gallery scrolls into view, instead of
  // fetching the user's whole history up front.
  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreHistory();
      }
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreHistory, isLoadingHistory, historyCursor, user, galleryModeFilter, gallerySortDir]);

  const fetchWavespeedBalance = async (keyToUse: string) => {
    if (!keyToUse) return;
    try {
      const res = await fetch("/api/wavespeed/balance", {
        method: "GET",
        headers: { "Authorization": `Bearer ${keyToUse}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data.balance === 'number') {
          setWavespeedBalance(`$${json.data.balance.toFixed(2)}`);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Wavespeed balance", e);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) { handleFileProcess(file); break; }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedHistoryItem) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNextHistory();
      } else if (e.code === 'ArrowLeft') {
        handlePrevHistory();
      } else if (e.code === 'Escape') {
        setSelectedHistoryItem(null);
        setIsFlipped(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistoryItem, history]);

  useEffect(() => {
    if (selectedHistoryItem) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.touchAction = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.touchAction = 'auto';
    };
  }, [selectedHistoryItem]);

  const handleRandomizePrompt = async () => {
    if (!grokKey) {
      setError('Still authenticating — please wait a second and try again.');
      return;
    }
    setIsRandomizing(true);
    setError(null);

    try {
      const generatedPrompt = await generateRandomIdea(grokKey, prompt);
      setPrompt(generatedPrompt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate prompt from Grok.');
    } finally {
      setIsRandomizing(false);
    }
  };

  const enhancePrompt = () => {
    const enhancer = " masterpiece, best quality, ultra-detailed, highly realistic, cinematic lighting";
    if (!prompt.includes("masterpiece")) {
      setPrompt(p => p ? p.trim() + "," + enhancer : enhancer.trim());
    }
  };

  // Copies any prompt text to the clipboard and briefly shows a checkmark on
  // whichever button triggered it. `id` distinguishes the main prompt field
  // ('main') from individual gallery card prompts (their history item id) so
  // only the button that was actually clicked shows the confirmation.
  const copyPromptToClipboard = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromptId(id);
      setTimeout(() => setCopiedPromptId(prev => (prev === id ? null : prev)), 1500);
    } catch (e) {
      console.error('Failed to copy prompt', e);
      setError('Could not copy to clipboard.');
    }
  };

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide a valid image file.');
      return;
    }
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setSelectedFile(file); 
    setPreviewUrl(url); 
    setResultUrl(null);
    setResultId(null);
    setError(null);
  };

  // Sends any finished image (from the main result panel, or a gallery item)
  // straight into another mode as the new primary image — no re-download/
  // re-upload needed. Used for "Upscale this", "Animate this", "Try another
  // angle" on the result panel, and the equivalent actions on a gallery card.
  const chainImageAs = async (targetMode: AppMode, sourceUrl: string) => {
    if (!sourceUrl || isChaining) return;
    setIsChaining(targetMode);
    try {
      const blob = await urlToBlob(sourceUrl);
      const file = new File([blob], `arx-result-${Date.now()}.png`, { type: blob.type || 'image/png' });
      setMode(targetMode);
      handleFileProcess(file);
      setSelectedHistoryItem(null);
      setIsFlipped(false);
      if (window.innerWidth < 1024) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error('Failed to chain this image into a new mode', e);
      setError('Could not reuse this image as a new input. Try downloading and re-uploading it instead.');
    } finally {
      setIsChaining(null);
    }
  };

  const chainResultAs = (targetMode: AppMode) => chainImageAs(targetMode, resultUrl || '');

  const handleFile2Process = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide a valid image file.');
      return;
    }
    if (previewUrl2 && previewUrl2.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl2);
    }
    const url = URL.createObjectURL(file);
    setSelectedFile2(file); 
    setPreviewUrl2(url); 
  };

  const handleFile3Process = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide a valid image file.');
      return;
    }
    if (previewUrl3 && previewUrl3.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl3);
    }
    const url = URL.createObjectURL(file);
    setSelectedFile3(file); 
    setPreviewUrl3(url); 
  };

  const optimizeImageForUpload = (file: File, maxSize: number = 1536): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Failed to get canvas context'));
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    if (file.size < 500 * 1024) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    } else {
      return optimizeImageForUpload(file);
    }
  };

  // Kept as a thin wrapper so the existing call site below doesn't need to
  // change — now routes through chainImageAs, which shows a proper loading
  // state on the button instead of silently freezing while it fetches.
  const handleAnimateFromHistory = (url: string) => chainImageAs('video', url);

  const handleSaveSettings = () => {
    setShowSettings(false);
  };

  const handleNextHistory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedHistoryItem || history.length === 0) return;
    const currentIndex = history.findIndex(h => h.id === selectedHistoryItem.id);
    const nextIndex = (currentIndex + 1) % history.length;
    setSelectedHistoryItem(history[nextIndex]);
    setIsFlipped(false);
  };

  const handlePrevHistory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedHistoryItem || history.length === 0) return;
    const currentIndex = history.findIndex(h => h.id === selectedHistoryItem.id);
    const prevIndex = (currentIndex - 1 + history.length) % history.length;
    setSelectedHistoryItem(history[prevIndex]);
    setIsFlipped(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextHistory();
      else handlePrevHistory();
    }
    touchStartX.current = null;
  };

  const handleDeleteHistory = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = history.find(h => h.id === id);
    setHistory(prev => prev.filter(item => item.id !== id));
    if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    if (selectedHistoryItem?.id === id) {
      setSelectedHistoryItem(null);
      setIsFlipped(false);
    }
    if (user) {
      try {
        await deleteHistoryDoc(user.uid, id, item?.storagePath);
      } catch (err) {
        console.error('Failed to delete this generation from Firebase', err);
        setError('Could not delete this image from your account. Please try again.');
      }
    }
  };

  const toggleGallerySelection = (id: string) => {
    setSelectedGalleryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!user || selectedGalleryIds.size === 0 || isBulkActing) return;
    const idsToDelete = Array.from(selectedGalleryIds);
    setIsBulkActing(true);
    try {
      const itemsToDelete = history.filter(h => idsToDelete.includes(h.id));
      await Promise.all(itemsToDelete.map(item =>
        deleteHistoryDoc(user.uid, item.id, item.storagePath).catch(err => {
          console.error(`Failed to delete ${item.id}`, err);
        })
      ));
      itemsToDelete.forEach(item => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url); });
      setHistory(prev => prev.filter(item => !idsToDelete.includes(item.id)));
      setSelectedGalleryIds(new Set());
      setGallerySelectMode(false);
    } catch (err) {
      console.error('Bulk delete failed', err);
      setError('Could not delete some of the selected images. Please try again.');
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedGalleryIds.size === 0 || isBulkActing) return;
    const idsToDownload = Array.from(selectedGalleryIds);
    setIsBulkActing(true);
    try {
      const itemsToDownload = history.filter(h => idsToDownload.includes(h.id));
      // Trigger downloads one at a time with a short gap — firing many
      // simultaneous downloads at once gets silently blocked by some browsers.
      for (const item of itemsToDownload) {
        await downloadAsset(item.url, item.prompt);
        await new Promise(r => setTimeout(r, 350));
      }
    } catch (err) {
      console.error('Bulk download failed', err);
      setError('Could not download some of the selected images. Please try again.');
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleSavePromptData = async () => {
    if (!newPromptName.trim() || !promptToSave.trim() || !user) return;
    const name = newPromptName.trim();
    const promptText = promptToSave.trim();
    setShowSavePrompt(false);
    setNewPromptName('');
    try {
      const id = await addSavedPromptDoc(user.uid, name, promptText);
      setSavedPrompts(prev => [{ id, name, prompt: promptText }, ...prev]);
    } catch (err) {
      console.error('Failed to save prompt to Firebase', err);
      setError('Could not save this prompt. Please try again.');
    }
  };

  const handleDeleteSavedPrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
    if (user) {
      try {
        await deleteSavedPromptDoc(user.uid, id);
      } catch (err) {
        console.error('Failed to delete saved prompt from Firebase', err);
      }
    }
  };

  const triggerWavespeedVideo = async (file: File, internalTaskId: string, priceUsd: number) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch("/api/wavespeed/media/upload/binary", {
      method: "POST",
      headers: { "Authorization": `Bearer ${wavespeedKey}` },
      body: formData 
    });

    if (!uploadRes.ok) throw new Error('Asset upload failed for video generation.');
    const uploadData = await uploadRes.json();
    const cdnUrl = uploadData.data?.download_url || uploadData.url;
    if (!cdnUrl) throw new Error('Failed to retrieve CDN URL after upload.');

    let activePrompt = prompt.trim();
    if (!activePrompt) {
      activePrompt = "beautiful woman, natural smooth motion, detailed face, realistic movement, high quality, cinematic lighting";
    }

    const payload: any = {
      prompt: activePrompt,
      image: cdnUrl,
      seed: videoSeed === -1 ? Math.floor(Math.random() * 999999999) : videoSeed
    };

    let endpoint = "/api/wavespeed/wavespeed-ai/wan-2.2/i2v-5b-720p";
    let modelName = VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-wan'];

    if (videoEngine === 'wavespeed-pruna') {
      endpoint = "/api/wavespeed/pruna-ai/p-video/image-to-video";
      modelName = VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-pruna'];
      payload.duration = apiVideoDuration;
      payload.resolution = apiVideoResolution === '480p' ? '720p' : apiVideoResolution;
      payload.save_audio = true;
    } else if (videoEngine === 'wavespeed-seedance') {
      endpoint = "/api/wavespeed/bytedance/seedance-v1-pro-fast/image-to-video";
      modelName = VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-seedance'];
      payload.duration = apiVideoDuration > 12 ? 12 : apiVideoDuration < 2 ? 2 : apiVideoDuration;
      payload.resolution = apiVideoResolution;
      payload.aspect_ratio = selectedRatio;
      payload.camera_fixed = false;
    } else if (videoEngine === 'wavespeed-wan2i2v') {
      endpoint = "/api/wavespeed/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast";
      modelName = VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-wan2i2v'];
      payload.duration = apiVideoDuration >= 8 ? 8 : 5;
    }

    const triggerResponse = await fetch(attachWebhook(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${wavespeedKey}`
      },
      body: JSON.stringify(payload)
    });

    const triggerData = await triggerResponse.json();
    if (!triggerResponse.ok) throw new Error(`Wavespeed Video API Error: ${triggerData.message || triggerData.error || triggerData.detail || 'Unknown Error'}`);

    const id = triggerData.id || triggerData.data?.id;
    if (!id) throw new Error(`API Rejected Request: Missing Task ID.`);

    let pollUrl = toProxyUrl(triggerData.urls?.get || triggerData.data?.urls?.get) || `/api/wavespeed/predictions/${id}`;
    let targetResultUrl = `/api/wavespeed/predictions/${id}/result`;

    if (user) createPendingJob(user.uid, id, 'video', activePrompt, modelName, priceUsd, internalTaskId);

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: activePrompt,
      modelInfo: modelName
    };
  };

  const triggerWavespeedAngles = async (file: File, internalTaskId: string, priceUsd: number) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch("/api/wavespeed/media/upload/binary", {
      method: "POST",
      headers: { "Authorization": `Bearer ${wavespeedKey}` },
      body: formData 
    });

    if (!uploadRes.ok) throw new Error('Asset upload failed. Please try a smaller file.');
    const uploadData = await uploadRes.json();
    const cdnUrl = uploadData.data?.download_url || uploadData.url;
    if (!cdnUrl) throw new Error('Failed to retrieve CDN URL after upload.');

    const payload = {
      distance: distance,
      enable_base64_output: false,
      enable_sync_mode: false,
      horizontal_angle: horizontalAngle,
      images: [cdnUrl],
      output_format: "jpeg",
      seed: -1,
      vertical_angle: verticalAngle
    };

    const triggerResponse = await fetch(attachWebhook("/api/wavespeed/wavespeed-ai/qwen-image/edit-multiple-angles"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${wavespeedKey}`
      },
      body: JSON.stringify(payload)
    });

    const triggerData = await triggerResponse.json();
    if (!triggerResponse.ok) throw new Error(`Wavespeed API Error: ${triggerData.message || triggerData.error || triggerData.detail || 'Unknown Error'}`);

    const id = triggerData.id || triggerData.request_id || triggerData.task_id || triggerData.uuid || triggerData.data?.id || triggerData.data?.request_id;
    if (!id) throw new Error(`API Rejected Request: Missing Task ID.`);

    let pollUrl = triggerData.status_url || triggerData.urls?.get || triggerData.data?.urls?.get;
    let targetResultUrl = triggerData.response_url;

    if (!pollUrl) {
      if (triggerData.request_id || triggerData.data?.request_id) {
        pollUrl = `/api/wavespeed/wavespeed-ai/qwen-image/edit-multiple-angles/requests/${id}/status`;
        targetResultUrl = `/api/wavespeed/wavespeed-ai/qwen-image/edit-multiple-angles/requests/${id}`;
      } else {
        pollUrl = `/api/wavespeed/predictions/${id}`;
        targetResultUrl = `/api/wavespeed/predictions/${id}/result`;
      }
    }

    pollUrl = toProxyUrl(pollUrl);
    targetResultUrl = toProxyUrl(targetResultUrl);

    const angleHistoryPrompt = `${ANGLES_DISPLAY_NAME} | H:${horizontalAngle}° V:${verticalAngle}° D:${distance}`;
    if (user) createPendingJob(user.uid, id, 'angles', angleHistoryPrompt, ANGLES_DISPLAY_NAME, priceUsd, internalTaskId);

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: angleHistoryPrompt,
      modelInfo: ANGLES_DISPLAY_NAME
    };
  };

  const triggerWavespeedUpscale = async (file: File, internalTaskId: string, priceUsd: number) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch("/api/wavespeed/media/upload/binary", {
      method: "POST",
      headers: { "Authorization": `Bearer ${wavespeedKey}` },
      body: formData 
    });

    if (!uploadRes.ok) throw new Error('Asset upload failed. Please try a smaller file or check your connection.');
    const uploadData = await uploadRes.json();
    const cdnUrl = uploadData.data?.download_url || uploadData.url;
    if (!cdnUrl) throw new Error('Failed to retrieve CDN URL after upload.');

    const payload = {
      enable_base64_output: false,
      enable_sync_mode: false,
      image: cdnUrl,
      output_format: "jpeg",
      target_resolution: targetResolution
    };

    const triggerResponse = await fetch(attachWebhook("/api/wavespeed/wavespeed-ai/image-upscaler"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${wavespeedKey}`
      },
      body: JSON.stringify(payload)
    });

    const triggerData = await triggerResponse.json();
    if (!triggerResponse.ok) throw new Error(`Wavespeed API Error: ${triggerData.message || triggerData.error || triggerData.detail || 'Unknown Server Error'}`);
    
    const id = triggerData.id || triggerData.request_id || triggerData.task_id || triggerData.uuid || triggerData.data?.id || triggerData.data?.request_id;
    if (!id) throw new Error(`API Rejected Request: Missing ID.`);

    let pollUrl = triggerData.status_url || triggerData.urls?.get || triggerData.data?.urls?.get;
    let targetResultUrl = triggerData.response_url;

    if (!pollUrl) {
      if (triggerData.request_id || triggerData.data?.request_id) {
        pollUrl = `/api/wavespeed/wavespeed-ai/image-upscaler/requests/${id}/status`;
        targetResultUrl = `/api/wavespeed/wavespeed-ai/image-upscaler/requests/${id}`;
      } else {
        pollUrl = `/api/wavespeed/predictions/${id}`;
        targetResultUrl = `/api/wavespeed/predictions/${id}/result`;
      }
    }

    pollUrl = toProxyUrl(pollUrl);
    targetResultUrl = toProxyUrl(targetResultUrl);

    const upscaleHistoryPrompt = `${UPSCALE_DISPLAY_NAME} — Upscaled to ${targetResolution.toUpperCase()}`;
    if (user) createPendingJob(user.uid, id, 'upscaler', upscaleHistoryPrompt, UPSCALE_DISPLAY_NAME, priceUsd, internalTaskId);

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: upscaleHistoryPrompt,
      modelInfo: UPSCALE_DISPLAY_NAME
    };
  };

  const triggerWavespeed = async (base64Image: string, base64Image2: string | null | undefined, base64Image3: string | null | undefined, internalTaskId: string, priceUsd: number) => {
    const safeBase64 = cleanAndPadBase64(base64Image);
    const payload: any = { 
        prompt: prompt, 
    };

    const ratioObj = RATIO_OPTIONS.find(r => r.label === selectedRatio) || RATIO_OPTIONS[0];

    if (editorModel === 'seedream') {
        payload.aspect_ratio = ratioObj.seedream;
        payload.output_format = "jpeg";
        payload.resolution = "1k";
        payload.seed = -1;
        payload.images = [safeBase64];
        if (base64Image2) payload.images.push(cleanAndPadBase64(base64Image2));
        if (base64Image3) payload.images.push(cleanAndPadBase64(base64Image3));
    } else if (editorModel === 'qwen-lora') {
        payload.seed = -1;
        payload.image = safeBase64;
        payload.loras = activeLoras.map(l => ({ path: l.id, scale: l.strength }));
    } else {
        payload.seed = -1;
        payload.images = [safeBase64];
        if (base64Image2) {
            payload.images.push(cleanAndPadBase64(base64Image2));
        }
        if (base64Image3) {
            payload.images.push(cleanAndPadBase64(base64Image3));
        }
        if (editorModel === 'qwen-2.0') {
            payload.size = ratioObj.qwen;
        }
    }
    
    if (editorModel === 'wan-2.6') {
        payload.enable_prompt_expansion = false;
        payload.guidance_scale = 7.5;
        payload.num_inference_steps = 30;
    }

    let endpoint = '';
    let basePath = '';

    if (editorModel === 'qwen-2.0') {
        endpoint = '/api/wavespeed/wavespeed-ai/qwen-image-2.0/edit';
        basePath = 'wavespeed-ai/qwen-image-2.0/edit';
    } else if (editorModel === 'qwen-lora') {
        endpoint = '/api/wavespeed/wavespeed-ai/qwen-image/edit-lora';
        basePath = 'wavespeed-ai/qwen-image/edit-lora';
    } else if (editorModel === 'seedream') {
        endpoint = '/api/wavespeed/bytedance/seedream-v5.0-pro/edit';
        basePath = 'bytedance/seedream-v5.0-pro/edit';
    } else {
        endpoint = `/api/wavespeed/alibaba/${editorModel}/image-edit`;
        basePath = `alibaba/${editorModel}/image-edit`;
    }

    const triggerResponse = await fetch(attachWebhook(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wavespeedKey}` },
      body: JSON.stringify(payload)
    });

    const triggerData = await triggerResponse.json();
    if (!triggerResponse.ok) throw new Error(`Failed to trigger Wavespeed edit: ${triggerData.message || 'Unknown Error'}`);

    const id = triggerData.id || triggerData.request_id || triggerData.job_id || triggerData.task_id || triggerData.prediction_id || triggerData.uuid || triggerData.prediction?.id || triggerData.data?.id || triggerData.data?.request_id;
    if (!id) throw new Error(`Server responded successfully but no ID was found.`);

    let pollUrl = triggerData.status_url || triggerData.urls?.get || triggerData.data?.urls?.get;
    let targetResultUrl = triggerData.response_url;

    if (!pollUrl) {
      if (triggerData.request_id || triggerData.data?.request_id) {
        pollUrl = `/api/wavespeed/${basePath}/requests/${id}/status`;
        targetResultUrl = `/api/wavespeed/${basePath}/requests/${id}`;
      } else {
        pollUrl = `/api/wavespeed/predictions/${id}`;
        targetResultUrl = `/api/wavespeed/predictions/${id}/result`;
      }
    }
    
    let usedModelInfo = EDITOR_MODEL_DISPLAY_NAMES[editorModel] || 'AI Editor';
    if (editorModel === 'qwen-lora' && activeLoras.length > 0) {
       usedModelInfo = `${EDITOR_MODEL_DISPLAY_NAMES['qwen-lora']} + ${activeLoras.length} style layer${activeLoras.length > 1 ? 's' : ''}`;
    }

    pollUrl = toProxyUrl(pollUrl);
    targetResultUrl = toProxyUrl(targetResultUrl);

    if (user) createPendingJob(user.uid, id, 'editor', prompt, usedModelInfo, priceUsd, internalTaskId);

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: prompt,
      modelInfo: usedModelInfo
    };
  };

  // Restores a failed task's saved settings + source image(s) into the live
  // form (from a local IndexedDB snapshot, not Firebase), then resubmits it
  // — this is what makes "Retry" work even after the page has been reloaded,
  // when the in-memory closure from the original attempt is long gone.
  const restoreSnapshotAndRetry = (snapshot: FailedTaskSnapshot) => {
    const primaryFile = new File([snapshot.primaryBlob], snapshot.primaryName, { type: snapshot.primaryBlob.type });
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setSelectedFile(primaryFile);
    setPreviewUrl(URL.createObjectURL(primaryFile));

    if (snapshot.ref2Blob) {
      const f2 = new File([snapshot.ref2Blob], snapshot.ref2Name || 'reference2.png', { type: snapshot.ref2Blob.type });
      if (previewUrl2 && previewUrl2.startsWith('blob:')) URL.revokeObjectURL(previewUrl2);
      setSelectedFile2(f2);
      setPreviewUrl2(URL.createObjectURL(f2));
    }
    if (snapshot.ref3Blob) {
      const f3 = new File([snapshot.ref3Blob], snapshot.ref3Name || 'reference3.png', { type: snapshot.ref3Blob.type });
      if (previewUrl3 && previewUrl3.startsWith('blob:')) URL.revokeObjectURL(previewUrl3);
      setSelectedFile3(f3);
      setPreviewUrl3(URL.createObjectURL(f3));
    }

    setMode(snapshot.mode as AppMode);
    setEditorModel(snapshot.editorModel as EditorModel);
    setVideoEngine(snapshot.videoEngine as VideoEngine);
    setPrompt(snapshot.prompt);
    setHorizontalAngle(snapshot.horizontalAngle);
    setVerticalAngle(snapshot.verticalAngle);
    setDistance(snapshot.distance);
    setTargetResolution(snapshot.targetResolution as Resolution);
    try {
      setActiveLoras(JSON.parse(snapshot.activeLorasJson));
    } catch {
      // ignore malformed/missing LoRA snapshot data
    }

    setFailedTasks(prev => prev.filter(f => f.id !== snapshot.id));
    deleteFailedTaskSnapshot(snapshot.id);

    // generateEdit() reads component state, so it needs to run AFTER the
    // state updates above have actually flushed/re-rendered — hence routing
    // through pendingRetry + an effect, rather than calling it right here.
    setPendingRetry(snapshot.id);
  };

  // Fires once the state restored by restoreSnapshotAndRetry above has
  // actually committed, so generateEdit() sees the restored values instead
  // of whatever was in the form before.
  useEffect(() => {
    if (!pendingRetry) return;
    generateEdit();
    setPendingRetry(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRetry]);

  // On first load, pull in any failed generations left over from a previous
  // session (stored locally, never in Firebase) so they can still be retried.
  useEffect(() => {
    loadFailedTaskSnapshots().then((snapshots) => {
      if (snapshots.length === 0) return;
      setFailedTasks(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const restored: FailedTask[] = snapshots
          .filter(s => !existingIds.has(s.id))
          .map(s => ({
            id: s.id,
            mode: s.mode as AppMode,
            prompt: s.prompt,
            modelInfo: s.modelInfo,
            errorMessage: s.errorMessage,
            retry: () => restoreSnapshotAndRetry(s),
          }));
        return [...prev, ...restored];
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateEdit = () => {
    if (!wavespeedKey) {
      setError('Still authenticating — please wait a second and try again.');
      return;
    }

    if ((mode === 'editor' || mode === 'video') && !prompt) {
      setError('Please enter a generation prompt.');
      return;
    }

    if (!selectedFile) {
      setError('Please upload a primary image to process.');
      return;
    }

    const priceUsd = mode === 'upscaler' ? UPSCALE_PRICE
      : mode === 'angles' ? ANGLES_PRICE
      : mode === 'video' ? VIDEO_ENGINE_PRICES[videoEngine]
      : EDITOR_MODEL_PRICES[editorModel];

    // Quick client-side check against the live-subscribed balance, purely
    // to skip a round-trip for the common "obviously not enough" case — the
    // real, race-condition-proof check happens server-side in reserveCredits.
    // Admins skip this entirely since their wallet balance is never touched.
    if (!isAdminUser && creditBalance < priceUsd) {
      setError(`This generation costs $${priceUsd.toFixed(2)} — top up to continue.`);
      setShowTopUp(true);
      return;
    }

    setError(null); 
    
    // Quick visual feedback that generation started, without blocking the UI
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    let initialModelInfo = mode === 'upscaler' ? UPSCALE_DISPLAY_NAME : 
                           mode === 'angles' ? ANGLES_DISPLAY_NAME : 
                           mode === 'video' ? VIDEO_ENGINE_DISPLAY_NAMES[videoEngine] : 
                           EDITOR_MODEL_DISPLAY_NAMES[editorModel];

    const initialTask: QueueTask = {
      id: taskId,
      mode: mode,
      prompt: prompt || 'Generation',
      progress: 2,
      message: 'Uploading assets...',
      pollUrl: '',
      targetResultUrl: '',
      modelInfo: initialModelInfo
    };

    const executeTask = async () => {
      // Wraps the whole retry: clears the failed-task card, puts a fresh
      // "uploading" bubble back in the active queue, then reruns this exact
      // same request (same file(s), mode, and prompt captured when the user
      // originally hit generate) — no need for them to redo any setup.
      const retryThisTask = async () => {
        setFailedTasks(prev => prev.filter(f => f.id !== taskId));
        deleteFailedTaskSnapshot(taskId);

        const idToken = await getFreshIdToken();
        const reservation = await reserveCredits(idToken, taskId, priceUsd, initialModelInfo);
        if (!reservation.ok) {
          setError(
            reservation.error === 'insufficient_balance'
              ? `This generation costs $${priceUsd.toFixed(2)} — top up to continue.`
              : 'Could not process this retry. Please try again.'
          );
          if (reservation.error === 'insufficient_balance') setShowTopUp(true);
          return;
        }

        setQueue(prev => [...prev, initialTask]);
        setQueueBatchTotal(prev => (queue.length === 0 ? 1 : prev + 1));
        executeTask();
      };

      const markFailed = (message: string) => {
        setFailedTasks(prev => [
          ...prev.filter(f => f.id !== taskId),
          {
            id: taskId,
            mode,
            prompt: prompt || initialModelInfo,
            modelInfo: initialModelInfo,
            errorMessage: message,
            retry: retryThisTask,
          }
        ]);

        // Give back the credit that was reserved for this attempt — it
        // didn't produce a usable result. Safe to call even if the webhook
        // already refunded this same taskId (server-side idempotency).
        getFreshIdToken().then(idToken => refundCredits(idToken, taskId, priceUsd));

        // Persist locally (never to Firebase) so this is still retryable
        // even if the user reloads the page before hitting Retry.
        if (selectedFile) {
          saveFailedTaskSnapshot({
            id: taskId,
            mode,
            prompt,
            modelInfo: initialModelInfo,
            errorMessage: message,
            editorModel,
            videoEngine,
            horizontalAngle,
            verticalAngle,
            distance,
            targetResolution,
            activeLorasJson: JSON.stringify(activeLoras),
            primaryBlob: selectedFile,
            primaryName: selectedFile.name || 'primary.png',
            ref2Blob: selectedFile2 || undefined,
            ref2Name: selectedFile2?.name,
            ref3Blob: selectedFile3 || undefined,
            ref3Name: selectedFile3?.name,
            createdAt: Date.now(),
          });
        }
      };

      try {
        let triggerResult;
        
        if (mode === 'upscaler') {
          triggerResult = await triggerWavespeedUpscale(selectedFile, taskId, priceUsd);
        } else if (mode === 'angles') {
          triggerResult = await triggerWavespeedAngles(selectedFile, taskId, priceUsd);
        } else if (mode === 'video') {
          triggerResult = await triggerWavespeedVideo(selectedFile, taskId, priceUsd);
        } else {
          const base64ImageRaw = await fileToBase64(selectedFile);
          let base64ImageRaw2 = null;
          let base64ImageRaw3 = null;
          if (editorModel === 'qwen-2.0' || editorModel === 'seedream') {
              if (selectedFile2) base64ImageRaw2 = await fileToBase64(selectedFile2);
              if (selectedFile3) base64ImageRaw3 = await fileToBase64(selectedFile3);
          }
          triggerResult = await triggerWavespeed(base64ImageRaw, base64ImageRaw2, base64ImageRaw3, taskId, priceUsd);
        } 

        const newTaskObj: QueueTask = {
          id: triggerResult.id,
          mode: mode,
          prompt: triggerResult.historyPrompt,
          progress: 15,
          message: 'Queued on server...',
          pollUrl: triggerResult.pollUrl,
          targetResultUrl: triggerResult.targetResultUrl,
          modelInfo: triggerResult.modelInfo
        };

        setQueue(prev => prev.map(t => t.id === taskId ? newTaskObj : t));
        pollBackground(newTaskObj, markFailed);

      } catch (err: any) {
        console.error(err);
        const message = err.message || 'An unexpected error occurred.';
        setQueue(prev => prev.filter(t => t.id !== taskId));
        setError(`Task Failed: ${message}`);
        markFailed(message);
      }
    };

    // Reserve the credit BEFORE ever contacting Wavespeed — this is a real,
    // atomic, server-side balance check (not just trusting the locally
    // cached number), so we never end up on the hook to Wavespeed for a
    // generation the user couldn't actually pay for.
    const startGeneration = async () => {
      const idToken = await getFreshIdToken();
      const reservation = await reserveCredits(idToken, taskId, priceUsd, initialModelInfo);
      if (!reservation.ok) {
        setError(
          reservation.error === 'insufficient_balance'
            ? `This generation costs $${priceUsd.toFixed(2)} — top up to continue.`
            : 'Could not process this request. Please try again.'
        );
        if (reservation.error === 'insufficient_balance') setShowTopUp(true);
        return;
      }

      setQueue(prev => [...prev, initialTask]);
      setQueueBatchTotal(prev => (queue.length === 0 ? 1 : prev + 1));

      if (window.innerWidth < 1024 && resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Fire and forget, runs seamlessly in the background
      executeTask();
    };
    startGeneration();
  };

  const pollBackground = async (task: QueueTask, onFailure: (message: string) => void) => {
    let isCompleted = false;
    let pollCount = 0;

    const progressInterval = setInterval(() => {
      setQueue(prev => prev.map(t => {
        if (t.id === task.id && t.progress < 85) {
          return { ...t, progress: t.progress + Math.max(0.5, (85 - t.progress) * 0.05) };
        }
        return t;
      }));
    }, 500);

    try {
      while (!isCompleted) {
        if (pollCount >= 200) throw new Error('Polling timed out.');
        
        const delay = pollCount < 10 ? 2000 : 4000;
        await new Promise(r => setTimeout(r, delay));
        pollCount++;

        const headers: any = { "Authorization": `Bearer ${wavespeedKey}` };
        const pollResponse = await fetch(task.pollUrl, { headers });

        if (!pollResponse.ok) {
          if (pollResponse.status === 404 && pollCount < 10) continue; 
          throw new Error(`Server polling failed with status ${pollResponse.status}`);
        }

        const pollData = await pollResponse.json();
        const currentStatus = (pollData.status || pollData.state || pollData.data?.status || '').toLowerCase();

        if (currentStatus === "completed" || currentStatus === "succeeded" || currentStatus === "success") {
          clearInterval(progressInterval);
          setQueue(prev => prev.map(t => t.id === task.id ? { ...t, progress: 95, message: 'Fetching output...' } : t));

          let outputs = pollData.outputs || pollData.output || pollData.data?.outputs;

          if (!outputs || outputs.length === 0) {
            const fetchTarget = task.targetResultUrl;
            const resultResponse = await fetch(fetchTarget, {
              headers: { "Authorization": `Bearer ${wavespeedKey}` }
            });
            if (!resultResponse.ok) throw new Error('Failed to fetch final result.');
            const resultData = await resultResponse.json();
            outputs = resultData.outputs || resultData.output || resultData.data?.outputs;
          }

          if (outputs && outputs.length > 0) {
            let finalImage = outputs[0];
            if (typeof finalImage === 'object' && finalImage !== null) {
                finalImage = finalImage.url || finalImage.file?.url;
            }
            isCompleted = true;
            await handleFinalSuccess(finalImage, task.id, task.prompt, task.modelInfo, task.mode);
          } else {
            throw new Error("Generation succeeded but no output URL was found.");
          }
        } else if (currentStatus === "failed" || currentStatus === "error" || currentStatus === "canceled") {
          throw new Error(pollData.error || pollData.data?.error || "Task failed on the server.");
        } else {
          setQueue(prev => prev.map(t => t.id === task.id ? { ...t, message: `Status: ${currentStatus || 'Processing'}` } : t));
        }
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setQueue(prev => prev.filter(t => t.id !== task.id));
      setError(`Task Failed: ${err.message}`);
      onFailure(err.message || 'An unexpected error occurred.');
    }
  };

  const handleFinalSuccess = async (finalDataUrl: string, taskId: string, taskPrompt: string, modelInfoStr: string, taskMode: AppMode) => {
    // Clean up any local failed-task snapshot for this id — it succeeded now,
    // so there's nothing left to retry.
    deleteFailedTaskSnapshot(taskId);

    let displayUrl = finalDataUrl;
    let blob: Blob | null = null;
    const isVideo = finalDataUrl.startsWith('data:video') || isVideoUrl(finalDataUrl);

    try {
      blob = await urlToBlob(finalDataUrl);
      displayUrl = URL.createObjectURL(blob);
    } catch (e) {
      console.warn("Could not create a local preview for this result", e);
    }

    // Upload the result into this user's own Firebase Storage so it's
    // permanently theirs (not dependent on Wavespeed continuing to host it),
    // then store the permanent download URL — not the temporary blob — in
    // their Firestore history record.
    let permanentUrl = finalDataUrl;
    let storagePath: string | undefined;

    if (blob && user) {
      try {
        const ext = isVideo ? 'mp4' : 'png';
        storagePath = `outputs/${user.uid}/${taskId}.${ext}`;
        permanentUrl = await uploadToFirebase(blob, storagePath);
      } catch (e) {
        console.error('Failed to save this generation to Firebase Storage', e);
        storagePath = undefined;
      }
    }

    const newItem: HistoryItem = { 
      id: taskId, 
      prompt: taskPrompt, 
      url: permanentUrl, 
      storagePath,
      date: new Date().toISOString(),
      modelInfo: modelInfoStr,
      mode: taskMode
    };
    
    setHistory(prev => {
      const merged = [newItem, ...prev];
      return Array.from(new Map(merged.map(item => [item.id, item])).values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (user) {
      try {
        await addHistoryDoc(user.uid, newItem);
      } catch (e) {
        console.error('Failed to save history to Firestore', e);
      }
    }

    setQueue(prev => prev.filter(t => t.id !== taskId));
    
    setResultUrl(displayUrl);
    setResultId(taskId);
    
    if (wavespeedKey) fetchWavespeedBalance(wavespeedKey);
  };

  const downloadAsset = async (url: string, promptText: string) => {
    try {
      let blobUrlToDownload = url;
      let blobToRevoke: string | null = null;

      if (url.startsWith('data:')) {
        const blob = base64ToBlob(url);
        blobUrlToDownload = URL.createObjectURL(blob);
        blobToRevoke = blobUrlToDownload;
      } else if (url.startsWith('http')) {
        const response = await fetch(url);
        const blob = await response.blob();
        blobUrlToDownload = URL.createObjectURL(blob);
        blobToRevoke = blobUrlToDownload;
      }
      
      const a = document.createElement('a');
      a.href = blobUrlToDownload;
      
      const cleanPrompt = promptText.substring(0, 20).replace(/[^a-z0-9]/gi, '_');
      const isVid = isVideoUrl(url);
      a.download = `ARX_${cleanPrompt}${isVid ? '.mp4' : '.png'}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (blobToRevoke) {
          setTimeout(() => URL.revokeObjectURL(blobToRevoke!), 1000);
      }
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const handleDownload = async (url: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    await downloadAsset(url, promptText);
  };

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(percentage);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark className="text-zinc-100 w-6 h-6 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ARX</h1>
        </div>
        <div className="flex items-center gap-4">
          {isAdminUser ? (
            <div className="flex items-center gap-2 pl-3 pr-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full" title="Real-time Wavespeed account balance">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                {wavespeedBalance ?? '—'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowTopUp(true)}
              className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-full transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest">
                ${creditBalance.toFixed(2)}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-widest bg-yellow-500 text-zinc-950 px-2 py-1 rounded-full">
                Top Up
              </span>
            </button>
          )}
          {queue.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full">
              <Layers className="w-3.5 h-3.5 text-zinc-100 animate-pulse" />
              <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest hidden sm:inline">{queue.length} Active</span>
              <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest sm:hidden">{queue.length} Queue</span>
            </div>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="flex items-center gap-2 p-1.5 pr-3 hover:bg-zinc-900 rounded-xl border border-transparent hover:border-zinc-800 transition-all group"
            title={user?.email || 'Account'}
          >
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <Settings className="w-4 h-4 transition-transform group-hover:rotate-90 text-zinc-400 group-hover:text-zinc-100" />
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-4 sm:px-8 xl:px-12 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 2xl:gap-16">
        
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-5 space-y-8 sm:space-y-10">
          
          {/* Master Mode Switcher */}
          <div className="grid grid-cols-4 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50 shadow-inner gap-1">
            <button onClick={() => setMode('editor')} className={`py-3 sm:py-3.5 px-1 sm:px-2 rounded-xl text-[8px] sm:text-[10px] font-medium uppercase tracking-tight sm:tracking-widest transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${mode === 'editor' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Editor
            </button>
            <button onClick={() => setMode('video')} className={`py-3 sm:py-3.5 px-1 sm:px-2 rounded-xl text-[8px] sm:text-[10px] font-medium uppercase tracking-tight sm:tracking-widest transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${mode === 'video' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Video
            </button>
            <button onClick={() => setMode('angles')} className={`py-3 sm:py-3.5 px-1 sm:px-2 rounded-xl text-[8px] sm:text-[10px] font-medium uppercase tracking-tight sm:tracking-widest transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${mode === 'angles' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
              <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Angles
            </button>
            <button onClick={() => setMode('upscaler')} className={`py-3 sm:py-3.5 px-1 sm:px-2 rounded-xl text-[8px] sm:text-[10px] font-medium uppercase tracking-tight sm:tracking-widest transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${mode === 'upscaler' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Upscale
            </button>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 font-mono">
                01 // {mode === 'editor' ? 'Asset Framework' : mode === 'video' ? 'Image for Video Generation' : mode === 'upscaler' ? 'Image to Upscale' : 'Subject to Rotate'}
              </h2>
            </div>
            
            <div className={`grid gap-4 ${mode === 'editor' && (editorModel === 'qwen-2.0' || editorModel === 'seedream') ? 'grid-cols-1 sm:grid-cols-3 h-[420px] sm:h-[160px]' : 'grid-cols-1 h-[200px]'}`}>
              <UploadZone 
                label="Primary Image"
                file={selectedFile} 
                preview={previewUrl} 
                onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                onProcess={(f: File) => handleFileProcess(f)} 
              />
              {mode === 'editor' && (editorModel === 'qwen-2.0' || editorModel === 'seedream') && (
                <>
                  <UploadZone
                    label="Reference 2"
                    file={selectedFile2}
                    preview={previewUrl2}
                    onClear={() => { setSelectedFile2(null); setPreviewUrl2(null); }}
                    onProcess={(f: File) => handleFile2Process(f)}
                  />
                  <UploadZone
                    label="Reference 3"
                    file={selectedFile3}
                    preview={previewUrl3}
                    onClear={() => { setSelectedFile3(null); setPreviewUrl3(null); }}
                    onProcess={(f: File) => handleFile3Process(f)}
                  />
                </>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 font-mono">
                02 // Parameters
              </h2>
            </div>
            
            <div className="space-y-6">
              {mode === 'upscaler' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <label className="flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-400 uppercase tracking-widest text-center mb-4">
                    Target Output Resolution
                    <span className="text-zinc-600">— ${UPSCALE_PRICE.toFixed(2)} / generation</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['2k', '4k', '8k'] as Resolution[]).map((res) => (
                      <button key={res} onClick={() => setTargetResolution(res)} className={`py-4 rounded-xl text-xs font-medium uppercase tracking-widest transition-all ${targetResolution === res ? 'bg-zinc-100 text-zinc-900 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100'}`}>{res}</button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'angles' && (
                <div className="space-y-6 bg-zinc-900/30 p-5 sm:p-6 border border-zinc-800/50 rounded-2xl">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest text-center -mt-1">
                    {ANGLES_DISPLAY_NAME} — ${ANGLES_PRICE.toFixed(2)} / generation
                  </p>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>Horizontal Rotation (Azimuth)</span>
                      <span className="text-zinc-100">{horizontalAngle}°</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {horizontalOptions.map((opt) => (
                        <button key={`h-${opt.v}`} onClick={() => setHorizontalAngle(opt.v)} className={`py-2 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${horizontalAngle === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{opt.l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-zinc-800/50">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Vertical Tilt</span>
                        <span className="text-zinc-100">{verticalAngle}°</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {verticalOptions.map((opt) => (
                          <button key={`v-${opt.v}`} onClick={() => setVerticalAngle(opt.v)} className={`py-2 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${verticalAngle === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Distance</span>
                        <span className="text-zinc-100">Level {distance}</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {distanceOptions.map((opt) => (
                          <button key={`d-${opt.v}`} onClick={() => setDistance(opt.v)} className={`py-2 px-1 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${distance === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'video' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      {VIDEO_ENGINE_DISPLAY_NAMES[videoEngine]} Engine
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={handleRandomizePrompt} disabled={isRandomizing} className="text-[9px] flex items-center gap-1.5 text-rose-400 hover:text-rose-300 uppercase tracking-widest font-mono transition-colors disabled:opacity-50">
                        <Dices className={`w-3 h-3 ${isRandomizing ? 'animate-spin' : ''}`} /> Architect Prompt
                      </button>
                      <button onClick={() => setShowLoadPrompt(true)} className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors">
                        <Bookmark className="w-3 h-3" /> Presets
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <button onClick={() => setVideoEngine('wavespeed-seedance')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${videoEngine === 'wavespeed-seedance' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-seedance']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${VIDEO_ENGINE_PRICES['wavespeed-seedance'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setVideoEngine('wavespeed-pruna')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${videoEngine === 'wavespeed-pruna' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-pruna']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${VIDEO_ENGINE_PRICES['wavespeed-pruna'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setVideoEngine('wavespeed-wan2i2v')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${videoEngine === 'wavespeed-wan2i2v' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-wan2i2v']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${VIDEO_ENGINE_PRICES['wavespeed-wan2i2v'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setVideoEngine('wavespeed-wan')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${videoEngine === 'wavespeed-wan' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{VIDEO_ENGINE_DISPLAY_NAMES['wavespeed-wan']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${VIDEO_ENGINE_PRICES['wavespeed-wan'].toFixed(2)}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the motion and scene details..." className="w-full h-24 p-5 pr-14 bg-zinc-900/30 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed resize-y text-zinc-100" />
                    {prompt && (
                      <button
                        onClick={() => copyPromptToClipboard(prompt, 'main')}
                        title="Copy prompt"
                        className="absolute top-3 right-3 p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        {copiedPromptId === 'main' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <div className="absolute bottom-4 right-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">Positive Prompt</div>
                  </div>

                  {(videoEngine === 'wavespeed-pruna' || videoEngine === 'wavespeed-seedance' || videoEngine === 'wavespeed-wan2i2v') && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                            Duration <span>{videoEngine === 'wavespeed-wan2i2v' ? (apiVideoDuration >= 8 ? 8 : 5) : apiVideoDuration}s</span>
                          </label>
                          <input 
                            type="range" 
                            min={videoEngine === 'wavespeed-seedance' ? "2" : videoEngine === 'wavespeed-wan2i2v' ? "5" : "1"} 
                            max={videoEngine === 'wavespeed-seedance' ? "12" : videoEngine === 'wavespeed-wan2i2v' ? "8" : "20"} 
                            step={videoEngine === 'wavespeed-wan2i2v' ? "3" : "1"} 
                            value={apiVideoDuration} 
                            onChange={(e) => setApiVideoDuration(Number(e.target.value))} 
                            className="w-full accent-zinc-100" 
                          />
                        </div>
                        {(videoEngine === 'wavespeed-seedance' || videoEngine === 'wavespeed-pruna') && (
                          <div>
                            <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">Resolution</label>
                            <div className="flex gap-2">
                                {videoEngine === 'wavespeed-seedance' && (
                                  <button onClick={() => setApiVideoResolution('480p')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all ${apiVideoResolution === '480p' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>480p</button>
                                )}
                                <button onClick={() => setApiVideoResolution('720p')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all ${apiVideoResolution === '720p' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>720p</button>
                                <button onClick={() => setApiVideoResolution('1080p')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all ${apiVideoResolution === '1080p' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>1080p</button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {videoEngine === 'wavespeed-seedance' && (
                        <div>
                          <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">Aspect Ratio</label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {RATIO_OPTIONS.map((opt) => (
                              <button
                                key={`vid-ratio-${opt.label}`}
                                onClick={() => setSelectedRatio(opt.label)}
                                className={`py-2 rounded-lg text-[9px] font-medium font-mono uppercase tracking-widest transition-all border ${
                                  selectedRatio === opt.label
                                    ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-sm'
                                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === 'editor' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">AI Editing Engine</label>
                    <div className="flex items-center gap-3">
                      <button onClick={handleRandomizePrompt} disabled={isRandomizing} className="text-[9px] flex items-center gap-1.5 text-rose-400 hover:text-rose-300 uppercase tracking-widest font-mono transition-colors disabled:opacity-50">
                        <Dices className={`w-3 h-3 ${isRandomizing ? 'animate-spin' : ''}`} /> Architect Prompt
                      </button>
                      <button onClick={() => setShowLoadPrompt(true)} className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors">
                        <Bookmark className="w-3 h-3" /> Saved Prompts
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <button onClick={() => setEditorModel('wan-2.6')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${editorModel === 'wan-2.6' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{EDITOR_MODEL_DISPLAY_NAMES['wan-2.6']}</span>
                      <span className={`block text-[8px] normal-case font-mono mt-0.5 text-zinc-600`}>${EDITOR_MODEL_PRICES['wan-2.6'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setEditorModel('wan-2.7')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${editorModel === 'wan-2.7' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{EDITOR_MODEL_DISPLAY_NAMES['wan-2.7']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${EDITOR_MODEL_PRICES['wan-2.7'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setEditorModel('qwen-2.0')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${editorModel === 'qwen-2.0' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{EDITOR_MODEL_DISPLAY_NAMES['qwen-2.0']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${EDITOR_MODEL_PRICES['qwen-2.0'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setEditorModel('qwen-lora')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${editorModel === 'qwen-lora' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{EDITOR_MODEL_DISPLAY_NAMES['qwen-lora']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${EDITOR_MODEL_PRICES['qwen-lora'].toFixed(2)}</span>
                    </button>
                    <button onClick={() => setEditorModel('seedream')} className={`py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${editorModel === 'seedream' ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>
                      <span className="block">{EDITOR_MODEL_DISPLAY_NAMES['seedream']}</span>
                      <span className="block text-[8px] normal-case font-mono mt-0.5 text-zinc-600">${EDITOR_MODEL_PRICES['seedream'].toFixed(2)}</span>
                    </button>
                  </div>

                  {(editorModel === 'qwen-2.0' || editorModel === 'seedream') && (
                    <div className="space-y-3 bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" /> Canvas Aspect Ratio
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {RATIO_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => setSelectedRatio(opt.label)}
                            className={`py-2 rounded-lg text-[10px] font-medium font-mono transition-all border ${
                              selectedRatio === opt.label
                                ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-md scale-105'
                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(editorModel === 'wan-2.6' || editorModel === 'wan-2.7' || editorModel === 'qwen-lora') && (
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest text-center -mt-2 mb-2">
                      Output matches your uploaded image's aspect ratio
                    </p>
                  )}

                  <div className="relative">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the modifications..." className="w-full h-32 p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed resize-y text-zinc-100" />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      {prompt && (
                        <button
                          onClick={() => copyPromptToClipboard(prompt, 'main')}
                          title="Copy prompt"
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          {copiedPromptId === 'main' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button onClick={enhancePrompt} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors" title="Magic Prompt Enhancer"><Wand2 className="w-3.5 h-3.5" /></button>
                      <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
                        {EDITOR_MODEL_DISPLAY_NAMES[editorModel]} Editor
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={generateEdit} disabled={isSubmitting} className="w-full py-5 rounded-2xl font-medium uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all bg-zinc-100 text-zinc-950 hover:bg-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <BrandLoader className="w-5 h-5" /> : (
                  <>
                    {mode === 'upscaler' && <Maximize className="w-5 h-5" />}
                    {mode === 'editor' && <Sparkles className="w-5 h-5" />}
                    {mode === 'video' && <Film className="w-5 h-5" />}
                    {mode === 'angles' && <Box className="w-5 h-5" />}
                  </>
                )}
                {isSubmitting ? 'Uploading to Server...' : mode === 'upscaler' ? 'Queue Resolution Enhancement' : mode === 'angles' ? 'Queue 3D Camera Angle' : mode === 'video' ? 'Queue Video Generation' : 'Queue AI Edit'}
              </button>
              
              <AnimatePresence>
                {queue.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-8 space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 font-mono">
                        Active Queue
                      </h3>
                    </div>
                    {(() => {
                      // Show one consolidated indicator instead of a bubble
                      // per queued item: "X/Y in queue" plus a single shared
                      // progress bar tracking whichever item is furthest along.
                      const activeTask = queue.reduce((best, t) => (t.progress > best.progress ? t : best), queue[0]);
                      const total = Math.max(queueBatchTotal, queue.length);
                      const completed = Math.max(total - queue.length, 0);
                      const position = Math.min(completed + 1, total);
                      return (
                        <motion.div
                          key="queue-summary"
                          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-inner"
                        >
                          <div className="flex justify-between items-center mb-3">
                             <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                               {position}/{total} in queue
                             </span>
                             <span className="text-[10px] font-medium text-zinc-100">
                               {Math.round(activeTask.progress)}%
                             </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                             <div className="h-full bg-zinc-300 transition-all duration-300" style={{ width: `${activeTask.progress}%` }} />
                          </div>
                          <div className="flex justify-between items-center gap-4">
                            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest truncate flex-1">
                              {activeTask.prompt}
                            </p>
                            <p className="text-[9px] font-mono text-zinc-300 uppercase tracking-widest truncate">
                              {activeTask.message}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {failedTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-8 space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-red-400/80 font-mono">
                        Failed
                      </h3>
                    </div>
                    {failedTasks.map(task => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-red-950/20 border border-red-900/40 rounded-2xl p-4 shadow-inner"
                      >
                        <div className="flex justify-between items-center gap-3 mb-2">
                          <span className="text-[10px] font-medium text-red-300 uppercase tracking-widest truncate">
                            {task.mode === 'angles' ? 'Multi-Angle' : task.mode}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={task.retry}
                              className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-widest text-zinc-950 bg-zinc-100 hover:bg-white px-3 py-1.5 rounded-full transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                            <button
                              onClick={() => { setFailedTasks(prev => prev.filter(f => f.id !== task.id)); deleteFailedTaskSnapshot(task.id); }}
                              className="p-1.5 text-red-400/70 hover:text-red-300 transition-colors"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] font-mono text-red-400/70 uppercase tracking-widest truncate">
                          {task.errorMessage}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
        
        {/* Right Column Layout */}
        <div className="lg:col-span-7" id="result-section" ref={resultRef}>
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 font-mono">
                  {queue.length > 0 && !resultUrl ? 'Processing in Background...' : 'Prediction // Output'}
                </h2>
              </div>
              {resultUrl && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const cleanPrompt = (prompt || 'Generated Prompt').replace(/^\[RunPod ComfyUI\]\s*/i, '');
                      setPromptToSave(cleanPrompt);
                      setShowSavePrompt(true);
                    }}
                    className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 flex items-center gap-2 hover:bg-zinc-800 transition-all bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 shadow-sm"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save Prompt
                  </button>
                  <button 
                    onClick={(e) => handleDownload(resultUrl, prompt || 'angle_render', e)} 
                    className="text-[10px] font-medium uppercase tracking-widest text-zinc-950 flex items-center gap-2 hover:bg-zinc-200 transition-all bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> 
                    Export
                  </button>
                </div>
              )}
            </div>

            {resultUrl && !isVideoUrl(resultUrl) && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {mode !== 'upscaler' && (
                  <button
                    onClick={() => chainResultAs('upscaler')}
                    disabled={isChaining !== null}
                    className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 flex items-center gap-2 hover:bg-zinc-800 hover:text-zinc-100 transition-all bg-zinc-900/70 px-4 py-2 rounded-full border border-zinc-800 disabled:opacity-50"
                  >
                    {isChaining === 'upscaler' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Maximize className="w-3.5 h-3.5" />}
                    Upscale This
                  </button>
                )}
                {mode !== 'video' && (
                  <button
                    onClick={() => chainResultAs('video')}
                    disabled={isChaining !== null}
                    className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 flex items-center gap-2 hover:bg-zinc-800 hover:text-zinc-100 transition-all bg-zinc-900/70 px-4 py-2 rounded-full border border-zinc-800 disabled:opacity-50"
                  >
                    {isChaining === 'video' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
                    Animate This
                  </button>
                )}
                {mode !== 'angles' && (
                  <button
                    onClick={() => chainResultAs('angles')}
                    disabled={isChaining !== null}
                    className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 flex items-center gap-2 hover:bg-zinc-800 hover:text-zinc-100 transition-all bg-zinc-900/70 px-4 py-2 rounded-full border border-zinc-800 disabled:opacity-50"
                  >
                    {isChaining === 'angles' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />}
                    Try Another Angle
                  </button>
                )}
              </div>
            )}
            
            {/* Ambient glow behind the output frame, matching the sign-in screen's accent instead of leaving the rest of the app flat black */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30 -z-10">
                <div className="w-[85%] aspect-square rounded-full bg-cyan-500/10 blur-[100px]" />
              </div>
              <div className="relative aspect-square sm:aspect-[4/3] bg-zinc-900/30 rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-xl flex items-center justify-center">
              {resultUrl && (
                <motion.div
                  key={`flash-${resultId}`}
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 z-30 rounded-[2.5rem] ring-2 ring-zinc-100/70 shadow-[0_0_80px_15px_rgba(255,255,255,0.18)]"
                />
              )}
              <AnimatePresence mode="wait">
                {resultUrl ? (
                  <motion.div 
                    key="result" 
                    initial={{ opacity: 0, scale: 1.05 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="w-full h-full p-2 sm:p-4"
                  >
                    {mode === 'upscaler' && previewUrl && !selectedHistoryItem && !isVideoUrl(resultUrl) ? (
                      /* --- INTERACTIVE BEFORE/AFTER SLIDER FOR UPSCALER --- */
                      <div 
                        ref={sliderContainerRef}
                        className="relative w-full h-full cursor-ew-resize select-none rounded-[2rem] overflow-hidden group/result"
                        onMouseMove={handleSliderMove}
                        onTouchMove={handleSliderMove}
                      >
                        <img 
                          src={previewUrl} 
                          alt="Original" 
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-50" 
                        />
                        <img 
                          src={resultUrl} 
                          alt="Upscaled" 
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                        />
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-zinc-300 pointer-events-none transition-all duration-75 shadow-md"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 border-2 border-zinc-200 rounded-full flex items-center justify-center shadow-xl">
                            <SlidersHorizontal className="w-4 h-4 text-zinc-950" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-zinc-100 pointer-events-none">
                          Enhanced ({targetResolution})
                        </div>
                        <div className="absolute top-4 right-4 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-zinc-400 pointer-events-none">
                          Original
                        </div>
                      </div>
                    ) : (
                      /* --- STANDARD MEDIA VIEWER --- */
                      <div 
                        className="relative w-full h-full cursor-pointer group/result" 
                        onClick={() => {
                          const match = history.find(h => h.id === resultId) || history.find(h => h.url === resultUrl);
                          
                          let dynamicModelInfo = EDITOR_MODEL_DISPLAY_NAMES[editorModel];
                          if (mode === 'video') {
                              dynamicModelInfo = VIDEO_ENGINE_DISPLAY_NAMES[videoEngine];
                          }
                          
                          setSelectedHistoryItem(match || { 
                            id: resultId || Date.now().toString(), 
                            prompt: prompt || 'Latest Output', 
                            url: resultUrl, 
                            date: new Date().toISOString(),
                            modelInfo: dynamicModelInfo
                          });
                          setIsFlipped(false);
                        }}
                      >
                        {isVideoUrl(resultUrl) ? (
                            <video 
                              key={resultUrl}
                              src={resultUrl} 
                              autoPlay loop muted playsInline controls
                              className="w-full h-full object-contain rounded-[2rem] shadow-xl bg-black transition-transform duration-500 group-hover/result:scale-[1.01]" 
                            />
                        ) : (
                            <img 
                              src={resultUrl} 
                              alt="Result" 
                              className="w-full h-full object-cover rounded-[2rem] shadow-xl transition-transform duration-500 group-hover/result:scale-[1.01]" 
                            />
                        )}
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="bg-zinc-950/80 px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl backdrop-blur-sm pointer-events-auto">
                            <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest">
                              Click to Expand Data
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : queue.length > 0 ? (
                  <div className="flex flex-col items-center text-center p-12">
                    <BrandLoader className="w-12 h-12 text-zinc-700 mb-4" />
                    <p className="text-sm font-medium mb-2 uppercase tracking-widest text-zinc-300">
                      {Math.min(Math.max(queueBatchTotal, queue.length) - queue.length + 1, Math.max(queueBatchTotal, queue.length))}/{Math.max(queueBatchTotal, queue.length)} In Queue
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Your results will appear here shortly.
                    </p>
                  </div>
                ) : (
                  <ImageIcon className="w-20 h-20 text-zinc-800" />
                )}
              </AnimatePresence>
            </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Grid */}
      {user && (history.length > 0 || (hasLoadedHistoryOnce && !isLoadingHistory)) && (
        <section className="max-w-[1800px] w-full mx-auto px-4 sm:px-8 xl:px-12 pt-16 border-t border-zinc-800/50 pb-12">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 font-mono">
              03 // Generation Log
            </h2>
            <History className="w-4 h-4 text-zinc-500 hidden sm:block" />
          </div>

          {(history.length > 0 || galleryModeFilter) && (
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-1.5 flex-wrap">
                {([null, 'editor', 'video', 'angles', 'upscaler'] as (AppMode | null)[]).map((m) => (
                  <button
                    key={m ?? 'all'}
                    onClick={() => setGalleryModeFilter(m)}
                    className={`px-3.5 py-2 rounded-full text-[9px] font-medium uppercase tracking-widest border transition-colors ${
                      galleryModeFilter === m
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {m === null ? 'All' : m === 'angles' ? 'Angles' : m === 'upscaler' ? 'Upscale' : m === 'video' ? 'Video' : 'Editor'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGallerySortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[9px] font-medium uppercase tracking-widest border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${gallerySortDir === 'desc' ? 'rotate-90' : '-rotate-90'}`} />
                  {gallerySortDir === 'desc' ? 'Newest' : 'Oldest'}
                </button>
                <button
                  onClick={() => {
                    setGallerySelectMode(prev => !prev);
                    setSelectedGalleryIds(new Set());
                  }}
                  className={`px-3.5 py-2 rounded-full text-[9px] font-medium uppercase tracking-widest border transition-colors ${
                    gallerySelectMode
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {gallerySelectMode ? 'Cancel' : 'Select'}
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {gallerySelectMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-6 overflow-hidden"
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                  {selectedGalleryIds.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDownload}
                    disabled={selectedGalleryIds.size === 0 || isBulkActing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[9px] font-medium uppercase tracking-widest bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                  >
                    {isBulkActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Download
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedGalleryIds.size === 0 || isBulkActing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[9px] font-medium uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  >
                    {isBulkActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {history.length === 0 ? (
            <div className="flex flex-col items-center text-center py-20 border border-dashed border-zinc-800 rounded-[2rem] bg-zinc-900/20">
              <History className="w-10 h-10 text-zinc-700 mb-4" />
              {galleryModeFilter ? (
                <>
                  <p className="text-sm font-medium mb-2 uppercase tracking-widest text-zinc-300">Nothing here yet</p>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-5">
                    No generations found for this filter.
                  </p>
                  <button
                    onClick={() => setGalleryModeFilter(null)}
                    className="text-[9px] font-medium uppercase tracking-widest text-zinc-950 bg-zinc-100 hover:bg-white px-4 py-2 rounded-full transition-colors"
                  >
                    Clear Filter
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2 uppercase tracking-widest text-zinc-300">Your generations will show up here</p>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Run your first edit above to get started.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
              {history.map((item) => {
                const isSelected = selectedGalleryIds.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    className="relative group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/30 aspect-square"
                  >
                    {isVideoUrl(item.url) ? (
                       <video 
                         src={item.url} 
                         preload="none"
                         autoPlay loop muted playsInline
                         className={`w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500 opacity-80 hover:opacity-100 ${isSelected ? 'ring-2 ring-inset ring-zinc-100' : ''}`}
                         onClick={() => {
                           if (gallerySelectMode) { toggleGallerySelection(item.id); return; }
                           setSelectedHistoryItem(item); 
                           setIsFlipped(false); 
                         }} 
                       />
                    ) : (
                       <img 
                         src={item.url} 
                         alt={item.prompt} 
                         loading="lazy"
                         decoding="async"
                         className={`w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500 opacity-80 hover:opacity-100 ${isSelected ? 'ring-2 ring-inset ring-zinc-100' : ''}`}
                         onClick={() => {
                           if (gallerySelectMode) { toggleGallerySelection(item.id); return; }
                           setSelectedHistoryItem(item); 
                           setIsFlipped(false); 
                         }} 
                       />
                    )}

                    {gallerySelectMode ? (
                      <div
                        onClick={() => toggleGallerySelection(item.id)}
                        className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
                          isSelected ? 'bg-zinc-100 border-zinc-100' : 'bg-zinc-950/70 border-zinc-600'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-sm bg-zinc-950" />}
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => handleDeleteHistory(item.id, e)} 
                        className="absolute top-2 left-2 p-2 bg-zinc-950/80 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination sentinel: triggers loadMoreHistory() when scrolled
              into view, plus a manual fallback button for anyone with
              scroll-triggered fetches disabled/blocked. */}
          {hasMoreHistory && history.length > 0 && (
            <div ref={loadMoreSentinelRef} className="flex items-center justify-center mt-8">
              <button
                onClick={loadMoreHistory}
                disabled={isLoadingHistory}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors text-[9px] font-medium uppercase tracking-widest text-zinc-300 disabled:opacity-50 border border-zinc-800"
              >
                {isLoadingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isLoadingHistory ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* History Card Modal (Fullscreen Carousel with Flips) */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedHistoryItem(null)} 
              className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-[80]"
              style={{ touchAction: 'none' }}
            />
            
            <div 
              className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden touch-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'pan-y' }}
            >
              
              {/* Navigation Controls */}
              {history.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevHistory} 
                    className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 z-[3000] p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110 shadow-2xl hidden sm:flex"
                  >
                    <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                  <button 
                    onClick={handleNextHistory} 
                    className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 z-[3000] p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110 shadow-2xl hidden sm:flex"
                  >
                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                </>
              )}

              {/* 3D Carousel Mapper */}
              <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1800px', touchAction: 'pan-y' }}>
                {history.map((img, idx) => {
                  const currentIndex = history.findIndex(h => h.id === selectedHistoryItem.id);
                  let offset = idx - currentIndex;
                  const len = history.length;
                  
                  if (offset > len / 2) offset -= len;
                  else if (offset < -len / 2) offset += len;
                  
                  const isCenter = offset === 0;
                  const isVisible = Math.abs(offset) <= 2;

                  return (
                    <div
                      key={`carousel-${img.id}`}
                      className={`absolute transition-all duration-700 ease-out flex items-center justify-center ${!isVisible ? 'hidden' : ''}`}
                      style={{
                        transform: `translateX(${offset * 72}vw) translateZ(${isCenter ? 0 : -600}px) rotateY(${isCenter ? 0 : offset * 38}deg)`,
                        zIndex: 1000 - Math.abs(offset),
                        opacity: isCenter ? 1 : (Math.abs(offset) === 1 ? 0.65 : 0.25),
                        pointerEvents: isCenter ? 'auto' : 'none',
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      <div className="relative w-fit max-w-[90vw] sm:max-w-[85vw] h-fit max-h-[85vh] flex flex-col" style={{ perspective: '2000px', touchAction: 'none' }}>
                        {/* Close/Delete controls live OUTSIDE the rotating 3D card, in a
                            stable non-transformed layer, so they behave identically and
                            reliably whether the front or back face is showing — no more
                            depending on 3D transform hit-testing to land on the right
                            button after a flip. */}
                        {isCenter && (
                          <>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedHistoryItem(null); 
                              }} 
                              className="absolute top-4 right-4 z-20 p-2.5 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-800"
                            >
                              <X className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={(e) => handleDeleteHistory(img.id, e)} 
                              className="absolute top-4 left-4 z-20 p-2.5 text-red-400 hover:text-red-300 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-800 transition-colors hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <motion.div 
                          className="relative w-full h-full shadow-2xl rounded-2xl cursor-pointer" 
                          style={{ transformStyle: 'preserve-3d' }} 
                          animate={{ rotateY: isCenter && isFlipped ? 180 : 0 }} 
                          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }} 
                          onClick={(e) => { 
                            if (!isCenter) return;
                            const now = Date.now();
                            if (now - lastTapTime.current < 350) {
                              setIsFlipped(!isFlipped);
                              lastTapTime.current = 0;
                            } else {
                              lastTapTime.current = now;
                            }
                          }}
                        >
                          
                          {/* --- FRONT OF CARD --- */}
                          <div 
                            className="relative w-full h-fit max-h-[85vh] rounded-[2rem] overflow-hidden bg-zinc-950 flex justify-center items-center" 
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            {isVideoUrl(img.url) ? (
                                <video 
                                  src={img.url} 
                                  autoPlay loop muted playsInline controls={isCenter}
                                  className="w-auto h-auto max-w-[90vw] sm:max-w-[85vw] max-h-[85vh] object-contain block bg-black" 
                                />
                            ) : (
                                <img 
                                  src={img.url} 
                                  alt="History Entry" 
                                  className="w-auto h-auto max-w-[90vw] sm:max-w-[85vw] max-h-[85vh] object-contain block" 
                                />
                            )}
                          </div>

                          {/* --- BACK OF CARD --- */}
                          <div 
                            className="absolute inset-0 w-full h-full rounded-[2rem] shadow-2xl bg-zinc-950 p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-y-auto" 
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          >
                            <History className="w-8 h-8 text-zinc-700 mb-6 shrink-0" />
                            
                            <h3 className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-2 shrink-0">
                              Modification Log
                            </h3>

                            {img.modelInfo && (
                                <p className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest mb-6">
                                  {img.modelInfo}
                                </p>
                            )}
                            
                            <div className="w-full max-w-2xl mx-auto flex items-start justify-center gap-2 overflow-hidden mb-6 flex-1">
                              <p className="text-sm sm:text-lg text-zinc-100 leading-relaxed px-4 font-light">
                                {img.prompt}
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyPromptToClipboard(img.prompt, img.id); }}
                                title="Copy prompt"
                                className="shrink-0 p-2 mt-0.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors"
                              >
                                {copiedPromptId === img.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                            
                            <div className="w-full max-w-md mx-auto space-y-3 shrink-0">
                              
                              <button
                                onClick={(e) => handleDownload(img.url, img.prompt, e)}
                                className="w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-2xl font-medium flex items-center justify-center gap-3 transition-all active:scale-[0.97] group"
                              >
                                <Download className="w-5 h-5 transition-transform group-active:scale-110" />
                                Download
                              </button>
                              
                              {!isVideoUrl(img.url) && (
                                <>
                                  <div className="grid grid-cols-3 gap-2">
                                    {img.mode !== 'upscaler' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); chainImageAs('upscaler', img.url); }}
                                        disabled={isChaining !== null}
                                        className="py-3.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl font-medium uppercase tracking-widest text-[9px] hover:bg-zinc-800 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
                                      >
                                        {isChaining === 'upscaler' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Maximize className="w-4 h-4" />}
                                        Upscale
                                      </button>
                                    )}
                                    {img.mode !== 'video' && (
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          handleAnimateFromHistory(img.url);
                                        }} 
                                        disabled={isChaining !== null}
                                        className="py-3.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-medium uppercase tracking-widest text-[9px] hover:bg-indigo-500/20 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
                                      >
                                        {isChaining === 'video' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                                        Animate
                                      </button>
                                    )}
                                    {img.mode !== 'angles' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); chainImageAs('angles', img.url); }}
                                        disabled={isChaining !== null}
                                        className="py-3.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl font-medium uppercase tracking-widest text-[9px] hover:bg-zinc-800 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
                                      >
                                        {isChaining === 'angles' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                                        Angle
                                      </button>
                                    )}
                                  </div>

                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      const cleanPrompt = img.prompt.replace(/^\[RunPod ComfyUI\]\s*/i, '');
                                      setPrompt(cleanPrompt); 
                                      setSelectedHistoryItem(null); 
                                      window.scrollTo({ top: 0, behavior: 'smooth' }); 
                                    }} 
                                    className="w-full py-4 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl font-medium uppercase tracking-[0.15em] text-[10px] hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    Use This Prompt
                                  </button>

                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      const cleanPrompt = img.prompt.replace(/^\[RunPod ComfyUI\]\s*/i, '');
                                      setPromptToSave(cleanPrompt);
                                      setShowSavePrompt(true);
                                    }} 
                                    className="w-full py-4 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl font-medium uppercase tracking-[0.15em] text-[10px] hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                  >
                                    <BookmarkPlus className="w-4 h-4" />
                                    Save Prompt
                                  </button>
                                </>
                              )}
                            </div>
                            
                            <p className="text-[9px] text-zinc-500 mt-4 uppercase tracking-widest shrink-0">
                              <span className="sm:hidden">Double tap card for details</span>
                              <span className="hidden sm:inline">Double click or Space for details</span>
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={handleSaveSettings} 
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[60]" 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-[70] p-10 flex flex-col shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-16">
                <h2 className="text-2xl font-medium tracking-tight text-zinc-100">Account</h2>
                <button onClick={handleSaveSettings} className="p-2 bg-zinc-900 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-6 h-6 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-100 truncate">{user?.displayName || 'Signed in'}</p>
                      <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    API keys for Wavespeed and Grok are managed securely on the server and are never exposed to your browser or stored on this device.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/50">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Get the App</p>
                  <InstallAppButton className="w-full" variant="button" />
                </div>

                <div className="pt-4 border-t border-zinc-800/50">
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      if (!window.confirm('This permanently deletes every image and video you\'ve generated from your account. This cannot be undone. Continue?')) return;
                      setIsDeletingAllHistory(true);
                      try {
                        await deleteAllHistory(user.uid);
                        setHistory([]);
                        setHistoryCursor(null);
                        setHasMoreHistory(false);
                      } catch (e) {
                        console.error('Failed to delete all history', e);
                        setError('Could not delete all your generations. Please try again.');
                      } finally {
                        setIsDeletingAllHistory(false);
                      }
                    }} 
                    disabled={isDeletingAllHistory}
                    className="w-full py-4 bg-red-500/10 text-red-400 rounded-xl font-medium uppercase tracking-widest text-[10px] border border-red-500/20 transition-all hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {isDeletingAllHistory ? 'Deleting…' : 'Delete All My Generations'}
                  </button>
                </div>
              </div>
              <button 
                onClick={async () => { setShowSettings(false); await signOut(); }} 
                className="mt-8 py-5 bg-zinc-100 text-zinc-950 rounded-xl font-medium uppercase tracking-[0.2em] text-xs transition-all hover:bg-white flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Up Modal */}
      <AnimatePresence>
        {showTopUp && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTopUp(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-sm mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 z-[95] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-medium tracking-tight text-zinc-100">Top Up</h2>
                <button onClick={() => setShowTopUp(false)} className="p-2 bg-zinc-900 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Pay with any crypto wallet — pick a coin on the next screen. Your balance updates automatically once payment confirms.
              </p>

              <div className="space-y-3">
                {([
                  { id: 'tiny' as const, amount: 5 },
                  { id: 'small' as const, amount: 10 },
                  { id: 'medium' as const, amount: 25 },
                  { id: 'large' as const, amount: 50 },
                ]).map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => handleTopUp(pack.id)}
                    disabled={creatingInvoicePack !== null}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-zinc-100">${pack.amount.toFixed(2)} Credits</span>
                    {creatingInvoicePack === pack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    ) : (
                      <span className="text-[9px] font-medium uppercase tracking-widest text-zinc-950 bg-zinc-100 px-3 py-1.5 rounded-full">
                        Buy
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-zinc-600 mt-6 text-center uppercase tracking-widest">
                Current balance: ${creditBalance.toFixed(2)}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Save Prompt Modal */}
      <AnimatePresence>
        {showSavePrompt && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowSavePrompt(false)} 
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[110]" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }} 
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} 
              exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }} 
              className="fixed top-1/2 left-1/2 w-full max-w-sm bg-zinc-950 border border-zinc-800 p-6 rounded-3xl z-[120] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-100">Save Prompt</h3>
                <button onClick={() => setShowSavePrompt(false)} className="text-zinc-500 hover:text-zinc-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">Prompt Name</label>
                <input 
                  type="text" 
                  value={newPromptName} 
                  onChange={(e) => setNewPromptName(e.target.value)} 
                  placeholder="e.g. Cyberpunk Style"
                  className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm"
                  autoFocus
                />
              </div>
              <button 
                onClick={handleSavePromptData} 
                disabled={!newPromptName.trim()}
                className="w-full py-4 bg-zinc-100 text-zinc-950 rounded-xl font-medium uppercase tracking-[0.15em] text-[10px] hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save to Library
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Load Prompt Modal */}
      <AnimatePresence>
        {showLoadPrompt && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowLoadPrompt(false)} 
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[110]" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }} 
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }} 
              exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }} 
              className="fixed top-1/2 left-1/2 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl z-[120] shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-800/50">
                <h3 className="text-sm font-medium uppercase tracking-widest text-zinc-100 flex items-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  Prompt Library
                </h3>
                <button onClick={() => setShowLoadPrompt(false)} className="text-zinc-500 hover:text-zinc-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {savedPrompts.length === 0 ? (
                  <div className="text-center py-10">
                    <Bookmark className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">No saved prompts yet</p>
                  </div>
                ) : (
                  savedPrompts.map(sp => (
                    <div key={sp.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col group transition-colors hover:border-zinc-700">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <h4 className="text-xs font-medium text-zinc-100 uppercase tracking-wider truncate">{sp.name}</h4>
                        <button 
                          onClick={(e) => handleDeleteSavedPrompt(sp.id, e)}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                        {sp.prompt}
                      </p>
                      <button
                        onClick={() => {
                          setPrompt(sp.prompt);
                          setShowLoadPrompt(false);
                        }}
                        className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium uppercase tracking-[0.1em] text-[9px] hover:bg-zinc-700 hover:text-zinc-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Load into Editor
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

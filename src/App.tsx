/**
 * @license 
 * SPDX-License-Identifier: Apache-2.0
 */
import { generateRandomIdea } from './lib/grok';
import { uploadToFirebase } from './lib/firebase';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, Sparkles, Settings, Loader2, AlertCircle, Download,
  Image as ImageIcon, X, History, RefreshCw, ChevronLeft, ChevronRight,
  Trash2, Maximize, SlidersHorizontal, Box, Layers, CloudDownload,
  Bookmark, BookmarkPlus, Server, Settings2, Plus, User, Dices, Camera,
  UserCircle, Wand2, Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Native IndexedDB Wrapper ---
const DB_NAME = 'ARX_DB';
const STORE_NAME = 'history';
const DB_VERSION = 2;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveHistoryItem = async (item: HistoryItem) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const getHistoryDB = async (): Promise<HistoryItem[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const data = request.result as HistoryItem[];
      resolve(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };
    request.onerror = () => reject(request.error);
  });
};

const deleteHistoryItemDB = async (id: string) => {
  const db = await initDB();
  const itemToRevoke: HistoryItem | undefined = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
  });
  if (itemToRevoke?.url && itemToRevoke.url.startsWith('blob:')) {
    URL.revokeObjectURL(itemToRevoke.url);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const clearHistoryDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const pruneHistoryDB = async (keepCount: number = 100) => {
  const history = await getHistoryDB();
  if (history.length <= keepCount) return;
  const toDelete = history.slice(keepCount);
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  toDelete.forEach(item => {
    if (item.url && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
    store.delete(item.id);
  });
};

// --- Reusable Components ---
const TechApexIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22L2 2h20L12 22z" />
    <path d="M12 22V2" />
    <path d="M2 2l10 10 10-10" />
  </svg>
);

const UploadZone = ({ label, file, preview, onClear, onProcess, icon: Icon = Upload, accept = "image/*" }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  return (
    <div 
      onClick={() => !file && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onProcess(f); }}
      className={`relative group cursor-pointer border rounded-2xl p-4 sm:p-6 transition-all duration-300 overflow-hidden h-full flex flex-col items-center justify-center min-h-[140px] ${
        isDragging ? 'border-zinc-400 bg-zinc-800/50 scale-[1.02]' : file ? 'bg-zinc-900 border-zinc-800/80' : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-600'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); }} className="hidden" accept={accept} />
      {preview ? (
        <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-full rounded-xl overflow-hidden shadow-md border border-zinc-800/50 flex-1 flex items-center justify-center group bg-zinc-950">
          {file?.type.startsWith('video/') ? (
            <video src={preview} className="max-h-[120px] w-full object-cover rounded-xl" autoPlay loop muted playsInline />
          ) : (
            <img src={preview} alt="Preview" className="max-h-[120px] w-full object-cover rounded-xl" />
          )}
          <div className="absolute inset-0 bg-zinc-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
            <span className="text-zinc-100 text-[10px] sm:text-xs font-medium uppercase tracking-widest bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700">Replace</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-red-400 text-[10px] font-medium uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 px-5 py-2 rounded-full hover:bg-red-500/20 transition-colors">Clear</button>
          </div>
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
type AppMode = 'editor' | 'upscaler' | 'angles' | 'runpod' | 'video';
type EditorModel = 'wan-2.6' | 'wan-2.7' | 'qwen-2.0';
type Resolution = '2k' | '4k' | '8k';

interface HistoryItem { id: string; prompt: string; url: string; date: string; modelInfo?: string; }
interface SavedPrompt { id: string; name: string; prompt: string; }
interface QueueTask { id: string; mode: AppMode; prompt: string; progress: number; message: string; pollUrl: string; targetResultUrl: string; modelInfo: string; }
interface ActiveLora { id: string; name: string; strength: number; }

const RUNPOD_MODELS = [
  { id: "Qwen-Rapid-AIO-NSFW-v23.safetensors", name: "Qwen AIO (Rapid-v23)" },
  { id: "Qwen-Rapid-AIO-NSFW-v19.safetensors", name: "Qwen AIO (Rapid-v19)" }
];

const LORA_OPTIONS = [
  { id: "yarn_qwen.safetensors", name: "YARN" }, { id: "hmfemme_qwen.safetensors", name: "HMFEM" },  { id: "shavedpussyv1.safetensors", name: "PSY1" }, 
  { id: "hairypussyv5.safetensors", name: "HRYPSY5" },{ id: "hairypussyv6.safetensors", name: "HRYPSY6" },{ id: "hairypussyv7.safetensors", name: "HRYPSY7" },{ id: "hairypussyv8.safetensors", name: "HRYPSY8" },{ id: "hairypussyv9.safetensors", name: "HRYPSY9" },
  { id: "qwen4play.safetensors", name: "QWEN4PLAY" }, { id: "FemNde.safetensors", name: "FEMNUDE" },
  { id: "ENZOM_BJ.safetensors", name: "ENZOM_BJ" }, { id: "ZOOTALLURES_BJ.safetensors", name: "ZOOTALLURES_BJ" },
  { id: "GNASS_SXE.safetensors", name: "GNASS_SXE" }, { id: "FOK_SXE.safetensors", name: "FOK_SXE" },
  { id: "BRAND_ENHANCER.safetensors", name: "BRAND_ENHANCER" }, { id: "HEARME_BOOBS.safetensors", name: "HEARME_BOOBS" },
  { id: "LIMABOG_PUSSY.safetensors", name: "LIMABOG_PUSSY" }, { id: "HARPY_BKAKKE.safetensors", name: "HARPY_BKAKKE" },
  { id: "IR_BJ.safetensors", name: "IR_BJ" }, { id: "JIB_SKIN.safetensors", name: "JIB_SKIN" },
  { id: "NRDX_LIGHTING.safetensors", name: "NRDX_LIGHTING" }, { id: "ALCAITIFF.safetensors", name: "ALCAITIFF" },
  { id: "NATURALSKIN.safetensors", name: "NATURALSKIN" }
];

const BODY_TYPES = ['Random', 'Petite', 'Slim', 'Athletic', 'Curvy', 'Thick', 'Plus-size', 'Hourglass'];
const CAMERA_ANGLES = ['Random', 'Eye-level', 'High angle', 'Low angle', 'Three-quarter view', 'Side profile', 'From behind', 'Birds-eye view'];
const SHOT_TYPES = ['Random', 'Close-up (Face focus)', 'Close-up (Body focus)', 'Medium shot', 'Full body far shot'];

const horizontalOptions = [  { v: 0, l: 'Front' }, { v: 45, l: '3/4 Right' },  { v: 90, l: 'Side' }, { v: 135, l: '3/4 Left' }];
const verticalOptions = [  { v: 0, l: 'Eye Level' }, { v: -30, l: 'Low Angle' },  { v: 30, l: 'High Angle' }];
const distanceOptions = [  { v: 1, l: 'Close' }, { v: 2, l: 'Medium' }, { v: 3, l: 'Far' }];

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

const AUTO_LORA_MAP: Record<string, any> = {
  "creampie": { 
    high: "creampie.safetensors", 
    low: "creampie.safetensors", 
    high_weight: 0.9, 
    low_weight: 0.85 
  },
  "cum in mouth": { 
    high: "cum-in-mouth.safetensors", 
    low: "cum-in-mouth.safetensors", 
    high_weight: 0.9, 
    low_weight: 0.85 
  },
  "creampie coming out": { 
    high: "creampie.safetensors", 
    low: "creampie.safetensors", 
    high_weight: 0.95, 
    low_weight: 0.9 
  },
  "vagina": { 
    high: "vagina.safetensors", 
    low: "pussy.safetensors", 
    high_weight: 0.9, 
    low_weight: 0.85 
  },
  "pussy": { 
    high: "vagina.safetensors", 
    low: "pussy.safetensors", 
    high_weight: 0.9, 
    low_weight: 0.85 
  },
  "fingering": { 
    high: "fingering.safetensors", 
    low: "fingering.safetensors", 
    high_weight: 0.9, 
    low_weight: 0.85 
  },
  "twerk": { 
    high: "twerk.safetensors", 
    low: "twerk.safetensors", 
    high_weight: 0.85, 
    low_weight: 0.8 
  },
  "twerking": { 
    high: "twerk.safetensors", 
    low: "twerk.safetensors", 
    high_weight: 0.85, 
    low_weight: 0.8 
  }
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('editor');
  const [editorModel, setEditorModel] = useState<EditorModel>('wan-2.7');
  const [wavespeedKey, setWavespeedKey] = useState<string>('');
  const [runpodKey, setRunpodKey] = useState<string>('');
  const [runpodEndpointId, setRunpodEndpointId] = useState<string>('');
  const [videoEndpointId, setVideoEndpointId] = useState<string>('4k4i9q6i33lda0');
  const [grokKey, setGrokKey] = useState<string>('');
  
  const [prompt, setPrompt] = useState<string>('');
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [promptBodyType, setPromptBodyType] = useState('Random');
  const [promptAngle, setPromptAngle] = useState('Random');
  const [promptShotType, setPromptShotType] = useState('Random');
  
  const [wavespeedBalance, setWavespeedBalance] = useState<string | null>(null);
  const [runpodBalance, setRunpodBalance] = useState<string | null>(null);

  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [horizontalAngle, setHorizontalAngle] = useState<number>(0);
  const [verticalAngle, setVerticalAngle] = useState<number>(0);
  const [distance, setDistance] = useState<number>(1);

  const [runpodModel, setRunpodModel] = useState<string>('Qwen-Rapid-AIO-NSFW-v23.safetensors');
  const [activeLoras, setActiveLoras] = useState<ActiveLora[]>([]);
  const [sampler, setSampler] = useState<string>('euler');
  const [scheduler, setScheduler] = useState<string>('simple');
  const [negativePrompt, setNegativePrompt] = useState<string>('lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, username, watermark, signature');
  const [steps, setSteps] = useState<number>(6);
  const [cfg, setCfg] = useState<number>(1.5);
  const [denoise, setDenoise] = useState<number>(1.0); 

  const [videoWidth, setVideoWidth] = useState<number>(480);
  const [videoHeight, setVideoHeight] = useState<number>(832);
  const [videoFps, setVideoFps] = useState<number>(16);
  const [videoSteps, setVideoSteps] = useState<number>(10);
  const [videoCfg, setVideoCfg] = useState<number>(2.0);
  const [videoSeed, setVideoSeed] = useState<number>(-1);
  
  const [videoRefFile, setVideoRefFile] = useState<File | null>(null);
  const [videoRefPreview, setVideoRefPreview] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAdvancedRunpod, setShowAdvancedRunpod] = useState(false);
  
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showLoadPrompt, setShowLoadPrompt] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [promptToSave, setPromptToSave] = useState('');

  const [sliderPosition, setSliderPosition] = useState(50);
  const resultRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  
  // New touch and swipe tracking refs
  const touchStartX = useRef<number | null>(null);
  const isSwiping = useRef<boolean>(false);

  const COMFY_SAMPLERS = ["euler", "euler_ancestral", "heun", "heunpp2", "dpm_2", "dpm_2_ancestral", "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde", "dpmpp_sde_gpu", "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpmpp_3m_sde_gpu", "ddpm", "lcm", "ddim", "uni_pc", "uni_pc_bh2"];
  const COMFY_SCHEDULERS = ["normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform"];

  useEffect(() => {
    const savedWsKey = localStorage.getItem('arx_wavespeed_key') || '';
    const savedRpKey = localStorage.getItem('arx_runpod_key') || '';
    const savedRpEndpoint = localStorage.getItem('arx_runpod_endpoint') || '';
    const savedVidEndpoint = localStorage.getItem('arx_video_endpoint') || '4k4i9q6i33lda0';
    const savedGrok = localStorage.getItem('arx_grok_key') || '';
    const savedLoras = localStorage.getItem('arx_runpod_loras');
    const savedRpModel = localStorage.getItem('arx_runpod_model');
    const savedMode = localStorage.getItem('arx_mode') as AppMode;
    
    setMode(savedMode || 'editor');
    setEditorModel((localStorage.getItem('arx_editor_model') as EditorModel) || 'wan-2.7');
    if (savedRpModel) setRunpodModel(savedRpModel);
    
    if (savedLoras) {
      try { setActiveLoras(JSON.parse(savedLoras)); } 
      catch (e) { console.error("Failed to parse saved LoRAs", e); }
    }
    
    setWavespeedKey(savedWsKey);
    setRunpodKey(savedRpKey);
    setRunpodEndpointId(savedRpEndpoint);
    setVideoEndpointId(savedVidEndpoint);
    setGrokKey(savedGrok);
    
    const localSavedPrompts = localStorage.getItem('arx_saved_prompts');
    if (localSavedPrompts) {
      try { setSavedPrompts(JSON.parse(localSavedPrompts)); } 
      catch (e) { console.error("Failed to parse saved prompts", e); }
    }

    getHistoryDB().then(localData => {
      setHistory(localData);
      if (savedWsKey) {
        syncCloudHistory(savedWsKey);
        fetchWavespeedBalance(savedWsKey);
      }
      if (savedRpKey) {
        fetchRunPodBalance(savedRpKey);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('arx_editor_model', editorModel); }, [editorModel]);
  useEffect(() => { localStorage.setItem('arx_runpod_model', runpodModel); }, [runpodModel]);
  useEffect(() => { localStorage.setItem('arx_runpod_loras', JSON.stringify(activeLoras)); }, [activeLoras]);

  const fetchWavespeedBalance = async (keyToUse: string) => {
    if (!keyToUse) return;
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/balance", {
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

  const fetchRunPodBalance = async (keyToUse: string) => {
    if (!keyToUse) return;
    try {
      const res = await fetch("https://api.runpod.io/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyToUse}`
        },
        body: JSON.stringify({
          query: `query { myself { balance } }`
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.myself && typeof json.data.myself.balance === 'number') {
          setRunpodBalance(`$${json.data.myself.balance.toFixed(2)}`);
        }
      }
    } catch (e) {
      console.error("Failed to fetch RunPod balance", e);
    }
  };

  const syncCloudHistory = async (keyToUse: string) => {
    if (!keyToUse) return;
    setIsSyncing(true);
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/predictions?page=1&page_size=100", {
        headers: { "Authorization": `Bearer ${keyToUse}` }
      });
      if (!res.ok) return;
      
      const json = await res.json();
      const items = json.data?.items || json.items || [];
      const cloudHistory = items
        .filter((item: any) => item.status === "completed" || item.status === "succeeded" || item.outputs?.length > 0 || item.data?.outputs?.length > 0)
        .map((item: any) => {
          let imageUrl = '';
          const outputs = item.outputs || item.data?.outputs || (typeof item.output === 'string' ? [item.output] : item.output);
          const out = outputs?.[0];
          
          if (typeof out === 'string') imageUrl = out;
          else if (typeof out === 'object' && out !== null) imageUrl = out.url || out.file?.url;

          let historyPrompt = item.input?.prompt || item.model || 'Cloud Generation';
          if (item.model?.includes('upscaler')) historyPrompt = `Upscaled Image`;
          if (item.model?.includes('multiple-angles') || item.model?.includes('qwen-image/edit-multiple')) historyPrompt = `Multi-Angle Render`;

          return {
            id: item.id,
            prompt: historyPrompt,
            url: imageUrl,
            date: item.created_at || new Date().toISOString(),
            modelInfo: 'Cloud Generation'
          };
        })
        .filter((item: any) => item.url);

      setHistory(prev => {
        const merged = [...cloudHistory, ...prev];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10000);
        sorted.forEach(item => saveHistoryItem(item));
        return sorted;
      });
    } catch (e) {
      console.warn("Cloud sync failed gracefully:", e);
    } finally {
      setIsSyncing(false);
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedHistoryItem) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';     // Prevent zoom & background scroll
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
    if (!grokKey && !import.meta.env.VITE_GROK_API_KEY) {
      setError('Please enter your Grok API Key in the settings first.');
      setShowSettings(true);
      return;
    }
    setIsRandomizing(true);
    setError(null);

    try {
      const generatedPrompt = await generateRandomIdea(grokKey, prompt, promptBodyType, promptAngle, promptShotType);
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
    if (file.type.startsWith('video/')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    }
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

  const handleAnimateFromHistory = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], "animate.png", { type: blob.type });
      
      setSelectedFile(file);
      setPreviewUrl(url);
      setMode('video');
      setSelectedHistoryItem(null);
      setIsFlipped(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error("Could not extract file from history", e);
      setError("Failed to extract that image to the video engine. (CORS or network error)");
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('arx_wavespeed_key', wavespeedKey);
    localStorage.setItem('arx_runpod_key', runpodKey);
    localStorage.setItem('arx_runpod_endpoint', runpodEndpointId);
    localStorage.setItem('arx_video_endpoint', videoEndpointId);
    localStorage.setItem('arx_grok_key', grokKey);
    setShowSettings(false);
    if (wavespeedKey) {
      syncCloudHistory(wavespeedKey);
      fetchWavespeedBalance(wavespeedKey);
    }
    if (runpodKey) {
      fetchRunPodBalance(runpodKey);
    }
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

   // --- TOUCH & SWIPE HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      isSwiping.current = true;
      if (diff > 0) handleNextHistory();
      else handlePrevHistory();
    }
    touchStartX.current = null;
  };

  // Double Tap Handler (works on BOTH front and back)
  const handleDoubleTap = () => {
    const now = Date.now();
    if (window.lastTap && now - window.lastTap < 280) {
      setIsFlipped(prev => !prev);
      window.lastTap = 0;
    } else {
      window.lastTap = now;
    }
  };

  const handleDeleteHistory = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    await deleteHistoryItemDB(id);
    if (selectedHistoryItem?.id === id) {
      setSelectedHistoryItem(null);
      setIsFlipped(false);
    }
  };

  const handleSavePromptData = () => {
    if (!newPromptName.trim() || !promptToSave.trim()) return;
    const newSavedPrompt = {
      id: Date.now().toString(),
      name: newPromptName.trim(),
      prompt: promptToSave.trim()
    };
    const updated = [...savedPrompts, newSavedPrompt];
    setSavedPrompts(updated);
    localStorage.setItem('arx_saved_prompts', JSON.stringify(updated));
    setShowSavePrompt(false);
    setNewPromptName('');
  };

  const handleDeleteSavedPrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    localStorage.setItem('arx_saved_prompts', JSON.stringify(updated));
  };

  const addLora = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'none') return;
    const opt = LORA_OPTIONS.find(l => l.id === val);
    if (opt && !activeLoras.find(l => l.id === val)) {
      setActiveLoras([...activeLoras, { id: opt.id, name: opt.name, strength: 0.8 }]);
    }
    e.target.value = 'none';
  };

  const updateLoraStrength = (id: string, strength: number) => {
    setActiveLoras(prev => prev.map(l => l.id === id ? { ...l, strength } : l));
  };

  const removeLora = (id: string) => {
    setActiveLoras(prev => prev.filter(l => l.id !== id));
  };

  const extractBase64 = (obj: any, isVideo: boolean = false): string | null => {
    if (typeof obj === 'string') {
      if (obj.startsWith('data:video') || obj.startsWith('http')) return obj;
      if (obj.startsWith('data:image')) return obj;
      if (obj.length > 2000) {
        return isVideo ? `data:video/mp4;base64,${obj}` : `data:image/png;base64,${obj}`;
      }
      return null;
    }
    if (typeof obj === 'object' && obj !== null) {
      if (obj.video) {
        const v = obj.video;
        return typeof v === 'string' 
          ? (v.startsWith('data:') ? v : `data:video/mp4;base64,${v}`)
          : null;
      }
      if (obj.output?.video) {
        const v = obj.output.video;
        return typeof v === 'string' 
          ? (v.startsWith('data:') ? v : `data:video/mp4;base64,${v}`)
          : null;
      }
      if (obj.data?.video) {
        const v = obj.data.video;
        return typeof v === 'string' 
          ? (v.startsWith('data:') ? v : `data:video/mp4;base64,${v}`)
          : null;
      }
      for (const key in obj) {
        const res = extractBase64(obj[key], isVideo);
        if (res) return res;
      }
    }
    return null;
  };

  const triggerRunPodVideo = async (base64Image: string, retryCount = 0): Promise<any> => {
    let safeBase64 = cleanAndPadBase64(base64Image);

    // Aggressive compression for large images
    if ((safeBase64.length > 2_500_000 || (selectedFile && selectedFile.size > 1_200_000)) && selectedFile && !selectedFile.type.startsWith('video/')) {
      const compressed = await optimizeImageForUpload(selectedFile, 768);
      safeBase64 = cleanAndPadBase64(compressed);
    }
    
    let safeVideoBase64 = null;
    if (videoRefFile) {
      const rawVideoBase64 = await fileToBase64(videoRefFile);
      safeVideoBase64 = cleanAndPadBase64(rawVideoBase64);
    }

    // Generalized default prompt with good Wan 2.2 enhancers
    let activePrompt = prompt.trim();
    if (!activePrompt) {
      activePrompt = "beautiful woman, natural smooth motion, detailed face, realistic movement, high quality, cinematic lighting";
    }

    const payload: any = {
      input: {
        prompt: activePrompt,
        negative_prompt: negativePrompt || "blurry, low quality, distorted",
        image_base64: safeBase64,
        seed: videoSeed === -1 ? Math.floor(Math.random() * 999999999) : videoSeed,
        cfg: videoCfg,
        width: videoWidth,
        height: videoHeight,
        fps: videoFps,
        steps: videoSteps,
      }
    };
    
    if (safeVideoBase64) {
      payload.input.video_base64 = safeVideoBase64;
    }

    console.log("📤 Sending to RunPod Video WanAnimate API:", {
      prompt: activePrompt.substring(0, 120) + (activePrompt.length > 120 ? "..." : ""),
      includesReferenceVideo: !!safeVideoBase64
    });

    try {
      const response = await fetch(`https://api.runpod.ai/v2/${videoEndpointId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${runpodKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🚨 RunPod Error Response:", errorText);
        
        if (retryCount < 2 && (errorText.includes("time") || errorText.includes("Connection"))) {
          console.log(`🔄 Retrying (${retryCount + 1}/3)...`);
          await new Promise(r => setTimeout(r, 5000));
          return triggerRunPodVideo(base64Image, retryCount + 1);
        }
        throw new Error(`RunPod rejected request: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        pollUrl: `https://api.runpod.ai/v2/${videoEndpointId}/status/${data.id}`,
        historyPrompt: activePrompt,
        modelInfo: safeVideoBase64 ? 'WanAnimate Video2Video' : 'WanAnimate Image2Video'
      };
    } catch (err: any) {
      console.error("Video trigger failed:", err);
      throw err;
    }
  };

  const triggerRunPod = async (base64Image: string) => {
    const safeBase64 = cleanAndPadBase64(base64Image);
    const activeEndpointId = runpodEndpointId;

    const workflowObj: any = {
      "5": { 
        "inputs": { "ckpt_name": runpodModel },
        "class_type": "CheckpointLoaderSimple"
      }
    };

    let lastModelNodeId = "5";
    let lastModelOutputIndex = 0;
    let lastClipNodeId = "5";
    let lastClipOutputIndex = 1;
    let currentId = 100;

    activeLoras.forEach(lora => {
      const nodeId = currentId.toString();
      workflowObj[nodeId] = {
        "inputs": {
          "lora_name": lora.id,
          "strength_model": lora.strength,
          "strength_clip": lora.strength,
          "model": [lastModelNodeId, lastModelOutputIndex],
          "clip": [lastClipNodeId, lastClipOutputIndex]
        },
        "class_type": "LoraLoader"
      };
      lastModelNodeId = nodeId;
      lastModelOutputIndex = 0;
      lastClipNodeId = nodeId;
      lastClipOutputIndex = 1;
      currentId++;
    });

    workflowObj["8"] = { "inputs": { "samples": ["3", 0], "vae": ["5", 2] }, "class_type": "VAEDecode" };
    workflowObj["60"] = { "inputs": { "filename_prefix": "ARX_Edit", "images": ["8", 0] }, "class_type": "SaveImage" };
    workflowObj["78"] = { "inputs": { "image": "input_image.png" }, "class_type": "LoadImage" };
    workflowObj["88"] = { "inputs": { "pixels": ["93", 0], "vae": ["5", 2] }, "class_type": "VAEEncode" };
    workflowObj["93"] = { "inputs": { "upscale_method": "lanczos", "megapixels": 1, "resolution_steps": 64, "image": ["78", 0] }, "class_type": "ImageScaleToTotalPixels" };
    workflowObj["110"] = { "inputs": { "prompt": negativePrompt, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    workflowObj["111"] = { "inputs": { "prompt": prompt || "change to red", "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    workflowObj["3"] = {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000), 
        "steps": steps, 
        "cfg": cfg,
        "sampler_name": sampler,
        "scheduler": scheduler,
        "denoise": denoise,
        "model": [lastModelNodeId, lastModelOutputIndex],
        "positive": ["111", 0],
        "negative": ["110", 0],
        "latent_image": ["88", 0]
      },
      "class_type": "KSampler"
    };

    const imagesPayload = [
        { name: "input_image.png", image: safeBase64 }
    ];

    const payload = {
      input: {
        workflow: workflowObj,
        images: imagesPayload
      }
    };

    const response = await fetch(`https://api.runpod.ai/v2/${activeEndpointId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runpodKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`RunPod API Error: ${data.error?.message || data.error || 'Request Failed'}`);

    const id = data.id;
    if (!id) throw new Error('RunPod API Error: Missing Job ID');
    
    const modelName = RUNPOD_MODELS.find(m => m.id === runpodModel)?.name || 'RunPod Base';
    let usedModelInfo = activeLoras.length === 0 
      ? `${modelName} Base` 
      : `${modelName} + ` + activeLoras.map(l => `${l.name} (${l.strength.toFixed(1)})`).join(' + ');
      
    return {
      id,
      pollUrl: `https://api.runpod.ai/v2/${activeEndpointId}/status/${id}`,
      targetResultUrl: '',
      historyPrompt: prompt,
      modelInfo: usedModelInfo
    };
  };

  const triggerWavespeedAngles = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch("https://api.wavespeed.ai/api/v3/media/upload/binary", {
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

    const triggerResponse = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles", {
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
        pollUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles/requests/${id}/status`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles/requests/${id}`;
      } else {
        pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
      }
    }

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: `Multi-Angle | H:${horizontalAngle}° V:${verticalAngle}° D:${distance}`,
      modelInfo: "Multi-Angle Generator"
    };
  };

  const triggerWavespeedUpscale = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch("https://api.wavespeed.ai/api/v3/media/upload/binary", {
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

    const triggerResponse = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler", {
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
        pollUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler/requests/${id}/status`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler/requests/${id}`;
      } else {
        pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
      }
    }

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: `Upscaled to ${targetResolution.toUpperCase()}`,
      modelInfo: "AI Upscaler"
    };
  };

  const triggerWavespeed = async (base64Image: string) => {
    const safeBase64 = cleanAndPadBase64(base64Image);
    const payload: any = { 
        images: [safeBase64], 
        prompt: prompt, 
        seed: -1
    };
    
    if (editorModel === 'wan-2.6') {
        payload.enable_prompt_expansion = false;
        payload.guidance_scale = 7.5;
        payload.num_inference_steps = 30;
    }

    let endpoint = '';
    let basePath = '';

    if (editorModel === 'qwen-2.0') {
        endpoint = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image-2.0/edit';
        basePath = 'wavespeed-ai/qwen-image-2.0/edit';
    } else {
        endpoint = `https://api.wavespeed.ai/api/v3/alibaba/${editorModel}/image-edit`;
        basePath = `alibaba/${editorModel}/image-edit`;
    }

    const triggerResponse = await fetch(endpoint, {
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
        pollUrl = `https://api.wavespeed.ai/api/v3/${basePath}/requests/${id}/status`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/${basePath}/requests/${id}`;
      } else {
        pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
      }
    }
    
    const usedModelInfo = editorModel === 'wan-2.6' ? 'Wan 2.6' : editorModel === 'wan-2.7' ? 'Wan 2.7' : 'Qwen 2.0';

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: prompt,
      modelInfo: usedModelInfo
    };
  };

  const generateEdit = async () => {
    if (mode === 'runpod' || mode === 'video') {
      if (mode === 'video' && (!runpodKey || !videoEndpointId)) {
        setError('Please enter your RunPod API Key and Video Endpoint ID in settings.');
        setShowSettings(true); 
        return;
      }
      if (mode === 'runpod' && (!runpodKey || !runpodEndpointId)) {
        setError('Please enter your RunPod API Key and Standard Endpoint ID in settings.');
        setShowSettings(true); 
        return;
      }
    } else {
      if (!wavespeedKey) {
        setError('Please enter your Wavespeed API Key in settings.');
        setShowSettings(true); 
        return;
      }
    }

    if ((mode === 'editor' || mode === 'runpod' || mode === 'video') && !prompt) {
      setError('Please enter a generation prompt.');
      return;
    }

    if (!selectedFile) {
      setError('Please upload a primary image to process.');
      return;
    }

    setError(null); 
    setIsSubmitting(true);

    try {
      if (window.innerWidth < 1024 && resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      let triggerResult;
      
      if (mode === 'upscaler') {
        triggerResult = await triggerWavespeedUpscale(selectedFile);
      } else if (mode === 'angles') {
        triggerResult = await triggerWavespeedAngles(selectedFile);
      } else if (mode === 'video') {
        const base64ImageRaw = await fileToBase64(selectedFile);
        triggerResult = await triggerRunPodVideo(base64ImageRaw);
      } else if (mode === 'runpod') {
        const base64ImageRaw = await fileToBase64(selectedFile);
        triggerResult = await triggerRunPod(base64ImageRaw);
      } else {
        const base64ImageRaw = await fileToBase64(selectedFile);
        triggerResult = await triggerWavespeed(base64ImageRaw);
      } 

      const newTask: QueueTask = {
        id: triggerResult.id,
        mode: mode,
        prompt: triggerResult.historyPrompt,
        progress: 15,
        message: 'Queued...',
        pollUrl: triggerResult.pollUrl,
        targetResultUrl: triggerResult.targetResultUrl,
        modelInfo: triggerResult.modelInfo
      };

      setQueue(prev => [...prev, newTask]);
      pollBackground(newTask);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const pollBackground = async (task: QueueTask) => {
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

        const headers: any = {};
        if (task.mode === 'runpod' || task.mode === 'video') {
          headers["Authorization"] = `Bearer ${runpodKey}`;
        } else {
          headers["Authorization"] = `Bearer ${wavespeedKey}`;
        }

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

          if (task.mode === 'runpod' || task.mode === 'video') {
            let finalOutput = extractBase64(pollData.output || pollData, task.mode === 'video') || '';

            if (finalOutput) {
              isCompleted = true;

              if (finalOutput.startsWith('data:')) {
                setQueue(prev => prev.map(t => t.id === task.id ? { ...t, message: 'Uploading to Firebase...' } : t));
                const isVid = finalOutput.startsWith('data:video') || isVideoUrl(finalOutput);
                const contentType = isVid ? 'video/mp4' : 'image/png';
                const fileExt = isVid ? 'mp4' : 'png';
                
                try {
                  const fileBlob = base64ToBlob(finalOutput, contentType);
                  const firebaseUrl = await uploadToFirebase(fileBlob, `outputs/${task.id}.${fileExt}`);
                  await handleFinalSuccess(firebaseUrl, task.id, task.prompt, task.modelInfo);
                } catch (fbErr) {
                  console.error("Firebase upload failed, falling back to local base64.", fbErr);
                  await handleFinalSuccess(finalOutput, task.id, task.prompt, task.modelInfo);
                }
              } else {
                await handleFinalSuccess(finalOutput, task.id, task.prompt, task.modelInfo);
              }
              continue;
            } else {
              const dump = JSON.stringify(pollData.output || pollData).substring(0, 300);
              throw new Error(`RunPod returned success but no output found. Payload preview: ${dump}...`);
            }
          } else {
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
              await handleFinalSuccess(finalImage, task.id, task.prompt, task.modelInfo);
            } else {
              throw new Error("Generation succeeded but no output URL was found.");
            }
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
      setError(`Task ${task.id.substring(0, 6)} Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSuccess = async (finalDataUrl: string, taskId: string, taskPrompt: string, modelInfoStr: string) => {
    let displayUrl = finalDataUrl;

    // Create a local blob specifically for rendering the active UI if it's base64
    // (This prevents sluggish UI rendering for massive base64 strings)
    if (finalDataUrl.startsWith('data:video')) {
      try {
        const blob = base64ToBlob(finalDataUrl, 'video/mp4');
        displayUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.warn("Could not create blob URL for video", e);
      }
    } else if (finalDataUrl.startsWith('data:image')) {
      try {
        const blob = base64ToBlob(finalDataUrl, 'image/png');
        displayUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.warn("Could not create blob URL for image", e);
      }
    }

    // Save the PERMANENT URL (Firebase or Base64) to history, never the blob
    const newItem: HistoryItem = { 
      id: taskId, 
      prompt: taskPrompt, 
      url: finalDataUrl, 
      date: new Date().toISOString(),
      modelInfo: modelInfoStr 
    };
    
    setHistory(prev => {
      const merged = [newItem, ...prev];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10000);
    });
    
    await saveHistoryItem(newItem);
    await pruneHistoryDB(100);

    setQueue(prev => prev.filter(t => t.id !== taskId));
    
    // Set the live UI to use the efficient Blob URL
    setResultUrl(displayUrl);
    setResultId(taskId);
    
    if (wavespeedKey) fetchWavespeedBalance(wavespeedKey);
    if (runpodKey) fetchRunPodBalance(runpodKey);
  };

  const handleDownload = async (url: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
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

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const displayBalance = (mode === 'runpod' || mode === 'video') ? runpodBalance : wavespeedBalance;
  const balanceLabel = (mode === 'runpod' || mode === 'video') ? 'RunPod' : 'Wavespeed';

  const memoizedPrompt = useMemo(() => prompt, [prompt]);
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TechApexIcon className="text-zinc-100 w-6 h-6 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ARX</h1>
        </div>
        <div className="flex items-center gap-4">
          
          {displayBalance && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest hidden sm:inline">
                {balanceLabel}: {displayBalance}
              </span>
              <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest sm:hidden">
                {displayBalance}
              </span>
            </div>
          )}

          {queue.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full">
              <Layers className="w-3.5 h-3.5 text-zinc-100 animate-pulse" />
              <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest hidden sm:inline">{queue.length} Active Queue</span>
              <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest sm:hidden">{queue.length} Active</span>
            </div>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-2.5 hover:bg-zinc-900 rounded-xl border border-transparent hover:border-zinc-800 transition-all group"
          >
            <Settings className={`w-5 h-5 transition-transform group-hover:rotate-90 ${(mode !== 'runpod' && mode !== 'video' && !wavespeedKey) || ((mode === 'runpod' || mode === 'video') && !runpodKey) ? 'text-zinc-500 animate-pulse' : 'text-zinc-400 group-hover:text-zinc-100'}`} />
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-5 space-y-8 sm:space-y-10">
          
          {/* Master Mode Switcher */}
          <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50 shadow-inner gap-1 overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-x-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <button
              onClick={() => setMode('editor')}
              className={`py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap sm:whitespace-normal ${
                mode === 'editor' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Editor
            </button>
            <button
              onClick={() => setMode('runpod')}
              className={`py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap sm:whitespace-normal ${
                mode === 'runpod' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              RunPod
            </button>
            <button
              onClick={() => setMode('video')}
              className={`py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap sm:whitespace-normal ${
                mode === 'video' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Video
            </button>
            <button
              onClick={() => setMode('angles')}
              className={`py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap sm:whitespace-normal ${
                mode === 'angles' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Angles
            </button>
            <button
              onClick={() => setMode('upscaler')}
              className={`py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap sm:whitespace-normal ${
                mode === 'upscaler' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Upscale
            </button>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 font-mono">
                01 // {mode === 'editor' ? 'Primary Asset' : mode === 'runpod' ? 'Image for ComfyUI' : mode === 'video' ? 'Image for Video Generation' : mode === 'upscaler' ? 'Image to Upscale' : 'Subject to Rotate'}
              </h2>
            </div>
            
            <div className="h-[200px]">
              <UploadZone 
                label={mode === 'editor' ? 'Upload Image to Edit' : mode === 'runpod' ? 'Upload Image for RunPod Endpoint' : mode === 'video' ? 'Upload Starting Frame' : mode === 'upscaler' ? 'Upload Image to Enhance' : 'Upload Image to Extract Angles'}
                file={selectedFile} 
                preview={previewUrl} 
                accept="image/*"
                onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                onProcess={(f: File) => handleFileProcess(f)} 
              />
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
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest text-center mb-4">
                    Target Output Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['2k', '4k', '8k'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => setTargetResolution(res)}
                        className={`py-4 rounded-xl text-xs font-medium uppercase tracking-widest transition-all ${
                          targetResolution === res 
                            ? 'bg-zinc-100 text-zinc-900 shadow-sm scale-105' 
                            : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'angles' && (
                <div className="space-y-6 bg-zinc-900/30 p-5 sm:p-6 border border-zinc-800/50 rounded-2xl">
                  {/* Horizontal Angle */}
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>Horizontal Rotation (Azimuth)</span>
                      <span className="text-zinc-100">{horizontalAngle}°</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {horizontalOptions.map((opt) => (
                        <button
                          key={`h-${opt.v}`}
                          onClick={() => setHorizontalAngle(opt.v)}
                          className={`py-2 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${
                            horizontalAngle === opt.v 
                              ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' 
                              : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-zinc-800/50">
                    {/* Vertical Angle */}
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Vertical Tilt</span>
                        <span className="text-zinc-100">{verticalAngle}°</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {verticalOptions.map((opt) => (
                          <button
                            key={`v-${opt.v}`}
                            onClick={() => setVerticalAngle(opt.v)}
                            className={`py-2 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${
                              verticalAngle === opt.v 
                                ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' 
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Distance</span>
                        <span className="text-zinc-100">Level {distance}</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {distanceOptions.map((opt) => (
                          <button
                            key={`d-${opt.v}`}
                            onClick={() => setDistance(opt.v)}
                            className={`py-2 px-1 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${
                              distance === opt.v 
                                ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' 
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {opt.l}
                          </button>
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
                      Wan 2.2 Video Generator
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleRandomizePrompt}
                        disabled={isRandomizing}
                        className="text-[9px] flex items-center gap-1.5 text-rose-400 hover:text-rose-300 uppercase tracking-widest font-mono transition-colors disabled:opacity-50"
                      >
                        <Dices className={`w-3 h-3 ${isRandomizing ? 'animate-spin' : ''}`} />
                        Architect Prompt
                      </button>
                      <button
                        onClick={() => setShowLoadPrompt(true)}
                        className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors"
                      >
                        <Bookmark className="w-3 h-3" />
                        Presets
                      </button>
                    </div>
                  </div>

                  {/* --- PROMPT CONFIGURATION UI --- */}
                  <div className="pt-2 pb-4 mb-2 border-b border-zinc-800/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <UserCircle className="w-3.5 h-3.5" /> Body Type
                        </label>
                        <select 
                          value={promptBodyType} 
                          onChange={(e) => setPromptBodyType(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 cursor-pointer"
                        >
                          {BODY_TYPES.map(bt => <option key={bt}>{bt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <Camera className="w-3.5 h-3.5" /> Angle
                        </label>
                        <select 
                          value={promptAngle} 
                          onChange={(e) => setPromptAngle(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 cursor-pointer"
                        >
                          {CAMERA_ANGLES.map(a => <option key={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <Camera className="w-3.5 h-3.5" /> Shot Type
                        </label>
                        <select 
                          value={promptShotType} 
                          onChange={(e) => setPromptShotType(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 cursor-pointer"
                        >
                          {SHOT_TYPES.map(st => <option key={st}>{st}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea 
                      value={memoizedPrompt} 
                      onChange={handlePromptChange}
                      placeholder="Describe the motion and scene details..." 
                      className="w-full h-24 p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed resize-y" 
                    />
                    <div className="absolute bottom-4 right-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
                      Positive Prompt
                    </div>
                  </div>

                  <div className="relative">
                    <textarea 
                      value={negativePrompt} 
                      onChange={(e) => setNegativePrompt(e.target.value)} 
                      placeholder="Negative prompt..." 
                      className="w-full h-16 p-4 bg-red-950/20 border border-red-900/30 rounded-xl focus:ring-1 focus:ring-red-500/50 outline-none text-xs leading-relaxed text-zinc-300" 
                    />
                    <div className="absolute bottom-3 right-3 text-[9px] font-mono text-red-500/50 uppercase tracking-widest pointer-events-none">
                      Negative
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                        Steps <span>{videoSteps}</span>
                      </label>
                      <input 
                        type="range" min="1" max="50" step="1" 
                        value={videoSteps} onChange={(e) => setVideoSteps(Number(e.target.value))}
                        className="w-full accent-zinc-100" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                        CFG <span>{videoCfg.toFixed(1)}</span>
                      </label>
                      <input 
                        type="range" min="1" max="10" step="0.5" 
                        value={videoCfg} onChange={(e) => setVideoCfg(Number(e.target.value))}
                        className="w-full accent-zinc-100" 
                      />
                    </div>
                  </div>

                  {/* --- WANANIMATE REFERENCE VIDEO SECTION --- */}
                  <div className="pt-4 border-t border-zinc-800/50 mt-4">
                     <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">Reference Video (WanAnimate Pose/Motion)</label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="h-32">
                             <UploadZone
                                label="Upload Reference Video (.mp4)"
                                file={videoRefFile}
                                preview={videoRefPreview}
                                icon={Film}
                                accept="video/mp4,video/quicktime,video/webm"
                                onClear={() => { 
                                  if (videoRefPreview && videoRefPreview.startsWith('blob:')) URL.revokeObjectURL(videoRefPreview);
                                  setVideoRefFile(null); 
                                  setVideoRefPreview(null); 
                                }}
                                onProcess={(f: File) => {
                                    if (videoRefPreview && videoRefPreview.startsWith('blob:')) URL.revokeObjectURL(videoRefPreview);
                                    const url = URL.createObjectURL(f);
                                    setVideoRefFile(f);
                                    setVideoRefPreview(url);
                                }}
                              />
                         </div>
                         <div className="flex flex-col justify-center space-y-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                             <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex justify-between">
                                 Output FPS <span>{videoFps}</span>
                             </label>
                             <input
                                 type="range" min="8" max="30" step="1"
                                 value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))}
                                 className="w-full accent-zinc-100"
                             />
                             <p className="text-[9px] text-zinc-500 leading-relaxed">
                                 Higher FPS yields smoother motion but requires more generation time. Provide a reference video for advanced pose mapping.
                             </p>
                         </div>
                     </div>
                  </div>
                </div>
              )}

              {mode === 'runpod' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      RunPod Endpoint
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleRandomizePrompt}
                        disabled={isRandomizing}
                        className="text-[9px] flex items-center gap-1.5 text-rose-400 hover:text-rose-300 uppercase tracking-widest font-mono transition-colors disabled:opacity-50"
                      >
                        <Dices className={`w-3 h-3 ${isRandomizing ? 'animate-spin' : ''}`} />
                        Architect Prompt
                      </button>
                      <button
                        onClick={() => setShowAdvancedRunpod(!showAdvancedRunpod)}
                        className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors"
                      >
                        <Settings2 className="w-3 h-3" />
                        Advanced
                      </button>
                      <button
                        onClick={() => setShowLoadPrompt(true)}
                        className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors"
                      >
                        <Bookmark className="w-3 h-3" />
                        Presets
                      </button>
                    </div>
                  </div>
                  
                  {/* --- PROMPT CONFIGURATION UI --- */}
                  <div className="pt-2 pb-4 mb-2 border-b border-zinc-800/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Body Type */}
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                          Body Type
                        </label>
                        <select
                          value={promptBodyType}
                          onChange={(e) => setPromptBodyType(e.target.value)}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
                        >
                          {BODY_TYPES.map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Angle */}
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                          Camera Angle
                        </label>
                        <select
                          value={promptAngle}
                          onChange={(e) => setPromptAngle(e.target.value)}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
                        >
                          {CAMERA_ANGLES.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      {/* Shot Type */}
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                          Shot Type
                        </label>
                        <select
                          value={promptShotType}
                          onChange={(e) => setPromptShotType(e.target.value)}
                          className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
                        >
                          {SHOT_TYPES.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Textarea */}
                  <div className="relative">
                    <textarea
                      value={memoizedPrompt}
                      onChange={handlePromptChange}
                      placeholder="Enter a base position (e.g., 'doggy style', 'missionary') or leave blank for random..."
                      className="w-full h-28 p-5 bg-zinc-900/50 border border-zinc-800 rounded-3xl focus:border-zinc-600 focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed resize-y min-h-[100px]"
                    />
                    
                    <div className="absolute bottom-4 right-5 text-[10px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
                      Positive Prompt
                    </div>
                  </div>

                  <AnimatePresence>
                    {showAdvancedRunpod && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-4 border-t border-zinc-800/50">

                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                            <div>
                              <label className="block text-[10px] font-medium text-zinc-100 uppercase tracking-widest mb-3">Base Neural Architecture</label>
                              <select
                                value={runpodModel}
                                onChange={(e) => setRunpodModel(e.target.value)}
                                className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 font-mono uppercase tracking-widest"
                              >
                                {RUNPOD_MODELS.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-zinc-800/50">
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                <span>Active Style Injections (LoRAs)</span>
                              </label>
                              
                              <div className="space-y-2 mb-3">
                                {activeLoras.map(lora => (
                                  <div key={lora.id} className="flex items-center gap-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                                    <span className="text-[9px] font-mono text-zinc-300 w-24 truncate">{lora.name}</span>
                                    <input 
                                      type="range" min="0" max="2" step="0.1" 
                                      value={lora.strength} 
                                      onChange={(e) => updateLoraStrength(lora.id, Number(e.target.value))}
                                      className="flex-1 accent-zinc-500 h-1" 
                                    />
                                    <span className="text-[9px] font-mono text-zinc-500 w-6 text-right">{lora.strength.toFixed(1)}</span>
                                    <button onClick={() => removeLora(lora.id)} className="text-zinc-600 hover:text-red-400 p-1 transition-colors">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {activeLoras.length === 0 && (
                                  <div className="text-[9px] font-mono text-zinc-600 italic text-center py-2">No LoRAs active</div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <select 
                                  onChange={addLora}
                                  value="none"
                                  className="flex-1 p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] uppercase tracking-widest outline-none focus:border-zinc-500 text-zinc-400 shadow-inner"
                                >
                                  <option value="none">Add LoRA to Chain...</option>
                                  {LORA_OPTIONS.filter(opt => !activeLoras.find(l => l.id === opt.id)).map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                  ))}
                                </select>
                                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 border border-zinc-700 pointer-events-none">
                                  <Plus className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="relative">
                            <textarea 
                              value={negativePrompt} 
                              onChange={(e) => setNegativePrompt(e.target.value)} 
                              placeholder="Negative prompt..." 
                              className="w-full h-20 p-4 bg-red-950/20 border border-red-900/30 rounded-xl focus:ring-1 focus:ring-red-500/50 outline-none text-xs leading-relaxed text-zinc-300" 
                            />
                            <div className="absolute bottom-3 right-3 text-[9px] font-mono text-red-500/50 uppercase tracking-widest pointer-events-none">
                              Negative Prompt
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Sampler</label>
                              <select 
                                value={sampler} 
                                onChange={(e) => setSampler(e.target.value)}
                                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300"
                              >
                                {COMFY_SAMPLERS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Scheduler</label>
                              <select 
                                value={scheduler} 
                                onChange={(e) => setScheduler(e.target.value)}
                                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300"
                              >
                                {COMFY_SCHEDULERS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                                Steps <span>{steps}</span>
                              </label>
                              <input 
                                type="range" min="4" max="40" step="1" 
                                value={steps} onChange={(e) => setSteps(Number(e.target.value))}
                                className="w-full accent-zinc-100" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                                CFG <span>{cfg.toFixed(1)}</span>
                              </label>
                              <input 
                                type="range" min="1" max="8" step="0.1" 
                                value={cfg} onChange={(e) => setCfg(Number(e.target.value))}
                                className="w-full accent-zinc-100" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                                Denoise <span>{denoise.toFixed(2)}</span>
                              </label>
                              <input 
                                type="range" min="0.6" max="1.1" step="0.01" 
                                value={denoise} onChange={(e) => setDenoise(Number(e.target.value))}
                                className="w-full accent-zinc-100" 
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {mode === 'editor' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      AI Editing Engine
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleRandomizePrompt}
                        disabled={isRandomizing}
                        className="text-[9px] flex items-center gap-1.5 text-rose-400 hover:text-rose-300 uppercase tracking-widest font-mono transition-colors disabled:opacity-50"
                      >
                        <Dices className={`w-3 h-3 ${isRandomizing ? 'animate-spin' : ''}`} />
                        Architect Prompt
                      </button>
                      <button
                        onClick={() => setShowLoadPrompt(true)}
                        className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors"
                      >
                        <Bookmark className="w-3 h-3" />
                        Saved Prompts
                      </button>
                    </div>
                  </div>
                  
                  {/* --- PROMPT CONFIGURATION UI --- */}
                  <div className="pt-2 pb-4 mb-2 border-b border-zinc-800/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <UserCircle className="w-3.5 h-3.5" /> Body Type
                        </label>
                        <select 
                          value={promptBodyType} 
                          onChange={(e) => setPromptBodyType(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 cursor-pointer"
                        >
                          {BODY_TYPES.map(bt => <option key={bt}>{bt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <Camera className="w-3.5 h-3.5" /> Angle
                        </label>
                        <select 
                          value={promptAngle} 
                          onChange={(e) => setPromptAngle(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 cursor-pointer"
                        >
                          {CAMERA_ANGLES.map(a => <option key={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <Camera className="w-3.5 h-3.5" /> Shot Type
                        </label>
                        <select 
                          value={promptShotType} 
                          onChange={(e) => setPromptShotType(e.target.value)}
                          className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs outline-none focus:border-zinc-500 text-zinc-300 cursor-pointer"
                        >
                          {SHOT_TYPES.map(st => <option key={st}>{st}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <button
                      onClick={() => setEditorModel('wan-2.6')}
                      className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                        editorModel === 'wan-2.6' 
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' 
                          : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                      }`}
                    >
                      Wan 2.6
                    </button>
                    <button
                      onClick={() => setEditorModel('wan-2.7')}
                      className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                        editorModel === 'wan-2.7' 
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' 
                          : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                      }`}
                    >
                      Wan 2.7
                    </button>
                    <button
                      onClick={() => setEditorModel('qwen-2.0')}
                      className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                        editorModel === 'qwen-2.0' 
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm scale-105' 
                          : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                      }`}
                    >
                      Qwen 2.0
                    </button>
                  </div>
                  
                  <div className="relative">
                    <textarea 
                      value={memoizedPrompt} 
                      onChange={handlePromptChange}
                      placeholder="Describe the modifications (e.g. 'change her outfit to a red jacket')...." 
                      className="w-full h-32 p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed resize-y" 
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      <button 
                        onClick={enhancePrompt}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                        title="Magic Prompt Enhancer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
                        {editorModel === 'wan-2.7' ? 'Wan-2.7 Editor' : editorModel === 'qwen-2.0' ? 'Qwen-2.0 Editor' : 'Wan-2.6 Editor'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={generateEdit}
                disabled={isSubmitting} 
                className="w-full py-5 rounded-2xl font-medium uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all bg-zinc-100 text-zinc-950 hover:bg-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'upscaler' && <Maximize className="w-5 h-5" />}
                    {mode === 'editor' && <Sparkles className="w-5 h-5" />}
                    {mode === 'runpod' && <Server className="w-5 h-5" />}
                    {mode === 'video' && <Film className="w-5 h-5" />}
                    {mode === 'angles' && <Box className="w-5 h-5" />}
                  </>
                )}
                {isSubmitting ? 'Uploading to Server...' 
                 : mode === 'upscaler' ? 'Queue Resolution Enhancement' 
                 : mode === 'angles' ? 'Queue 3D Camera Angle' 
                 : mode === 'video' ? 'Queue Video Generation'
                 : mode === 'runpod' ? 'Queue RunPod Task'
                 : 'Queue AI Edit'}
              </button>

              {/* Dynamic Action Queue */}
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
                    {queue.map(task => (
                      <motion.div 
                        key={task.id} 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-inner"
                      >
                        <div className="flex justify-between items-center mb-3">
                           <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                             {task.mode === 'angles' ? 'Multi-Angle' : task.mode === 'runpod' ? 'RunPod Serverless' : task.mode === 'video' ? 'Video' : task.mode}
                           </span>
                           <span className="text-[10px] font-medium text-zinc-100">
                             {Math.round(task.progress)}%
                           </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
                           <div className="h-full bg-zinc-300 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest truncate flex-1">
                            {task.prompt}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-300 uppercase tracking-widest truncate">
                            {task.message}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
            </div>
          </section>
          
          {error && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-red-400 text-[11px] font-mono uppercase">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Right Column (Results) */}
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
            
            <div className="relative aspect-square sm:aspect-[4/3] bg-zinc-900/30 rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-xl flex items-center justify-center">
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
                          
                          let dynamicModelInfo = editorModel;
                          if (mode === 'video') {
                              dynamicModelInfo = videoRefFile ? 'WanAnimate Video2Video' : 'WanAnimate Image2Video';
                          } else if (mode === 'runpod') {
                            const modelName = RUNPOD_MODELS.find(m => m.id === runpodModel)?.name || 'RunPod Base';
                            dynamicModelInfo = activeLoras.length === 0 ? `${modelName} Base` : `${modelName} + ` + activeLoras.map(l => `${l.name} (${l.strength.toFixed(1)})`).join(' + ');
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
                              onError={(e) => {
                                console.error("Video playback error:", e);
                                // Fallback: try creating blob URL
                                if (resultUrl.startsWith('data:')) {
                                  try {
                                    const blob = base64ToBlob(resultUrl, 'video/mp4');
                                    const blobUrl = URL.createObjectURL(blob);
                                    e.currentTarget.src = blobUrl;
                                  } catch(err) {
                                    console.error("Fallback blob creation failed", err);
                                  }
                                }
                              }}
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
                    <Layers className="w-12 h-12 text-zinc-700 animate-pulse mb-4" />
                    <p className="text-sm font-medium mb-2 uppercase tracking-widest text-zinc-300">Processing Tasks</p>
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
      </main>

      {/* History Grid */}
      {history.length > 0 && (
        <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-16 border-t border-zinc-800/50 pb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 font-mono">
              03 // Generation Log
            </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => syncCloudHistory(wavespeedKey)}
                disabled={isSyncing || !wavespeedKey}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors text-[9px] font-medium uppercase tracking-widest text-zinc-300 disabled:opacity-50 border border-zinc-800"
              >
                <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-zinc-100' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Fetch Cloud Sync'}
              </button>
              <History className="w-4 h-4 text-zinc-500 hidden sm:block" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="relative group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/30 aspect-square"
              >
                {isVideoUrl(item.url) ? (
                   <video 
                     src={item.url} 
                     autoPlay loop muted playsInline
                     className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500 opacity-80 hover:opacity-100" 
                     onClick={() => { 
                       setSelectedHistoryItem(item); 
                       setIsFlipped(false); 
                     }} 
                   />
                ) : (
                   <img 
                     src={item.url} 
                     alt={item.prompt} 
                     className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500 opacity-80 hover:opacity-100" 
                     onClick={() => { 
                       setSelectedHistoryItem(item); 
                       setIsFlipped(false); 
                     }} 
                   />
                )}
                
                <button 
                  onClick={(e) => handleDeleteHistory(item.id, e)} 
                  className="absolute top-2 left-2 p-2 bg-zinc-950/80 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

{/* === PREMIUM FLIP MODAL - DOUBLE TAP BOTH SIDES + AUTO HIDE HINT === */}
<AnimatePresence>
  {selectedHistoryItem && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { setSelectedHistoryItem(null); setIsFlipped(false); }}
        className="fixed inset-0 bg-zinc-950/95 backdrop-blur-xl z-[80]"
      />

      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-8 overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {history.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevHistory(); }}
              className="hidden sm:flex fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-700 items-center justify-center text-white hover:bg-zinc-800"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNextHistory(); }}
              className="hidden sm:flex fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-700 items-center justify-center text-white hover:bg-zinc-800"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </>
        )}

        <div className="relative w-full max-w-4xl" style={{ perspective: '1600px' }}>
          <motion.div
            className="relative mx-auto cursor-pointer"
            style={{ 
              transformStyle: 'preserve-3d',
              width: 'fit-content',
              maxWidth: '94vw',
              maxHeight: '88vh'
            }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.75, type: 'spring', stiffness: 280, damping: 26 }}
          >
            {/* FRONT */}
            <div
              className="relative backface-hidden rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 bg-black"
              style={{ backfaceVisibility: 'hidden' }}
              onClick={(e) => { e.stopPropagation(); handleDoubleTap(); }}
            >
              {isVideoUrl(selectedHistoryItem.url) ? (
                <video
                  src={selectedHistoryItem.url}
                  autoPlay loop muted playsInline controls
                  className="max-h-[82vh] w-auto max-w-full object-contain"
                />
              ) : (
                <img
                  src={selectedHistoryItem.url}
                  alt={selectedHistoryItem.prompt}
                  className="max-h-[82vh] w-auto max-w-full object-contain"
                />
              )}

              {/* Top Controls */}
              <div className="absolute top-4 left-4 z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedHistoryItem(null); setIsFlipped(false); }}
                  className="p-3 bg-black/70 hover:bg-black rounded-2xl text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteHistory(selectedHistoryItem.id); }}
                  className="p-3 bg-black/70 hover:bg-red-950 rounded-2xl text-red-400 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Subtle Auto-Hide Hint */}
              <motion.div
                initial={{ opacity: 0.75 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 5, duration: 1.2 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/30 text-white/50 text-[10px] px-5 py-1.5 rounded-full pointer-events-none tracking-widest backdrop-blur-md"
              >
                double tap to flip
              </motion.div>
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 backface-hidden rounded-3xl bg-zinc-950 border border-zinc-700 flex flex-col overflow-hidden shadow-2xl"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              onClick={(e) => { e.stopPropagation(); handleDoubleTap(); }}
            >
              <div className="flex-1 p-6 sm:p-10 overflow-y-auto">
                <div className="flex justify-center mb-8">
                  <History className="w-12 h-12 text-zinc-700" />
                </div>

                {selectedHistoryItem.modelInfo && (
                  <p className="text-center text-emerald-400 text-xs font-mono tracking-[2px] mb-6">
                    {selectedHistoryItem.modelInfo}
                  </p>
                )}

                <p className="text-zinc-100 text-[15px] sm:text-[17px] leading-relaxed text-center px-4">
                  {selectedHistoryItem.prompt}
                </p>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900 space-y-3">
                <button
                  onClick={(e) => handleDownload(selectedHistoryItem.url, selectedHistoryItem.prompt, e)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-3 active:scale-95"
                >
                  <Download className="w-5 h-5" /> DOWNLOAD
                </button>

                {!isVideoUrl(selectedHistoryItem.url) &&
                 !selectedHistoryItem.prompt?.startsWith('Multi-Angle') &&
                 !selectedHistoryItem.prompt?.startsWith('Upscaled') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAnimateFromHistory(selectedHistoryItem.url); }}
                      className="py-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-2xl text-sm"
                    >
                      Use in Video
                    </button>
                    <button
                      onClick={() => {
                        const clean = selectedHistoryItem.prompt.replace(/^\[RunPod ComfyUI\]\s*/i, '');
                        setPrompt(clean);
                        setSelectedHistoryItem(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm"
                    >
                      Load Prompt
                    </button>
                    <button
                      onClick={() => {
                        const clean = selectedHistoryItem.prompt.replace(/^\[RunPod ComfyUI\]\s*/i, '');
                        setPromptToSave(clean);
                        setShowSavePrompt(true);
                      }}
                      className="py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm"
                    >
                      Save Prompt
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
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
                <h2 className="text-2xl font-medium tracking-tight text-zinc-100">Config</h2>
                <button onClick={handleSaveSettings} className="p-2 bg-zinc-900 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-400 mb-3">
                      Wavespeed API Key
                    </label>
                    <input 
                      type="password" 
                      value={wavespeedKey} 
                      onChange={(e) => setWavespeedKey(e.target.value)} 
                      placeholder="Enter Wavespeed API Key"
                      className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                  <div>
                    <label className="block text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-400 mb-3">
                      RunPod API Key
                    </label>
                    <input 
                      type="password" 
                      value={runpodKey} 
                      onChange={(e) => setRunpodKey(e.target.value)} 
                      placeholder="Enter RunPod API Key"
                      className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-400 mb-3">
                      RunPod Standard Endpoint ID
                    </label>
                    <input 
                      type="text" 
                      value={runpodEndpointId} 
                      onChange={(e) => setRunpodEndpointId(e.target.value)} 
                      placeholder="e.g. abc123def456"
                      className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-400 mb-3">
                      RunPod Video Endpoint ID
                    </label>
                    <input 
                      type="text" 
                      value={videoEndpointId} 
                      onChange={(e) => setVideoEndpointId(e.target.value)} 
                      placeholder="e.g. 4k4i9q6i33lda0"
                      className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                  <div>
                    <label className="block text-[10px] font-mono font-medium uppercase tracking-widest text-zinc-400 mb-3">
                      Grok API Key (xAI)
                    </label>
                    <input 
                      type="password" 
                      value={grokKey} 
                      onChange={(e) => setGrokKey(e.target.value)} 
                      placeholder="Enter Grok API Key"
                      className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm" 
                    />
                  </div>
                </div>
                
                <div className="pt-8 border-t border-zinc-800/50">
                  <button 
                    onClick={async () => { 
                      await clearHistoryDB(); 
                      setHistory([]); 
                    }} 
                    className="w-full py-4 bg-red-500/10 text-red-400 rounded-xl font-medium uppercase tracking-widest text-[10px] border border-red-500/20 transition-all hover:bg-red-500/20"
                  >
                    Wipe Local Log
                  </button>
                </div>
              </div>
              <button 
                onClick={handleSaveSettings} 
                className="mt-8 py-5 bg-zinc-100 text-zinc-950 rounded-xl font-medium uppercase tracking-[0.2em] text-xs transition-all hover:bg-white"
              >
                Commit Config
              </button>
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

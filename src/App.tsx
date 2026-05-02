/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles,
  Settings, 
  Loader2, 
  AlertCircle, 
  Download,
  Image as ImageIcon,
  X,
  History,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Maximize,
  SlidersHorizontal,
  Box,
  Layers,
  CloudDownload,
  Bookmark,
  BookmarkPlus,
  Server,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Native IndexedDB Wrapper ---
const DB_NAME = 'ARX_DB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

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

const pruneHistoryDB = async (keepCount: number = 10000) => {
  const history = await getHistoryDB();
  if (history.length <= keepCount) return;
  const toDelete = history.slice(keepCount);
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  toDelete.forEach(item => store.delete(item.id));
};

// --- Reusable Components ---
const TechApexIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22L2 2h20L12 22z" />
    <path d="M12 22V2" />
    <path d="M2 2l10 10 10-10" />
  </svg>
);

const UploadZone = ({ label, file, preview, onClear, onProcess }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div 
      onClick={() => !file && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { 
        e.preventDefault(); 
        setIsDragging(false); 
        const f = e.dataTransfer.files?.[0]; 
        if (f) onProcess(f); 
      }}
      className={`relative group cursor-pointer border rounded-2xl p-4 sm:p-6 transition-all duration-300 overflow-hidden h-full flex flex-col items-center justify-center min-h-[180px] ${
        isDragging 
          ? 'border-zinc-400 bg-zinc-800/50 scale-[1.02]' 
          : file 
            ? 'bg-zinc-900 border-zinc-800/80' 
            : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-600'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); }} className="hidden" accept="image/*" />
      
      {preview ? (
        <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-full rounded-xl overflow-hidden shadow-md border border-zinc-800/50 flex-1 flex items-center justify-center group">
          <img src={preview} alt="Preview" className="max-h-[140px] w-full object-cover rounded-xl" />
          <div className="absolute inset-0 bg-zinc-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
            <span className="text-zinc-100 text-[10px] sm:text-xs font-medium uppercase tracking-widest bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700">Replace Asset</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-red-400 text-[10px] font-medium uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 px-5 py-2 rounded-full hover:bg-red-500/20 transition-colors">Clear</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isDragging ? 'bg-zinc-100 text-zinc-900 scale-110' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:scale-110 group-hover:border-zinc-600 group-hover:text-zinc-100'}`}>
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-zinc-100 mb-1 tracking-wide">{label}</p>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{isDragging ? "Drop here" : "Click or Drop"}</p>
        </div>
      )}
    </div>
  );
};

// --- Types ---
type AppMode = 'editor' | 'upscaler' | 'angles' | 'runpod';
type EditorModel = 'wan-2.6' | 'wan-2.7' | 'qwen-2.0';
type Resolution = '2k' | '4k' | '8k';

interface HistoryItem {
  id: string;
  prompt: string;
  url: string;
  date: string;
}

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
}

interface QueueTask {
  id: string;
  mode: AppMode;
  prompt: string;
  progress: number;
  message: string;
  pollUrl: string;
  targetResultUrl: string;
}

export default function App() {
  // --- Core State ---
  const [mode, setMode] = useState<AppMode>('editor');
  const [editorModel, setEditorModel] = useState<EditorModel>('wan-2.7');
  
  // API Keys
  const [wavespeedKey, setWavespeedKey] = useState<string>('');
  const [runpodKey, setRunpodKey] = useState<string>('');
  const [runpodEndpointId, setRunpodEndpointId] = useState<string>('');
  
  const [prompt, setPrompt] = useState<string>('');
  const [creditBalance, setCreditBalance] = useState<number | string>('...');
  
  // --- Parameters State ---
  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [horizontalAngle, setHorizontalAngle] = useState<number>(0);
  const [verticalAngle, setVerticalAngle] = useState<number>(0);
  const [distance, setDistance] = useState<number>(1);

  // --- RunPod ComfyUI Settings State ---
  const [sampler, setSampler] = useState<string>('euler');
  const [scheduler, setScheduler] = useState<string>('simple');
  const [negativePrompt, setNegativePrompt] = useState<string>('lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, username, watermark, signature');
  const [steps, setSteps] = useState<number>(4);
  const [cfg, setCfg] = useState<number>(1.0);
  const [denoise, setDenoise] = useState<number>(0.75);

  // --- Input State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- Queue Engine State ---
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // --- UI State (Slider & Modals) ---
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAdvancedRunpod, setShowAdvancedRunpod] = useState(false);
  
  // --- Saved Prompts State ---
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showLoadPrompt, setShowLoadPrompt] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [promptToSave, setPromptToSave] = useState('');

  const [sliderPosition, setSliderPosition] = useState(50);
  const resultRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // --- Parameter Configs ---
  const horizontalOptions = [
    { v: 0, l: '0° Front' }, { v: 45, l: '45° F-Right' }, { v: 90, l: '90° Right' }, { v: 135, l: '135° B-Right' },
    { v: 180, l: '180° Back' }, { v: 225, l: '225° B-Left' }, { v: 270, l: '270° Left' }, { v: 315, l: '315° F-Left' }
  ];
  const verticalOptions = [
    { v: -30, l: '-30° Low' }, { v: 0, l: '0° Eye' }, { v: 30, l: '30° Elev' }, { v: 60, l: '60° High' }
  ];
  const distanceOptions = [
    { v: 0, l: 'Close' }, { v: 1, l: 'Medium' }, { v: 2, l: 'Wide' }
  ];

  const COMFY_SAMPLERS = [
    "euler", "euler_ancestral", "heun", "heunpp2", "dpm_2", "dpm_2_ancestral",
    "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde", "dpmpp_sde_gpu",
    "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpmpp_3m_sde_gpu",
    "ddpm", "lcm", "ddim", "uni_pc", "uni_pc_bh2"
  ];
  const COMFY_SCHEDULERS = [
    "normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform"
  ];

  // --- Initialization & Cloud Sync ---
  useEffect(() => {
    const savedWsKey = localStorage.getItem('arx_wavespeed_key') || '';
    const savedRpKey = localStorage.getItem('arx_runpod_key') || '';
    const savedRpEndpoint = localStorage.getItem('arx_runpod_endpoint') || '';
    
    setMode((localStorage.getItem('arx_mode') as AppMode) || 'editor');
    setEditorModel((localStorage.getItem('arx_editor_model') as EditorModel) || 'wan-2.7');
    
    setWavespeedKey(savedWsKey);
    setRunpodKey(savedRpKey);
    setRunpodEndpointId(savedRpEndpoint);
    
    // Load saved prompts
    const localSavedPrompts = localStorage.getItem('arx_saved_prompts');
    if (localSavedPrompts) {
      try {
        setSavedPrompts(JSON.parse(localSavedPrompts));
      } catch (e) {
        console.error("Failed to parse saved prompts", e);
      }
    }

    getHistoryDB().then(localData => {
      setHistory(localData);
      if (savedWsKey) {
        syncCloudHistory(savedWsKey);
        fetchBalance(savedWsKey);
      }
    }).catch(console.error);
  }, []);

  // --- Auto-Save Settings ---
  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('arx_editor_model', editorModel); }, [editorModel]);

  // --- Balance Fetch Logic ---
  const fetchBalance = async (keyToUse: string) => {
    if (!keyToUse) return;
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/balance", {
        method: "GET",
        headers: { "Authorization": `Bearer ${keyToUse}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data.balance === 'number') {
          setCreditBalance(`$${json.data.balance.toFixed(2)}`);
        }
      }
    } catch (e) {
      console.error("Failed to fetch balance", e);
    }
  };

  // --- Cloud Sync Logic ---
  const syncCloudHistory = async (keyToUse: string) => {
    if (!keyToUse) return;
    setIsSyncing(true);
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/predictions?page=1&page_size=100", {
        headers: { "Authorization": `Bearer ${keyToUse}` }
      });
      
      // Handle 404 gracefully without blowing up the UI
      if (!res.ok) {
        console.warn(`Wavespeed history sync failed with status ${res.status}`);
        return; 
      }
      
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
            date: item.created_at || new Date().toISOString()
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

  // --- Global Paste Listener ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) { 
            handleFileProcess(file); 
            break; 
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // --- Carousel Keyboard Listener ---
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistoryItem, history]);

  // --- Core Handlers ---
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide a valid image file.');
      return;
    }
    const url = URL.createObjectURL(file);
    setSelectedFile(file); 
    setPreviewUrl(url); 
    setResultUrl(null);
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveSettings = () => {
    localStorage.setItem('arx_wavespeed_key', wavespeedKey);
    localStorage.setItem('arx_runpod_key', runpodKey);
    localStorage.setItem('arx_runpod_endpoint', runpodEndpointId);
    setShowSettings(false);
    if (wavespeedKey) {
      syncCloudHistory(wavespeedKey);
      fetchBalance(wavespeedKey);
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

  const handleDeleteHistory = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    await deleteHistoryItemDB(id);
    if (selectedHistoryItem?.id === id) {
      setSelectedHistoryItem(null);
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

  // --- NON-BLOCKING QUEUE ENGINE ---
  const generateEdit = async () => {
    if (mode === 'runpod') {
      if (!runpodKey || !runpodEndpointId) {
        setError('Please enter your RunPod API Key and Endpoint ID in settings.');
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

    if ((mode === 'editor' || mode === 'runpod') && !prompt) {
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
        targetResultUrl: triggerResult.targetResultUrl
      };

      setQueue(prev => [...prev, newTask]);
      pollBackground(newTask);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UNIVERSAL BACKGROUND POLLING LOOP
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
        if (pollCount >= 150) throw new Error('Polling timed out.');
        await new Promise(r => setTimeout(r, 2000));
        pollCount++;

        const headers: any = {};
        if (task.mode === 'runpod') {
          headers["Authorization"] = `Bearer ${runpodKey}`;
        } else {
          headers["Authorization"] = `Bearer ${wavespeedKey}`;
        }

        const pollResponse = await fetch(task.pollUrl, { headers });

        if (!pollResponse.ok) {
          if (pollResponse.status === 404 && pollCount < 10) continue; // Handle propagation delay
          throw new Error(`Server polling failed with status ${pollResponse.status}`);
        }

        const pollData = await pollResponse.json();
        const currentStatus = (pollData.status || pollData.state || pollData.data?.status || '').toLowerCase();

        if (currentStatus === "completed" || currentStatus === "succeeded" || currentStatus === "success") {
          clearInterval(progressInterval);
          setQueue(prev => prev.map(t => t.id === task.id ? { ...t, progress: 95, message: 'Fetching output...' } : t));

          if (task.mode === 'runpod') {
            // --- OMNI-PARSER FOR BULLETPROOF BASE64 EXTRACTION ---
            let finalImage = '';
            
            const extractBase64 = (obj: any): string | null => {
              if (typeof obj === 'string') {
                if (obj.startsWith('data:image') || obj.startsWith('http')) return obj;
                if (obj.length > 500 && (obj.startsWith('iVBORw') || obj.startsWith('/9j/'))) return `data:image/png;base64,${obj}`;
              }
              if (typeof obj === 'object' && obj !== null) {
                for (let key in obj) {
                  const res = extractBase64(obj[key]);
                  if (res) return res;
                }
              }
              return null;
            };

            finalImage = extractBase64(pollData.output || pollData) || '';

            if (finalImage) {
              isCompleted = true;
              await handleFinalSuccess(finalImage, task.id, task.prompt);
              continue;
            } else {
              // If we STILL can't find it, dump the stringified JSON payload to the UI so we can see what's happening
              const dump = JSON.stringify(pollData.output || pollData).substring(0, 300);
              throw new Error(`RunPod returned success but no image found. Payload preview: ${dump}...`);
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
              await handleFinalSuccess(finalImage, task.id, task.prompt);
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
    }
  };

  const handleFinalSuccess = async (finalImage: string, taskId: string, taskPrompt: string) => {
    const newItem: HistoryItem = { 
      id: taskId, 
      prompt: taskPrompt, 
      url: finalImage, 
      date: new Date().toISOString() 
    };
    
    setHistory(prev => {
      const merged = [newItem, ...prev];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10000);
    });
    
    await saveHistoryItem(newItem);
    await pruneHistoryDB(10000);

    setQueue(prev => prev.filter(t => t.id !== taskId));
    setResultUrl(finalImage);
    
    // Refresh balance after successful generation (only for wavespeed for now)
    if (wavespeedKey) fetchBalance(wavespeedKey);
  };

  // --- API TRIGGER DEFINITIONS ---
  const triggerRunPod = async (base64Image: string) => {
    // Clean base64 (remove data:image prefix)
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // Advanced Qwen-Image Workflow Object with Dynamic Variables
    const workflowObj = {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000), 
          "steps": steps, 
          "cfg": cfg,
          "sampler_name": sampler,
          "scheduler": scheduler,
          "denoise": denoise,
          "model": ["75", 0],
          "positive": ["111", 0],
          "negative": ["110", 0],
          "latent_image": ["88", 0]
        },
        "class_type": "KSampler"
      },
      "5": { 
        "inputs": {
          "ckpt_name": "Qwen-Rapid-AIO-NSFW-v23.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["5", 2]
        },
        "class_type": "VAEDecode"
      },
      "60": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      },
      "66": {
        "inputs": {
          "shift": 3,
          "model": ["89", 0]
        },
        "class_type": "ModelSamplingAuraFlow"
      },
      "75": {
        "inputs": {
          "strength": 1,
          "model": ["66", 0]
        },
        "class_type": "CFGNorm"
      },
      "78": {
        "inputs": {
          "image": "input_image.png" 
        },
        "class_type": "LoadImage"
      },
      "88": {
        "inputs": {
          "pixels": ["93", 0],
          "vae": ["5", 2]
        },
        "class_type": "VAEEncode"
      },
      "89": {
        "inputs": {
          "lora_name": "Qwen-Image-Lightning-4steps-V1.0.safetensors",
          "strength_model": 1,
          "model": ["5", 0]
        },
        "class_type": "LoraLoaderModelOnly"
      },
      "93": {
        "inputs": {
          "upscale_method": "lanczos",
          "megapixels": 1,
          "resolution_steps": 64, // Required to satisfy node validation
          "image": ["78", 0]
        },
        "class_type": "ImageScaleToTotalPixels"
      },
      "110": {
        "inputs": {
          "prompt": negativePrompt, 
          "clip": ["5", 1],
          "vae": ["5", 2],
          "image1": ["93", 0]
        },
        "class_type": "TextEncodeQwenImageEditPlus"
      },
      "111": {
        "inputs": {
          "prompt": prompt || "cyberpunk style", 
          "clip": ["5", 1],
          "vae": ["5", 2],
          "image1": ["93", 0]
        },
        "class_type": "TextEncodeQwenImageEditPlus"
      }
    };

    // Construct the payload EXACTLY as the RunPod worker expects it
    const payload = {
      input: {
        workflow: workflowObj,
        images: [
          {
            name: "input_image.png",
            image: base64Data
          }
        ]
      }
    };

    // We use /run (async mode) instead of /runsync so our UI progress queue doesn't freeze
    const response = await fetch(`https://api.runpod.ai/v2/${runpodEndpointId}/run`, {
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

    return {
      id,
      pollUrl: `https://api.runpod.ai/v2/${runpodEndpointId}/status/${id}`,
      targetResultUrl: '',
      historyPrompt: `[RunPod ComfyUI] ${prompt}`
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
      historyPrompt: `Multi-Angle | H:${horizontalAngle}° V:${verticalAngle}° D:${distance}`
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
      historyPrompt: `Upscaled to ${targetResolution.toUpperCase()}`
    };
  };

  const triggerWavespeed = async (base64Image: string) => {
    const payload: any = { 
        images: [base64Image], 
        prompt: prompt, 
        seed: -1
    };
    
    // Add Wan-2.6 specific parameters if it's the active model
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

    return {
      id,
      pollUrl,
      targetResultUrl,
      historyPrompt: prompt
    };
  };

  // --- EVENT HANDLERS ---
  const handleDownload = async (url: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      
      const cleanPrompt = promptText.substring(0, 20).replace(/[^a-z0-9]/gi, '_');
      a.download = `ARX_${cleanPrompt}.png`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TechApexIcon className="text-zinc-100 w-6 h-6 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ARX</h1>
        </div>
        <div className="flex items-center gap-4">
          
          {wavespeedKey && creditBalance !== '...' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest hidden sm:inline">
                Bal: {creditBalance}
              </span>
              <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest sm:hidden">
                {creditBalance}
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
            <Settings className={`w-5 h-5 transition-transform group-hover:rotate-90 ${(mode !== 'runpod' && !wavespeedKey) || (mode === 'runpod' && !runpodKey) ? 'text-zinc-500 animate-pulse' : 'text-zinc-400 group-hover:text-zinc-100'}`} />
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-5 space-y-8 sm:space-y-10">
          
          {/* Master Mode Switcher */}
          <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50 shadow-inner gap-1 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setMode('editor')}
              className={`flex-1 py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap min-w-max ${
                mode === 'editor' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Editor
            </button>
            <button
              onClick={() => setMode('runpod')}
              className={`flex-1 py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap min-w-max ${
                mode === 'runpod' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              RunPod ComfyUI
            </button>
            <button
              onClick={() => setMode('angles')}
              className={`flex-1 py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap min-w-max ${
                mode === 'angles' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Multi-Angle
            </button>
            <button
              onClick={() => setMode('upscaler')}
              className={`flex-1 py-3.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-medium uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap min-w-max ${
                mode === 'upscaler' 
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Upscale
            </button>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 font-mono">
                01 // {mode === 'editor' ? 'Primary Asset' : mode === 'runpod' ? 'Image for ComfyUI' : mode === 'upscaler' ? 'Image to Upscale' : 'Subject to Rotate'}
              </h2>
            </div>
            
            <div className="h-[200px]">
              <UploadZone 
                label={mode === 'editor' ? 'Upload Image to Edit' : mode === 'runpod' ? 'Upload Image for ComfyUI Node' : mode === 'upscaler' ? 'Upload Image to Enhance' : 'Upload Image to Extract Angles'}
                file={selectedFile} 
                preview={previewUrl} 
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

              {mode === 'runpod' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      RunPod ComfyUI Serverless
                    </label>
                    <div className="flex items-center gap-3">
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
                  
                  <div className="relative">
                    <textarea 
                      value={prompt} 
                      onChange={(e) => setPrompt(e.target.value)} 
                      placeholder="Describe the modifications (e.g. 'make the background cyberpunk')..." 
                      className="w-full h-24 p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed" 
                    />
                    <div className="absolute bottom-4 right-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
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
                                type="range" min="1" max="50" step="1" 
                                value={steps} onChange={(e) => setSteps(Number(e.target.value))}
                                className="w-full accent-zinc-100" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                                CFG <span>{cfg.toFixed(1)}</span>
                              </label>
                              <input 
                                type="range" min="1" max="15" step="0.5" 
                                value={cfg} onChange={(e) => setCfg(Number(e.target.value))}
                                className="w-full accent-zinc-100" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                                Denoise <span>{denoise.toFixed(2)}</span>
                              </label>
                              <input 
                                type="range" min="0" max="1" step="0.05" 
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
                    <button
                      onClick={() => setShowLoadPrompt(true)}
                      className="text-[9px] flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 uppercase tracking-widest font-mono transition-colors"
                    >
                      <Bookmark className="w-3 h-3" />
                      Saved Prompts
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <button
                      onClick={() => setEditorModel('wan-2.6')}
                      className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                        editorModel === 'wan-2.6' 
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm scale-105' 
                          : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                      }`}
                    >
                      Wan 2.6
                    </button>
                    <button
                      onClick={() => setEditorModel('wan-2.7')}
                      className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                        editorModel === 'wan-2.7' 
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm scale-105' 
                          : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                      }`}
                    >
                      Wan 2.7
                    </button>
                    <button
                      onClick={() => setEditorModel('qwen-2.0')}
                      className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                        editorModel === 'qwen-2.0' 
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm scale-105' 
                          : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                      }`}
                    >
                      Qwen 2.0
                    </button>
                  </div>
                  
                  <div className="relative">
                    <textarea 
                      value={prompt} 
                      onChange={(e) => setPrompt(e.target.value)} 
                      placeholder="Describe the modifications (e.g. 'change her outfit to a red jacket')..." 
                      className="w-full h-32 p-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 outline-none text-sm leading-relaxed" 
                    />
                    <div className="absolute bottom-4 right-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
                      {editorModel === 'wan-2.7' ? 'Wan-2.7 Editor' : editorModel === 'qwen-2.0' ? 'Qwen-2.0 Editor' : 'Wan-2.6 Editor'}
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
                    {mode === 'angles' && <Box className="w-5 h-5" />}
                  </>
                )}
                {isSubmitting ? 'Uploading to Server...' 
                 : mode === 'upscaler' ? 'Queue Resolution Enhancement' 
                 : mode === 'angles' ? 'Queue 3D Camera Angle' 
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
                             {task.mode === 'angles' ? 'Multi-Angle' : task.mode === 'runpod' ? 'RunPod' : task.mode}
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
                      setPromptToSave(prompt || 'Generated Prompt');
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
                    {mode === 'upscaler' && previewUrl && !selectedHistoryItem ? (
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
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50" 
                        />
                        <img 
                          src={resultUrl} 
                          alt="Upscaled" 
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
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
                      /* --- STANDARD IMAGE VIEWER --- */
                      <div 
                        className="relative w-full h-full cursor-pointer group/result" 
                        onClick={() => {
                          const match = history.find(h => h.url === resultUrl);
                          setSelectedHistoryItem(match || { 
                            id: Date.now().toString(), 
                            prompt: prompt || 'Latest Output', 
                            url: resultUrl, 
                            date: new Date().toISOString() 
                          });
                          setIsFlipped(false);
                        }}
                      >
                        <img 
                          src={resultUrl} 
                          alt="Result" 
                          className="w-full h-full object-contain rounded-[2rem] shadow-xl transition-transform duration-500 group-hover/result:scale-[1.01]" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-opacity duration-300">
                          <div className="bg-zinc-950/80 px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl backdrop-blur-sm">
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
                <img 
                  src={item.url} 
                  alt={item.prompt} 
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500 opacity-80 hover:opacity-100" 
                  onClick={() => { 
                    setSelectedHistoryItem(item); 
                    setIsFlipped(false); 
                  }} 
                />
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

      {/* History Card Modal (Front & Back) */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedHistoryItem(null)} 
              className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm z-[80]" 
            />
            
            {/* Carousel Controls */}
            {history.length > 1 && (
              <>
                <button 
                  onClick={handlePrevHistory} 
                  className="fixed left-2 sm:left-8 top-1/2 -translate-y-1/2 z-[100] p-3 sm:p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button 
                  onClick={handleNextHistory} 
                  className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 z-[100] p-3 sm:p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 sm:p-8 pointer-events-none">
              <div className="pointer-events-auto relative flex items-center justify-center" style={{ perspective: 2000 }}>
                <motion.div 
                  className="relative flex items-center justify-center" 
                  style={{ transformStyle: 'preserve-3d' }} 
                  animate={{ rotateY: isFlipped ? 180 : 0 }} 
                  transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }} 
                  onDoubleClick={() => setIsFlipped(!isFlipped)}
                >
                  
                  {/* --- FRONT OF CARD --- */}
                  <div 
                    className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950 flex" 
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <img 
                      src={selectedHistoryItem.url} 
                      alt="History Entry" 
                      className="block max-w-[90vw] sm:max-w-[85vw] max-h-[80vh] sm:max-h-[85vh] w-auto h-auto object-contain" 
                    />
                    
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedHistoryItem(null); 
                      }} 
                      className="absolute top-4 right-4 p-2.5 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-800"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={(e) => handleDeleteHistory(selectedHistoryItem.id, e)} 
                      className="absolute top-4 left-4 p-2.5 text-red-400 hover:text-red-300 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-800 transition-colors hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <motion.div 
                      key={selectedHistoryItem.id}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ delay: 2.5, duration: 0.8 }}
                      className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none"
                    >
                      <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl">
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-300 animate-spin-slow" />
                        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-100 sm:hidden">
                          Double tap to flip
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-100 hidden sm:inline">
                          Space to flip
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* --- BACK OF CARD --- */}
                  <div 
                    className="absolute inset-0 rounded-[2rem] shadow-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-y-auto" 
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedHistoryItem(null); 
                      }} 
                      className="absolute top-4 right-4 p-2.5 text-zinc-500 hover:text-zinc-100 transition-colors bg-zinc-900 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={(e) => handleDeleteHistory(selectedHistoryItem.id, e)} 
                      className="absolute top-4 left-4 p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <History className="w-8 h-8 text-zinc-700 mb-6" />
                    
                    <h3 className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] mb-4">
                      Modification Log
                    </h3>
                    
                    <div className="flex-1 w-full max-w-2xl mx-auto flex items-center justify-center overflow-hidden mb-6">
                      <p className="text-sm sm:text-lg text-zinc-100 leading-relaxed px-4 font-light">
                        {selectedHistoryItem.prompt}
                      </p>
                    </div>
                    
                    {/* Only show 'Use prompt' and 'Save Prompt' if it's an editor request */}
                    {!selectedHistoryItem.prompt.startsWith('Multi-Angle') && !selectedHistoryItem.prompt.startsWith('Upscaled') && !selectedHistoryItem.prompt.startsWith('Cloud') && (
                      <div className="w-full max-w-md mx-auto space-y-3">
                        <button 
                          onClick={() => { 
                            if(selectedHistoryItem) { 
                              setPrompt(selectedHistoryItem.prompt); 
                              setSelectedHistoryItem(null); 
                              window.scrollTo({ top: 0, behavior: 'smooth' }); 
                            } 
                          }} 
                          className="w-full py-4 bg-zinc-100 text-zinc-950 rounded-xl font-medium uppercase tracking-[0.15em] text-[10px] hover:bg-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Use This Prompt
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            setPromptToSave(selectedHistoryItem.prompt);
                            setShowSavePrompt(true);
                          }} 
                          className="w-full py-4 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-xl font-medium uppercase tracking-[0.15em] text-[10px] hover:bg-zinc-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                          Save Prompt
                        </button>
                      </div>
                    )}
                    
                    <p className="text-[9px] text-zinc-500 mt-4 uppercase tracking-widest">
                      <span className="sm:hidden">Double tap to view image</span>
                      <span className="hidden sm:inline">Space to view image</span>
                    </p>
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
                      RunPod Endpoint ID
                    </label>
                    <input 
                      type="text" 
                      value={runpodEndpointId} 
                      onChange={(e) => setRunpodEndpointId(e.target.value)} 
                      placeholder="e.g. abc123def456"
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

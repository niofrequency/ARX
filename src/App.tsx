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
  Activity,
  Zap,
  Layers,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Native IndexedDB Wrapper (Hardened for Unlimited Multi-Task Storage) ---
const DB_NAME = 'ARX_DB_FINAL'; 
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

// --- Reusable Components ---
const TechApexIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Hardcoded Upside-Down Pyramid Icon */}
    <path d="M12 22L2 2h20L12 22z" />
    <path d="M12 22V2" />
    <path d="M2 2l10 10 10-10" />
  </svg>
);

const ProcessingBar = ({ progress, pos, total }: { progress: number, pos?: number, total?: number }) => {
  const totalSegments = 10;
  const litSegments = (progress / 100) * totalSegments;

  return (
    <div className="relative w-full h-14 sm:h-[60px] bg-[#0a0f14] border border-[#1a232c] rounded-2xl flex items-center justify-center overflow-hidden px-4 shadow-inner">
      <div className="absolute inset-0 flex items-center justify-between px-3 gap-1.5 opacity-30">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div key={`bg-${i}`} className="h-6 w-full bg-cyan-950 rounded-sm" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-3 gap-1.5">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const segmentOpacity = Math.max(0, Math.min(1, litSegments - i));
          return (
            <motion.div key={`active-${i}`} className="h-6 w-full bg-accent rounded-sm" initial={{ opacity: 0 }} animate={{ opacity: segmentOpacity }} transition={{ duration: 0.3 }} style={{ boxShadow: segmentOpacity > 0 ? `0 0 10px rgba(6, 182, 212, ${segmentOpacity * 0.6})` : 'none' }} />
          );
        })}
      </div>
      <div className="absolute z-10 px-5 py-1.5 bg-[#0a0f14]/80 backdrop-blur-md border border-accent/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <span className="text-[10px] sm:text-xs font-mono tracking-widest text-accent font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
          {Math.round(progress)}%{total && total > 1 ? ` • QUEUE: ${pos}/${total}` : ''}
        </span>
      </div>
    </div>
  );
};

const UploadZone = ({ label, file, preview, onClear, onProcess }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div onClick={() => !file && fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onProcess(f); }}
      className={`relative group cursor-pointer border rounded-2xl p-4 sm:p-6 transition-all duration-300 overflow-hidden h-full flex flex-col items-center justify-center min-h-[180px] ${isDragging ? 'border-accent bg-accent/10 scale-[1.02]' : file ? 'bg-accent/5 border-accent/30' : 'border-border bg-white/[0.02] hover:bg-white/[0.04] hover:border-accent/50'}`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); }} className="hidden" accept="image/*" />
      {preview ? (
        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10 flex-1 flex items-center justify-center group">
          <img src={preview} alt="Preview" className="max-h-[140px] w-full object-cover rounded-xl" />
          <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
            <span className="text-accent text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/5">Replace Asset</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-red-400 text-[10px] font-bold uppercase tracking-widest bg-black/60 border border-white/10 px-4 py-1.5 rounded-full hover:bg-red-500 hover:text-white transition-colors">Clear</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={`w-10 h-10 border rounded-xl flex items-center justify-center mb-3 transition-all duration-500 ${isDragging ? 'bg-accent/20 border-accent scale-110 text-accent' : 'bg-white/5 border-border text-text-secondary group-hover:scale-110 group-hover:border-accent/50 group-hover:text-accent'}`}><Upload className="w-5 h-5" /></div>
          <p className="text-[10px] sm:text-xs font-bold tracking-tight text-text-primary mb-1">{label}</p>
          <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">{isDragging ? "Drop here" : "Click or Drop"}</p>
        </div>
      )}
    </div>
  );
};

// --- Types ---
type EngineProvider = 'wavespeed' | 'runpod_flux' | 'runpod_zimage';
type AppMode = 'editor' | 'upscaler';
type Resolution = '2k' | '4k' | '8k';

interface HistoryItem {
  id: string;
  prompt: string;
  url: string;           
  originalUrl: string;   
  date: string;
  status: 'loading' | 'completed' | 'failed';
  mode: AppMode;
  provider: EngineProvider;
  resolution?: Resolution;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('editor');
  const [provider, setProvider] = useState<EngineProvider>('wavespeed');
  
  // Persistence State
  const [wavespeedKey, setWavespeedKey] = useState<string>(localStorage.getItem('arx_wavespeed_key') || '');
  const [runpodKey, setRunpodKey] = useState<string>(localStorage.getItem('arx_runpod_key') || '');
  const [fluxId, setFluxId] = useState<string>(localStorage.getItem('arx_flux_id') || '');
  const [zimageId, setZimageId] = useState<string>(localStorage.getItem('arx_zimage_id') || '');
  
  const [prompt, setPrompt] = useState<string>('');
  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Task Queue Management
  const [activeTasks, setActiveTasks] = useState<Record<string, number>>({});
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Init and History Loader
  useEffect(() => {
    getHistoryDB().then(data => {
      // Filter out any invalid items that might cause crashes
      const validHistory = data.filter(item => item && item.id && item.url);
      setHistory(validHistory);
      if (validHistory.length > 0) setCurrentViewId(validHistory[0].id);
    }).catch(err => console.error("Database failed to initialize:", err));
  }, []);

  // Progress Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTasks(prev => {
        let changed = false;
        const next = { ...prev };
        for (const id in next) {
          if (next[id] < 92) {
            next[id] = next[id] + Math.max(0.3, (92 - next[id]) * 0.04);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

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

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Invalid image.'); return; }
    setSelectedFile(file); 
    setPreviewUrl(URL.createObjectURL(file)); 
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
    localStorage.setItem('arx_flux_id', fluxId);
    localStorage.setItem('arx_zimage_id', zimageId);
    setShowSettings(false);
  };

  const generateEdit = async () => {
    const currentKey = provider === 'wavespeed' ? wavespeedKey : runpodKey;
    if (!currentKey) { setError(`Missing ${provider} Key`); setShowSettings(true); return; }
    if (mode === 'editor' && !prompt) { setError('Missing prompt.'); return; }
    if (!selectedFile) { setError('No image uploaded.'); return; }

    setError(null); 
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    const taskId = Date.now().toString();
    const base64ImageRaw = await fileToBase64(selectedFile);
    const executionPrompt = mode === 'upscaler' ? `Upscaled to ${(targetResolution || '4K').toUpperCase()}` : prompt;

    // Persist as Base64 so refresh doesn't break previews
    const placeholderItem: HistoryItem = {
      id: taskId,
      prompt: executionPrompt,
      url: base64ImageRaw,
      originalUrl: base64ImageRaw,
      date: new Date().toISOString(),
      status: 'loading',
      mode: mode,
      provider: provider,
      resolution: targetResolution
    };

    setHistory(prev => [placeholderItem, ...prev]);
    setCurrentViewId(taskId);
    setActiveTasks(prev => ({ ...prev, [taskId]: 5 }));
    
    // Save placeholder to disk immediately
    await saveHistoryItem(placeholderItem);

    setSelectedFile(null); 
    setPreviewUrl(null); 
    if (mode === 'editor') setPrompt('');

    runBackgroundTask(taskId, base64ImageRaw, mode, provider, executionPrompt, targetResolution);
  };

  const runBackgroundTask = async (id: string, base64: string, appMode: AppMode, prov: EngineProvider, execPrompt: string, resTarget: Resolution) => {
    try {
      let finalUrl = '';
      if (appMode === 'upscaler') {
        finalUrl = await triggerWavespeedUpscale(id, base64, resTarget);
      } else {
        if (prov === 'wavespeed') finalUrl = await triggerWavespeed(id, base64, execPrompt);
        else finalUrl = await triggerRunpod(id, base64, execPrompt, prov);
      }

      setHistory(prev => prev.map(h => {
        if (h.id === id) {
          const finished: HistoryItem = { ...h, url: finalUrl, originalUrl: finalUrl, status: 'completed' };
          saveHistoryItem(finished);
          return finished;
        }
        return h;
      }));
      setActiveTasks(prev => { const next = {...prev}; delete next[id]; return next; });
    } catch (err: any) {
      setHistory(prev => prev.map(h => h.id === id ? { ...h, status: 'failed' } : h));
      setActiveTasks(prev => { const next = {...prev}; delete next[id]; return next; });
    }
  };

  // --- IRONCLAD SAFE PARSER ---
  const fetchSafeJson = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (response.status === 404) return null; // Server queue not ready
      throw new Error(`Invalid Server Response`);
    }
  };

  const triggerWavespeedUpscale = async (id: string, base64Image: string, resTarget: Resolution): Promise<string> => {
    const res = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wavespeedKey}` },
      body: JSON.stringify({ enable_base64_output: false, image: base64Image, target_resolution: resTarget })
    });
    const data = await fetchSafeJson(res);
    if (!res.ok) throw new Error(data?.message || 'API Error');

    const remoteId = data.id || data.request_id || data.data?.id;
    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${remoteId}`, { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
      const pollData = await fetchSafeJson(poll);
      if (!pollData) continue; // Skip 404s

      const status = (pollData.status || pollData.data?.status || '').toLowerCase();
      if (status === "completed" || status === "succeeded") {
        const result = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${remoteId}/result`, { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
        const resData = await fetchSafeJson(result);
        return (resData.outputs || resData.data?.outputs || pollData.outputs)[0];
      } else if (status === "failed") throw new Error("Failed");
    }
  };

  const triggerWavespeed = async (id: string, base64Image: string, execPrompt: string): Promise<string> => {
    const res = await fetch('https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wavespeedKey}` },
      body: JSON.stringify({ enable_prompt_expansion: false, images: [base64Image], prompt: execPrompt, seed: Math.floor(Math.random() * 1000000000), guidance_scale: 7.5, num_inference_steps: 30 })
    });
    const data = await fetchSafeJson(res);
    if (!res.ok) throw new Error('Trigger failed.');
    const remoteId = data.id || data.request_id || data.data?.id;
    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      const pollUrl = data.request_id ? `https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit/requests/${remoteId}/status` : `https://api.wavespeed.ai/api/v3/predictions/${remoteId}`;
      const poll = await fetch(pollUrl, { headers: { 'Authorization': `Bearer ${wavespeedKey}` } });
      const pollData = await fetchSafeJson(poll);
      if (!pollData) continue;

      const status = (pollData.status || pollData.state || pollData.data?.status || '').toLowerCase();
      if (status === 'completed' || status === 'succeeded' || status === 'success') {
        const outputs = pollData.outputs || pollData.data?.outputs || pollData.output;
        return typeof outputs[0] === 'string' ? outputs[0] : outputs[0].url;
      } else if (status === 'failed' || status === 'error') throw new Error('Failed');
    }
  };

  const triggerRunpod = async (id: string, base64: string, execPrompt: string, prov: EngineProvider): Promise<string> => {
    const ep = prov === 'runpod_flux' ? fluxId : zimageId;
    const res = await fetch(`https://api.runpod.ai/v2/${ep}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${runpodKey}` },
      body: JSON.stringify({ input: { prompt: execPrompt, image_base64: base64.split(',')[1] || base64 } })
    });
    const data = await res.json();
    const remoteId = data.id;
    while (true) {
      await new Promise(r => setTimeout(r, 2500));
      const poll = await fetch(`https://api.runpod.ai/v2/${ep}/status/${remoteId}`, { headers: { 'Authorization': `Bearer ${runpodKey}` } });
      const pollData = await poll.json();
      if (pollData.status === 'COMPLETED') return `data:image/png;base64,${pollData.output.image || pollData.output}`;
      if (pollData.status === 'FAILED') throw new Error('Runpod Failed');
    }
  };

  const handleNextCarousel = () => {
    const idx = history.findIndex(h => h.id === selectedHistoryItem?.id);
    if (idx !== -1) {
      const next = history[(idx + 1) % history.length];
      setSelectedHistoryItem(next);
      setIsFlipped(false);
    }
  };

  const handlePrevCarousel = () => {
    const idx = history.findIndex(h => h.id === selectedHistoryItem?.id);
    if (idx !== -1) {
      const prev = history[(idx - 1 + history.length) % history.length];
      setSelectedHistoryItem(prev);
      setIsFlipped(false);
    }
  };

  const handleDownload = async (url: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `ARX_Result.png`;
      a.click();
    } catch (err) { window.open(url, '_blank'); }
  };

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleDeleteHistory = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    await deleteHistoryItemDB(id);
    if (currentViewId === id) setCurrentViewId(history.find(h => h.id !== id)?.id || null);
  };

  const activeViewItem = history.find(h => h.id === currentViewId) || history[0];
  const activeTaskIds = history.filter(h => h.status === 'loading').map(h => h.id).reverse();
  const activeTaskCount = activeTaskIds.length;

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans flex flex-col selection:bg-accent/20 selection:text-accent">
      
      {/* Dynamic Navbar */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <TechApexIcon className="text-accent w-7 h-7" />
          <h1 className="text-2xl font-bold tracking-tight">ARX</h1>
        </div>
        <div className="flex items-center gap-4">
          {activeTaskCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full animate-pulse">
              <Zap className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-mono text-accent uppercase font-bold">{activeTaskCount} Pipeline Running</span>
            </div>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-border transition-all">
            <Settings className={`w-5 h-5 ${!wavespeedKey ? 'text-orange-500 animate-pulse' : ''}`} />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-10">
          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button onClick={() => setMode('editor')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'editor' ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}><Sparkles className="w-4 h-4 inline mr-2" /> Editor</button>
            <button onClick={() => setMode('upscaler')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'upscaler' ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}><Maximize className="w-4 h-4 inline mr-2" /> Upscaler</button>
          </div>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono mb-6">01 // Asset Input</h2>
            <div className="h-[200px]"><UploadZone label={mode === 'editor' ? 'Upload Image to Edit' : 'Upload Image to Enhance'} file={selectedFile} preview={previewUrl} onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} onProcess={handleFileProcess} /></div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono mb-6">02 // Parameters</h2>
            <div className="space-y-6">
              {mode === 'upscaler' ? (
                <div className="bg-white/[0.02] p-5 border border-border rounded-2xl grid grid-cols-3 gap-3">
                  {(['2k', '4k', '8k'] as Resolution[]).map((res) => (<button key={res} onClick={() => setTargetResolution(res)} className={`py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${targetResolution === res ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-105' : 'bg-black/30 border border-white/10 text-text-secondary hover:text-white'}`}>{res}</button>))}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe modifications (e.g. 'red hair', 'cyberpunk city')..." className="w-full h-32 p-5 bg-white/[0.02] border border-border rounded-2xl focus:ring-1 focus:ring-accent outline-none text-sm leading-relaxed shadow-inner" />
                  <div className="grid grid-cols-3 gap-2">
                    {(['wavespeed', 'runpod_flux', 'runpod_zimage'] as EngineProvider[]).map(p => (
                      <button key={p} onClick={() => setProvider(p)} className={`py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${provider === p ? 'border-accent text-accent bg-accent/5' : 'border-white/5 text-text-secondary'}`}>
                        {p.replace('runpod_', '').replace('wavespeed', 'Wan 2.6')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button disabled={!selectedFile} onClick={generateEdit} className="w-full py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all bg-accent text-bg hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] disabled:opacity-50">Launch {mode === 'upscaler' ? 'Enhancement' : 'AI Edit'}</button>
            </div>
          </section>
        </div>

        {/* Right Live Viewer */}
        <div className="lg:col-span-7" ref={resultRef}>
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" /> Live Monitor
              </h2>
              {activeViewItem?.status === 'completed' && <button onClick={(e) => handleDownload(activeViewItem.url, activeViewItem.prompt, e)} className="text-[10px] font-bold uppercase text-accent flex items-center gap-2 hover:text-white transition-all"><Download className="w-4 h-4" /> Export Asset</button>}
            </div>
            
            <div className="relative aspect-square sm:aspect-[4/3] bg-white/[0.01] rounded-[2.5rem] overflow-hidden border border-border shadow-2xl flex items-center justify-center group">
              <AnimatePresence mode="wait">
                {activeViewItem ? (
                  <motion.div key={activeViewId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full p-4">
                    {activeViewItem.status === 'loading' && (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-8 rounded-[2rem] overflow-hidden bg-black/20">
                        <img src={activeViewItem.originalUrl} className="absolute inset-0 w-full h-full object-contain opacity-20 blur-xl" />
                        <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">
                          <ProcessingBar progress={activeTasks[activeViewItem.id] || 5} pos={activeTaskIds.indexOf(activeViewItem.id) + 1} total={activeTaskCount} />
                          <div className="flex items-center gap-3 bg-black/60 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md">
                            <Loader2 className="w-4 h-4 text-accent animate-spin" /><span className="text-[10px] font-mono text-white uppercase tracking-widest">Processing Task {activeViewItem.id.slice(-4)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeViewItem.status === 'completed' && activeViewItem.mode === 'upscaler' ? (
                      <div ref={sliderContainerRef} className="relative w-full h-full cursor-ew-resize select-none rounded-[2rem] overflow-hidden shadow-2xl" onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                        <img src={activeViewItem.originalUrl} className="absolute inset-0 w-full h-full object-contain opacity-80" />
                        <img src={activeViewItem.url} className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_10px_rgba(0,242,255,1)]" style={{ left: `${sliderPosition}%` }}><div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-bg border-2 border-accent rounded-full flex items-center justify-center shadow-xl"><SlidersHorizontal className="w-4 h-4 text-accent" /></div></div>
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white">Enhanced ({activeViewItem.resolution || '4K'})</div>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest text-text-secondary">Original</div>
                      </div>
                    ) : activeViewItem.status === 'completed' ? (
                      <div className="w-full h-full cursor-pointer relative rounded-[2rem] overflow-hidden" onClick={() => { setSelectedHistoryItem(activeViewItem); setIsFlipped(false); }}>
                        <img src={activeViewItem.url} className="w-full h-full object-contain shadow-2xl transition-transform duration-500 hover:scale-[1.01]" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300"><div className="bg-black/60 px-4 py-2 rounded-full border border-white/10 shadow-xl backdrop-blur-sm"><span className="text-[10px] font-bold text-white uppercase tracking-widest">Double-Tap Image for Flip Data</span></div></div>
                      </div>
                    ) : activeViewItem.status === 'failed' && <div className="text-red-500 font-mono text-xs uppercase flex flex-col items-center gap-3"><AlertCircle className="w-10 h-10" /> Task Engine Failed</div>}
                  </motion.div>
                ) : <ImageIcon className="w-16 h-16 opacity-10" />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* History Grid */}
      {history.length > 0 && (
        <section className="max-w-6xl w-full mx-auto px-6 pt-16 border-t border-border/50 pb-12">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono mb-8 flex items-center justify-between"><span>03 // Action Log (Unlimited)</span><span className="bg-accent/10 text-accent px-3 py-1 rounded-full font-mono text-[10px]">{history.length} Units Cached</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {history.map((item) => (
              <div key={item.id} onClick={() => setCurrentViewId(item.id)} className={`relative group rounded-2xl overflow-hidden border bg-white/[0.02] aspect-square cursor-pointer transition-all duration-300 ${currentViewId === item.id ? 'border-accent shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-105 z-10' : 'border-border hover:border-white/20'}`}>
                {item.status === 'loading' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"><Loader2 className="w-5 h-5 text-accent animate-spin mb-2" /><span className="text-[8px] font-mono text-accent">{Math.round(activeTasks[item.id] || 0)}%</span></div>}
                <img src={item.status === 'completed' ? item.url : item.originalUrl} className={`w-full h-full object-cover ${item.status !== 'completed' ? 'opacity-30 grayscale blur-[2px]' : ''}`} />
                <button onClick={(e) => handleDeleteHistory(item.id, e)} className="absolute top-2 left-2 p-2 bg-black/60 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-500 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-[8px] font-mono text-white/70 truncate uppercase">{item.mode}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Configuration Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleSaveSettings} className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-bg border-l border-border z-[70] p-10 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-16"><h2 className="text-2xl font-bold tracking-tighter uppercase">ARX <span className="text-accent">Config</span></h2><button onClick={handleSaveSettings} className="hover:text-accent transition-colors"><X /></button></div>
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary">Wavespeed Key</label>
                  <input type="password" value={wavespeedKey} onChange={(e) => setWavespeedKey(e.target.value)} className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl focus:border-accent outline-none" />
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary">RunPod API Key</label>
                  <input type="password" value={runpodKey} onChange={(e) => setRunpodKey(e.target.value)} className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl focus:border-accent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary text-xs">Flux ID</label>
                    <input type="text" value={fluxId} onChange={(e) => setFluxId(e.target.value)} className="w-full p-3 bg-black/30 border border-white/10 rounded-xl focus:border-accent outline-none" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary text-xs">Z-Image ID</label>
                    <input type="text" value={zimageId} onChange={(e) => setZimageId(e.target.value)} className="w-full p-3 bg-black/30 border border-white/10 rounded-xl focus:border-accent outline-none" />
                  </div>
                </div>
                <div className="pt-8 border-t border-white/10"><button onClick={async () => { await clearHistoryDB(); setHistory([]); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-xl font-bold uppercase text-[10px] border border-red-500/20 hover:bg-red-500/20 transition-all">Clear IndexedDB Storage</button></div>
              </div>
              <button onClick={handleSaveSettings} className="mt-8 py-5 bg-accent text-bg rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all">Commit Changes</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3D Data Modal */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedHistoryItem(null)} className="fixed inset-0 bg-bg/95 backdrop-blur-md z-[80]" />
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-8 pointer-events-none">
              <div className="pointer-events-auto relative flex items-center justify-center" style={{ perspective: 2000 }}>
                <motion.div className="relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }} onDoubleClick={() => setIsFlipped(!isFlipped)}>
                  
                  {/* Front Side */}
                  <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-border bg-[#0a0f14] flex" style={{ backfaceVisibility: 'hidden' }}>
                    <img src={selectedHistoryItem.url} className="max-w-[90vw] max-h-[80vh] object-contain" />
                    <button onClick={() => setSelectedHistoryItem(null)} className="absolute top-6 right-6 p-2 bg-bg/60 backdrop-blur-md rounded-full text-text-secondary hover:text-white transition-all hover:rotate-90"><X className="w-6 h-6" /></button>
                  </div>

                  {/* Back Side (Prompt Data) */}
                  <div className="absolute inset-0 rounded-[2.5rem] shadow-2xl bg-[#0d0d10] border border-border p-12 flex flex-col items-center justify-center text-center overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <button onClick={() => setSelectedHistoryItem(null)} className="absolute top-6 right-6 p-2 text-text-secondary hover:text-white transition-all"><X className="w-6 h-6" /></button>
                    <History className="w-10 h-10 text-accent/30 mb-8" />
                    <h3 className="text-accent font-mono text-[11px] uppercase tracking-[0.3em] mb-6">Task Logic</h3>
                    <div className="flex-1 w-full max-w-2xl mx-auto flex items-center justify-center overflow-hidden mb-8">
                      <p className="text-xl text-text-primary leading-relaxed px-6 font-medium italic">"{selectedHistoryItem.prompt}"</p>
                    </div>
                    {selectedHistoryItem.mode === 'editor' && (
                      <button onClick={() => { setPrompt(selectedHistoryItem.prompt); setProvider(selectedHistoryItem.provider); setSelectedHistoryItem(null); setMode('editor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="py-5 px-10 bg-accent text-bg rounded-2xl font-bold uppercase tracking-widest text-[11px] flex items-center gap-3 active:scale-95 transition-all">
                        <RefreshCw className="w-4 h-4" /> Re-Apply Prompt
                      </button>
                    )}
                    <p className="mt-8 text-[9px] font-mono text-text-secondary uppercase tracking-[0.2em] opacity-40">Double tap image to flip back</p>
                  </div>
                </motion.div>

                {/* Modal Navigation Buttons */}
                <div className="fixed inset-x-0 bottom-10 flex justify-center gap-4 z-[100] pointer-events-auto">
                   <button onClick={handlePrevCarousel} className="p-4 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/50 hover:text-white hover:border-accent transition-all hover:scale-110 shadow-2xl">
                     <ChevronLeft className="w-8 h-8" />
                   </button>
                   <button onClick={handleNextCarousel} className="p-4 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/50 hover:text-white hover:border-accent transition-all hover:scale-110 shadow-2xl">
                     <ChevronRight className="w-8 h-8" />
                   </button>
                </div>

              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Native IndexedDB Wrapper (Unlimited Storage) ---
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

// --- Reusable Components ---
const TechApexIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22L2 2h20L12 22z" />
    <path d="M12 22V2" />
    <path d="M2 2l10 10 10-10" />
  </svg>
);

const ProcessingBar = ({ progress }: { progress: number }) => {
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
            <motion.div
              key={`active-${i}`}
              className="h-6 w-full bg-accent rounded-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: segmentOpacity }}
              transition={{ duration: 0.3 }}
              style={{ boxShadow: segmentOpacity > 0 ? `0 0 10px rgba(6, 182, 212, ${segmentOpacity * 0.6})` : 'none' }}
            />
          );
        })}
      </div>
      <div className="absolute z-10 px-4 py-1 bg-[#0a0f14]/80 backdrop-blur-md border border-accent/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <span className="text-[10px] sm:text-xs font-mono tracking-widest text-accent font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

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
          ? 'border-accent bg-accent/10 scale-[1.02]' 
          : file 
            ? 'bg-accent/5 border-accent/30' 
            : 'border-border bg-white/[0.02] hover:bg-white/[0.04] hover:border-accent/50'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); }} className="hidden" accept="image/*" />
      
      {preview ? (
        <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10 flex-1 flex items-center justify-center group">
          <img src={preview} alt="Preview" className="max-h-[140px] w-full object-cover rounded-xl" />
          <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
            <span className="text-accent text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/5">Replace Asset</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-red-400 text-[10px] font-bold uppercase tracking-widest bg-black/60 border border-white/10 px-4 py-1.5 rounded-full hover:bg-red-50 hover:text-white transition-colors">Clear</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={`w-10 h-10 border rounded-xl flex items-center justify-center mb-3 transition-all duration-500 ${isDragging ? 'bg-accent/20 border-accent scale-110 text-accent' : 'bg-white/5 border-border text-text-secondary group-hover:scale-110 group-hover:border-accent/50 group-hover:text-accent'}`}>
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-[10px] sm:text-xs font-bold tracking-tight text-text-primary mb-1">{label}</p>
          <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">{isDragging ? "Drop here" : "Click or Drop"}</p>
        </div>
      )}
    </div>
  );
};

// --- Types ---
type GenerationStatus = 'idle' | 'uploading' | 'triggering' | 'processing' | 'fetching' | 'completed' | 'failed';
type AppMode = 'editor' | 'upscaler';
type Resolution = '2k' | '4k' | '8k';

interface HistoryItem {
  id: string;
  prompt: string;
  url: string;
  date: string;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('editor');
  const [wavespeedKey, setWavespeedKey] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [batchSize, setBatchSize] = useState<number>(1);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode((localStorage.getItem('arx_mode') as AppMode) || 'editor');
    setWavespeedKey(localStorage.getItem('arx_wavespeed_key') || '');
    getHistoryDB().then(setHistory).catch(console.error);
  }, []);

  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'processing' || status === 'triggering') {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90;
          return prev + Math.max(0.5, (90 - prev) * 0.03); // Smooth scaling up to 90%
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status]);

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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHistoryItem, history]);

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Invalid image file.'); return; }
    const url = URL.createObjectURL(file);
    setSelectedFile(file); 
    setPreviewUrl(url); 
    setResultUrl(null);
    setError(null);
    setStatus('idle');
    setProgress(0);
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
    setShowSettings(false);
  };

  const handleFinalSuccess = async (finalImages: string[], prompts: string[]) => {
    setResultUrl(finalImages[finalImages.length - 1]);
    setProgress(100); 
    setStatus('completed');

    const newItems: HistoryItem[] = finalImages.map((img, i) => ({
      id: Date.now().toString() + '-' + i,
      prompt: prompts[i],
      url: img,
      date: new Date().toISOString()
    }));
    
    // Unlimited History Addition
    setHistory(prev => [...newItems, ...prev]);
    for (const item of newItems) {
      await saveHistoryItem(item);
    }
  };

  const generateEdit = async () => {
    if (!wavespeedKey) { setError('Missing API Key.'); setShowSettings(true); return; }
    if (mode === 'editor' && !prompt) { setError('Missing prompt.'); return; }
    if (!selectedFile) { setError('No image uploaded.'); return; }

    try {
      setError(null); setResultUrl(null); setRequestId(null); setStatus('triggering'); setProgress(5); 
      setStatusMessage('Initiating ARX Pipeline...');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

      const base64ImageRaw = await fileToBase64(selectedFile);
      
      if (mode === 'upscaler') {
        const finalUrl = await triggerWavespeedUpscale(base64ImageRaw);
        await handleFinalSuccess([finalUrl], [`Upscaled to ${targetResolution.toUpperCase()}`]);
      } else {
        // Run Batched Editor Variations Concurrently
        setStatusMessage(`Generating ${batchSize} Variation${batchSize > 1 ? 's' : ''}...`);
        const promises = Array.from({ length: batchSize }).map(() => triggerWavespeed(base64ImageRaw));
        const results = await Promise.allSettled(promises);
        
        const successfulUrls = results
          .filter((res): res is PromiseFulfilledResult<string> => res.status === 'fulfilled')
          .map(res => res.value);

        if (successfulUrls.length === 0) {
          const firstError = results.find((res): res is PromiseRejectedResult => res.status === 'rejected')?.reason;
          throw new Error(firstError?.message || 'All generation requests failed.');
        }

        await handleFinalSuccess(successfulUrls, Array(successfulUrls.length).fill(prompt));
      } 
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred.');
      setStatus('failed'); 
      setProgress(0); 
    }
  };

  const triggerWavespeedUpscale = async (base64Image: string): Promise<string> => {
    const res = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wavespeedKey}` },
      body: JSON.stringify({ enable_base64_output: false, image: base64Image, target_resolution: targetResolution })
    });
    
    let triggerData;
    try { triggerData = await res.json(); } catch (e) { throw new Error(`Failed to parse Wavespeed response.`); }
    if (!res.ok) throw new Error(triggerData.message || triggerData.error || 'API Error');

    const id = triggerData.id || triggerData.request_id || triggerData.data?.id;
    if (!id) throw new Error(`API Rejected Request: ${triggerData.message || 'No task ID returned.'}`);

    setRequestId(id);
    setStatus('processing');
    
    let isCompleted = false;
    let pollCount = 0;
    while (!isCompleted && pollCount < 150) {
      await new Promise(r => setTimeout(r, 2000));
      pollCount++;
      const poll = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${id}`, { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
      const pollData = await poll.json();
      const status = (pollData.status || pollData.data?.status || '').toLowerCase();

      if (status === "completed" || status === "succeeded") {
        const result = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${id}/result`, { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
        const resData = await result.json();
        const outputs = resData.outputs || resData.data?.outputs || pollData.outputs;
        if (outputs?.[0]) return outputs[0];
        throw new Error("Upscale succeeded but no output URL was returned.");
      } else if (status === "failed") {
        throw new Error(pollData.error || "Upscale failed.");
      }
    }
    throw new Error('Polling timed out.');
  };

  const triggerWavespeed = async (base64Image: string): Promise<string> => {
    const payload: any = { 
        enable_prompt_expansion: false, 
        images: [base64Image], 
        prompt: prompt, 
        seed: Math.floor(Math.random() * 1000000000), // Ensures diverse concurrent variations
        guidance_scale: 7.5,
        num_inference_steps: 30
    };

    const res = await fetch('https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wavespeedKey}` },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Trigger failed.');

    const id = data.id || data.request_id || data.data?.id;
    if (!id) throw new Error(`Server responded successfully but no ID was found.`);
    
    setRequestId(id); 
    setStatus('processing'); 

    let isCompleted = false;
    let pollCount = 0;
    while (!isCompleted && pollCount < 150) {
      await new Promise(r => setTimeout(r, 2000));
      pollCount++;
      
      const pollUrl = data.request_id 
        ? `https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit/requests/${id}/status`
        : `https://api.wavespeed.ai/api/v3/predictions/${id}`;

      const poll = await fetch(pollUrl, { headers: { 'Authorization': `Bearer ${wavespeedKey}` } });
      const pollData = await poll.json();
      const status = (pollData.status || pollData.state || pollData.data?.status || '').toLowerCase();

      if (status === 'completed' || status === 'succeeded' || status === 'success') {
        const outputs = pollData.outputs || pollData.data?.outputs || pollData.output;
        if (outputs?.[0]) return typeof outputs[0] === 'string' ? outputs[0] : outputs[0].url;
        throw new Error('No output image found in result.');
      } else if (status === 'failed' || status === 'error' || status === 'canceled') {
        throw new Error(pollData.error || pollData.data?.error || 'Editor failed.');
      }
    }
    throw new Error('Polling timed out.');
  };

  const handleDownload = async (url: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      const cleanPrompt = promptText.substring(0, 20).replace(/[^a-z0-9]/gi, '_');
      a.download = `ARX_${cleanPrompt}.png`;
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
    if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null);
  };

  const handleNextHistory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idx = history.findIndex(h => h.id === selectedHistoryItem?.id);
    setSelectedHistoryItem(history[(idx + 1) % history.length]);
    setIsFlipped(false);
  };

  const handlePrevHistory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idx = history.findIndex(h => h.id === selectedHistoryItem?.id);
    setSelectedHistoryItem(history[(idx - 1 + history.length) % history.length]);
    setIsFlipped(false);
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans flex flex-col selection:bg-accent/20">
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TechApexIcon className="text-accent w-7 h-7" />
          <h1 className="text-2xl font-bold tracking-tight">ARX</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-border transition-all">
          <Settings className={`w-5 h-5 ${!wavespeedKey ? 'text-orange-500 animate-pulse' : ''}`} />
        </button>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-10">
          
          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button onClick={() => setMode('editor')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'editor' ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'text-text-secondary hover:text-white'}`}>
              <Sparkles className="w-4 h-4 inline mr-2" /> Editor
            </button>
            <button onClick={() => setMode('upscaler')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'upscaler' ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'text-text-secondary hover:text-white'}`}>
              <Maximize className="w-4 h-4 inline mr-2" /> Upscaler
            </button>
          </div>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono mb-6">01 // Asset Input</h2>
            <div className="h-[200px]">
              <UploadZone label={mode === 'editor' ? 'Upload Image to Edit' : 'Upload Image to Enhance'} file={selectedFile} preview={previewUrl} onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} onProcess={handleFileProcess} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono mb-6">02 // Parameters</h2>
            <div className="space-y-6">
              
              {mode === 'upscaler' ? (
                <div className="bg-white/[0.02] p-5 border border-border rounded-2xl grid grid-cols-3 gap-3">
                  {(['2k', '4k', '8k'] as Resolution[]).map((res) => (
                    <button key={res} onClick={() => setTargetResolution(res)} className={`py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${targetResolution === res ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'bg-black/30 border border-white/10 text-text-secondary'}`}>{res}</button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe modifications (e.g. 'change outfit to a red jacket')..." className="w-full h-32 p-5 bg-white/[0.02] border border-border rounded-2xl focus:ring-1 focus:ring-accent outline-none text-sm leading-relaxed" />
                    <div className="absolute bottom-4 right-4 text-[9px] font-mono text-text-secondary/50 uppercase tracking-widest">Wan-2.6 Editor</div>
                  </div>
                  
                  <div className="bg-white/[0.02] p-5 border border-border rounded-2xl">
                    <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest text-center mb-4">Output Variations (Batch Size)</label>
                    <div className="grid grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map(num => (
                        <button key={num} onClick={() => setBatchSize(num)} className={`py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${batchSize === num ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-105' : 'bg-black/30 border border-white/10 text-text-secondary hover:text-white'}`}>
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {status === 'idle' || status === 'completed' || status === 'failed' ? (
                <button onClick={generateEdit} className="w-full py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all bg-accent text-bg hover:shadow-[0_0_30px_rgba(0,242,255,0.4)]">
                  Execute {mode === 'upscaler' ? 'Enhancement' : 'AI Edit'}
                </button>
              ) : (
                <ProcessingBar progress={progress} />
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-7" id="result-section" ref={resultRef}>
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">Prediction // Output</h2>
              {resultUrl && (
                <button onClick={(e) => handleDownload(resultUrl, prompt, e)} className="text-[10px] font-bold uppercase text-accent flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export Asset
                </button>
              )}
            </div>
            
            <div className="relative aspect-square sm:aspect-[4/3] bg-white/[0.02] rounded-[2.5rem] overflow-hidden border border-border shadow-2xl flex items-center justify-center">
              <AnimatePresence mode="wait">
                {resultUrl ? (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full p-4">
                    {mode === 'upscaler' && previewUrl && !selectedHistoryItem ? (
                      <div ref={sliderContainerRef} className="relative w-full h-full cursor-ew-resize select-none rounded-[2rem] overflow-hidden" onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                        <img src={previewUrl} className="absolute inset-0 w-full h-full object-contain opacity-80" />
                        <img src={resultUrl} className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_10px_rgba(0,242,255,1)]" style={{ left: `${sliderPosition}%` }}>
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-bg border-2 border-accent rounded-full flex items-center justify-center shadow-xl">
                            <SlidersHorizontal className="w-4 h-4 text-accent" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full cursor-pointer" onClick={() => { setSelectedHistoryItem(history.find(h => h.url === resultUrl) || null); setIsFlipped(false); }}>
                        <img src={resultUrl} className="w-full h-full object-contain rounded-[2rem] shadow-2xl" />
                      </div>
                    )}
                  </motion.div>
                ) : status !== 'idle' ? (
                  <div className="flex flex-col items-center text-center p-12">
                    <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                    <p className="text-lg font-bold">{statusMessage}</p>
                  </div>
                ) : <ImageIcon className="w-20 h-20 text-text-secondary/20" />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {history.length > 0 && (
        <section className="max-w-6xl w-full mx-auto px-6 pt-16 border-t border-border/50 pb-12">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono mb-8">03 // Generation Log (Unlimited)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {history.map((item) => (
              <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-border bg-white/[0.02] aspect-square">
                <img src={item.url} className="w-full h-full object-cover cursor-pointer" onClick={() => { setSelectedHistoryItem(item); setIsFlipped(false); }} />
                <button onClick={(e) => handleDeleteHistory(item.id, e)} className="absolute top-2 left-2 p-2 bg-black/60 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History Modal */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedHistoryItem(null)} className="fixed inset-0 bg-bg/95 backdrop-blur-md z-[80]" />
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-8 pointer-events-none">
              <div className="pointer-events-auto relative flex items-center justify-center" style={{ perspective: 2000 }}>
                <motion.div className="relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }} onDoubleClick={() => setIsFlipped(!isFlipped)}>
                  <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-border bg-[#0a0f14] flex" style={{ backfaceVisibility: 'hidden' }}>
                    <img src={selectedHistoryItem.url} className="max-w-[90vw] max-h-[80vh] object-contain" />
                    <button onClick={() => setSelectedHistoryItem(null)} className="absolute top-4 right-4 p-2 bg-bg/60 backdrop-blur-md rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="absolute inset-0 rounded-[2rem] shadow-2xl bg-[#0d0d10] border border-border p-8 flex flex-col items-center justify-center text-center overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <h3 className="text-accent font-mono text-[10px] uppercase tracking-[0.2em] mb-4">Modification Log</h3>
                    <p className="text-lg text-text-primary mb-6">"{selectedHistoryItem.prompt}"</p>
                    <button onClick={() => { setPrompt(selectedHistoryItem.prompt); setSelectedHistoryItem(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="py-4 px-8 bg-accent text-bg rounded-xl font-bold uppercase tracking-widest text-[10px]">Use This Prompt</button>
                  </div>
                </motion.div>
                <button onClick={handlePrevHistory} className="fixed left-6 top-1/2 -translate-y-1/2 z-[100] p-4 bg-black/50 rounded-full border border-white/10"><ChevronLeft /></button>
                <button onClick={handleNextHistory} className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] p-4 bg-black/50 rounded-full border border-white/10"><ChevronRight /></button>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleSaveSettings} className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-bg border-l border-border z-[70] p-10 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-16">
                <h2 className="text-2xl font-bold">ARX <span className="text-accent">Config</span></h2>
                <button onClick={handleSaveSettings}><X /></button>
              </div>
              <div className="flex-1 space-y-6">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary">Wavespeed API Key</label>
                <input type="password" value={wavespeedKey} onChange={(e) => setWavespeedKey(e.target.value)} className="w-full p-4 bg-white/[0.02] border border-border rounded-2xl focus:border-accent outline-none transition-all" />
                <button onClick={async () => { await clearHistoryDB(); setHistory([]); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-xl font-bold uppercase text-[10px] border border-red-500/20">Wipe Local Log</button>
              </div>
              <button onClick={handleSaveSettings} className="mt-8 py-5 bg-accent text-bg rounded-2xl font-bold uppercase tracking-[0.2em] text-xs">Commit Config</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

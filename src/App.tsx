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
  CloudDownload
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

const pruneHistoryDB = async (keepCount: number = 100) => {
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
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-red-400 text-[10px] font-bold uppercase tracking-widest bg-black/60 border border-white/10 px-4 py-1.5 rounded-full hover:bg-red-500 hover:text-white transition-colors">Clear</button>
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
type AppMode = 'editor' | 'upscaler' | 'angles';
type Resolution = '2k' | '4k' | '8k';

interface HistoryItem {
  id: string;
  prompt: string;
  url: string;
  date: string;
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
  const [wavespeedKey, setWavespeedKey] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  
  // --- Parameters State ---
  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [horizontalAngle, setHorizontalAngle] = useState<number>(0);
  const [verticalAngle, setVerticalAngle] = useState<number>(0);
  const [distance, setDistance] = useState<number>(1);

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

  // --- Initialization & Cloud Sync ---
  useEffect(() => {
    const savedKey = localStorage.getItem('arx_wavespeed_key') || '';
    setMode((localStorage.getItem('arx_mode') as AppMode) || 'editor');
    setWavespeedKey(savedKey);
    
    getHistoryDB().then(localData => {
      setHistory(localData);
      if (savedKey) syncCloudHistory(savedKey);
    }).catch(console.error);
  }, []);

  // --- Auto-Save Settings ---
  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);

  // --- Cloud Sync Logic ---
  const syncCloudHistory = async (keyToUse: string) => {
    if (!keyToUse) return;
    setIsSyncing(true);
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/predictions?page=1&page_size=100", {
        headers: { "Authorization": `Bearer ${keyToUse}` }
      });
      if (!res.ok) throw new Error("Failed to fetch cloud history");
      
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
          if (item.model?.includes('multiple-angles') || item.model?.includes('qwen')) historyPrompt = `Multi-Angle Render`;

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
        const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100);
        
        sorted.forEach(item => saveHistoryItem(item));
        return sorted;
      });
    } catch (e) {
      console.error("Cloud sync failed:", e);
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
    setShowSettings(false);
    if (wavespeedKey) syncCloudHistory(wavespeedKey);
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

  // --- NON-BLOCKING QUEUE ENGINE ---
  const generateEdit = async () => {
    if (!wavespeedKey) {
      setError('Please enter your Wavespeed API Key in settings.');
      setShowSettings(true); 
      return;
    }

    if (mode === 'editor' && !prompt) {
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

        const pollResponse = await fetch(task.pollUrl, {
          headers: { "Authorization": `Bearer ${wavespeedKey}` }
        });

        if (!pollResponse.ok) {
          if (pollResponse.status === 404 && pollCount < 10) continue;
          throw new Error(`Wavespeed polling failed with status ${pollResponse.status}`);
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
            await handleFinalSuccess(finalImage, task.id, task.prompt);
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
      return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100);
    });
    
    await saveHistoryItem(newItem);
    await pruneHistoryDB(100);

    setQueue(prev => prev.filter(t => t.id !== taskId));
    setResultUrl(finalImage);
  };

  // --- API TRIGGER DEFINITIONS ---
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
        enable_prompt_expansion: false, 
        images: [base64Image], 
        prompt: prompt, 
        seed: -1,
        guidance_scale: 7.5,
        num_inference_steps: 30
    };

    const triggerResponse = await fetch('https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit', {
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
        pollUrl = `https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit/requests/${id}/status`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit/requests/${id}`;
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
    <div className="min-h-screen bg-bg text-text-primary font-sans flex flex-col selection:bg-accent/20 selection:text-accent">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TechApexIcon className="text-accent w-7 h-7 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ARX</h1>
        </div>
        <div className="flex items-center gap-4">
          {queue.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
              <Layers className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest hidden sm:inline">{queue.length} Active Queue</span>
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest sm:hidden">{queue.length} Active</span>
            </div>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-border transition-all group"
          >
            <Settings className={`w-5 h-5 transition-transform group-hover:rotate-90 ${(!wavespeedKey) ? 'text-orange-500 animate-pulse' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-5 space-y-8 sm:space-y-10">
          
          {/* Master Mode Switcher */}
          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 shadow-inner gap-1">
            <button
              onClick={() => setMode('editor')}
              className={`flex-1 py-3.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
                mode === 'editor' 
                  ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Editor
            </button>
            <button
              onClick={() => setMode('angles')}
              className={`flex-1 py-3.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
                mode === 'angles' 
                  ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Multi-Angle
            </button>
            <button
              onClick={() => setMode('upscaler')}
              className={`flex-1 py-3.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
                mode === 'upscaler' 
                  ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Upscale
            </button>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">
                01 // {mode === 'editor' ? 'Primary Asset' : mode === 'upscaler' ? 'Image to Upscale' : 'Subject to Rotate'}
              </h2>
            </div>
            
            <div className="h-[200px]">
              <UploadZone 
                label={mode === 'editor' ? 'Upload Image to Edit' : mode === 'upscaler' ? 'Upload Image to Enhance' : 'Upload Image to Extract Angles'}
                file={selectedFile} 
                preview={previewUrl} 
                onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} 
                onProcess={(f: File) => handleFileProcess(f)} 
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">
                02 // Parameters
              </h2>
            </div>
            
            <div className="space-y-6">
              
              {mode === 'upscaler' && (
                <div className="space-y-4 bg-white/[0.02] p-5 border border-border rounded-2xl">
                  <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest text-center mb-4">
                    Target Output Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['2k', '4k', '8k'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => setTargetResolution(res)}
                        className={`py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                          targetResolution === res 
                            ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-105' 
                            : 'bg-black/30 border border-white/10 text-text-secondary hover:text-white'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'angles' && (
                <div className="space-y-6 bg-white/[0.02] p-5 sm:p-6 border border-border rounded-2xl">
                  {/* Horizontal Angle */}
                  <div>
                    <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>Horizontal Rotation (Azimuth)</span>
                      <span className="text-accent">{horizontalAngle}°</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {horizontalOptions.map((opt) => (
                        <button
                          key={`h-${opt.v}`}
                          onClick={() => setHorizontalAngle(opt.v)}
                          className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                            horizontalAngle === opt.v 
                              ? 'bg-accent/10 border-accent text-accent shadow-[0_0_10px_rgba(0,242,255,0.1)]' 
                              : 'bg-black/40 border-white/5 text-text-secondary hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                    {/* Vertical Angle */}
                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Vertical Tilt</span>
                        <span className="text-accent">{verticalAngle}°</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {verticalOptions.map((opt) => (
                          <button
                            key={`v-${opt.v}`}
                            onClick={() => setVerticalAngle(opt.v)}
                            className={`py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              verticalAngle === opt.v 
                                ? 'bg-accent/10 border-accent text-accent shadow-[0_0_10px_rgba(0,242,255,0.1)]' 
                                : 'bg-black/40 border-white/5 text-text-secondary hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>Distance</span>
                        <span className="text-accent">Level {distance}</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {distanceOptions.map((opt) => (
                          <button
                            key={`d-${opt.v}`}
                            onClick={() => setDistance(opt.v)}
                            className={`py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              distance === opt.v 
                                ? 'bg-accent/10 border-accent text-accent shadow-[0_0_10px_rgba(0,242,255,0.1)]' 
                                : 'bg-black/40 border-white/5 text-text-secondary hover:bg-white/5 hover:text-white'
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

              {mode === 'editor' && (
                <div className="relative">
                  <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="Describe the modifications (e.g. 'change her outfit to a red jacket')..." 
                    className="w-full h-32 p-5 bg-white/[0.02] border border-border rounded-2xl focus:ring-1 focus:ring-accent outline-none text-sm leading-relaxed" 
                  />
                  <div className="absolute bottom-4 right-4 text-[9px] font-mono text-text-secondary/50 uppercase tracking-widest">
                    Wan-2.6 Editor
                  </div>
                </div>
              )}

              <button 
                onClick={generateEdit}
                disabled={isSubmitting} 
                className="w-full py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all bg-accent text-bg hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'upscaler' && <Maximize className="w-5 h-5" />}
                    {mode === 'editor' && <Sparkles className="w-5 h-5" />}
                    {mode === 'angles' && <Box className="w-5 h-5" />}
                  </>
                )}
                {isSubmitting ? 'Uploading to Server...' 
                 : mode === 'upscaler' ? 'Queue Resolution Enhancement' 
                 : mode === 'angles' ? 'Queue 3D Camera Angle' 
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
                      <div className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">
                        Active Queue
                      </h3>
                    </div>
                    {queue.map(task => (
                      <motion.div 
                        key={task.id} 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-[#0a0f14] border border-[#1a232c] rounded-2xl p-4 shadow-inner"
                      >
                        <div className="flex justify-between items-center mb-3">
                           <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                             {task.mode === 'angles' ? 'Multi-Angle' : task.mode}
                           </span>
                           <span className="text-[10px] font-bold text-accent drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]">
                             {Math.round(task.progress)}%
                           </span>
                        </div>
                        <div className="w-full h-1.5 bg-cyan-950 rounded-full overflow-hidden mb-3">
                           <div className="h-full bg-accent transition-all duration-300 shadow-[0_0_10px_rgba(0,242,255,0.8)]" style={{ width: `${task.progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest truncate flex-1">
                            {task.prompt}
                          </p>
                          <p className="text-[9px] font-mono text-accent uppercase tracking-widest truncate">
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">
                  {queue.length > 0 && !resultUrl ? 'Processing in Background...' : 'Prediction // Output'}
                </h2>
              </div>
              {resultUrl && (
                <button 
                  onClick={(e) => handleDownload(resultUrl, prompt || 'angle_render', e)} 
                  className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-2 hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20"
                >
                  <Download className="w-3.5 h-3.5" /> 
                  Export
                </button>
              )}
            </div>
            
            <div className="relative aspect-square sm:aspect-[4/3] bg-white/[0.02] rounded-[2.5rem] overflow-hidden border border-border shadow-2xl flex items-center justify-center">
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
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80" 
                        />
                        <img 
                          src={resultUrl} 
                          alt="Upscaled" 
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                        />
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_10px_rgba(0,242,255,1)] pointer-events-none transition-all duration-75"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-bg border-2 border-accent rounded-full flex items-center justify-center shadow-xl">
                            <SlidersHorizontal className="w-4 h-4 text-accent" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white pointer-events-none">
                          Enhanced ({targetResolution})
                        </div>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest text-text-secondary pointer-events-none">
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
                            prompt: 'Latest Output', 
                            url: resultUrl, 
                            date: new Date().toISOString() 
                          });
                          setIsFlipped(false);
                        }}
                      >
                        <img 
                          src={resultUrl} 
                          alt="Result" 
                          className="w-full h-full object-contain rounded-[2rem] shadow-2xl transition-transform duration-500 group-hover/result:scale-[1.01]" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-opacity duration-300">
                          <div className="bg-black/60 px-4 py-2 rounded-full border border-white/10 shadow-xl backdrop-blur-sm">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                              Click to Expand Data
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : queue.length > 0 ? (
                  <div className="flex flex-col items-center text-center p-12">
                    <Layers className="w-12 h-12 text-accent/30 animate-pulse mb-4" />
                    <p className="text-sm font-bold mb-2 uppercase tracking-widest">Processing Background Tasks</p>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      Your results will appear here shortly.
                    </p>
                  </div>
                ) : (
                  <ImageIcon className="w-20 h-20 text-text-secondary/20" />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* History Grid */}
      {history.length > 0 && (
        <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-16 border-t border-border/50 pb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">
              03 // Generation Log
            </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => syncCloudHistory(wavespeedKey)}
                disabled={isSyncing || !wavespeedKey}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-[9px] font-bold uppercase tracking-widest text-text-secondary disabled:opacity-50"
              >
                <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-accent' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Fetch Cloud Sync'}
              </button>
              <History className="w-4 h-4 text-text-secondary hidden sm:block" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="relative group rounded-2xl overflow-hidden border border-border bg-white/[0.02] aspect-square"
              >
                <img 
                  src={item.url} 
                  alt={item.prompt} 
                  className="w-full h-full object-cover cursor-pointer" 
                  onClick={() => { 
                    setSelectedHistoryItem(item); 
                    setIsFlipped(false); 
                  }} 
                />
                <button 
                  onClick={(e) => handleDeleteHistory(item.id, e)} 
                  className="absolute top-2 left-2 p-2 bg-black/60 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="fixed inset-0 bg-bg/95 backdrop-blur-md z-[80]" 
            />
            
            {/* Carousel Controls */}
            {history.length > 1 && (
              <>
                <button 
                  onClick={handlePrevHistory} 
                  className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[100] p-2 sm:p-4 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white border border-white/10 hover:bg-black/80 transition-all hover:scale-110"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                <button 
                  onClick={handleNextHistory} 
                  className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[100] p-2 sm:p-4 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white border border-white/10 hover:bg-black/80 transition-all hover:scale-110"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
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
                    className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-border bg-[#0a0f14] flex" 
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
                      className="absolute top-4 right-4 p-2 bg-bg/60 backdrop-blur-md rounded-full text-text-secondary hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <button 
                      onClick={(e) => handleDeleteHistory(selectedHistoryItem.id, e)} 
                      className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 bg-red-500/20 backdrop-blur-md rounded-full border border-red-500/30 transition-colors"
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
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-xl">
                        <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin-slow" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white sm:hidden">
                          Double tap to flip
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white hidden sm:inline">
                          Space to flip
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* --- BACK OF CARD --- */}
                  <div 
                    className="absolute inset-0 rounded-[2rem] shadow-2xl bg-[#0d0d10] border border-border p-6 sm:p-8 flex flex-col items-center justify-center text-center overflow-y-auto" 
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedHistoryItem(null); 
                      }} 
                      className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <button 
                      onClick={(e) => handleDeleteHistory(selectedHistoryItem.id, e)} 
                      className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full border border-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <History className="w-8 h-8 text-accent/30 mb-6" />
                    
                    <h3 className="text-accent font-mono text-[10px] uppercase tracking-[0.2em] mb-4">
                      Modification Log
                    </h3>
                    
                    <div className="flex-1 w-full max-w-2xl mx-auto flex items-center justify-center overflow-hidden mb-6">
                      <p className="text-sm sm:text-lg text-text-primary leading-relaxed px-4">
                        {selectedHistoryItem.prompt}
                      </p>
                    </div>
                    
                    {/* Only show 'Use prompt' if it's an editor request */}
                    {!selectedHistoryItem.prompt.startsWith('Multi-Angle') && !selectedHistoryItem.prompt.startsWith('Upscaled') && !selectedHistoryItem.prompt.startsWith('Cloud') && (
                      <button 
                        onClick={() => { 
                          if(selectedHistoryItem) { 
                            setPrompt(selectedHistoryItem.prompt); 
                            setSelectedHistoryItem(null); 
                            window.scrollTo({ top: 0, behavior: 'smooth' }); 
                          } 
                        }} 
                        className="w-full max-w-md mx-auto py-4 bg-accent text-bg rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] hover:shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Use This Prompt
                      </button>
                    )}
                    
                    <p className="text-[9px] text-text-secondary mt-4 uppercase tracking-widest opacity-50">
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
              className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[60]" 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-bg border-l border-border z-[70] p-10 flex flex-col shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-16">
                <h2 className="text-2xl font-bold tracking-tight">ARX <span className="text-accent">Config</span></h2>
                <button onClick={handleSaveSettings} className="transition-colors hover:text-accent">
                  <X />
                </button>
              </div>
              
              <div className="flex-1 space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-text-secondary mb-3">
                      Wavespeed API Key
                    </label>
                    <input 
                      type="password" 
                      value={wavespeedKey} 
                      onChange={(e) => setWavespeedKey(e.target.value)} 
                      className="w-full p-4 bg-white/[0.02] border border-border rounded-2xl focus:border-accent outline-none transition-all" 
                    />
                  </div>
                </div>
                
                <div className="pt-8 border-t border-border/50">
                  <button 
                    onClick={async () => { 
                      await clearHistoryDB(); 
                      setHistory([]); 
                    }} 
                    className="w-full py-4 bg-red-500/10 text-red-500 rounded-xl font-bold uppercase text-[10px] border border-red-500/20 transition-all hover:bg-red-500/20"
                  >
                    Wipe Local Log
                  </button>
                </div>
              </div>
              <button 
                onClick={handleSaveSettings} 
                className="mt-8 py-5 bg-accent text-bg rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]"
              >
                Commit Config
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

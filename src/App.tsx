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

const pruneHistoryDB = async (keepCount: number = 50) => {
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
  // --- Core State ---
  const [mode, setMode] = useState<AppMode>('editor');
  const [wavespeedKey, setWavespeedKey] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');

  // --- Input State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- Engine State ---
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // --- UI State (Slider & Modals) ---
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [sliderPosition, setSliderPosition] = useState(50);
  const resultRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // --- Initialization Effects ---
  useEffect(() => {
    setMode((localStorage.getItem('arx_mode') as AppMode) || 'editor');
    setWavespeedKey(localStorage.getItem('arx_wavespeed_key') || '');
    getHistoryDB().then(setHistory).catch(console.error);
  }, []);

  // --- Auto-Save Settings ---
  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'processing') {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) return 85;
          return prev + Math.max(0.5, (85 - prev) * 0.05);
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status]);

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
    setStatus('idle');
    setStatusMessage('');
    setProgress(0);
    setRequestId(null);
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

  // --- THE UNIFIED GENERATION ENGINE ---
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

    try {
      setError(null); 
      setResultUrl(null); 
      setRequestId(null); 
      setStatus('triggering'); 
      setProgress(5); 
      setStatusMessage('Initiating ARX Pipeline...');

      setTimeout(() => {
        if (window.innerWidth < 1024 && resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      // Branch logic: Upscaler uses binary upload, Editor uses Base64
      if (mode === 'upscaler') {
        await triggerWavespeedUpscale(selectedFile);
      } else {
        const base64ImageRaw = await fileToBase64(selectedFile);
        setProgress(15);
        await triggerWavespeed(base64ImageRaw);
      } 
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
      setStatus('failed'); 
      setProgress(0); 
    }
  };

  const handleFinalSuccess = async (finalImage: string, id: string) => {
    setResultUrl(finalImage);
    setProgress(100); 
    setStatus('completed');

    const newItem: HistoryItem = { 
      id: id, 
      prompt: mode === 'upscaler' ? `Upscaled to ${targetResolution.toUpperCase()}` : prompt, 
      url: finalImage, 
      date: new Date().toISOString() 
    };
    
    setHistory(prev => [newItem, ...prev].slice(0, 50));
    await saveHistoryItem(newItem);
    await pruneHistoryDB(50);
  };

  // --- WAVESPEED LOGIC (Upscaler API) ---
  const triggerWavespeedUpscale = async (file: File) => {
    // 1. Upload File as Binary (Best Practice for large upscaling assets)
    setStatusMessage('Uploading Asset to Secure CDN...');
    setProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await fetch("https://api.wavespeed.ai/api/v3/media/upload/binary", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${wavespeedKey}`
      },
      // Note: Do NOT set Content-Type header when using FormData; the browser sets it automatically with the correct boundary
      body: formData 
    });

    if (!uploadRes.ok) {
      throw new Error('Asset upload failed. Please try a smaller file or check your connection.');
    }

    const uploadData = await uploadRes.json();
    const cdnUrl = uploadData.data?.download_url || uploadData.url;

    if (!cdnUrl) {
      throw new Error('Failed to retrieve CDN URL after upload.');
    }

    // 2. Trigger Upscaler Endpoint
    setStatusMessage('Initiating Resolution Enhancement...');
    setProgress(25);

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

    let triggerData;
    try {
      triggerData = await triggerResponse.json();
    } catch (e) {
      throw new Error(`Failed to parse Wavespeed response. Server said: ${await triggerResponse.text()}`);
    }

    if (!triggerResponse.ok) {
      const serverMsg = triggerData.message || triggerData.error || triggerData.detail || 'Unknown Server Error';
      throw new Error(`Wavespeed API Error: ${serverMsg}`);
    }

    const id = triggerData.id || triggerData.request_id || triggerData.task_id || triggerData.uuid || triggerData.data?.id || triggerData.data?.request_id;

    if (!id) {
      const errorReason = triggerData.message || triggerData.error || triggerData.detail || JSON.stringify(triggerData);
      throw new Error(`API Rejected Request: ${errorReason}`);
    }

    setRequestId(id);
    setStatus('processing');
    setStatusMessage('Enhancing Resolution & Details...');

    // 3. Polling Loop
    let isCompleted = false;
    let pollCount = 0;
    let finalImageUri = '';

    while (!isCompleted) {
      if (pollCount >= 150) throw new Error('Polling timed out.');
      await new Promise(r => setTimeout(r, 2000));
      pollCount++;

      const pollResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${id}`, {
        headers: { "Authorization": `Bearer ${wavespeedKey}` }
      });

      if (!pollResponse.ok) throw new Error('Wavespeed polling failed.');

      const pollData = await pollResponse.json();
      const currentStatus = (pollData.status || pollData.data?.status || '').toLowerCase();

      if (currentStatus === "completed" || currentStatus === "succeeded") {
        setProgress(90);
        setStatusMessage('Fetching final high-res image...');

        // Check if outputs are returned directly in the polling response first
        let outputs = pollData.outputs || pollData.data?.outputs;

        if (!outputs || outputs.length === 0) {
          // Fallback to the dedicated result endpoint
          const resultResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${id}/result`, {
            headers: { "Authorization": `Bearer ${wavespeedKey}` }
          });
          
          if (!resultResponse.ok) throw new Error('Failed to fetch final upscale result.');
          const resultData = await resultResponse.json();
          outputs = resultData.outputs || resultData.data?.outputs;
        }

        if (outputs && outputs.length > 0) {
          finalImageUri = outputs[0];
          isCompleted = true;
        } else {
          throw new Error("Upscale succeeded but no output URL was found in the result data.");
        }
      } else if (currentStatus === "failed" || currentStatus === "error") {
        throw new Error(pollData.error || pollData.data?.error || "Upscaling task failed on the server.");
      } else {
        setStatusMessage(`Status: ${currentStatus || 'Processing'}...`);
      }
    }

    handleFinalSuccess(finalImageUri, id);
  };

  // --- WAVESPEED LOGIC (Wan-2.6 I2I) ---
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
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${wavespeedKey}` 
      },
      body: JSON.stringify(payload)
    });

    if (!triggerResponse.ok) {
      throw new Error(`Failed to trigger Wavespeed edit: ${await triggerResponse.text()}`);
    }

    setProgress(25);
    const triggerData = await triggerResponse.json();
    
    const id = triggerData.id || triggerData.request_id || triggerData.job_id || triggerData.task_id || triggerData.prediction_id || triggerData.uuid || triggerData.prediction?.id || triggerData.data?.id || triggerData.data?.request_id;
    let pollUrl = triggerData.status_url || triggerData.urls?.get || triggerData.data?.urls?.get;
    let targetResultUrl = triggerData.response_url;

    if (!id) throw new Error(`Server responded successfully but no ID was found.`);

    if (!pollUrl) {
      if (triggerData.request_id) {
        pollUrl = `https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit/requests/${id}/status`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit/requests/${id}`;
      } else {
        pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
        targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
      }
    }

    setRequestId(id); 
    setStatus('processing'); 
    setStatusMessage('Wan-2.6 is processing your request...');

    let isCompleted = false;
    let pollCount = 0;
    let finalOutputs: any = null;

    while (!isCompleted) {
      if (pollCount >= 150) throw new Error('Polling timed out.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      pollCount++;
      
      const pollResponse = await fetch(pollUrl as string, { 
        headers: { 'Authorization': `Bearer ${wavespeedKey}` } 
      });
      
      if (!pollResponse.ok) throw new Error('Wavespeed polling failed.');

      const pollData = await pollResponse.json();
      const currentStatus = (pollData.status || pollData.state || pollData.data?.status || '').toLowerCase();
      
      if (currentStatus === 'blocked' || pollData.nsfw === true || pollData.data?.nsfw === true) {
        throw new Error('Safety filter blocked request.');
      }

      if (currentStatus === 'completed' || currentStatus === 'succeeded' || currentStatus === 'success') {
        isCompleted = true; 
        setProgress(90); 
        finalOutputs = pollData.outputs || pollData.data?.outputs || (typeof pollData.output === 'string' ? [pollData.output] : pollData.output);
      } else if (currentStatus === 'failed' || currentStatus === 'error' || currentStatus === 'canceled') {
        throw new Error(pollData.error || pollData.data?.error || 'Generation failed on the server.');
      } else {
        setStatusMessage(`Status: ${currentStatus || 'Processing'}...`);
      }
    }

    if (!finalOutputs) {
      setStatus('fetching'); 
      setProgress(95); 
      
      const fetchTarget = targetResultUrl || `https://api.wavespeed.ai/api/v3/predictions/${id}`;
      const resultResponse = await fetch(fetchTarget, { 
        headers: { 'Authorization': `Bearer ${wavespeedKey}` } 
      });
      
      if (!resultResponse.ok) throw new Error('Failed to fetch result.');
      
      const resultData = await resultResponse.json();
      finalOutputs = resultData.outputs || resultData.output || resultData.data?.outputs || (resultData.url ? [resultData.url] : null);
    }

    if (finalOutputs && finalOutputs.length > 0) {
      let finalImage = finalOutputs[0];
      if (typeof finalImage === 'object' && finalImage !== null) {
        finalImage = finalImage.url || finalImage.file?.url;
      }
      handleFinalSuccess(finalImage, id);
    } else {
      throw new Error('No output image found in Wavespeed result.');
    }
  };

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
      
      window.URL.revokeObjectURL(blobUrl);
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
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-border transition-all group"
        >
          <Settings className={`w-5 h-5 transition-transform group-hover:rotate-90 ${(!wavespeedKey) ? 'text-orange-500 animate-pulse' : ''}`} />
        </button>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-5 space-y-8 sm:space-y-10">
          
          {/* Master Mode Switcher */}
          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button
              onClick={() => setMode('editor')}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'editor' 
                  ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Image Editor
            </button>
            <button
              onClick={() => setMode('upscaler')}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'upscaler' 
                  ? 'bg-accent text-bg shadow-[0_0_15px_rgba(0,242,255,0.3)] scale-[1.02]' 
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Maximize className="w-4 h-4" />
              AI Upscaler
            </button>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary font-mono">
                01 // {mode === 'editor' ? 'Primary Asset' : 'Image to Upscale'}
              </h2>
            </div>
            
            <div className="h-[200px]">
              <UploadZone 
                label={mode === 'editor' ? 'Upload Image to Edit' : 'Upload Image to Enhance'}
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
              
              {mode === 'upscaler' ? (
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
              ) : (
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

              {status === 'idle' || status === 'completed' || status === 'failed' ? (
                <button 
                  onClick={generateEdit} 
                  className="w-full py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all bg-accent text-bg hover:shadow-[0_0_30px_rgba(0,242,255,0.4)]"
                >
                  {mode === 'upscaler' ? <Maximize className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />} 
                  {mode === 'upscaler' ? 'Execute Resolution Enhancement' : 'Execute AI Edit'}
                </button>
              ) : (
                <ProcessingBar progress={progress} />
              )}
              
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
                  Prediction // Output
                </h2>
              </div>
              {resultUrl && (
                <button 
                  onClick={(e) => handleDownload(resultUrl, prompt, e)} 
                  className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> 
                  Export Asset
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
                            id: requestId || Date.now().toString(), 
                            prompt: prompt, 
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
                ) : status !== 'idle' ? (
                  <div className="flex flex-col items-center text-center p-12">
                    <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
                    <p className="text-lg font-bold mb-1">{statusMessage}</p>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      TaskID: {requestId || 'Queueing'}
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
            <History className="w-4 h-4 text-text-secondary" />
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

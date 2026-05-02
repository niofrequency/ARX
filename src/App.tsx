/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Sparkles, Settings, Loader2, AlertCircle, Download, Image as ImageIcon, 
  X, History, RefreshCw, ChevronLeft, ChevronRight, Trash2, Maximize, 
  SlidersHorizontal, Box, Layers, CloudDownload, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================
type AppMode = 'editor' | 'upscaler' | 'angles';
type EditorModel = 'wan-2.6' | 'wan-2.7' | 'qwen-2.0';
type Resolution = '2k' | '4k' | '8k';

interface HistoryItem {
  id: string; prompt: string; url: string; date: string;
}

interface QueueTask {
  id: string; mode: AppMode; prompt: string; progress: number; message: string; pollUrl: string; targetResultUrl: string;
}

const HORIZONTAL_OPTIONS = [
  { v: 0, l: '0°' }, { v: 45, l: '45°' }, { v: 90, l: '90°' }, { v: 135, l: '135°' },
  { v: 180, l: '180°' }, { v: 225, l: '225°' }, { v: 270, l: '270°' }, { v: 315, l: '315°' }
];
const VERTICAL_OPTIONS = [{ v: -30, l: '-30°' }, { v: 0, l: '0°' }, { v: 30, l: '30°' }, { v: 60, l: '60°' }];
const DISTANCE_OPTIONS = [{ v: 0, l: 'Close' }, { v: 1, l: 'Med' }, { v: 2, l: 'Wide' }];

// ==========================================
// 2. DATABASE UTILITIES
// ==========================================
const DB_NAME = 'ARX_DB'; const STORE_NAME = 'history'; const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
};

const dbUtils = {
  save: async (item: HistoryItem) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error);
    });
  },
  getAll: async (): Promise<HistoryItem[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as HistoryItem[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      request.onerror = () => reject(request.error);
    });
  },
  delete: async (id: string) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error);
    });
  },
  clear: async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error);
    });
  },
  prune: async (keepCount = 10000) => {
    const history = await dbUtils.getAll();
    if (history.length <= keepCount) return;
    const toDelete = history.slice(keepCount);
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    toDelete.forEach(item => tx.objectStore(STORE_NAME).delete(item.id));
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string); reader.onerror = reject;
  });
};

// ==========================================
// 3. CUSTOM HOOKS (LOGIC LAYER)
// ==========================================
function useHistoryManager(wavespeedKey: string) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncCloudHistory = useCallback(async () => {
    if (!wavespeedKey) return;
    setIsSyncing(true);
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/predictions?page=1&page_size=100", { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
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
          if (item.model?.includes('multiple-angles') || item.model?.includes('qwen-image/edit-multiple')) historyPrompt = `Multi-Angle Render`;

          return { id: item.id, prompt: historyPrompt, url: imageUrl, date: item.created_at || new Date().toISOString() };
        })
        .filter((item: any) => item.url);

      setHistory(prev => {
        const merged = [...cloudHistory, ...prev];
        const unique = Array.from(new Map(merged.map(i => [i.id, i])).values());
        const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10000);
        sorted.forEach(i => dbUtils.save(i));
        return sorted;
      });
    } catch (e) { console.error("Cloud sync failed:", e); } 
    finally { setIsSyncing(false); }
  }, [wavespeedKey]);

  useEffect(() => {
    dbUtils.getAll().then(localData => {
      setHistory(localData);
      if (wavespeedKey) syncCloudHistory();
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addHistoryItem = async (item: HistoryItem) => {
    setHistory(prev => {
      const merged = [item, ...prev];
      const unique = Array.from(new Map(merged.map(i => [i.id, i])).values());
      return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10000);
    });
    await dbUtils.save(item);
    await dbUtils.prune(10000);
  };

  const deleteHistoryItem = async (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    await dbUtils.delete(id);
  };

  const clearHistory = async () => {
    await dbUtils.clear();
    setHistory([]);
  };

  return { history, isSyncing, addHistoryItem, deleteHistoryItem, clearHistory, syncCloudHistory };
}

function useWavespeedEngine(wavespeedKey: string, onSuccess: (item: HistoryItem) => void) {
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | string>('...');

  const fetchBalance = useCallback(async (key = wavespeedKey) => {
    if (!key) return;
    try {
      const res = await fetch("https://api.wavespeed.ai/api/v3/balance", { headers: { "Authorization": `Bearer ${key}` }});
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data.balance === 'number') setCreditBalance(`$${json.data.balance.toFixed(2)}`);
      }
    } catch (e) { console.error("Failed to fetch balance", e); }
  }, [wavespeedKey]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const pollBackground = async (task: QueueTask) => {
    let isCompleted = false; let pollCount = 0;
    const progressInterval = setInterval(() => {
      setQueue(prev => prev.map(t => t.id === task.id && t.progress < 85 ? { ...t, progress: t.progress + Math.max(0.5, (85 - t.progress) * 0.05) } : t));
    }, 500);

    try {
      while (!isCompleted) {
        if (pollCount >= 150) throw new Error('Polling timed out.');
        await new Promise(r => setTimeout(r, 2000)); pollCount++;
        
        const pollResponse = await fetch(task.pollUrl, { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
        if (!pollResponse.ok) { if (pollResponse.status === 404 && pollCount < 10) continue; throw new Error(`Wavespeed polling failed with status ${pollResponse.status}`); }

        const pollData = await pollResponse.json();
        const currentStatus = (pollData.status || pollData.state || pollData.data?.status || '').toLowerCase();

        if (['completed', 'succeeded', 'success'].includes(currentStatus)) {
          clearInterval(progressInterval);
          setQueue(prev => prev.map(t => t.id === task.id ? { ...t, progress: 95, message: 'Fetching output...' } : t));
          
          let outputs = pollData.outputs || pollData.output || pollData.data?.outputs;
          if (!outputs || outputs.length === 0) {
            const resultResponse = await fetch(task.targetResultUrl, { headers: { "Authorization": `Bearer ${wavespeedKey}` } });
            if (!resultResponse.ok) throw new Error('Failed to fetch final result.');
            const resultData = await resultResponse.json();
            outputs = resultData.outputs || resultData.output || resultData.data?.outputs;
          }
          if (outputs && outputs.length > 0) {
            let finalImage = outputs[0];
            if (typeof finalImage === 'object' && finalImage !== null) finalImage = finalImage.url || finalImage.file?.url;
            isCompleted = true;
            setQueue(prev => prev.filter(t => t.id !== task.id));
            setResultUrl(finalImage);
            
            onSuccess({
              id: task.id,
              prompt: task.prompt,
              url: finalImage,
              date: new Date().toISOString()
            });
            
            fetchBalance();
          } else throw new Error("Generation succeeded but no output URL was found.");
        } else if (['failed', 'error', 'canceled'].includes(currentStatus)) {
          throw new Error(pollData.error || pollData.data?.error || "Task failed on server.");
        } else {
          setQueue(prev => prev.map(t => t.id === task.id ? { ...t, message: `Status: ${currentStatus || 'Processing'}` } : t));
        }
      }
    } catch (err: any) {
      clearInterval(progressInterval); 
      setQueue(prev => prev.filter(t => t.id !== task.id)); 
      setError(`Task Failed: ${err.message}`);
    }
  };

  const executeTask = async (mode: AppMode, file: File, config: any) => {
    if (!wavespeedKey) { setError('Please enter your Wavespeed API Key in settings.'); return; }
    setError(null); setIsSubmitting(true);

    try {
      let triggerResult;

      if (mode === 'upscaler') {
        const formData = new FormData(); formData.append('file', file);
        const uploadRes = await fetch("https://api.wavespeed.ai/api/v3/media/upload/binary", { method: "POST", headers: { "Authorization": `Bearer ${wavespeedKey}` }, body: formData });
        if (!uploadRes.ok) throw new Error('Asset upload failed. Please try a smaller file or check your connection.');
        const uploadData = await uploadRes.json();
        const cdnUrl = uploadData.data?.download_url || uploadData.url;
        if (!cdnUrl) throw new Error('Failed to retrieve CDN URL after upload.');

        const payload = { enable_base64_output: false, enable_sync_mode: false, image: cdnUrl, output_format: "jpeg", target_resolution: config.targetResolution };
        const res = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wavespeedKey}` }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(`Wavespeed API Error: ${data.message || data.error || data.detail || 'Unknown Server Error'}`);

        const id = data.id || data.request_id || data.task_id || data.uuid || data.data?.id || data.data?.request_id;
        if (!id) throw new Error(`API Rejected Request: Missing ID.`);

        let pollUrl = data.status_url || data.urls?.get || data.data?.urls?.get;
        let targetResultUrl = data.response_url;

        if (!pollUrl) {
          if (data.request_id || data.data?.request_id) {
            pollUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler/requests/${id}/status`;
            targetResultUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/image-upscaler/requests/${id}`;
          } else {
            pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
            targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
          }
        }
        triggerResult = { id, pollUrl, targetResultUrl, historyPrompt: `Upscaled to ${config.targetResolution.toUpperCase()}` };
      } 
      else if (mode === 'angles') {
        const formData = new FormData(); formData.append('file', file);
        const uploadRes = await fetch("https://api.wavespeed.ai/api/v3/media/upload/binary", { method: "POST", headers: { "Authorization": `Bearer ${wavespeedKey}` }, body: formData });
        if (!uploadRes.ok) throw new Error('Asset upload failed. Please try a smaller file.');
        const uploadData = await uploadRes.json();
        const cdnUrl = uploadData.data?.download_url || uploadData.url;
        if (!cdnUrl) throw new Error('Failed to retrieve CDN URL after upload.');

        const payload = { distance: config.distance, enable_base64_output: false, enable_sync_mode: false, horizontal_angle: config.horizontalAngle, images: [cdnUrl], output_format: "jpeg", seed: -1, vertical_angle: config.verticalAngle };
        const res = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wavespeedKey}` }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(`Wavespeed API Error: ${data.message || data.error || data.detail || 'Unknown Error'}`);

        const id = data.id || data.request_id || data.task_id || data.uuid || data.data?.id || data.data?.request_id;
        if (!id) throw new Error(`API Rejected Request: Missing Task ID.`);

        let pollUrl = data.status_url || data.urls?.get || data.data?.urls?.get;
        let targetResultUrl = data.response_url;

        if (!pollUrl) {
          if (data.request_id || data.data?.request_id) {
            pollUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles/requests/${id}/status`;
            targetResultUrl = `https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles/requests/${id}`;
          } else {
            pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
            targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
          }
        }
        triggerResult = { id, pollUrl, targetResultUrl, historyPrompt: `Multi-Angle | H:${config.horizontalAngle}° V:${config.verticalAngle}° D:${config.distance}` };
      } 
      else {
        const base64ImageRaw = await fileToBase64(file);
        const payload: any = { images: [base64ImageRaw], prompt: config.prompt, seed: -1 };
        if (config.editorModel === 'wan-2.6') { payload.enable_prompt_expansion = false; payload.guidance_scale = 7.5; payload.num_inference_steps = 30; }

        let endpoint = ''; let basePath = '';
        if (config.editorModel === 'qwen-2.0') {
            endpoint = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image-2.0/edit'; basePath = 'wavespeed-ai/qwen-image-2.0/edit';
        } else {
            endpoint = `https://api.wavespeed.ai/api/v3/alibaba/${config.editorModel}/image-edit`; basePath = `alibaba/${config.editorModel}/image-edit`;
        }

        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wavespeedKey}` }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(`Failed to trigger Wavespeed edit: ${data.message || 'Unknown Error'}`);

        const id = data.id || data.request_id || data.job_id || data.task_id || data.prediction_id || data.uuid || data.prediction?.id || data.data?.id || data.data?.request_id;
        if (!id) throw new Error(`Server responded successfully but no ID was found.`);

        let pollUrl = data.status_url || data.urls?.get || data.data?.urls?.get;
        let targetResultUrl = data.response_url;

        if (!pollUrl) {
          if (data.request_id || data.data?.request_id) {
            pollUrl = `https://api.wavespeed.ai/api/v3/${basePath}/requests/${id}/status`;
            targetResultUrl = `https://api.wavespeed.ai/api/v3/${basePath}/requests/${id}`;
          } else {
            pollUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}`;
            targetResultUrl = `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;
          }
        }
        triggerResult = { id, pollUrl, targetResultUrl, historyPrompt: config.prompt };
      }

      const newTask: QueueTask = { id: triggerResult.id, mode, prompt: triggerResult.historyPrompt, progress: 15, message: 'Queued...', pollUrl: triggerResult.pollUrl, targetResultUrl: triggerResult.targetResultUrl };
      setQueue(prev => [...prev, newTask]);
      pollBackground(newTask);

    } catch (err: any) { console.error(err); setError(err.message || 'An unexpected error occurred.'); } 
    finally { setIsSubmitting(false); }
  };

  return { queue, isSubmitting, error, setError, resultUrl, setResultUrl, creditBalance, fetchBalance, executeTask };
}


// ==========================================
// 4. UI COMPONENTS (WORKSPACE ARCHITECTURE)
// ==========================================
const TechApexIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22L2 2h20L12 22z" /><path d="M12 22V2" /><path d="M2 2l10 10 10-10" />
  </svg>
);

const GlobalHeader = ({ wavespeedKey, creditBalance, queueLength, onOpenSettings, sidebarOpen, setSidebarOpen }: any) => (
  <header className="flex-shrink-0 z-50 bg-zinc-950 border-b border-zinc-800/50 px-4 h-14 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 hover:text-zinc-100 transition-colors">
        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
      </button>
      <div className="w-px h-4 bg-zinc-800" />
      <div className="flex items-center gap-2">
        <TechApexIcon className="text-zinc-100 w-4 h-4 shrink-0" />
        <h1 className="text-sm font-semibold tracking-wide text-zinc-50">ARX Workspace</h1>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      {wavespeedKey && creditBalance !== '...' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md">
          <Sparkles className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-medium text-zinc-300 tracking-widest">{creditBalance}</span>
        </div>
      )}
      {queueLength > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-md">
          <Layers className="w-3 h-3 text-zinc-100 animate-pulse" />
          <span className="text-[10px] font-medium text-zinc-100 tracking-widest">{queueLength} Active</span>
        </div>
      )}
      <button onClick={onOpenSettings} className="p-1.5 hover:bg-zinc-900 rounded-md transition-all text-zinc-400 hover:text-zinc-100">
        <Settings className="w-4 h-4" />
      </button>
    </div>
  </header>
);

const UploadZone = ({ file, preview, onClear, onProcess }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div 
      onClick={() => !file && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onProcess(f); }}
      className={`relative group cursor-pointer border border-dashed rounded-xl p-3 transition-all duration-300 overflow-hidden min-h-[140px] flex flex-col items-center justify-center ${
        isDragging ? 'border-zinc-500 bg-zinc-900/50' : file ? 'bg-zinc-900 border-zinc-800 border-solid' : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-700'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); }} className="hidden" accept="image/*" />
      {preview ? (
        <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-full rounded-lg overflow-hidden flex-1 flex items-center justify-center group/preview">
          <img src={preview} alt="Preview" className="max-h-[120px] w-full object-contain" />
          <div className="absolute inset-0 bg-zinc-950/80 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-zinc-100 text-[10px] font-medium uppercase tracking-widest bg-zinc-800 px-3 py-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-zinc-700 transition-colors">Remove</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <Upload className={`w-5 h-5 mb-2 transition-colors ${isDragging ? 'text-zinc-100' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
          <p className="text-[10px] font-medium text-zinc-300 tracking-wider">Drag asset or click</p>
        </div>
      )}
    </div>
  );
};

const ActionQueue = ({ queue }: { queue: QueueTask[] }) => (
  <AnimatePresence>
    {queue.length > 0 && (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 border-t border-zinc-800/50 mt-4 space-y-2">
        <h3 className="text-[9px] font-medium uppercase tracking-widest text-zinc-500 mb-3 px-1">Processing Queue</h3>
        {queue.map(task => (
          <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
               <span className="text-[9px] font-medium text-zinc-300 uppercase tracking-widest">{task.mode}</span>
               <span className="text-[9px] font-medium text-zinc-400">{Math.round(task.progress)}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden mb-2">
               <div className="h-full bg-zinc-400 transition-all duration-300" style={{ width: `${task.progress}%` }} />
            </div>
            <p className="text-[9px] text-zinc-500 truncate">{task.message}</p>
          </motion.div>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

const ResultViewer = ({ resultUrl, mode, previewUrl, queueLength, targetResolution, onSelectHistory }: any) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPosition(percentage);
  };

  if (!resultUrl && queueLength === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-[10px] uppercase tracking-widest font-medium">No output generated</p>
      </div>
    );
  }

  if (queueLength > 0 && !resultUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 mb-4 animate-spin opacity-50" />
        <p className="text-[10px] uppercase tracking-widest font-medium">Rendering in progress...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex items-center justify-center p-2 sm:p-8 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={resultUrl} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full flex items-center justify-center">
          {mode === 'upscaler' && previewUrl ? (
            <div ref={sliderContainerRef} className="relative w-full max-w-4xl max-h-full aspect-square sm:aspect-auto cursor-ew-resize select-none rounded-xl overflow-hidden group/result shadow-2xl border border-zinc-800/50 bg-zinc-900/20" onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
              <img src={previewUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-40" />
              <img src={resultUrl} alt="Upscaled" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
              <div className="absolute top-0 bottom-0 w-[1px] bg-zinc-400 pointer-events-none transition-all duration-75" style={{ left: `${sliderPosition}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center shadow-md">
                  <SlidersHorizontal className="w-3 h-3 text-zinc-950" />
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-zinc-100 pointer-events-none">Enhanced ({targetResolution})</div>
              <div className="absolute top-4 right-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-zinc-400 pointer-events-none">Original</div>
            </div>
          ) : (
            <div className="relative w-full max-w-5xl h-full cursor-pointer group/result flex items-center justify-center" onClick={onSelectHistory}>
              <img src={resultUrl} alt="Result" className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-500 group-hover/result:scale-[1.01]" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-opacity duration-300">
                <div className="bg-zinc-950/80 px-4 py-2 rounded-md border border-zinc-800 shadow-xl backdrop-blur-sm">
                  <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest">Click to Expand</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const HistoryFilmstrip = ({ history, onSelect, onDelete }: any) => {
  if (history.length === 0) return null;
  return (
    <div className="h-28 flex-shrink-0 bg-zinc-950 border-t border-zinc-800/50 flex items-center px-4 overflow-x-auto gap-3 hidden-scrollbar">
      {history.map((item: HistoryItem) => (
        <div key={item.id} className="relative group w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-600 transition-colors" onClick={() => onSelect(item)}>
          <img src={item.url} alt={item.prompt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, e); }} className="absolute top-1 right-1 p-1 bg-zinc-950/80 rounded border border-zinc-800 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

const HistoryCardModal = ({ item, history, onClose, onDelete, onApplyPrompt }: any) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(prev => !prev); }
      else if (e.code === 'ArrowRight') handleNavigate(1);
      else if (e.code === 'ArrowLeft') handleNavigate(-1);
      else if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, history]);

  const handleNavigate = (direction: number) => {
    const currentIndex = history.findIndex((h: HistoryItem) => h.id === item.id);
    const newIndex = (currentIndex + direction + history.length) % history.length;
    onApplyPrompt(history[newIndex], true); 
    setIsFlipped(false);
  };

  if (!item) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-zinc-950/90 backdrop-blur-sm z-[80]" />
      
      {history.length > 1 && (
        <>
          <button onClick={() => handleNavigate(-1)} className="fixed left-2 sm:left-8 top-1/2 -translate-y-1/2 z-[100] p-3 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button onClick={() => handleNavigate(1)} className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 z-[100] p-3 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-12 pointer-events-none">
        <div className="pointer-events-auto relative flex items-center justify-center w-full max-w-5xl" style={{ perspective: 2000 }}>
          <motion.div 
            className="relative flex items-center justify-center" 
            style={{ transformStyle: 'preserve-3d' }} 
            animate={{ rotateY: isFlipped ? 180 : 0 }} 
            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }} 
            onDoubleClick={() => setIsFlipped(!isFlipped)}
          >
            {/* FRONT (Allows image to dictate dimensions up to max-w/h bounds) */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
              <img src={item.url} alt="History Entry" className="block max-w-[90vw] sm:max-w-[85vw] max-h-[80vh] sm:max-h-[85vh] w-auto h-auto object-contain" />
              
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 p-2.5 bg-zinc-900/80 backdrop-blur-md rounded-md text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-800">
                <X className="w-4 h-4" />
              </button>
              <button onClick={(e) => onDelete(item.id, e)} className="absolute top-4 left-4 p-2.5 text-red-400 bg-zinc-900/80 backdrop-blur-md rounded-md border border-zinc-800 transition-colors hover:bg-red-500/20">
                <Trash2 className="w-4 h-4" />
              </button>
              <motion.div key={item.id} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.5, duration: 0.8 }} className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl">
                  <RefreshCw className="w-3 h-3 text-zinc-400 animate-spin-slow" />
                  <span className="text-[9px] font-medium uppercase tracking-widest text-zinc-300">Space to flip</span>
                </div>
              </motion.div>
            </div>

            {/* BACK (Matches exact dimensions of the front via absolute inset-0) */}
            <div className="absolute inset-0 rounded-3xl shadow-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-12 flex flex-col items-center justify-center text-center overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 p-2.5 text-zinc-500 hover:text-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <History className="w-6 h-6 text-zinc-700 mb-6" />
              <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest mb-4">Metadata Log</h3>
              <div className="w-full max-w-2xl mx-auto mb-8 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-light">{item.prompt}</p>
                <p className="text-[10px] text-zinc-600 mt-4 font-mono">{new Date(item.date).toLocaleString()}</p>
              </div>
              {!item.prompt.startsWith('Multi-Angle') && !item.prompt.startsWith('Upscaled') && !item.prompt.startsWith('Cloud') && (
                <button onClick={() => onApplyPrompt(item)} className="w-full max-w-xs mx-auto py-3 bg-zinc-100 text-zinc-950 rounded-lg font-medium uppercase tracking-widest text-[10px] hover:bg-white transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Apply Parameters
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

// ==========================================
// 5. MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<AppMode>(() => (localStorage.getItem('arx_mode') as AppMode) || 'editor');
  const [editorModel, setEditorModel] = useState<EditorModel>(() => (localStorage.getItem('arx_editor_model') as EditorModel) || 'wan-2.7');
  const [wavespeedKey, setWavespeedKey] = useState<string>(() => localStorage.getItem('arx_wavespeed_key') || '');
  const [prompt, setPrompt] = useState<string>('');
  
  const [targetResolution, setTargetResolution] = useState<Resolution>('4k');
  const [horizontalAngle, setHorizontalAngle] = useState<number>(0);
  const [verticalAngle, setVerticalAngle] = useState<number>(0);
  const [distance, setDistance] = useState<number>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);

  const { history, isSyncing, addHistoryItem, deleteHistoryItem, clearHistory, syncCloudHistory } = useHistoryManager(wavespeedKey);
  const { queue, isSubmitting, error, setError, resultUrl, setResultUrl, creditBalance, fetchBalance, executeTask } = useWavespeedEngine(wavespeedKey, addHistoryItem);

  // Auto-close sidebar on mobile devices on initial load
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('arx_editor_model', editorModel); }, [editorModel]);

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
    if (!file.type.startsWith('image/')) { setError('Invalid file type.'); return; }
    setSelectedFile(file); 
    setPreviewUrl(URL.createObjectURL(file)); 
    setResultUrl(null);
    setError(null);
  };

  const handleExecute = () => {
    if (!wavespeedKey) return setShowSettings(true) || setError('Missing API Key.');
    if (mode === 'editor' && !prompt) return setError('Prompt required.');
    if (!selectedFile) return setError('Asset required.');
    
    executeTask(mode, selectedFile, { prompt, editorModel, targetResolution, horizontalAngle, verticalAngle, distance });
  };

  const handleApplyHistoryPrompt = (item: HistoryItem, isNavigationOnly = false) => {
    if (!isNavigationOnly) {
      setPrompt(item.prompt);
      setSelectedHistoryItem(null);
      setSidebarOpen(true);
    } else {
      setSelectedHistoryItem(item);
    }
  };

  const handleDownload = async (url: string, promptText: string) => {
    try {
      const response = await fetch(url); const blob = await response.blob(); const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl;
      a.download = `ARX_${promptText.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) { window.open(url, '_blank'); }
  };

  const closeSettings = () => {
    localStorage.setItem('arx_wavespeed_key', wavespeedKey);
    setShowSettings(false);
    if (wavespeedKey) { syncCloudHistory(); fetchBalance(); }
  };

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 font-sans flex flex-col overflow-hidden selection:bg-zinc-800 selection:text-zinc-100">
      
      <GlobalHeader 
        wavespeedKey={wavespeedKey} creditBalance={creditBalance} queueLength={queue.length} 
        onOpenSettings={() => setShowSettings(true)} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} 
      />

      <div className="flex-1 flex overflow-hidden relative w-full">
        
        {/* Mobile Sidebar Overlay Backdrop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* LEFT SIDEBAR: Tools & Parameters */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }} 
              animate={{ width: 320, opacity: 1 }} 
              exit={{ width: 0, opacity: 0 }} 
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="absolute md:relative left-0 top-0 bottom-0 z-30 bg-zinc-950 border-r border-zinc-800/50 flex flex-col overflow-x-hidden overflow-y-auto hidden-scrollbar"
            >
              <div className="p-4 sm:p-5 space-y-6 w-[320px] max-w-[85vw]">
                
                {/* Mode Switcher */}
                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                  {[{ id: 'editor', label: 'Edit' }, { id: 'angles', label: 'Angle' }, { id: 'upscaler', label: 'Scale' }].map(tab => (
                    <button key={tab.id} onClick={() => setMode(tab.id as AppMode)} className={`flex-1 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all duration-200 ${mode === tab.id ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Upload Zone */}
                <section>
                  <h3 className="text-[9px] font-medium uppercase tracking-widest text-zinc-500 mb-2 px-1">Base Asset</h3>
                  <UploadZone file={selectedFile} preview={previewUrl} onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} onProcess={handleFileProcess} />
                </section>

                {/* Parameters */}
                <section>
                  <h3 className="text-[9px] font-medium uppercase tracking-widest text-zinc-500 mb-2 px-1">Configuration</h3>
                  
                  {mode === 'upscaler' && (
                    <div className="grid grid-cols-3 gap-2">
                      {(['2k', '4k', '8k'] as Resolution[]).map((res) => (
                        <button key={res} onClick={() => setTargetResolution(res)} className={`py-2 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-all border ${targetResolution === res ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}>{res}</button>
                      ))}
                    </div>
                  )}

                  {mode === 'angles' && (
                    <div className="space-y-4">
                      <div>
                        <label className="flex justify-between text-[9px] text-zinc-400 uppercase tracking-widest mb-2 px-1"><span>Azimuth</span><span className="text-zinc-100">{horizontalAngle}°</span></label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {HORIZONTAL_OPTIONS.map((opt) => (
                            <button key={`h-${opt.v}`} onClick={() => setHorizontalAngle(opt.v)} className={`py-1.5 rounded text-[9px] font-medium transition-all border ${horizontalAngle === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>{opt.l}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex justify-between text-[9px] text-zinc-400 uppercase tracking-widest mb-2 px-1"><span>Tilt</span><span className="text-zinc-100">{verticalAngle}°</span></label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {VERTICAL_OPTIONS.map((opt) => (
                              <button key={`v-${opt.v}`} onClick={() => setVerticalAngle(opt.v)} className={`py-1.5 rounded text-[9px] font-medium transition-all border ${verticalAngle === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>{opt.l}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="flex justify-between text-[9px] text-zinc-400 uppercase tracking-widest mb-2 px-1"><span>Dist</span><span className="text-zinc-100">Lvl {distance}</span></label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {DISTANCE_OPTIONS.map((opt) => (
                              <button key={`d-${opt.v}`} onClick={() => setDistance(opt.v)} className={`py-1.5 rounded text-[9px] font-medium transition-all border ${distance === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>{opt.l}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'editor' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                        {['wan-2.6', 'wan-2.7', 'qwen-2.0'].map(model => (
                          <button key={model} onClick={() => setEditorModel(model as EditorModel)} className={`py-1.5 rounded text-[9px] font-medium uppercase tracking-widest transition-all ${editorModel === model ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{model === 'qwen-2.0' ? 'Qwen' : model.replace('-', ' ')}</button>
                        ))}
                      </div>
                      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe modifications..." className="w-full h-32 p-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none text-xs leading-relaxed resize-none transition-all placeholder:text-zinc-600" />
                    </div>
                  )}
                </section>

                <button onClick={handleExecute} disabled={isSubmitting} className="w-full py-3 rounded-lg font-medium uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50 mt-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isSubmitting ? 'Processing...' : 'Execute'}
                </button>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-[10px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <ActionQueue queue={queue} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* MAIN CANVAS: Result Viewer & Filmstrip */}
        <main className="flex-1 bg-[#0a0a0c] flex flex-col relative min-w-0">
          
          <div className="absolute top-4 right-4 z-20 flex gap-2">
             {resultUrl && (
              <button onClick={() => handleDownload(resultUrl, prompt || 'render')} className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-300 hover:text-zinc-100 p-2 rounded-md transition-colors flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            )}
          </div>

          <ResultViewer 
            resultUrl={resultUrl} mode={mode} previewUrl={previewUrl} queueLength={queue.length} targetResolution={targetResolution} 
            onSelectHistory={() => {
              const match = history.find(h => h.url === resultUrl);
              setSelectedHistoryItem(match || { id: Date.now().toString(), prompt: 'Latest Output', url: resultUrl!, date: new Date().toISOString() });
            }} 
          />

          <HistoryFilmstrip history={history} onSelect={setSelectedHistoryItem} onDelete={deleteHistoryItem} />
        </main>

      </div>

      {/* MODALS */}
      <AnimatePresence>
        {selectedHistoryItem && <HistoryCardModal item={selectedHistoryItem} history={history} onClose={() => setSelectedHistoryItem(null)} onDelete={deleteHistoryItem} onApplyPrompt={handleApplyHistoryPrompt} />}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSettings} className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-zinc-950 border-l border-zinc-800 z-[70] p-8 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-lg font-medium tracking-tight text-zinc-100">Preferences</h2>
                <button onClick={closeSettings} className="p-1.5 text-zinc-500 hover:text-zinc-100 transition-colors bg-zinc-900 rounded-md"><X className="w-4 h-4"/></button>
              </div>
              <div className="flex-1 space-y-8">
                <div>
                  <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500 mb-2">API Authentication</label>
                  <input type="password" value={wavespeedKey} onChange={(e) => setWavespeedKey(e.target.value)} placeholder="Wavespeed API Key" className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-xs" />
                </div>
                <div className="pt-6 border-t border-zinc-800 space-y-3">
                  <button onClick={syncCloudHistory} disabled={isSyncing || !wavespeedKey} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium uppercase tracking-widest text-[9px] border border-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-zinc-100' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Fetch Cloud Sync'}
                  </button>
                  <button onClick={clearHistory} className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-lg font-medium uppercase tracking-widest text-[9px] border border-red-500/20 transition-all">
                    Wipe Local Storage
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

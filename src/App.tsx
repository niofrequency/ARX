/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Sparkles, Settings, Loader2, AlertCircle, Download, Image as ImageIcon, 
  X, History, RefreshCw, ChevronLeft, ChevronRight, Trash2, Maximize, 
  SlidersHorizontal, Box, Layers, CloudDownload
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
  { v: 0, l: '0° Front' }, { v: 45, l: '45° F-Right' }, { v: 90, l: '90° Right' }, { v: 135, l: '135° B-Right' },
  { v: 180, l: '180° Back' }, { v: 225, l: '225° B-Left' }, { v: 270, l: '270° Left' }, { v: 315, l: '315° F-Left' }
];
const VERTICAL_OPTIONS = [{ v: -30, l: '-30° Low' }, { v: 0, l: '0° Eye' }, { v: 30, l: '30° Elev' }, { v: 60, l: '60° High' }];
const DISTANCE_OPTIONS = [{ v: 0, l: 'Close' }, { v: 1, l: 'Medium' }, { v: 2, l: 'Wide' }];

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

  useEffect(() => {
    dbUtils.getAll().then(setHistory).catch(console.error);
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

  const syncCloudHistory = async () => {
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
  };

  return { history, isSyncing, addHistoryItem, deleteHistoryItem, clearHistory, syncCloudHistory };
}

function useWavespeedEngine(wavespeedKey: string, onSuccess: (url: string, id: string, prompt: string) => void) {
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
            onSuccess(finalImage, task.id, task.prompt);
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
      setError(`Task ${task.id.substring(0, 6)} Failed: ${err.message}`);
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
// 4. UI COMPONENTS (ZINC / MINIMALIST STYLING)
// ==========================================
const TechApexIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22L2 2h20L12 22z" /><path d="M12 22V2" /><path d="M2 2l10 10 10-10" />
  </svg>
);

const TopNav = ({ wavespeedKey, creditBalance, queueLength, onOpenSettings }: any) => (
  <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 sm:px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <TechApexIcon className="text-zinc-100 w-6 h-6 shrink-0" />
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">ARX</h1>
    </div>
    <div className="flex items-center gap-4">
      {wavespeedKey && creditBalance !== '...' && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest hidden sm:inline">Bal: {creditBalance}</span>
          <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest sm:hidden">{creditBalance}</span>
        </div>
      )}
      {queueLength > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full">
          <Layers className="w-3.5 h-3.5 text-zinc-100 animate-pulse" />
          <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest hidden sm:inline">{queueLength} Active</span>
          <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest sm:hidden">{queueLength}</span>
        </div>
      )}
      <button onClick={onOpenSettings} className="p-2.5 hover:bg-zinc-900 rounded-xl border border-transparent hover:border-zinc-800 transition-all group">
        <Settings className={`w-5 h-5 transition-transform group-hover:rotate-90 ${(!wavespeedKey) ? 'text-zinc-500 animate-pulse' : 'text-zinc-400 group-hover:text-zinc-100'}`} />
      </button>
    </div>
  </nav>
);

const UploadZone = ({ label, file, preview, onClear, onProcess }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div 
      onClick={() => !file && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onProcess(f); }}
      className={`relative group cursor-pointer border rounded-2xl p-4 sm:p-6 transition-all duration-300 overflow-hidden h-full flex flex-col items-center justify-center min-h-[180px] ${
        isDragging ? 'border-zinc-300 bg-zinc-100/5 scale-[1.02]' : file ? 'bg-zinc-900/30 border-zinc-800/50' : 'border-zinc-800/50 bg-transparent hover:bg-zinc-900/30 hover:border-zinc-600'
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
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isDragging ? 'bg-zinc-100 text-zinc-900 scale-110' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:scale-110 group-hover:border-zinc-500 group-hover:text-zinc-100'}`}>
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-zinc-100 mb-1 tracking-wide">{label}</p>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{isDragging ? "Drop here" : "Click or Drop"}</p>
        </div>
      )}
    </div>
  );
};

const ActionQueue = ({ queue }: { queue: QueueTask[] }) => (
  <AnimatePresence>
    {queue.length > 0 && (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="mt-8 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-1 rounded-full bg-zinc-600" />
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">Process Queue</h3>
        </div>
        {queue.map(task => (
          <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">{task.mode === 'angles' ? 'Multi-Angle' : task.mode}</span>
               <span className="text-[10px] font-medium text-zinc-100">{Math.round(task.progress)}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
               <div className="h-full bg-zinc-200 transition-all duration-300" style={{ width: `${task.progress}%` }} />
            </div>
            <div className="flex justify-between items-center gap-4">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate flex-1">{task.prompt}</p>
              <p className="text-[9px] text-zinc-300 uppercase tracking-widest truncate">{task.message}</p>
            </div>
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

  return (
    <div className="relative aspect-square sm:aspect-[4/3] bg-zinc-900/30 rounded-3xl overflow-hidden border border-zinc-800/50 shadow-sm flex items-center justify-center">
      <AnimatePresence mode="wait">
        {resultUrl ? (
          <motion.div key="result" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full p-2 sm:p-4">
            {mode === 'upscaler' && previewUrl ? (
              <div ref={sliderContainerRef} className="relative w-full h-full cursor-ew-resize select-none rounded-2xl overflow-hidden group/result" onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                <img src={previewUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50" />
                <img src={resultUrl} alt="Upscaled" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
                <div className="absolute top-0 bottom-0 w-[1px] bg-zinc-300 pointer-events-none transition-all duration-75" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-md">
                    <SlidersHorizontal className="w-4 h-4 text-zinc-900" />
                  </div>
                </div>
                <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-zinc-100 pointer-events-none">Enhanced ({targetResolution})</div>
                <div className="absolute top-4 right-4 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-zinc-400 pointer-events-none">Original</div>
              </div>
            ) : (
              <div className="relative w-full h-full cursor-pointer group/result" onClick={onSelectHistory}>
                <img src={resultUrl} alt="Result" className="w-full h-full object-contain rounded-2xl shadow-lg transition-transform duration-500 group-hover/result:scale-[1.02]" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/result:opacity-100 transition-opacity duration-300">
                  <div className="bg-zinc-950/80 px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl backdrop-blur-sm">
                    <span className="text-[10px] font-medium text-zinc-100 uppercase tracking-widest">Expand Details</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : queueLength > 0 ? (
          <div className="flex flex-col items-center text-center p-12">
            <Layers className="w-10 h-10 text-zinc-700 animate-pulse mb-5" />
            <p className="text-xs font-medium mb-2 uppercase tracking-widest text-zinc-300">Rendering Asset</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Output will appear shortly.</p>
          </div>
        ) : (
          <ImageIcon className="w-16 h-16 text-zinc-800" />
        )}
      </AnimatePresence>
    </div>
  );
};

const ArchiveGrid = ({ history, wavespeedKey, isSyncing, onSync, onSelect, onDelete }: any) => {
  if (history.length === 0) return null;
  return (
    <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-16 border-t border-zinc-800/50 pb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">03 — Archival Log</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={onSync} disabled={isSyncing || !wavespeedKey}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-colors text-[9px] font-medium uppercase tracking-widest text-zinc-300 disabled:opacity-50"
          >
            <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-zinc-100' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Fetch Cloud'}
          </button>
          <History className="w-4 h-4 text-zinc-600 hidden sm:block" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {history.map((item: HistoryItem) => (
          <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-zinc-800/50 bg-zinc-900/20 aspect-square">
            <img src={item.url} alt={item.prompt} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500" onClick={() => onSelect(item)} />
            <button onClick={(e) => onDelete(item.id, e)} className="absolute top-2 left-2 p-2 bg-zinc-950/80 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
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
          <button onClick={() => handleNavigate(-1)} className="fixed left-2 sm:left-8 top-1/2 -translate-y-1/2 z-[100] p-3 sm:p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110 hover:bg-zinc-800">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button onClick={() => handleNavigate(1)} className="fixed right-2 sm:right-8 top-1/2 -translate-y-1/2 z-[100] p-3 sm:p-4 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-all hover:scale-110 hover:bg-zinc-800">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 sm:p-12 pointer-events-none">
        <div className="pointer-events-auto relative flex items-center justify-center w-full max-w-4xl" style={{ perspective: 2000 }}>
          <motion.div 
            className="relative flex items-center justify-center w-full" 
            style={{ transformStyle: 'preserve-3d' }} 
            animate={{ rotateY: isFlipped ? 180 : 0 }} 
            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }} 
            onDoubleClick={() => setIsFlipped(!isFlipped)}
          >
            {/* FRONT */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center w-full" style={{ backfaceVisibility: 'hidden' }}>
              <img src={item.url} alt="History Entry" className="block max-w-full max-h-[85vh] w-auto h-auto object-contain" />
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 p-2.5 bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-800">
                <X className="w-4 h-4" />
              </button>
              <button onClick={(e) => onDelete(item.id, e)} className="absolute top-4 left-4 p-2.5 text-red-400 hover:text-red-300 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-800 transition-colors hover:bg-red-500/20">
                <Trash2 className="w-4 h-4" />
              </button>
              <motion.div key={item.id} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.5, duration: 0.8 }} className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl">
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400 animate-spin-slow" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 sm:hidden">Double tap to flip</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 hidden sm:inline">Space to flip</span>
                </div>
              </motion.div>
            </div>

            {/* BACK */}
            <div className="absolute inset-0 rounded-3xl shadow-2xl bg-zinc-950 border border-zinc-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 p-2.5 text-zinc-500 hover:text-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <button onClick={(e) => onDelete(item.id, e)} className="absolute top-4 left-4 p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <History className="w-8 h-8 text-zinc-700 mb-6" />
              <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest mb-4">Asset Metadata</h3>
              <div className="flex-1 w-full max-w-2xl mx-auto flex items-center justify-center overflow-hidden mb-8">
                <p className="text-base sm:text-lg text-zinc-100 leading-relaxed font-light px-4">{item.prompt}</p>
              </div>
              {!item.prompt.startsWith('Multi-Angle') && !item.prompt.startsWith('Upscaled') && !item.prompt.startsWith('Cloud') && (
                <button onClick={() => onApplyPrompt(item)} className="w-full max-w-sm mx-auto py-4 bg-zinc-100 text-zinc-950 rounded-xl font-medium uppercase tracking-widest text-[10px] hover:bg-white transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> Apply Specification
                </button>
              )}
              <p className="text-[10px] text-zinc-600 mt-6 uppercase tracking-widest">
                <span className="sm:hidden">Double tap to view asset</span>
                <span className="hidden sm:inline">Space to view asset</span>
              </p>
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
  // --- Form & Global State ---
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
  const resultRef = useRef<HTMLDivElement>(null);

  // --- Initialize Custom Hooks ---
  const { history, isSyncing, addHistoryItem, deleteHistoryItem, clearHistory, syncCloudHistory } = useHistoryManager(wavespeedKey);
  const { queue, isSubmitting, error, setError, resultUrl, setResultUrl, creditBalance, fetchBalance, executeTask } = useWavespeedEngine(wavespeedKey, addHistoryItem);

  // --- Auto-Save User Prefs ---
  useEffect(() => { localStorage.setItem('arx_mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('arx_editor_model', editorModel); }, [editorModel]);

  // --- Global Paste Listener ---
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

  // --- Interaction Handlers ---
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please provide a valid image file.'); return; }
    setSelectedFile(file); 
    setPreviewUrl(URL.createObjectURL(file)); 
    setResultUrl(null);
    setError(null);
  };

  const handleExecute = () => {
    if (!wavespeedKey) return setShowSettings(true) || setError('Please enter your Wavespeed API Key in settings.');
    if (mode === 'editor' && !prompt) return setError('Please enter a generation prompt.');
    if (!selectedFile) return setError('Please upload a primary image to process.');
    
    if (window.innerWidth < 1024 && resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    executeTask(mode, selectedFile, { 
      prompt, editorModel, targetResolution, horizontalAngle, verticalAngle, distance 
    });
  };

  const handleApplyHistoryPrompt = (item: HistoryItem, isNavigationOnly = false) => {
    if (!isNavigationOnly) {
      setPrompt(item.prompt);
      setSelectedHistoryItem(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSelectedHistoryItem(item);
    }
  };

  const handleDownload = async (url: string, promptText: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col selection:bg-zinc-800 selection:text-zinc-100">
      <TopNav wavespeedKey={wavespeedKey} creditBalance={creditBalance} queueLength={queue.length} onOpenSettings={() => setShowSettings(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Inputs & Controls */}
        <div className="lg:col-span-5 space-y-8 sm:space-y-10">
          
          <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50">
            {[
              { id: 'editor', label: 'Editor', icon: Sparkles },
              { id: 'angles', label: 'Angles', icon: Box },
              { id: 'upscaler', label: 'Upscale', icon: Maximize }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => setMode(tab.id as AppMode)} 
                className={`flex-1 py-3 rounded-xl text-[10px] font-medium uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${mode === tab.id ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-1 rounded-full bg-zinc-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                01 — {mode === 'editor' ? 'Primary Asset' : mode === 'upscaler' ? 'Enhancement Target' : 'Rotation Subject'}
              </h2>
            </div>
            <div className="h-[200px]">
              <UploadZone label={mode === 'editor' ? 'Select Base Image' : mode === 'upscaler' ? 'Select Image to Scale' : 'Select Image to Rotate'} file={selectedFile} preview={previewUrl} onClear={() => { setSelectedFile(null); setPreviewUrl(null); }} onProcess={handleFileProcess} />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-1 rounded-full bg-zinc-500" />
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">02 — Specifications</h2>
            </div>
            <div className="space-y-6">
              
              {mode === 'upscaler' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest text-center mb-4">Output Resolution</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['2k', '4k', '8k'] as Resolution[]).map((res) => (
                      <button key={res} onClick={() => setTargetResolution(res)} className={`py-3.5 rounded-xl text-xs font-medium uppercase tracking-widest transition-all ${targetResolution === res ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>{res}</button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'angles' && (
                <div className="space-y-6 bg-zinc-900/30 p-5 sm:p-6 border border-zinc-800/50 rounded-2xl">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest mb-4 flex items-center justify-between"><span>Azimuth Rotation</span><span className="text-zinc-100">{horizontalAngle}°</span></label>
                    <div className="grid grid-cols-4 gap-2">
                      {HORIZONTAL_OPTIONS.map((opt) => (
                        <button key={`h-${opt.v}`} onClick={() => setHorizontalAngle(opt.v)} className={`py-2.5 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${horizontalAngle === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{opt.l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/50">
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest mb-4 flex items-center justify-between"><span>Vertical Tilt</span><span className="text-zinc-100">{verticalAngle}°</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {VERTICAL_OPTIONS.map((opt) => (
                          <button key={`v-${opt.v}`} onClick={() => setVerticalAngle(opt.v)} className={`py-2.5 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${verticalAngle === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest mb-4 flex items-center justify-between"><span>Distance Level</span><span className="text-zinc-100">Level {distance}</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {DISTANCE_OPTIONS.map((opt) => (
                          <button key={`d-${opt.v}`} onClick={() => setDistance(opt.v)} className={`py-2.5 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border ${distance === opt.v ? 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'editor' && (
                <div className="space-y-4 bg-zinc-900/30 p-5 border border-zinc-800/50 rounded-2xl">
                  <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest text-center mb-4">Generation Model</label>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {['wan-2.6', 'wan-2.7', 'qwen-2.0'].map(model => (
                      <button key={model} onClick={() => setEditorModel(model as EditorModel)} className={`py-3 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${editorModel === model ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'}`}>{model === 'qwen-2.0' ? 'Qwen 2.0' : model.replace('-', ' ')}</button>
                    ))}
                  </div>
                  <div className="relative">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the aesthetic or structural modifications..." className="w-full h-32 p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 outline-none text-sm leading-relaxed resize-none transition-all placeholder:text-zinc-600" />
                    <div className="absolute bottom-4 right-4 text-[9px] font-medium text-zinc-500 uppercase tracking-widest">{editorModel === 'wan-2.7' ? 'Wan-2.7 Editor' : editorModel === 'qwen-2.0' ? 'Qwen-2.0 Editor' : 'Wan-2.6 Editor'}</div>
                  </div>
                </div>
              )}

              <button onClick={handleExecute} disabled={isSubmitting} className="w-full py-4 rounded-xl font-medium uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all bg-zinc-100 text-zinc-950 hover:bg-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{mode === 'upscaler' && <Maximize className="w-4 h-4" />}{mode === 'editor' && <Sparkles className="w-4 h-4" />}{mode === 'angles' && <Box className="w-4 h-4" />}</>}
                {isSubmitting ? 'Processing Request...' : mode === 'upscaler' ? 'Execute Upscale' : mode === 'angles' ? 'Execute Rotation' : 'Execute Modification'}
              </button>

              <ActionQueue queue={queue} />
            </div>
          </section>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Results */}
        <div className="lg:col-span-7" id="result-section" ref={resultRef}>
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-zinc-500" />
                <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">{queue.length > 0 && !resultUrl ? 'Processing...' : 'Output Render'}</h2>
              </div>
              {resultUrl && (
                <button onClick={(e) => handleDownload(resultUrl, prompt || 'angle_render', e)} className="text-[10px] font-medium uppercase tracking-widest text-zinc-900 bg-zinc-100 hover:bg-white px-4 py-2 rounded-full transition-colors flex items-center gap-2">
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
          </div>
        </div>
      </main>

      <ArchiveGrid history={history} isSyncing={isSyncing} wavespeedKey={wavespeedKey} onSync={syncCloudHistory} onSelect={setSelectedHistoryItem} onDelete={deleteHistoryItem} />

      <AnimatePresence>
        {selectedHistoryItem && <HistoryCardModal item={selectedHistoryItem} history={history} onClose={() => setSelectedHistoryItem(null)} onDelete={deleteHistoryItem} onApplyPrompt={handleApplyHistoryPrompt} />}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSettings} className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-[70] p-8 sm:p-10 flex flex-col shadow-2xl overflow-y-auto">
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-xl font-medium tracking-tight text-zinc-100">Preferences</h2>
                <button onClick={closeSettings} className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex-1 space-y-8">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-3">Authentication Key</label>
                  <input type="password" value={wavespeedKey} onChange={(e) => setWavespeedKey(e.target.value)} placeholder="Enter Wavespeed API Key" className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-700 text-sm" />
                </div>
                <div className="pt-8 border-t border-zinc-800">
                  <button onClick={clearHistory} className="w-full py-4 bg-red-500/10 text-red-400 rounded-xl font-medium uppercase tracking-widest text-[10px] border border-red-500/20 transition-all hover:bg-red-500/20">
                    Clear Local Cache
                  </button>
                </div>
              </div>
              <button onClick={closeSettings} className="mt-8 py-4 bg-zinc-100 text-zinc-950 rounded-xl font-medium uppercase tracking-widest text-xs transition-all hover:bg-white">
                Save Changes
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

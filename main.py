import subprocess
import time
import urllib.request
import urllib.error
import json
import os
import base64
import asyncio
import math
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# 🔴 1. STARTUP LIFESPAN: Replaces @modal.enter()
# This boots ComfyUI in the background the moment the Cerebrium container spins up.
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Booting ComfyUI Internal Server...")
    process = subprocess.Popen(
        ["python", "main.py", "--disable-metadata", "--highvram"],
        cwd="/workspace/ComfyUI"
    )
    
    # Wait for ComfyUI to accept HTTP requests
    while True:
        try:
            urllib.request.urlopen("http://127.0.0.1:8188")
            print("✅ ComfyUI is Online and Ready!")
            break
        except urllib.error.URLError:
            time.sleep(1)
            
    yield # The app runs while yielded here
    
    # Cleanup on container shutdown
    print("🛑 Shutting down ComfyUI...")
    process.terminate()

# --- Set up the standard FastAPI app ---
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔴 2. HIGH-EFFICIENCY WORKFLOW (10 Steps, uni_pc, 81 frames)
WORKFLOW_JSON = {
  "122": { "inputs": { "model": "Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors", "base_precision": "bf16", "quantization": "fp8_e4m3fn", "load_device": "offload_device", "attention_mode": "sageattn", "rms_norm_function": "default" }, "class_type": "WanVideoModelLoader" },
  "129": { "inputs": { "model_name": "Wan2_1_VAE_bf16.safetensors", "precision": "bf16" }, "class_type": "WanVideoVAELoader" },
  "130": { "inputs": { "enable_vae_tiling": False, "tile_x": 272, "tile_y": 272, "tile_stride_x": 144, "tile_stride_y": 128, "normalization": "default", "vae": ["129", 0], "samples": ["220", 0] }, "class_type": "WanVideoDecode" },
  "131": { "inputs": { "frame_rate": 16, "loop_count": 0, "filename_prefix": "WanVideo_X264", "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True, "trim_to_audio": True, "pingpong": False, "save_output": True, "images": ["130", 0] }, "class_type": "VHS_VideoCombine" },
  "135": { "inputs": { "positive_prompt": "YOUR PROMPT HERE", "negative_prompt": "bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, images, static, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, misshapen limbs, fused fingers, still picture, messy background, three legs, many people in the background, walking backwards", "force_offload": True, "use_disk_cache": False, "device": "gpu", "t5": ["136", 0] }, "class_type": "WanVideoTextEncode" },
  "136": { "inputs": { "model_name": "umt5-xxl-enc-bf16.safetensors", "precision": "bf16", "load_device": "offload_device", "quantization": "disabled" }, "class_type": "LoadWanVideoT5TextEncoder" },
  "171": { "inputs": { "width": ["235", 0], "height": ["236", 0], "upscale_method": "lanczos", "keep_proportion": "crop", "pad_color": "0, 0, 0", "crop_position": "center", "divisible_by": 2, "device": "cpu", "per_batch": 0, "image": ["244", 0] }, "class_type": "ImageResizeKJv2" },
  "173": { "inputs": { "clip_name": "clip_vision_h.safetensors" }, "class_type": "CLIPVisionLoader" },
  "193": { "inputs": { "strength_1": 1.0, "strength_2": 1, "crop": "center", "combine_embeds": "average", "force_offload": True, "tiles": 0, "ratio": 0.5, "clip_vision": ["173", 0], "image_1": ["171", 0] }, "class_type": "WanVideoClipVisionEncode" },
  "220": { "inputs": { "steps": 10, "cfg": 2.0, "shift": 9.0, "seed": 42, "force_offload": True, "scheduler": "uni_pc", "riflex_freq_index": 0, "denoise_strength": 1, "batched_cfg": False, "rope_function": "comfy", "start_step": 0, "end_step": 10, "add_noise_to_samples": True, "model": ["122", 0], "image_embeds": ["541", 0], "text_embeds": ["135", 0], "context_options": ["498", 0] }, "class_type": "WanVideoSampler" },
  "235": { "inputs": { "value": 480 }, "class_type": "INTConstant" },
  "236": { "inputs": { "value": 832 }, "class_type": "INTConstant" },
  "244": { "inputs": { "image": "input_image.jpg" }, "class_type": "LoadImage" },
  "498": { "inputs": { "context_schedule": "static_standard", "context_frames": 81, "context_stride": 4, "context_overlap": 48, "freenoise": True, "verbose": False, "fuse_method": "linear" }, "class_type": "WanVideoContextOptions" },
  "541": { "inputs": { "width": ["235", 0], "height": ["236", 0], "num_frames": 81, "noise_aug_strength": 0, "start_latent_strength": 1, "end_latent_strength": 1, "force_offload": True, "fun_or_fl2v_model": False, "tiled_vae": False, "vae": ["129", 0], "clip_embeds": ["193", 0], "start_image": ["171", 0] }, "class_type": "WanVideoImageToVideoEncode" }
}

def calculate_wan_dimensions(img_path, max_pixels=400000):
    from PIL import Image
    with Image.open(img_path) as img:
        w, h = img.size
    aspect_ratio = w / h
    if w * h > max_pixels:
        h = int(math.sqrt(max_pixels / aspect_ratio))
        w = int(h * aspect_ratio)
    w = max(16, round(w / 16) * 16)
    h = max(16, round(h / 16) * 16)
    return w, h

@app.post("/")
async def process_generate(request: Request):
    try:
        data = await request.json()
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Failed to parse JSON: {str(e)}"})

    try:
        prompt_text = data.get("prompt", "running man")
        seed = data.get("seed", 42)
        
        input_b64 = data.get("image_base64", "")
        if "," in input_b64:
            input_b64 = input_b64.split(",")[1]
            
        img_path = "/workspace/ComfyUI/input/input_image.jpg"
        os.makedirs("/workspace/ComfyUI/input", exist_ok=True)
        
        with open(img_path, "wb") as f:
            f.write(base64.b64decode(input_b64))

        w, h = calculate_wan_dimensions(img_path)
        
        # Inject dynamic settings into the workflow
        workflow = WORKFLOW_JSON.copy()
        workflow["135"]["inputs"]["positive_prompt"] = prompt_text
        workflow["220"]["inputs"]["seed"] = seed
        workflow["235"]["inputs"]["value"] = w
        workflow["236"]["inputs"]["value"] = h

        payload = {"prompt": workflow}
        print("Forwarding workflow to internal ComfyUI...")
        
        req = urllib.request.Request(
            "http://127.0.0.1:8188/prompt",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        
        try:
            response = urllib.request.urlopen(req)
            resp_data = json.loads(response.read())
            prompt_id = resp_data["prompt_id"]
        except urllib.error.HTTPError as e:
            return JSONResponse(status_code=500, content={"error": f"ComfyUI rejected prompt: {e.read().decode()}"})

        # --- POLLING FOR RESULTS ---
        attempts = 0
        while attempts < 900: # 15 minute timeout for Wan2.2
            req_hist = urllib.request.Request(f"http://127.0.0.1:8188/history/{prompt_id}")
            try:
                hist_resp = urllib.request.urlopen(req_hist)
                hist_data = json.loads(hist_resp.read())
                
                if prompt_id in hist_data:
                    outputs = hist_data[prompt_id].get('outputs', {})
                    if not outputs:
                        return JSONResponse(status_code=500, content={"error": "ComfyUI failed internally without output."})

                    if '131' in outputs and 'gifs' in outputs['131']:
                        video_filename = outputs['131']['gifs'][0]['filename']
                        video_path = f"/workspace/ComfyUI/output/{video_filename}"
                        
                        with open(video_path, "rb") as f:
                            encoded = base64.b64encode(f.read()).decode('utf-8')
                            
                        return {"video": f"data:video/mp4;base64,{encoded}"}
            except Exception:
                pass
                
            attempts += 1
            await asyncio.sleep(1)
            
        return JSONResponse(status_code=500, content={"error": "Generation timed out."})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Python backend error: {str(e)}"})

# Note: No @modal endpoints exist below here. Uvicorn will automatically serve the `app` object above!

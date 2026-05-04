# Use RunPod's public Docker Hub mirror
FROM runpod/worker-comfyui:5.8.5-base

WORKDIR /comfyui/custom_nodes/

# Keep IP-Adapter for any future SDXL needs, and add PuLID specifically for FLUX
RUN git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git && \
    git clone https://github.com/balazik/ComfyUI-PuLID-Flux.git

# Install InsightFace into the RunPod virtual environment (required for PuLID to scan faces)
RUN /opt/venv/bin/pip install insightface onnxruntime

# Map all standard folders PLUS the new 'pulid' folder to your network volume
RUN echo "runpod_volume:" > /comfyui/extra_model_paths.yaml && \
    echo "  base_path: /runpod-volume/models" >> /comfyui/extra_model_paths.yaml && \
    echo "  checkpoints: checkpoints" >> /comfyui/extra_model_paths.yaml && \
    echo "  clip: clip" >> /comfyui/extra_model_paths.yaml && \
    echo "  clip_vision: clip_vision" >> /comfyui/extra_model_paths.yaml && \
    echo "  loras: loras" >> /comfyui/extra_model_paths.yaml && \
    echo "  controlnet: controlnet" >> /comfyui/extra_model_paths.yaml && \
    echo "  embeddings: embeddings" >> /comfyui/extra_model_paths.yaml && \
    echo "  vae: vae" >> /comfyui/extra_model_paths.yaml && \
    echo "  upscale_models: upscale_models" >> /comfyui/extra_model_paths.yaml && \
    echo "  ipadapter: ipadapter" >> /comfyui/extra_model_paths.yaml && \
    echo "  pulid: pulid" >> /comfyui/extra_model_paths.yaml

WORKDIR /
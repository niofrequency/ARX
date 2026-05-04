# Use RunPod's public Docker Hub mirror (Stable Version 5.8.5)
FROM runpod/worker-comfyui:5.8.5-base

# Set the working directory to the active ComfyUI installation inside the container
WORKDIR /comfyui/custom_nodes/

# Clone the IP-Adapter Plus custom node into the container
RUN git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git

# Create a comprehensive native ComfyUI path configuration mapped to the Network Volume
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
    echo "  ipadapter: ipadapter" >> /comfyui/extra_model_paths.yaml

# Reset the working directory back to the root expected by the RunPod handler
WORKDIR /
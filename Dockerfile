# Use RunPod's public Docker Hub mirror (Stable Version 5.8.5)
FROM runpod/worker-comfyui:5.8.5-base

# Set the working directory to the active ComfyUI installation inside the container
WORKDIR /comfyui/custom_nodes/

# Clone the IP-Adapter Plus custom node into the container
RUN git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git

# Bypass RunPod's startup script by injecting a native ComfyUI path configuration
# CRITICAL: It MUST be named extra_model_paths.yaml for ComfyUI to read it automatically!
RUN echo "runpod_custom:" > /comfyui/extra_model_paths.yaml && \
    echo "  base_path: /runpod-volume/models" >> /comfyui/extra_model_paths.yaml && \
    echo "  ipadapter: ipadapter" >> /comfyui/extra_model_paths.yaml

# Reset the working directory back to the root expected by the RunPod handler
WORKDIR /

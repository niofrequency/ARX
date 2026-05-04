# Use RunPod's public Docker Hub mirror (Stable Version 5.8.5)
FROM runpod/worker-comfyui:5.8.5-base

# Set the working directory to the active ComfyUI installation inside the container
WORKDIR /comfyui/custom_nodes/

# Clone the IP-Adapter Plus custom node into the container
RUN git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git

# Create a symlink so ComfyUI knows to look on your Network Volume for IP-Adapter models
RUN rm -rf /comfyui/models/ipadapter && \
    ln -s /runpod-volume/models/ipadapter /comfyui/models/ipadapter

# Reset the working directory back to the root expected by the RunPod handler
WORKDIR /

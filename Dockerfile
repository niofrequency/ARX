# Use RunPod's public Docker Hub mirror (Stable Version 5.8.5)
FROM runpod/worker-comfyui:5.8.5-base

# Set the working directory to the active ComfyUI installation inside the container
WORKDIR /comfyui/custom_nodes/

# Clone the IP-Adapter Plus custom node into the container
RUN git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git

# Reset the working directory back to the root expected by the RunPod handler
WORKDIR /

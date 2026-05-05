# ARX - Serverless AI Identity & Image Engine 🚀

ARX is a high-performance, serverless AI image generation pipeline designed for production-scale API deployment. Built on top of RunPod Serverless and ComfyUI, ARX leverages the FLUX architecture and native PuLID identity transfer to generate highly customized, photorealistic images.

Instead of relying on bottlenecked network volumes, ARX utilizes a custom Just-In-Time (JIT) parallel downloading architecture via `aria2c`. This allows the container to cold-boot on any GPU globally, pulling massive 20GB+ models directly into temporary RAM in seconds.

## ⚡ Key Features

*   **Serverless GPU Architecture:** Deploys as a lightweight Docker container to RunPod Serverless, scaling infinitely based on API demand.
*   **JIT Model Provisioning:** Uses `boot.sh` and `aria2c` (16-stream parallel downloading) to fetch models at boot, eliminating the need for geographic network volumes.
*   **FLUX Core Engine:** Powered by the 23-Billion parameter `Qwen-Rapid-AIO-NSFW-v23.safetensors` model for state-of-the-art prompt adherence and aesthetics.
*   **Native Identity Transfer:** Integrates `ComfyUI-PuLID-Flux` and `facexlib` for flawless, native face mapping without the "Photoshop-look" of traditional face swappers.
*   **Headless API Ready:** Accepts standard Base64 image payloads via JSON workflows, ready to be routed through a React/Next.js frontend or a Supabase/Stripe gateway.

## 🛠️ Tech Stack

*   **Infrastructure:** Docker, RunPod Serverless
*   **AI Backend:** ComfyUI, Python `handler.py`
*   **Models:** FLUX (Qwen-Rapid-AIO), PuLID FLUX v0.9.0, WanVAE
*   **Dependencies:** `insightface`, `facexlib`, `onnxruntime`, `aria2`

## 📦 Project Structure

\`\`\`text
ARX-WAVESPEED/
├── Dockerfile                  # Custom RunPod worker image configuration
├── boot.sh                     # JIT parallel download script for heavy models
├── .github/
│   └── workflows/
│       └── docker-build.yml    # CI/CD pipeline to push image to Docker Hub
└── README.md
\`\`\`

## 🚀 Deployment & Installation

### 1. Configure the Boot Script
Ensure your direct download link for the Qwen checkpoint is set in `boot.sh`. If using CivitAI, ensure your API token is appended to the URL.

\`\`\`bash
# Inside boot.sh
aria2c -x 16 -s 16 -k 1M "YOUR_DIRECT_DOWNLOAD_LINK_HERE" -d /comfyui/models/checkpoints/ -o Qwen-Rapid-AIO-NSFW-v23.safetensors
\`\`\`

### 2. Build the Docker Image
The repository includes a GitHub Action (`docker-build.yml`) that automatically builds the container. To manually build locally:

\`\`\`bash
docker build -t your-dockerhub-username/arx-comfyui-worker:v10 .
docker push your-dockerhub-username/arx-comfyui-worker:v10
\`\`\`

### 3. Deploy to RunPod
1. Navigate to RunPod Serverless.
2. Create a new Endpoint.
3. Select your Docker Image (e.g., `your-dockerhub-username/arx-comfyui-worker:v10`).
4. **Do not attach a network volume.** The `boot.sh` script handles model provisioning natively into the container's RAM.

## 🔌 API Usage

ARX expects a standard ComfyUI API JSON payload. To initiate a generation with identity transfer, send a `POST` request to your RunPod Serverless Endpoint.

**Required Nodes in your JSON Payload:**
*   `CheckpointLoaderSimple` (Targeting the Qwen FLUX safetensors)
*   `PulidFluxModelLoader` (Targeting `pulid_flux_v0.9.0.safetensors`)
*   `ApplyPulidFlux` (To inject your Base64 reference image)
*   Standard FLUX sampling nodes (`KSampler`, `VAEDecode`, `SaveImageWebsocket`)

## 🗺️ Roadmap / Future Work

*   [ ] **API Gateway Layer:** Integration with Supabase and Stripe for B2B rate-limiting and billing.
*   [ ] **4K Upscaling Pipeline:** Implementing `Ultimate SD Upscale` for high-fidelity detailing.
*   [ ] **Precision Inpainting:** `VAE Encode (for Inpainting)` support for granular object replacement.
*   [ ] **Structural Cloning:** Edge detection via FLUX ControlNet (Depth/Canny) for exact pose replication.

## 📄 License
Private / Proprietary. Built for Project ARX.

import streamlit as st
import requests
import base64
import time
from PIL import Image
import io

# --- App Configuration ---
st.set_page_config(page_title="Wavespeed Image Editor", page_icon="🎨", layout="centered")

# Custom CSS for a cleaner UI
st.markdown("""
    <style>
    .main {
        background-color: #f8f9fa;
    }
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        height: 3em;
        background-color: #4F46E5;
        color: white;
        font-weight: bold;
        border: none;
    }
    .stButton>button:hover {
        background-color: #4338CA;
        border: none;
    }
    </style>
    """, unsafe_allow_html=True)

st.title("🎨 Wavespeed.ai Image Editor")
st.write("Transform your images using the **Alibaba Wan-2.6** model via Wavespeed.ai.")

# --- Sidebar Configuration ---
with st.sidebar:
    st.header("🔑 Authentication")
    api_key = st.text_input("WAVESPEED_API_KEY", type="password", help="Enter your API key from wavespeed.ai")
    st.divider()
    st.markdown("### Instructions:")
    st.markdown("""
    1. Enter your API Key.
    2. Upload a PNG or JPG image.
    3. Describe what you want to change.
    4. Click **Generate Edit**.
    """)

# --- Main Interface ---
uploaded_file = st.file_uploader("Upload a local image", type=["png", "jpg", "jpeg"])

if uploaded_file:
    # Display the original image
    st.image(uploaded_file, caption="Original Image", use_container_width=True)
    
    prompt = st.text_input("Editing Prompt", placeholder="e.g., 'Add a red hat to the cat' or 'Change the background to a snowy mountain'")
    
    if st.button("Generate Edit"):
        if not api_key:
            st.error("⚠️ Please provide your Wavespeed API Key in the sidebar.")
        elif not prompt:
            st.error("⚠️ Please enter an editing prompt.")
        else:
            try:
                # 1. File Handling: Convert local image to Base64 Data URI
                img = Image.open(uploaded_file)
                buffered = io.BytesIO()
                # Convert to PNG for consistency
                img.save(buffered, format="PNG")
                img_base64 = base64.b64encode(buffered.getvalue()).decode()
                base64_uri = f"data:image/png;base64,{img_base64}"

                # 2. API Integration (Step 1 - Trigger Edit)
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                
                payload = {
                    "enable_prompt_expansion": False,
                    "images": [base64_uri],
                    "prompt": prompt,
                    "seed": -1
                }

                with st.status("🚀 Initializing generation...", expanded=True) as status_container:
                    response = requests.post(
                        "https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit",
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code != 200:
                        st.error(f"Failed to trigger edit: {response.text}")
                        st.stop()
                    
                    request_id = response.json().get("id")
                    st.write(f"Request ID: `{request_id}`")

                    # 3. API Integration (Step 2 - Polling)
                    status_container.update(label="⏳ Processing image...", state="running")
                    
                    while True:
                        poll_response = requests.get(
                            f"https://api.wavespeed.ai/api/v3/predictions/{request_id}",
                            headers=headers
                        )
                        
                        if poll_response.status_code != 200:
                            st.error("Error encountered while polling status.")
                            break
                        
                        data = poll_response.json()
                        current_status = data.get("status")
                        
                        if current_status == "completed":
                            status_container.update(label="✅ Generation complete!", state="complete")
                            break
                        elif current_status == "failed":
                            st.error(f"❌ Generation failed: {data.get('error', 'Unknown error')}")
                            st.stop()
                        
                        st.write(f"Current Status: `{current_status}`...")
                        time.sleep(2)

                # 4. API Integration (Step 3 - Fetch Result)
                with st.spinner("📥 Fetching final result..."):
                    result_response = requests.get(
                        f"https://api.wavespeed.ai/api/v3/predictions/{request_id}/result",
                        headers=headers
                    )
                    
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                        outputs = result_data.get("outputs", [])
                        
                        if outputs:
                            final_image_url = outputs[0]
                            st.divider()
                            st.subheader("✨ Edited Result")
                            st.image(final_image_url, use_container_width=True)
                            st.balloons()
                            st.success("Image edited successfully!")
                            st.link_button("Download Result", final_image_url)
                        else:
                            st.error("No output image found in the API response.")
                    else:
                        st.error("Failed to retrieve the final edited image.")

            except Exception as e:
                st.error(f"An unexpected error occurred: {e}")

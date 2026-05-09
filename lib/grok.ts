/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export const generateRandomIdea = async (
  apiKey: string,
  basePrompt: string,
  bodyType: string,
  angle: string,
  shotType: string
): Promise<string> => {
  const key = apiKey || import.meta.env.VITE_GROK_API_KEY;

  if (!key) {
    throw new Error("Grok API key is missing. Please add it in the settings.");
  }

  const systemInstruction = `You are an expert AI image prompt architect. 
Your job is to expand basic parameters into a highly detailed, cinematic, comma-separated prompt suitable for Wan 2.2 / Flux / SDXL style models.
Return ONLY the raw prompt. No explanations, no quotes, no markdown.`;

  const userMessage = `Create a detailed image prompt using these parameters:

Base concept: ${basePrompt && basePrompt.trim() !== '' ? basePrompt : 'beautiful woman in seductive pose'}
Body Type: ${bodyType !== 'Random' ? bodyType : 'curvy athletic feminine'}
Camera Angle: ${angle !== 'Random' ? angle : 'dynamic cinematic angle'}
Shot Type: ${shotType !== 'Random' ? shotType : 'full body dramatic shot'}

Requirements:
- Highly detailed, realistic, cinematic lighting
- Natural motion and expression
- Best quality, masterpiece, ultra-detailed, 8k
- Focus on anatomy, skin texture, and atmosphere`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "grok-beta",           // ← Updated model
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userMessage }
        ],
        temperature: 0.9,
        max_tokens: 400,              // ← Increased for better prompts
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Grok API Error:", errData);
      throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    let generated = data.choices?.[0]?.message?.content?.trim();

    if (!generated) {
      throw new Error("Empty response from Grok");
    }

    // Clean any accidental formatting
    generated = generated.replace(/^["']|["']$/g, '').trim();
    return generated;

  } catch (error: any) {
    console.error("Grok Architect Error:", error);
    throw new Error(error.message || "Failed to connect to Grok. Check your API key and internet.");
  }
};

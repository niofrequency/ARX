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

  const systemInstruction = `You are an expert AI image prompt architect. Your job is to take basic parameters and expand them into a highly detailed, cinematic, comma-separated image generation prompt (Danbooru style mixed with midjourney aesthetics).
  
CRITICAL RULES:
1. Return ONLY the raw prompt string.
2. Do NOT wrap the output in quotes.
3. Do NOT include any conversational filler (e.g. "Here is your prompt:").`;

  const userMessage = `Expand this into a master-level image prompt:
- Base concept: ${basePrompt && basePrompt.trim() !== '' ? basePrompt : 'A stunning, highly detailed character portrait'}
- Body Type: ${bodyType !== 'Random' ? bodyType : 'Choose a dramatic, stylized physique'}
- Camera Angle: ${angle !== 'Random' ? angle : 'Choose a cinematic, dynamic angle'}
- Shot Type: ${shotType !== 'Random' ? shotType : 'Choose a compelling framing'}

Ensure you append high-quality enhancement tags at the end (e.g., masterpiece, best quality, ultra-detailed, volumetric lighting, 8k resolution).`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userMessage }
        ],
        temperature: 0.85,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Failed to communicate with Grok API.");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error: any) {
    console.error("Grok Architect Error:", error);
    throw new Error(error.message || "Network error while reaching Grok API.");
  }
};

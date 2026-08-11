/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export const generateRandomIdea = async (
  apiKey: string,
  basePrompt: string = '',
  bodyType: string = 'Random',
  angle: string = 'Random',
  shotType: string = 'Random'
): Promise<string> => {
  const key = apiKey || import.meta.env.VITE_GROK_API_KEY;

  if (!key) {
    throw new Error("Grok API key is missing. Please add it in the settings.");
  }

  const systemInstruction = `You are an expert AI image prompt architect.
Your job is to turn basic parameters into a highly detailed, cinematic, comma-separated prompt optimized for professional design, cinematic portraits, and high-end visual production models.
Return ONLY the raw prompt. No explanations, no quotes, no markdown.`;

  const userMessage = `Create a detailed, high-quality image prompt using these parameters:

Base concept: ${basePrompt && basePrompt.trim() !== '' ? basePrompt : 'stunning cinematic portrait of a professional subject'}
Body Type: ${bodyType !== 'Random' ? bodyType : 'balanced natural proportions'}
Camera Angle: ${angle !== 'Random' ? angle : 'dynamic cinematic angle'}
Shot Type: ${shotType !== 'Random' ? shotType : 'dramatic medium shot'}

Requirements:
- Extremely detailed, photorealistic, cinematic lighting
- Professional photography, realistic textures, natural expression
- Best quality, masterpiece, ultra-detailed, 8k
- Rich atmosphere and depth`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userMessage }
        ],
        temperature: 0.85,
        max_tokens: 500,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Grok API Error:", errData);
      throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    let generated = data.choices?.[0]?.message?.content?.trim();

    if (!generated) {
      throw new Error("Empty response from Grok API");
    }

    // Clean up any accidental formatting
    generated = generated
      .replace(/^["']|["']$/g, '')
      .replace(/\n/g, ' ')
      .trim();

    return generated;
  } catch (error: any) {
    console.error("Grok Architect Error:", error);
    throw new Error(error.message || "Failed to generate prompt. Check your API key.");
  }
};

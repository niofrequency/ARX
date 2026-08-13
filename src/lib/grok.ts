/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// `idToken` here is a Firebase ID token for the signed-in user, not a Grok
// API key. Our own /api/grok-proxy serverless route verifies it and attaches
// the real, server-only Grok key before forwarding to xAI. This keeps the
// real key out of the browser entirely.
export const generateRandomIdea = async (
  idToken: string,
  basePrompt: string = ''
): Promise<string> => {
  if (!idToken) {
    throw new Error('You must be signed in to use the AI prompt architect.');
  }

  const systemInstruction = `You are an expert AI image prompt architect.
Your job is to turn a basic idea into a highly detailed, cinematic, comma-separated prompt optimized for professional design, cinematic portraits, and high-end visual production models.
Return ONLY the raw prompt. No explanations, no quotes, no markdown.`;

  const userMessage = `Create a detailed, high-quality image prompt based on this concept:

${basePrompt && basePrompt.trim() !== '' ? basePrompt : 'a stunning cinematic portrait of a professional subject, with a dynamic camera angle and dramatic shot composition'}

Requirements:
- Extremely detailed, photorealistic, cinematic lighting
- Professional photography, realistic textures, natural expression
- Best quality, masterpiece, ultra-detailed, 8k
- Rich atmosphere and depth`;

  try {
    const response = await fetch("/api/grok-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
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
      throw new Error(errData.error?.message || errData.error || `HTTP Error ${response.status}`);
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
    throw new Error(error.message || "Failed to generate prompt. Please try again.");
  }
};

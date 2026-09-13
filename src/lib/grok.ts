/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

export const expandCustomCharacter = async (
  idToken: string,
  name: string,
  hairHint = '',
  costumeHint = ''
): Promise<{ name: string; hair: string; costume: string }> => {
  if (!idToken) {
    throw new Error('You must be signed in to use Grok.');
  }
  if (!name.trim()) {
    throw new Error('Enter a character name first.');
  }

  const response = await fetch("/api/grok-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      model: "grok-4-1-fast",
      messages: [
        {
          role: "system",
          content: `You expand a fictional adult female character into image-prompt costume notes.
Return ONLY valid JSON with keys name, hair, costume. No markdown.
hair: short accurate hairstyle for that character.
costume: wrecked/half-on tight signature outfit, one sentence, no identity/face change, no camera/pose.`,
        },
        {
          role: "user",
          content: `Character: ${name}
Hair hint: ${hairHint || 'none'}
Costume hint: ${costumeHint || 'none'}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 220,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || errData.error || `HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  const jsonText = raw.replace(/^```json\s*|\s*```$/g, '').trim();
  const parsed = JSON.parse(jsonText);
  return {
    name: String(parsed.name || name).trim(),
    hair: String(parsed.hair || hairHint).trim(),
    costume: String(parsed.costume || costumeHint).trim(),
  };
};

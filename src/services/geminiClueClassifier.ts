import { CountryClueTopic, getSupportedTopics } from '@/services/countryClueEngine';

interface GeminiClassification {
  topic: CountryClueTopic | 'unsupported';
}

export async function classifyWithGemini(question: string): Promise<CountryClueTopic | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_CLUE_MODEL || 'gemini-3.1-flash-lite';
  const topics = getSupportedTopics();

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `Classify this informal clue question into exactly one supported topic. Do not answer it and do not infer a country.\n\nSupported topics: ${topics.join(', ')}\n\nQuestion: ${question}` }],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 40,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: { topic: { type: 'STRING', enum: [...topics, 'unsupported'] } },
            required: ['topic'],
          },
        },
      }),
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') return null;
    const parsed = JSON.parse(text) as GeminiClassification;
    return topics.includes(parsed.topic as CountryClueTopic) ? parsed.topic as CountryClueTopic : null;
  } catch {
    return null;
  }
}

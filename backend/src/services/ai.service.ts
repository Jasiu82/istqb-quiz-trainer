import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization - client is created when first needed
let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function generateQuestion(chapter: number, level: 'K1' | 'K2' | 'K3') {
  const apiClient = getClient(); // Get or create client

  const prompt = `Jesteś ekspertem ISTQB Foundation Level 4.0. Wygeneruj JEDNO pytanie egzaminacyjne.

WYMAGANIA:
- Rozdział: ${chapter}
- Poziom kognitywny: ${level}
- Format: pytanie + 4 odpowiedzi (A, B, C, D)
- Jedna poprawna odpowiedź
- Wyjaśnienie dlaczego odpowiedź jest poprawna

Odpowiedz w formacie JSON:
{
  "question": "Treść pytania",
  "answers": {
    "A": "Odpowiedź A",
    "B": "Odpowiedź B",
    "C": "Odpowiedź C",
    "D": "Odpowiedź D"
  },
  "correct": "B",
  "explanation": "Wyjaśnienie",
  "chapter": ${chapter},
  "level": "${level}"
}`;

  const message = await apiClient.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  
  throw new Error('Failed to generate question');
}
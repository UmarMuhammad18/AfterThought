const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

const models = {
  gemma3: 'gemma-3',
  llama3: 'llama-3'
};

// Chat against Ollama; if Ollama is not available, return a harmless fallback reply so the app remains usable in dev.
export const chat = async (message, model = 'gemma-3') => {
  const payload = {
    model,
    messages: [
      { role: 'system', content: 'You are Velmeir, an elegant and calm personal productivity assistant. Keep responses concise and action-oriented.' },
      { role: 'user', content: message }
    ]
  };

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama request failed: ${body}`);
    }

    const data = await response.json();
    return { response: data.output?.[0]?.content || '', model: models[model] ?? model };
  } catch (err) {
    // Fallback: generate a concise simulated response so the frontend remains testable without Ollama.
    const fallback = (() => {
      const lower = message.toLowerCase();
      if (lower.includes('show my calendar')) return 'Opening your calendar view.';
      if (lower.includes('show my tasks') || lower.includes('tasks')) return 'Showing your task list.';
      if (lower.includes('plan my week')) return 'I suggest blocking focused work sessions on Tue/Wed and a review on Friday.';
      if (lower.includes('i work')) return 'Thanks — I will remember your weekly schedule.';
      return 'Velmeir is ready. (This is a development fallback response because the local AI service is not reachable.)';
    })();

    return { response: fallback, model: 'fallback' };
  }
};

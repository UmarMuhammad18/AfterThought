import { motion } from 'framer-motion';
import { useState } from 'react';
import { assistantService } from '../../services/assistantService';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const triggerMap: Record<string, string> = {
  calendar: '/calendar',
  tasks: '/tasks',
  goals: '/goals',
  habits: '/habits',
  notes: '/notes',
  memory: '/memory'
};

const CommandBar = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { setActivePanel } = useWorkspace();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const result = await assistantService.chat(prompt);
      setResponse(result.response);
      const lower = prompt.toLowerCase();
      for (const key of Object.keys(triggerMap)) {
        if (lower.includes(key)) {
          setActivePanel(key);
          break;
        }
      }
    } catch (error) {
      setResponse('Unable to connect to the AI service.');
    }

    setLoading(false);
    setPrompt('');
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-[36px] border border-white/10 bg-white/5 p-5 shadow-soft backdrop-blur-xl">
      <div className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-400">Velmeir command hub</div>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask Velmeir to show your calendar, plan the week, or add a task…"
          className="min-h-[58px] flex-1 rounded-3xl border border-white/15 bg-slate-950/80 px-5 text-sm text-slate-100 outline-none transition focus:border-violetSoft/70 focus:ring-2 focus:ring-violetSoft/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-14 items-center justify-center rounded-3xl bg-violetSoft px-6 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Listening…' : 'Send'}
        </button>
      </form>
      {response ? <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">{response}</div> : null}
    </section>
  );
};

export default CommandBar;

import { useState } from 'react';
import { motion } from 'framer-motion';

const SettingsPage = () => {
  const [model, setModel] = useState('gemma-3');
  const [theme, setTheme] = useState('calm');

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <p className="mt-2 text-sm text-slate-400">Choose your workspace tone, model, and profile preferences.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">AI model</h3>
          <p className="mt-2 text-sm text-slate-400">Switch between locally available Ollama models.</p>
          <div className="mt-5 space-y-3">
            {['gemma-3', 'llama-3'].map((option) => (
              <button
                key={option}
                onClick={() => setModel(option)}
                className={`w-full rounded-3xl px-4 py-3 text-left text-sm transition ${model === option ? 'bg-violetSoft text-slate-950' : 'bg-slate-950/70 text-slate-200 hover:bg-white/10'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Theme and accent</h3>
          <p className="mt-2 text-sm text-slate-400">Apply a gentle style to the UI and fine-tune your workspace mood.</p>
          <div className="mt-5 space-y-3">
            {['calm', 'silver', 'ice'].map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                className={`w-full rounded-3xl px-4 py-3 text-left text-sm transition ${theme === option ? 'bg-violetSoft text-slate-950' : 'bg-slate-950/70 text-slate-200 hover:bg-white/10'}`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;

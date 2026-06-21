import GlassCard from '../components/ui/GlassCard';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { activePanel } = useWorkspace();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard title="Welcome back">
          <div className="space-y-4 text-slate-200">
            <p className="text-lg font-semibold">Velmeir is listening.</p>
            <p className="text-sm text-slate-400">Everything begins from the AI command bar. Add tasks, schedule your week, track goals, and surface memories.</p>
          </div>
        </GlassCard>
        <GlassCard title="Today’s outlook">
          <div className="space-y-3 text-slate-200">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Active workspace</p>
              <p className="mt-2 text-base text-white">{activePanel ? activePanel.toUpperCase() : 'Calm and ready'} </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Focus', 'Flow', 'Memory', 'Momentum'].map((label) => (
                <div key={label} className="rounded-3xl border border-white/8 bg-slate-950/60 p-4 text-slate-300">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <GlassCard title="Workspace guide">
          <div className="grid gap-4 sm:grid-cols-3 text-sm text-slate-300">
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <p className="font-semibold text-white">Ask</p>
              <p className="mt-2">Use the command bar to tell Velmeir what you want.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <p className="font-semibold text-white">Reveal</p>
              <p className="mt-2">Velmeir animates the panel into view when you ask for it.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <p className="font-semibold text-white">Act</p>
              <p className="mt-2">Create tasks, habits, events, goals, and memories from natural language.</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default HomePage;

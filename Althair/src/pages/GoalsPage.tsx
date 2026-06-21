import { useEffect, useState } from 'react';
import { Goal } from '../lib/types';
import { goalService } from '../services/goalService';
import { motion } from 'framer-motion';
import MindMapView from '../components/goals/MindMapView';

const GoalsPage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('Build a personal OS');

  const loadGoals = async () => {
    try {
      const items = await goalService.list();
      setGoals(items);
    } catch {
      setGoals([]);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Goals dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">A calm, expandable space for long-term ambition and progress tracking.</p>
      </motion.section>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Goals list</h3>
          <div className="mt-5 space-y-4">
            {goals.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/60 p-6 text-slate-400">No goals yet — ask Velmeir to set a new goal.</div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-base font-semibold text-white">{goal.title}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{goal.progress}%</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{goal.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <MindMapView />
      </motion.div>
    </div>
  );
};

export default GoalsPage;

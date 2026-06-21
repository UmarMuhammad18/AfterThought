import { useEffect, useState } from 'react';
import { Habit } from '../lib/types';
import { motion } from 'framer-motion';

const sampleHabits: Habit[] = [
  { id: 'h1', user_id: 'demo', title: 'Morning stretch', frequency: 'daily', streak: 8, completion_rate: 92 },
  { id: 'h2', user_id: 'demo', title: 'Weekly review', frequency: 'weekly', streak: 3, completion_rate: 78 }
];

const HabitsPage = () => {
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    setHabits(sampleHabits);
  }, []);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-white">Habit pulse</h2>
        <p className="mt-2 text-sm text-slate-400">Track streaks and completion rates with soft progress indicators.</p>
      </motion.section>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-2">
        {habits.map((habit) => (
          <div key={habit.id} className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">{habit.title}</p>
                <p className="mt-1 text-sm text-slate-400">{habit.frequency === 'daily' ? 'Daily habit' : 'Weekly habit'}</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{habit.streak} day streak</div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-3xl bg-white/5 p-4 text-slate-200">
                <p className="text-sm text-slate-400">Completion</p>
                <div className="mt-3 h-3 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violetSoft" style={{ width: `${habit.completion_rate}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-300">{habit.completion_rate}% consistency</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default HabitsPage;

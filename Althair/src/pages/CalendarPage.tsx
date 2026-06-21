import { useEffect, useState } from 'react';
import { EventItem, Task } from '../lib/types';
import { motion } from 'framer-motion';
import { taskService } from '../services/taskService';

const sampleEvents: EventItem[] = [
  { id: '1', user_id: 'demo', title: 'Weekly planning', description: 'Align the week with your main goals.', date: '2026-06-14', time: '10:00', type: 'planning' },
  { id: '2', user_id: 'demo', title: 'Team sync', description: 'Review priorities and focus areas.', date: '2026-06-15', time: '15:00', type: 'meeting' }
];

const dummyTasks: Task[] = [
  { id: 't1', user_id: 'demo', title: 'Finish product draft', completed: false, created_at: '2026-06-10', priority: 'high', description: 'Prepare review notes.', due_date: '2026-06-14' }
];

const CalendarPage = () => {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await taskService.list();
        setTasks(data);
      } catch {
        setTasks(dummyTasks);
      }
    };
    loadTasks();
  }, []);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Calendar flow</h2>
            <p className="mt-2 text-sm text-slate-400">Switch between month, week, and day perspectives for a calm schedule view.</p>
          </div>
          <div className="inline-flex rounded-3xl bg-slate-950/70 p-2">
            {['month', 'week', 'day'].map((item) => (
              <button
                key={item}
                onClick={() => setView(item as 'month' | 'week' | 'day')}
                className={`rounded-3xl px-4 py-2 text-sm transition ${view === item ? 'bg-violetSoft text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white">{view.charAt(0).toUpperCase() + view.slice(1)} view</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {sampleEvents.map((event) => (
            <div key={event.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{event.date}</span>
                <span>{event.time}</span>
              </div>
              <p className="mt-3 text-base font-semibold text-white">{event.title}</p>
              <p className="mt-1 text-sm text-slate-300">{event.description}</p>
            </div>
          ))}
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm text-slate-400">Task due {task.due_date || 'soon'}</div>
                <p className="mt-2 text-base font-semibold text-white">{task.title}</p>
                <p className="mt-1 text-sm text-slate-300">{task.description || 'Scheduled task'}</p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/60 p-6 text-slate-400">No tasks available yet. Add one from the Tasks page.</div>
          )}
        </div>
      </motion.section>
    </div>
  );
};

export default CalendarPage;

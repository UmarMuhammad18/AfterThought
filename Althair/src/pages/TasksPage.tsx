import { useEffect, useState } from 'react';
import { Task } from '../lib/types';
import { taskService } from '../services/taskService';
import { motion } from 'framer-motion';

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await taskService.list();
      setTasks(result);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async () => {
    if (!title.trim()) return;
    await taskService.create({ title, completed: false, priority });
    setTitle('');
    loadTasks();
  };

  const toggleComplete = async (task: Task) => {
    await taskService.update(task.id, { completed: !task.completed });
    loadTasks();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl"
        >
          <h2 className="text-xl font-semibold text-white">Task command center</h2>
          <p className="mt-2 text-sm text-slate-400">Create focused tasks, mark progress, and keep your day aligned.</p>
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a new task"
                className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-violetSoft/70 focus:ring-2 focus:ring-violetSoft/15"
              />
              <button onClick={addTask} className="rounded-3xl bg-violetSoft px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">Add task</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>
          </div>
        </motion.section>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl"
        >
          <h3 className="text-lg font-semibold text-white">Quick task summary</h3>
          <p className="mt-2 text-sm text-slate-400">A calm overview of pending work and completed progress.</p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-3xl bg-slate-950/70 p-4 text-slate-200">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Open tasks</div>
              <div className="mt-2 text-3xl font-semibold text-white">{tasks.filter((task) => !task.completed).length}</div>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-4 text-slate-200">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Completed</div>
              <div className="mt-2 text-3xl font-semibold text-white">{tasks.filter((task) => task.completed).length}</div>
            </div>
          </div>
        </motion.section>
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white">Task board</h3>
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="text-slate-400">Loading tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/60 p-6 text-slate-400">No tasks yet — ask Velmeir to create one or add a new task above.</div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div>
                  <p className={`text-sm font-semibold ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</p>
                  <p className="text-xs text-slate-500">{task.priority ? `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority` : 'No priority'}</p>
                </div>
                <button
                  onClick={() => toggleComplete(task)}
                  className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${task.completed ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {task.completed ? 'Completed' : 'Complete'}
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TasksPage;

import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = res.locals.user;
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const user = res.locals.user;
  const task = { ...req.body, user_id: user.id, completed: req.body.completed ?? false };
  const { data, error } = await supabase.from('tasks').insert(task).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:id', async (req, res) => {
  const user = res.locals.user;
  const { id } = req.params;
  const { data, error } = await supabase.from('tasks').update(req.body).eq('id', id).eq('user_id', user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/delete', async (req, res) => {
  const user = res.locals.user;
  const { id } = req.body;
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;

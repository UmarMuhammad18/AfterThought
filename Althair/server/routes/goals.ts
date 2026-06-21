import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = res.locals.user;
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const user = res.locals.user;
  const goal = { ...req.body, user_id: user.id, progress: req.body.progress ?? 0 };
  const { data, error } = await supabase.from('goals').insert(goal).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:id', async (req, res) => {
  const user = res.locals.user;
  const { id } = req.params;
  const { data, error } = await supabase.from('goals').update(req.body).eq('id', id).eq('user_id', user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/delete', async (req, res) => {
  const user = res.locals.user;
  const { id } = req.body;
  const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;

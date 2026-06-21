import { Router } from 'express';
import { supabase } from '../services/supabaseService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = res.locals.user;
  const { data, error } = await supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ memories: data?.map((item) => item.content) || [] });
});

router.post('/', async (req, res) => {
  const user = res.locals.user;
  const { content, category } = req.body;
  const payload = { user_id: user.id, content, category: category || 'general' };
  const { data, error } = await supabase.from('memories').insert(payload).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;

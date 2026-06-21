import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = auth.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.locals.user = data.user;
  next();
};

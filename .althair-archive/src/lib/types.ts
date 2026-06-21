export type UserProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  created_at: string;
};

export type EventItem = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  type?: string;
};

export type Habit = {
  id: string;
  user_id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completion_rate: number;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  progress: number;
  target_date?: string;
  milestones?: string[];
};

export type Memory = {
  id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
};

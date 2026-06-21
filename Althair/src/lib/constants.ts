export const PANEL_ANIMATION = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

export const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/goals', label: 'Goals' },
  { path: '/habits', label: 'Habits' },
  { path: '/notes', label: 'Notes' },
  { path: '/memory', label: 'Memory' },
  { path: '/settings', label: 'Settings' }
];

import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-3xl px-4 py-3 text-sm transition duration-200 ${
    isActive ? 'bg-white/12 text-white shadow-lg shadow-violetSoft/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="fixed left-4 top-4 z-40">
      <button
        className="inline-flex h-12 w-12 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white shadow-soft backdrop-blur-xl transition hover:bg-white/10"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open navigation"
      >
        <span className="text-2xl">☰</span>
      </button>
      {open ? (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mt-4 w-[240px] rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-soft backdrop-blur-xl"
        >
          <div className="mb-4 text-slate-300">Workspace</div>
          <nav className="space-y-2">
            {ROUTES.map((route) => (
              <NavLink key={route.path} to={route.path} className={navClass} onClick={() => setOpen(false)}>
                {route.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="mt-6 w-full rounded-3xl bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/20"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </motion.div>
      ) : null}
    </div>
  );
};

export default Sidebar;

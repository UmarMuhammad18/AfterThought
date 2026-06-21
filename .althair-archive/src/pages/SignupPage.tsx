import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await signUp(email, password, name);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(145,150,255,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(118,206,255,0.16),_transparent_30%),#02040c] px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/75 p-10 shadow-soft backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-white">Get started</h1>
        <p className="mt-2 text-slate-400">Create your Velmeir workspace.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none focus:border-violetSoft/70 focus:ring-2 focus:ring-violetSoft/15"
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none focus:border-violetSoft/70 focus:ring-2 focus:ring-violetSoft/15"
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none focus:border-violetSoft/70 focus:ring-2 focus:ring-violetSoft/15"
              required
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button className="w-full rounded-3xl bg-violetSoft px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">Create account</button>
          <p className="text-center text-sm text-slate-400">
            Already have an account? <Link to="/login" className="text-white hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;

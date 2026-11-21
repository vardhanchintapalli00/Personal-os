'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Target, Wallet, Dumbbell, CheckSquare } from 'lucide-react';
import { Button, Field, Input, Segmented, Alert } from '@/components/ui';
import { api } from '@/lib/api';

const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && name.trim().length < 2) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < (mode === 'signup' ? 8 : 1)) return setError(mode === 'signup' ? 'Password must be at least 8 characters.' : 'Enter your password.');
    setBusy(true);
    try {
      if (mode === 'signup') await api('/api/register', { method: 'POST', json: { name, email, password } });
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) throw new Error('Incorrect email or password.');
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-study via-movie to-fit p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5 text-xl font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Sparkles size={20} /></span> LifeOS</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Run your life like a<br />well-built system.</h1>
          <p className="mt-3 max-w-md text-white/80">Tasks, fitness, food, money, habits and movies in one motivating place, built for students who want to level up.</p>
          <div className="mt-8 grid max-w-sm grid-cols-2 gap-3 text-sm font-medium">
            {[[CheckSquare, 'Stay on top of studies'], [Dumbbell, 'Build a fit body'], [Target, 'Daily habit streaks'], [Wallet, 'Spend smarter in ₹']].map(([I, t], i) => {
              const Icon = I as typeof Target;
              return <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur"><Icon size={18} />{t as string}</div>;
            })}
          </div>
        </div>
        <p className="text-xs text-white/70">Discipline is choosing what you want most over what you want now.</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-study to-movie text-white"><Sparkles size={20} /></span><span className="text-xl font-bold">LifeOS</span></div>
          <h2 className="text-2xl font-bold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">{mode === 'signin' ? 'Sign in to continue your streaks.' : 'Takes less than a minute.'}</p>
          <Segmented className="mb-5 w-full [&>button]:flex-1" value={mode} onChange={(v) => { setMode(v); setError(''); }} options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Sign up' }]} />

          <form onSubmit={submit} className="space-y-3.5" noValidate>
            {mode === 'signup' && <Field label="Your name"><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vardhan Chintapalli" /></Field>}
            <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
            <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters' : undefined}>
              <Input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
          </form>

          {GOOGLE && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <Button variant="outline" size="lg" className="w-full" onClick={() => signIn('google', { callbackUrl: '/' })}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-4 6.7-9.9 6.7-17.1z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
                Continue with Google
              </Button>
            </>
          )}
          <p className="mt-6 rounded-xl bg-muted/70 px-3.5 py-2.5 text-center text-xs text-muted-foreground">Demo account (after seeding): <b>vardhan@lifeos.app</b> / <b>lifeos1234</b></p>
        </motion.div>
      </div>
    </div>
  );
}

'use client';
import { useRef, useState, type ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useQueryClient } from '@tanstack/react-query';
import { BellRing, Camera, Database, Download, FileText, Flame, KeyRound, LogOut, Moon, Palette, Sun, Monitor, Target, Trash2, User, Wallet, ShieldAlert, RefreshCw } from 'lucide-react';
import { Alert, Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, SectionTitle, Segmented, Select, Toggle } from '@/components/ui';
import { Avatar } from '@/components/app-shell';
import { BudgetEditor } from '@/components/budget-editor';
import { useProfileUpdate, useSnapshot, SNAPSHOT_KEY } from '@/lib/hooks';
import { api } from '@/lib/api';
import { toast } from '@/lib/store';
import { ACTIVITY_LEVELS, FITNESS_GOALS } from '@/lib/constants';
import { downloadPdf } from '@/lib/export';
import { todayStr } from '@/lib/dates';

type Save = (data: Record<string, unknown>) => Promise<boolean>;

/** A field that validates and saves itself when you leave it, so settings apply instantly across the app. */
function Setting({ label, name, value, save, type = 'text', min, max, step, options, hint, nullable }: {
  label: string; name: string; value: string | number | null | undefined; save: Save; type?: 'text' | 'number' | 'email' | 'select';
  min?: number; max?: number; step?: number; options?: readonly string[]; hint?: string; nullable?: boolean;
}) {
  const [v, setV] = useState(String(value ?? ''));
  const [err, setErr] = useState('');
  const commit = async (raw: string) => {
    const original = String(value ?? '');
    if (raw === original) return setErr('');
    if (raw === '') {
      if (!nullable) { setErr('Required'); return; }
      setErr(''); await save({ [name]: null }); return;
    }
    if (type === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) return setErr('Enter a number');
      if (min != null && n < min) return setErr(`Min ${min}`);
      if (max != null && n > max) return setErr(`Max ${max}`);
      setErr(''); if (!(await save({ [name]: n }))) setV(original); return;
    }
    if (type === 'email' && !/^\S+@\S+\.\S+$/.test(raw)) return setErr('Enter a valid email');
    setErr('');
    if (!(await save({ [name]: raw.trim() }))) setV(original);
  };
  return (
    <Field label={label} error={err} hint={hint}>
      {type === 'select' ? (
        <Select value={v} onChange={(e) => { setV(e.target.value); commit(e.target.value); }}>{options?.map((o) => <option key={o}>{o}</option>)}</Select>
      ) : (
        <Input type={type} inputMode={type === 'number' ? 'decimal' : undefined} min={min} max={max} step={step ?? (type === 'number' ? 'any' : undefined)} value={v}
          onChange={(e) => setV(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      )}
    </Field>
  );
}

const Section = ({ icon, title, tone = 'neutral', children }: { icon: typeof User; title: string; tone?: 'study' | 'success' | 'fit' | 'danger' | 'movie' | 'neutral'; children: ReactNode }) => (
  <Card><SectionTitle icon={icon} tone={tone}>{title}</SectionTitle>{children}</Card>
);

/** Resizes a chosen image to a small JPEG data URL so it can be stored with the profile. */
function toAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 192;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a valid image.')); };
    img.src = url;
  });
}

export default function ProfilePage() {
  const { snapshot: s } = useSnapshot();
  const { setTheme, theme } = useTheme();
  const qc = useQueryClient();
  const profile = useProfileUpdate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState<'demo' | 'clear' | null>(null);
  const [dataBusy, setDataBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delEmail, setDelEmail] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  if (!s) return null;
  const u = s.user;
  const save: Save = (data) => profile.update(data);
  const notif = (k: string) => u.notifications?.[k] !== false;

  const onAvatar = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please choose an image file.');
    try { await profile.update({ image: await toAvatar(f) }, 'Profile photo updated'); } catch (e) { toast.error((e as Error).message); }
  };

  const changeTheme = (t: 'light' | 'dark' | 'system') => { setTheme(t); profile.update({ theme: t }, 'Theme saved'); };

  const changePassword = async () => {
    if (u.hasPassword && !pw.current) return setPwErr('Enter your current password.');
    if (pw.next.length < 8) return setPwErr('New password must be at least 8 characters.');
    if (pw.next !== pw.confirm) return setPwErr('Passwords do not match.');
    setPwErr(''); setPwBusy(true);
    try {
      await api('/api/profile/password', { method: 'POST', json: { currentPassword: pw.current || undefined, newPassword: pw.next } });
      toast.success('Password changed');
      setPw({ current: '', next: '', confirm: '' });
      qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    } catch (e) { setPwErr((e as Error).message); } finally { setPwBusy(false); }
  };

  const runData = async () => {
    setDataBusy(true);
    try {
      if (confirmDemo === 'demo') { await api('/api/demo', { method: 'POST', json: { today: todayStr() } }); toast.success('Demo data loaded'); }
      else { await api('/api/demo', { method: 'DELETE' }); toast.success('All data cleared. Fresh start!'); }
      await qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
      setConfirmDemo(null);
    } catch (e) { toast.error((e as Error).message); } finally { setDataBusy(false); }
  };

  const deleteAccount = async () => {
    setDelBusy(true);
    try { await api('/api/profile', { method: 'DELETE', json: { confirmEmail: delEmail } }); await signOut({ callbackUrl: '/login' }); }
    catch (e) { toast.error((e as Error).message); setDelBusy(false); }
  };

  const enableBrowser = async () => {
    if (typeof Notification === 'undefined') return toast.error('This browser does not support notifications.');
    const p = await Notification.requestPermission();
    if (p === 'granted') toast.success('Browser reminders enabled'); else toast.warning('Notifications are blocked in your browser settings.');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Profile & Settings" icon={User} tone="study" subtitle="Changes save automatically when you leave a field" />

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Avatar name={u.name} image={u.image} size={76} />
            <button onClick={() => fileRef.current?.click()} aria-label="Change profile photo" className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-study text-white shadow-pop"><Camera size={15} /></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onAvatar(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{u.name}</p><p className="truncate text-sm text-muted-foreground">{u.email}</p>
            {u.image && <button className="mt-1 text-xs font-semibold text-danger" onClick={() => profile.update({ image: '' }, 'Photo removed')}>Remove photo</button>}</div>
        </div>
        <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
          <Setting label="Name" name="name" value={u.name} save={save} />
          <Setting label="Email" name="email" type="email" value={u.email} save={save} />
          <Setting label="Age" name="age" type="number" min={10} max={100} value={u.age} save={save} nullable />
          <Setting label="Location" name="location" value={u.location} save={save} nullable />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={Flame} title="Body & fitness" tone="fit">
          <div className="grid grid-cols-2 gap-3.5">
            <Setting label="Height (cm)" name="heightCm" type="number" min={100} max={250} step={0.5} value={u.heightCm} save={save} nullable />
            <Setting label="Weight (kg)" name="weightKg" type="number" min={20} max={400} step={0.1} value={u.weightKg} save={save} nullable />
            <Setting label="Target weight (kg)" name="targetWeightKg" type="number" min={20} max={400} step={0.1} value={u.targetWeightKg} save={save} nullable />
            <Setting label="Weekly workout goal (days)" name="weeklyWorkoutGoal" type="number" min={1} max={7} value={u.weeklyWorkoutGoal} save={save} />
            <Setting label="Fitness goal" name="fitnessGoal" type="select" options={FITNESS_GOALS} value={u.fitnessGoal} save={save} />
            <Setting label="Activity level" name="activityLevel" type="select" options={ACTIVITY_LEVELS} value={u.activityLevel} save={save} />
            <Setting label="Weekly active minutes" name="weeklyActiveMinGoal" type="number" min={10} max={2000} value={u.weeklyActiveMinGoal} save={save} />
          </div>
        </Section>

        <Section icon={Target} title="Daily targets" tone="success">
          <div className="grid grid-cols-2 gap-3.5">
            <Setting label="Water (glasses)" name="waterGoal" type="number" min={1} max={30} value={u.waterGoal} save={save} />
            <Setting label="Calories (kcal)" name="calorieGoal" type="number" min={800} max={6000} value={u.calorieGoal} save={save} />
            <Setting label="Protein (g)" name="proteinGoal" type="number" min={10} max={400} value={u.proteinGoal} save={save} />
            <Setting label="Steps" name="stepGoal" type="number" min={500} max={50000} value={u.stepGoal} save={save} />
            <Setting label="Sleep (hours)" name="sleepTarget" type="number" min={3} max={14} step={0.5} value={u.sleepTarget} save={save} />
            <Setting label="Study / focus (hours)" name="studyTarget" type="number" min={0} max={16} step={0.5} value={u.studyTarget} save={save} />
            <Setting label="Cheat meals per week" name="cheatMealsPerWeek" type="number" min={0} max={7} value={u.cheatMealsPerWeek} save={save} />
          </div>
        </Section>

        <Section icon={Wallet} title="Money" tone="success">
          <div className="grid grid-cols-2 gap-3.5">
            <Setting label="Monthly budget" name="monthlyBudget" type="number" min={0} value={u.monthlyBudget} save={save} />
            <Setting label="Currency" name="currency" type="select" options={['INR', 'USD', 'EUR', 'GBP']} value={u.currency} save={save} hint="Default ₹ (INR)" />
          </div>
          <Button className="mt-4 w-full" variant="outline" onClick={() => setBudgetOpen(true)}>Edit category budget limits</Button>
        </Section>

        <Section icon={BellRing} title="Notifications" tone="fit">
          <div className="space-y-2">
            {([['tasks', 'Task reminders & overdue alerts'], ['water', 'Water reminders'], ['workout', 'Workout & rest-day reminders'], ['budget', 'Budget alerts (70 / 90 / 100%)'], ['habits', 'Habit nudges'], ['food', 'Food warnings'], ['sleep', 'Bedtime reminder']] as const).map(([k, l]) => (
              <div key={k} className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5"><span className="text-sm">{l}</span>
                <Toggle checked={notif(k)} label={l} onChange={(c) => profile.update({ notifications: { ...Object.fromEntries(['tasks', 'water', 'workout', 'budget', 'habits', 'food', 'sleep'].map((x) => [x, notif(x)])), [k]: c } }, 'Notification preference saved')} /></div>
            ))}
          </div>
          <Button className="mt-3 w-full" variant="soft" onClick={enableBrowser}>Enable browser push reminders</Button>
        </Section>
      </div>

      <Section icon={Palette} title="Appearance" tone="movie">
        <Segmented value={(theme as 'light' | 'dark' | 'system') ?? 'system'} onChange={changeTheme}
          options={[{ value: 'light', label: <span className="flex items-center gap-1.5"><Sun size={14} /> Light</span> }, { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon size={14} /> Dark</span> }, { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor size={14} /> System</span> }]} />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={KeyRound} title="Security" tone="study">
          <div className="space-y-3">
            {!u.hasPassword && <Alert tone="study" icon={ShieldAlert}>You signed in with Google. Set a password to also use email login.</Alert>}
            {u.hasPassword && <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>}
            <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Confirm new password"><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            {pwErr && <p className="text-sm font-medium text-danger" role="alert">{pwErr}</p>}
            <Button loading={pwBusy} onClick={changePassword}>{u.hasPassword ? 'Change password' : 'Set password'}</Button>
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">Google login: {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true' ? 'available on the sign-in page.' : 'add GOOGLE_CLIENT_ID / SECRET and set NEXT_PUBLIC_GOOGLE_ENABLED=true to enable it.'}</p>
          </div>
        </Section>

        <Section icon={Database} title="Your data" tone="success">
          <div className="space-y-2.5">
            <a href="/api/export?resource=all" download className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium transition hover:bg-muted"><Download size={16} /> Export everything (CSV)</a>
            <Button variant="outline" className="w-full" loading={pdfBusy} onClick={async () => { setPdfBusy(true); try { await downloadPdf(s); toast.success('PDF exported'); } catch { toast.error('PDF export failed'); } finally { setPdfBusy(false); } }}><FileText size={16} /> Export report (PDF)</Button>
            <Button variant="soft" className="w-full" onClick={() => setConfirmDemo('demo')}><RefreshCw size={16} /> Reload demo data</Button>
            <Button variant="soft" className="w-full" onClick={() => setConfirmDemo('clear')}><Trash2 size={16} /> Clear all my data</Button>
          </div>
        </Section>
      </div>

      <Card className="border-danger/40">
        <SectionTitle icon={ShieldAlert} tone="danger">Danger zone</SectionTitle>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={() => signOut({ callbackUrl: '/login' })}><LogOut size={16} /> Sign out</Button>
          <Button variant="danger" onClick={() => { setDelEmail(''); setDelOpen(true); }}><Trash2 size={16} /> Delete account</Button>
        </div>
      </Card>

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Budgets">{budgetOpen && <BudgetEditor onDone={() => setBudgetOpen(false)} />}</Modal>
      <ConfirmDialog open={!!confirmDemo} loading={dataBusy} onClose={() => setConfirmDemo(null)} confirmLabel={confirmDemo === 'demo' ? 'Replace with demo data' : 'Clear everything'}
        title={confirmDemo === 'demo' ? 'Replace your data with demo data?' : 'Clear all your data?'}
        message={confirmDemo === 'demo' ? 'All your current tasks, logs, meals, workouts, transactions and movies will be replaced by sample data.' : 'All tasks, logs, meals, workouts, transactions and movies will be permanently deleted. Your account and settings are kept.'} onConfirm={runData} />
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account" size="sm"
        footer={<><Button variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button><Button variant="danger" loading={delBusy} disabled={delEmail.trim().toLowerCase() !== u.email} onClick={deleteAccount}>Delete forever</Button></>}>
        <p className="mb-3 text-sm text-muted-foreground">This permanently deletes your account and every piece of data. It cannot be undone. Type <b className="text-foreground">{u.email}</b> to confirm.</p>
        <Input value={delEmail} onChange={(e) => setDelEmail(e.target.value)} placeholder={u.email} aria-label="Confirm email" />
      </Modal>
    </div>
  );
}

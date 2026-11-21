'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button, Chip, Field, Input, ProgressBar, Select, Toggle } from '@/components/ui';
import { useSnapshot, SNAPSHOT_KEY } from '@/lib/hooks';
import { api } from '@/lib/api';
import { toast } from '@/lib/store';
import { ACTIVITY_LEVELS, FITNESS_GOALS } from '@/lib/constants';
import { todayStr } from '@/lib/dates';

const GOALS = ['Crack placements', 'Score high in exams', 'Get fit & lean', 'Build muscle', 'Eat healthy', 'Save money', 'Learn coding', 'Sleep better', 'Reduce screen time', 'Build daily habits'];
const ACTIVITY_FACTOR: Record<string, number> = { Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Active: 1.725, 'Very active': 1.9 };
const STEPS = ['About you', 'Your goals', 'Body & fitness', 'Daily targets', 'Money & food', 'Finish'];

export default function Onboarding() {
  const router = useRouter();
  const qc = useQueryClient();
  const { snapshot: s } = useSnapshot();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(true);
  const [v, setV] = useState({
    name: s?.user.name ?? '', age: '21', location: 'Kukatpally, Telangana, India', goals: [] as string[],
    fitnessGoal: 'Lose fat', activityLevel: 'Moderate', heightCm: '175', weightKg: '72', targetWeightKg: '68',
    waterGoal: '8', calorieGoal: '2200', proteinGoal: '100', stepGoal: '8000', sleepTarget: '7.5', studyTarget: '3', weeklyWorkoutGoal: '4',
    monthlyBudget: '8000', cheatMealsPerWeek: '1',
    notifications: { tasks: true, water: true, workout: true, budget: true, habits: true, food: true, sleep: true } as Record<string, boolean>,
  });
  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }));

  const suggestTargets = () => {
    const w = Number(v.weightKg), h = Number(v.heightCm), a = Number(v.age);
    if (!w || !h || !a) return;
    const tdee = (10 * w + 6.25 * h - 5 * a + 5) * (ACTIVITY_FACTOR[v.activityLevel] ?? 1.55);
    const adj = v.fitnessGoal === 'Lose fat' ? -400 : v.fitnessGoal === 'Gain muscle' ? 300 : 0;
    setV((p) => ({ ...p, calorieGoal: String(Math.round((tdee + adj) / 50) * 50), proteinGoal: String(Math.round(w * (v.fitnessGoal === 'General fitness' ? 1.2 : 1.6))) }));
  };

  const valid = () => {
    if (step === 0) return v.name.trim().length >= 2 && Number(v.age) >= 10;
    if (step === 2) return Number(v.heightCm) >= 100 && Number(v.weightKg) >= 20 && Number(v.targetWeightKg) >= 20;
    return true;
  };

  const finish = async () => {
    setBusy(true);
    try {
      await api('/api/profile', { method: 'PATCH', json: {
        name: v.name.trim(), age: Number(v.age), location: v.location.trim() || null, goals: v.goals, fitnessGoal: v.fitnessGoal, activityLevel: v.activityLevel,
        heightCm: Number(v.heightCm), weightKg: Number(v.weightKg), targetWeightKg: Number(v.targetWeightKg), waterGoal: Number(v.waterGoal),
        calorieGoal: Number(v.calorieGoal), proteinGoal: Number(v.proteinGoal), stepGoal: Number(v.stepGoal), sleepTarget: Number(v.sleepTarget),
        studyTarget: Number(v.studyTarget), weeklyWorkoutGoal: Number(v.weeklyWorkoutGoal), monthlyBudget: Number(v.monthlyBudget),
        cheatMealsPerWeek: Number(v.cheatMealsPerWeek), notifications: v.notifications, onboarded: true,
      } });
      if (demo) await api('/api/demo', { method: 'POST', json: { today: todayStr() } });
      else await api('/api/demo', { method: 'DELETE' }); // starts clean with the default habit list
      await qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
      toast.success(`You're all set, ${v.name.split(' ')[0]}! Let's build your best life.`);
      router.replace('/');
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const num = (k: keyof typeof v, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}><Input type="number" inputMode="decimal" value={v[k] as string} onChange={(e) => set(k, e.target.value)} {...props} /></Field>
  );

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-study to-movie text-white"><Sparkles size={20} /></span><span className="text-lg font-bold">Welcome to LifeOS</span></div>
      <ProgressBar value={((step + 1) / STEPS.length) * 100} />
      <p className="mb-5 mt-2 text-xs font-semibold text-muted-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="card space-y-4 p-5">
          {step === 0 && (<>
            <h2 className="text-xl font-bold">Let's get to know you</h2>
            <Field label="Your name"><Input value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">{num('age', 'Age', { min: 10, max: 100 })}<Field label="Location"><Input value={v.location} onChange={(e) => set('location', e.target.value)} /></Field></div>
          </>)}
          {step === 1 && (<>
            <h2 className="text-xl font-bold">What do you want to achieve?</h2>
            <p className="text-sm text-muted-foreground">Pick as many as you like.</p>
            <div className="flex flex-wrap gap-2">{GOALS.map((g) => <Chip key={g} active={v.goals.includes(g)} onClick={() => set('goals', v.goals.includes(g) ? v.goals.filter((x) => x !== g) : [...v.goals, g])}>{g}</Chip>)}</div>
          </>)}
          {step === 2 && (<>
            <h2 className="text-xl font-bold">Body & fitness</h2>
            <div className="grid grid-cols-3 gap-3">{num('heightCm', 'Height (cm)')}{num('weightKg', 'Weight (kg)')}{num('targetWeightKg', 'Target (kg)')}</div>
            <Field label="Fitness goal"><Select value={v.fitnessGoal} onChange={(e) => set('fitnessGoal', e.target.value)}>{FITNESS_GOALS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
            <Field label="Activity level"><Select value={v.activityLevel} onChange={(e) => set('activityLevel', e.target.value)}>{ACTIVITY_LEVELS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
          </>)}
          {step === 3 && (<>
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Daily targets</h2><Button variant="soft" size="sm" onClick={suggestTargets}>Suggest for me</Button></div>
            <div className="grid grid-cols-2 gap-3">
              {num('waterGoal', 'Water (glasses)')}{num('calorieGoal', 'Calories (kcal)')}{num('proteinGoal', 'Protein (g)')}{num('stepGoal', 'Steps')}
              {num('sleepTarget', 'Sleep (hours)', { step: 0.5 })}{num('studyTarget', 'Study/focus (hours)', { step: 0.5 })}{num('weeklyWorkoutGoal', 'Workouts per week', { min: 1, max: 7 })}
            </div>
          </>)}
          {step === 4 && (<>
            <h2 className="text-xl font-bold">Money & food rules</h2>
            <div className="grid grid-cols-2 gap-3">{num('monthlyBudget', 'Monthly budget (₹)')}{num('cheatMealsPerWeek', 'Cheat meals / week', { min: 0, max: 7 })}</div>
            <p className="rounded-xl bg-muted/70 p-3 text-xs text-muted-foreground">Tip: a single planned cheat meal a week keeps you consistent without feeling deprived.</p>
          </>)}
          {step === 5 && (<>
            <h2 className="text-xl font-bold">Almost done</h2>
            <div className="space-y-2.5">
              {([['tasks', 'Task reminders'], ['water', 'Water reminders'], ['workout', 'Workout reminders'], ['budget', 'Budget alerts'], ['habits', 'Habit nudges'], ['food', 'Food warnings'], ['sleep', 'Bedtime reminder']] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3"><span className="text-sm font-medium">{l}</span><Toggle checked={v.notifications[k]} onChange={(c) => set('notifications', { ...v.notifications, [k]: c })} label={l} /></div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-study/10 px-4 py-3">
              <div><p className="text-sm font-semibold">Load sample data</p><p className="text-xs text-muted-foreground">Fills the dashboard with 30 days of demo activity. You can clear it anytime in Profile.</p></div>
              <Toggle checked={demo} onChange={setDemo} label="Load sample data" />
            </div>
          </>)}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex justify-between">
        <Button variant="outline" disabled={step === 0 || busy} onClick={() => setStep((x) => x - 1)}><ArrowLeft size={16} /> Back</Button>
        {step < STEPS.length - 1
          ? <Button disabled={!valid()} onClick={() => { if (step === 2) suggestTargets(); setStep((x) => x + 1); }}>Next <ArrowRight size={16} /></Button>
          : <Button variant="success" loading={busy} onClick={finish}>Launch LifeOS 🚀</Button>}
      </div>
    </div>
  );
}

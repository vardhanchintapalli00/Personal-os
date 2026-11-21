'use client';
import { useState, type ReactNode } from 'react';
import { Plus, Star, Trash2, X } from 'lucide-react';
import { Button, Checkbox, Chip, Field, Input, Select, Textarea, Badge } from './ui';
import { cn } from '@/lib/utils';
import type { FieldDef } from '@/lib/forms';
import { WORKOUT_TEMPLATES } from '@/lib/forms';
import * as C from '@/lib/constants';
import { todayStr } from '@/lib/dates';
import type { Exercise, Subtask } from '@/types';

type Values = Record<string, unknown>;

function validate(fields: FieldDef[], v: Values): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    if (f.showIf && !f.showIf(v)) continue;
    const val = v[f.name];
    const empty = val === '' || val === null || val === undefined;
    if (f.required && empty) { errs[f.name] = `${f.label} is required`; continue; }
    if (empty) continue;
    if (f.type === 'number' || f.type === 'rating') {
      const n = Number(val);
      if (!Number.isFinite(n)) errs[f.name] = 'Enter a valid number';
      else if (f.min != null && n < f.min) errs[f.name] = `Must be at least ${f.min}`;
      else if (f.max != null && n > f.max) errs[f.name] = `Must be at most ${f.max}`;
    }
    if (f.type === 'url' && typeof val === 'string' && !/^https?:\/\//i.test(val)) errs[f.name] = 'Must start with http:// or https://';
  }
  return errs;
}

/** Convert raw form values to an API payload. Empty -> omitted on create, null on edit (unless non-nullable). */
export function cleanValues(fields: FieldDef[], v: Values, editing: boolean): Values {
  const out: Values = {};
  for (const f of fields) {
    if (f.showIf && !f.showIf(v)) continue;
    let val = v[f.name];
    const empty = val === '' || val === null || val === undefined;
    if (empty) {
      if (editing && f.nullable !== false && f.type !== 'checkbox') out[f.name] = null;
      continue;
    }
    if (f.type === 'number' || f.type === 'rating') val = Number(val);
    if (typeof val === 'string') val = val.trim();
    out[f.name] = val;
  }
  return out;
}

export function RatingPicker({ value, max = 10, onChange }: { value: number | null; max?: number; onChange: (v: number | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(value === n ? null : n)} aria-label={`${n} out of ${max}`}
          className={cn('grid h-8 w-8 place-items-center rounded-lg text-xs font-bold transition', value != null && n <= value ? 'bg-amber-400 text-amber-950' : 'bg-muted text-muted-foreground hover:bg-border')}>
          {n}
        </button>
      ))}
    </div>
  );
}

export function FieldInput({ f, value, onChange, error }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const common = { 'aria-invalid': Boolean(error) } as const;
  let control: ReactNode;
  switch (f.type) {
    case 'select':
      control = (
        <Select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} {...common}>
          {!f.required && <option value="">None</option>}
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
      break;
    case 'chips':
      control = <div className="flex flex-wrap gap-2">{f.options?.map((o) => <Chip key={o} active={value === o} onClick={() => onChange(o)}>{o}</Chip>)}</div>;
      break;
    case 'textarea':
      control = <Textarea value={(value as string) ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'checkbox':
      return (
        <div className={cn('flex items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-3', f.full && 'sm:col-span-2')}>
          <Checkbox checked={Boolean(value)} onChange={onChange} label={f.label} />
          <span className="text-sm">{f.label}</span>
        </div>
      );
    case 'rating':
      control = <RatingPicker value={(value as number) ?? null} max={f.max ?? 10} onChange={onChange} />;
      break;
    default:
      control = (
        <Input
          type={f.type === 'url' ? 'url' : f.type} inputMode={f.type === 'number' ? 'decimal' : undefined}
          value={(value as string | number) ?? ''} placeholder={f.placeholder} min={f.min} max={f.max} step={f.step ?? (f.type === 'number' ? 'any' : undefined)}
          onChange={(e) => onChange(e.target.value)} {...common}
        />
      );
  }
  return <Field label={f.label} error={error} hint={f.hint} className={cn(f.full && 'sm:col-span-2')}>{control}</Field>;
}

/** Generic config-driven form with validation, used for movies, meals, transactions, goals, body entries and habits. */
export function EntityForm({ fields, initial, editing, onSubmit, onCancel, submitLabel, tone = 'primary', extra }: {
  fields: FieldDef[]; initial: Values; editing?: boolean; onSubmit: (data: Values) => Promise<unknown> | unknown;
  onCancel: () => void; submitLabel?: string; tone?: 'primary' | 'success' | 'danger' | 'fit' | 'movie'; extra?: ReactNode;
}) {
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(fields, v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await onSubmit(cleanValues(fields, v, Boolean(editing))); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        {fields.filter((f) => !f.showIf || f.showIf(v)).map((f) => (
          <FieldInput key={f.name} f={f} value={v[f.name]} error={errors[f.name]} onChange={(val) => { setV((p) => ({ ...p, [f.name]: val })); if (errors[f.name]) setErrors((p) => ({ ...p, [f.name]: '' })); }} />
        ))}
      </div>
      {extra}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant={tone} loading={busy}>{submitLabel ?? (editing ? 'Save changes' : 'Add')}</Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ Task form
const REMINDERS = [{ v: '', l: 'No reminder' }, { v: '0', l: 'At due time' }, { v: '15', l: '15 min before' }, { v: '60', l: '1 hour before' }, { v: '1440', l: '1 day before' }];

export function TaskForm({ initial, editing, onSubmit, onCancel }: { initial?: Partial<{ id: string; title: string; description: string | null; category: string; priority: string; dueDate: string | null; dueTime: string | null; estimatedMin: number | null; status: string; recurrence: string; recurrenceInterval: number | null; reminderMinutes: number | null; notes: string | null; attachmentUrl: string | null; subtasks: Subtask[] }>; editing?: boolean; onSubmit: (data: Values) => Promise<unknown> | unknown; onCancel: () => void }) {
  const [v, setV] = useState({
    title: initial?.title ?? '', description: initial?.description ?? '', category: initial?.category ?? 'Studies', priority: initial?.priority ?? 'Medium',
    dueDate: initial?.dueDate ?? (editing ? '' : todayStr()), dueTime: initial?.dueTime ?? '', estimatedMin: initial?.estimatedMin?.toString() ?? '',
    status: initial?.status ?? 'Not started', recurrence: initial?.recurrence ?? 'none', recurrenceInterval: initial?.recurrenceInterval?.toString() ?? '',
    reminderMinutes: initial?.reminderMinutes?.toString() ?? '', notes: initial?.notes ?? '', attachmentUrl: initial?.attachmentUrl ?? '',
  });
  const [subs, setSubs] = useState<{ title: string; completed: boolean }[]>(initial?.subtasks?.map((s) => ({ title: s.title, completed: s.completed })) ?? []);
  const [newSub, setNewSub] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (val: string) => { setV((p) => ({ ...p, [k]: val })); setErrors((p) => ({ ...p, [k]: '' })); };

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    setSubs((p) => [...p, { title: t, completed: false }]);
    setNewSub('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.title.trim()) errs.title = 'Title is required';
    if (v.estimatedMin && (Number(v.estimatedMin) < 1 || Number(v.estimatedMin) > 1440)) errs.estimatedMin = 'Enter 1-1440 minutes';
    if (v.reminderMinutes && !v.dueDate) errs.reminderMinutes = 'Set a due date to use reminders';
    if (v.recurrence !== 'none' && !v.dueDate) errs.recurrence = 'Recurring tasks need a due date';
    if (v.attachmentUrl && !/^https?:\/\//i.test(v.attachmentUrl)) errs.attachmentUrl = 'Must start with http:// or https://';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const pending = newSub.trim() ? [...subs, { title: newSub.trim(), completed: false }] : subs;
    const done = pending.filter((s) => s.completed).length;
    const empty = (s: string) => (s === '' ? (editing ? null : undefined) : s);
    const payload: Values = {
      title: v.title.trim(), description: empty(v.description.trim()), category: v.category, priority: v.priority,
      dueDate: empty(v.dueDate), dueTime: v.dueDate ? empty(v.dueTime) : (editing ? null : undefined),
      estimatedMin: v.estimatedMin ? Number(v.estimatedMin) : editing ? null : undefined,
      status: v.status, recurrence: v.recurrence,
      recurrenceInterval: v.recurrence === 'custom' ? Number(v.recurrenceInterval || 1) : editing ? null : undefined,
      reminderMinutes: v.reminderMinutes !== '' ? Number(v.reminderMinutes) : editing ? null : undefined,
      notes: empty(v.notes.trim()), attachmentUrl: empty(v.attachmentUrl.trim()), subtasks: pending,
    };
    if (pending.length) payload.progress = Math.round((done / pending.length) * 100);
    setBusy(true);
    try { await onSubmit(payload); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Task title" error={errors.title}><Input autoFocus value={v.title} onChange={(e) => set('title')(e.target.value)} placeholder="What needs to be done?" maxLength={140} /></Field>
      <Field label="Description"><Textarea value={v.description} onChange={(e) => set('description')(e.target.value)} placeholder="Details (optional)" /></Field>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Category"><Select value={v.category} onChange={(e) => set('category')(e.target.value)}>{C.TASK_CATEGORIES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Priority"><Select value={v.priority} onChange={(e) => set('priority')(e.target.value)}>{C.PRIORITIES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Due date"><Input type="date" value={v.dueDate} onChange={(e) => set('dueDate')(e.target.value)} /></Field>
        <Field label="Due time"><Input type="time" value={v.dueTime} onChange={(e) => set('dueTime')(e.target.value)} disabled={!v.dueDate} /></Field>
        <Field label="Estimated duration (min)" error={errors.estimatedMin}><Input type="number" inputMode="numeric" min={1} max={1440} value={v.estimatedMin} onChange={(e) => set('estimatedMin')(e.target.value)} placeholder="e.g. 45" /></Field>
        <Field label="Status"><Select value={v.status} onChange={(e) => set('status')(e.target.value)}>{C.TASK_STATUSES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Repeat" error={errors.recurrence}>
          <Select value={v.recurrence} onChange={(e) => set('recurrence')(e.target.value)}>
            {C.RECURRENCES.map((o) => <option key={o} value={o}>{o === 'none' ? 'Does not repeat' : o[0].toUpperCase() + o.slice(1)}</option>)}
          </Select>
        </Field>
        {v.recurrence === 'custom' ? (
          <Field label="Repeat every (days)"><Input type="number" min={1} max={365} value={v.recurrenceInterval} onChange={(e) => set('recurrenceInterval')(e.target.value)} placeholder="e.g. 3" /></Field>
        ) : (
          <Field label="Reminder" error={errors.reminderMinutes}><Select value={v.reminderMinutes} onChange={(e) => set('reminderMinutes')(e.target.value)}>{REMINDERS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select></Field>
        )}
        {v.recurrence === 'custom' && (
          <Field label="Reminder" error={errors.reminderMinutes} className="sm:col-span-2"><Select value={v.reminderMinutes} onChange={(e) => set('reminderMinutes')(e.target.value)}>{REMINDERS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</Select></Field>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Subtasks</span>
        <div className="space-y-2">
          {subs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
              <Checkbox checked={s.completed} tone="study" onChange={(c) => setSubs((p) => p.map((x, j) => (j === i ? { ...x, completed: c } : x)))} label={`Complete ${s.title}`} />
              <span className={cn('flex-1 text-sm', s.completed && 'text-muted-foreground line-through')}>{s.title}</span>
              <button type="button" aria-label="Remove subtask" onClick={() => setSubs((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-danger"><X size={16} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a subtask" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} />
            <Button type="button" variant="soft" size="icon" onClick={addSub} aria-label="Add subtask"><Plus size={18} /></Button>
          </div>
        </div>
      </div>

      <Field label="Notes"><Textarea value={v.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Notes (optional)" /></Field>
      <Field label="Attachment link" error={errors.attachmentUrl} hint="Paste a Drive / Notion / file link"><Input type="url" value={v.attachmentUrl} onChange={(e) => set('attachmentUrl')(e.target.value)} placeholder="https://..." /></Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy}>{editing ? 'Save task' : 'Add task'}</Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ Workout form
export function WorkoutForm({ initial, editing, onSubmit, onCancel, prefill }: {
  initial?: Partial<{ date: string; type: string; name: string | null; durationMin: number; calories: number | null; exercises: Exercise[]; notes: string | null }>;
  editing?: boolean; onSubmit: (data: Values) => Promise<unknown> | unknown; onCancel: () => void; prefill?: { durationMin?: number };
}) {
  const [v, setV] = useState({
    date: initial?.date ?? todayStr(), type: initial?.type ?? 'Gym', name: initial?.name ?? '',
    durationMin: (initial?.durationMin ?? prefill?.durationMin ?? '').toString(), calories: initial?.calories?.toString() ?? '', notes: initial?.notes ?? '',
  });
  const [ex, setEx] = useState<Exercise[]>(initial?.exercises ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | null>(null);
  const set = (k: keyof typeof v) => (val: string) => { setV((p) => ({ ...p, [k]: val })); setErrors((p) => ({ ...p, [k]: '' })); };

  const applyTemplate = (t: (typeof WORKOUT_TEMPLATES)[number]) => {
    setV((p) => ({ ...p, type: t.type, name: t.name, durationMin: String(t.durationMin), calories: String(t.calories) }));
    setEx(t.exercises.map((e) => ({ ...e })));
  };
  const updateEx = (i: number, patch: Partial<Exercise>) => setEx((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.date) errs.date = 'Pick a date';
    const d = Number(v.durationMin);
    if (!v.durationMin || !Number.isFinite(d) || d < 1 || d > 600) errs.durationMin = 'Enter 1-600 minutes';
    if (v.calories && (Number(v.calories) < 0 || Number(v.calories) > 5000)) errs.calories = 'Enter 0-5000';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSubmit({
        date: v.date, type: v.type, name: v.name.trim() || (editing ? null : undefined), durationMin: d,
        calories: v.calories ? Number(v.calories) : editing ? null : undefined,
        exercises: ex.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim() })),
        notes: v.notes.trim() || (editing ? null : undefined),
      });
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {!editing && (
        <div className="rounded-2xl bg-fit/8 p-3 ring-1 ring-fit/20">
          <p className="mb-2 text-xs font-semibold text-fit">Quick-start from a template</p>
          <div className="mb-2 flex gap-2">{(['Beginner', 'Intermediate', 'Advanced'] as const).map((l) => <Chip key={l} tone="fit" active={level === l} onClick={() => setLevel(level === l ? null : l)}>{l}</Chip>)}</div>
          {level && (
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TEMPLATES.filter((t) => t.level === level).map((t) => (
                <button key={t.name} type="button" onClick={() => applyTemplate(t)} className="rounded-xl bg-card px-3 py-2 text-left text-xs font-medium shadow-sm ring-1 ring-border transition hover:ring-fit">
                  <span className="block font-semibold">{t.name}</span><span className="text-muted-foreground">{t.durationMin} min · {t.exercises.length || 'cardio'} {t.exercises.length ? 'exercises' : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Workout type"><Select value={v.type} onChange={(e) => set('type')(e.target.value)}>{C.WORKOUT_TYPES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Date" error={errors.date}><Input type="date" value={v.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        <Field label="Name (optional)" className="sm:col-span-2"><Input value={v.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. Push day" maxLength={80} /></Field>
        <Field label="Duration (min)" error={errors.durationMin}><Input type="number" inputMode="numeric" value={v.durationMin} onChange={(e) => set('durationMin')(e.target.value)} placeholder="45" /></Field>
        <Field label="Calories burned" error={errors.calories}><Input type="number" inputMode="numeric" value={v.calories} onChange={(e) => set('calories')(e.target.value)} placeholder="250" /></Field>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Exercises</span>
          <button type="button" className="text-xs font-semibold text-fit" onClick={() => setEx((p) => [...p, { name: '', sets: 3, reps: 10, weightKg: 0 }])}>+ Add exercise</button></div>
        <div className="space-y-2">
          {ex.length === 0 && <p className="rounded-xl bg-muted/60 px-3 py-3 text-xs text-muted-foreground">No exercises yet. Add sets, reps and weights, or skip for cardio.</p>}
          {ex.map((x, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-muted/60 p-2.5">
              <Input value={x.name} onChange={(e) => updateEx(i, { name: e.target.value })} placeholder="Exercise name" className="col-span-2 bg-card" />
              <div className="grid grid-cols-3 gap-2">
                {([['sets', 'Sets'], ['reps', 'Reps'], ['weightKg', 'Kg']] as const).map(([k, l]) => (
                  <label key={k} className="text-[10px] font-medium text-muted-foreground">{l}
                    <Input type="number" inputMode="decimal" min={0} value={x[k]} onChange={(e) => updateEx(i, { [k]: Number(e.target.value) })} className="mt-0.5 bg-card px-2 py-1.5" /></label>
                ))}
              </div>
              <button type="button" aria-label="Remove exercise" onClick={() => setEx((p) => p.filter((_, j) => j !== i))} className="self-end rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
      <Field label="Notes"><Textarea value={v.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="How did it feel?" /></Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="fit" loading={busy}>{editing ? 'Save workout' : 'Log workout'}</Button>
      </div>
    </form>
  );
}

export const StarRating = ({ value }: { value: number | null }) => value == null ? null : <Badge tone="warn"><Star size={11} className="fill-current" /> {value}/10</Badge>;

'use client';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, ReferenceLine } from 'recharts';
import { AlertTriangle, Apple, Ban, ChevronLeft, ChevronRight, Cookie, Droplets, Flame, Home, Lightbulb, Minus, Pencil, Plus, Search, Trash2, Utensils } from 'lucide-react';
import { Alert, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, Input, Modal, PageHeader, ProgressBar, ProgressRing, SectionTitle, Segmented, StatCard, type Tone } from '@/components/ui';
import { ChartFrame, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { EntityForm } from '@/components/forms';
import { mealWarning } from '@/components/quick-add';
import { useCrud, useDailyLog, useSnapshot } from '@/lib/hooks';
import { toast, useUI } from '@/lib/store';
import { MEAL_CATEGORIES, MEAL_TYPES } from '@/lib/constants';
import { MEAL_FIELDS, MEAL_SUGGESTIONS } from '@/lib/forms';
import { addDays, dayName, fmtTime12, shortDate, weekDays } from '@/lib/dates';
import { cheatMealsInWeek, dayNutrition, foodScore, homeCookedStreak, isJunk, isOutside, isSugar, mealsOn, noJunkStreak, noOutsideStreak, noSugarStreak, weeklyFood } from '@/lib/scores';
import { COLORS, scoreColor } from '@/lib/theme';
import { downloadCsv } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { Meal } from '@/types';

const CAT_TONE: Record<string, Tone> = { 'Home food': 'success', Healthy: 'success', 'Outside food': 'danger', 'Junk food': 'danger', 'Sugary food': 'danger', 'Cheat meal': 'warn' };

export default function FoodPage() {
  const { snapshot: s, today } = useSnapshot();
  const crud = useCrud('meals');
  const { save } = useDailyLog();
  const openQuick = useUI((u) => u.openQuick);
  const [date, setDate] = useState(today);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [goalTab, setGoalTab] = useState<keyof typeof MEAL_SUGGESTIONS>(
    s?.user.fitnessGoal === 'Gain muscle' ? 'Gain muscle' : s?.user.fitnessGoal === 'Lose fat' ? 'Lose fat' : 'Maintenance',
  );

  const d = useMemo(() => {
    if (!s) return null;
    const meals = mealsOn(s, date);
    return {
      meals,
      n: dayNutrition(s, date),
      score: foodScore(s, date),
      outsideS: noOutsideStreak(s, today), sugarS: noSugarStreak(s, today), junkS: noJunkStreak(s, today), homeS: homeCookedStreak(s, today),
      cheat: cheatMealsInWeek(s, date),
      week: weeklyFood(s, date),
      chart: weekDays(date).map((x) => ({ label: dayName(x), day: x, score: foodScore(s, x) })),
      water: s.dailyLogs.find((l) => l.date === date)?.water ?? 0,
    };
  }, [s, date, today]);

  const history = useMemo(() => {
    if (!s) return [];
    const from = addDays(today, -30);
    return s.meals.filter((m) => m.date >= from && (!cat || m.category === cat) && (!q || `${m.food} ${m.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  }, [s, q, cat, today]);

  if (!s || !d) return null;
  const u = s.user;
  const calGoal = u.calorieGoal || 2200;
  const proteinGoal = u.proteinGoal || 100;
  const carbGoal = Math.round((calGoal * 0.5) / 4);
  const fatGoal = Math.round((calGoal * 0.25) / 9);
  const water = d.water;
  const waterGoal = u.waterGoal || 8;
  const isToday = date === today;
  const allowance = u.cheatMealsPerWeek ?? 1;
  const warnings = [
    d.meals.some(isOutside) && 'Outside food logged. Your no-outside-food streak is broken.',
    d.meals.some(isSugar) && 'Sugar logged. Your no-sugar streak is broken.',
    d.meals.some(isJunk) && 'Junk food logged. Balance it with a healthy, home-cooked meal.',
    d.n.calories > calGoal * 1.15 && `You are ${d.n.calories - calGoal} kcal over your goal. Keep the next meal light.`,
    d.meals.some((m) => { const h = Number(m.time.slice(0, 2)); return h >= 23 || h < 4; }) && 'Late-night eating logged, which hurts sleep and discipline.',
    d.cheat > allowance && `Cheat meal allowance exceeded (${d.cheat}/${allowance} this week).`,
  ].filter(Boolean) as string[];
  const scoreTone: Tone = d.score == null ? 'neutral' : d.score >= 70 ? 'success' : d.score >= 45 ? 'warn' : 'danger';

  const exportCsv = () => downloadCsv('meals', s.meals.map((m) => ({ date: m.date, time: m.time, meal: m.mealType, food: m.food, category: m.category, calories: m.calories, protein: m.protein, carbs: m.carbs, fats: m.fats, sugar: m.hasSugar ? 'yes' : 'no' })));

  return (
    <div className="space-y-5">
      <PageHeader title="Food & Nutrition" icon={Utensils} tone="success" subtitle="Strict, but motivating. Build discipline one meal at a time."
        action={<>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></Button>
            <button onClick={() => setDate(today)} className="px-2 text-xs font-semibold">{isToday ? 'Today' : shortDate(date)}</button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>CSV</Button>
          <Button variant="success" onClick={() => openQuick('meal', { date })}><Plus size={17} /> Log meal</Button></>} />

      {warnings.length > 0 && (
        <div className="space-y-2">{warnings.map((w) => <Alert key={w} tone="danger" icon={AlertTriangle}>{w}</Alert>)}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle icon={Flame} tone="success">Calories</SectionTitle>
          <div className="flex items-center gap-4">
            <ProgressRing value={(d.n.calories / calGoal) * 100} size={104} stroke={10} color={d.n.calories > calGoal * 1.15 ? COLORS.danger : COLORS.success}>
              <div className="text-center"><p className="text-lg font-bold tabular-nums">{d.n.calories}</p><p className="text-[10px] text-muted-foreground">/ {calGoal}</p></div></ProgressRing>
            <p className="text-sm text-muted-foreground">{d.n.calories <= calGoal ? <><b className="text-foreground">{calGoal - d.n.calories}</b> kcal left</> : <b className="text-danger">{d.n.calories - calGoal} kcal over</b>}</p>
          </div>
        </Card>
        <Card className="lg:col-span-1">
          <SectionTitle icon={Apple} tone="success">Macros</SectionTitle>
          <div className="space-y-3">
            {([['Protein', d.n.protein, proteinGoal, 'success'], ['Carbs', d.n.carbs, carbGoal, 'study'], ['Fats', d.n.fats, fatGoal, 'fit']] as [string, number, number, Tone][]).map(([l, v, g, t]) => (
              <div key={l}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{l}</span><span className="tabular-nums text-muted-foreground">{v} / {g} g</span></div><ProgressBar value={(v / g) * 100} tone={t} label={l} /></div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-1">
          <SectionTitle icon={Utensils} tone={scoreTone}>Food discipline score</SectionTitle>
          <div className="flex items-center gap-4">
            <ProgressRing value={d.score ?? 0} size={104} stroke={10} color={scoreColor(d.score)}><span className="text-2xl font-bold tabular-nums">{d.score ?? '--'}</span></ProgressRing>
            <p className="text-sm text-muted-foreground">{d.score == null ? 'Log a meal to get your score.' : d.score >= 70 ? 'Excellent discipline. Keep it up!' : d.score >= 45 ? 'Decent. Tighten up tomorrow.' : 'Rough day. Reset with home food.'}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="No outside food" icon={Home} tone="danger" value={<>{d.outsideS}<span className="text-sm font-medium text-muted-foreground"> days</span></>} sub="current streak" />
        <StatCard label="No sugar" icon={Ban} tone="danger" value={<>{d.sugarS}<span className="text-sm font-medium text-muted-foreground"> days</span></>} sub="current streak" />
        <StatCard label="No junk food" icon={Cookie} tone="danger" value={<>{d.junkS}<span className="text-sm font-medium text-muted-foreground"> days</span></>} sub="current streak" />
        <StatCard label="Home-cooked" icon={Utensils} tone="success" value={<>{d.homeS}<span className="text-sm font-medium text-muted-foreground"> days</span></>} sub="meals at home" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Droplets} tone="study">Water</SectionTitle>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold tabular-nums text-study">{water}<span className="text-sm font-medium text-muted-foreground"> / {waterGoal}</span></p>
            <ProgressBar className="flex-1" value={(water / waterGoal) * 100} tone="study" label="Water" />
            <Button size="icon" variant="outline" aria-label="Remove glass" disabled={water <= 0} onClick={() => save(date, { water: water - 1 }, false)}><Minus size={16} /></Button>
            <Button size="icon" aria-label="Add glass" onClick={() => save(date, { water: water + 1 }, water + 1 === waterGoal ? 'Water goal reached! 💧' : false)}><Plus size={16} /></Button>
          </div>
        </Card>
        <Card>
          <SectionTitle icon={Cookie} tone="fit">Weekly cheat meal</SectionTitle>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">{Array.from({ length: Math.max(allowance, d.cheat, 1) }).map((_, i) => <span key={i} className={cn('grid h-9 w-9 place-items-center rounded-xl text-lg', i < d.cheat ? (i >= allowance ? 'bg-danger/15' : 'bg-fit/15') : 'bg-muted')}>{i < d.cheat ? '🍕' : '·'}</span>)}</div>
            <p className="text-sm text-muted-foreground">{d.cheat}/{allowance} used this week. {d.cheat < allowance ? 'One controlled treat is fine. Plan it, enjoy it.' : d.cheat === allowance ? 'Allowance used. Back to discipline!' : 'Over the allowance. Compensate with clean meals.'}</p>
          </div>
        </Card>
      </div>

      {/* Day's meals */}
      <Card>
        <SectionTitle icon={Utensils} tone="success" action={<Badge tone="success">{d.meals.length} meals</Badge>}>{isToday ? "Today's meals" : `Meals · ${shortDate(date)}`}</SectionTitle>
        {d.meals.length === 0 ? <EmptyState icon={Utensils} tone="success" title="No meals logged" text="Log what you eat to get your discipline score, calories and macros." action={<Button variant="success" onClick={() => openQuick('meal', { date })}><Plus size={16} /> Log meal</Button>} /> : (
          <div className="space-y-4">
            {MEAL_TYPES.map((t) => {
              const list = d.meals.filter((m) => m.mealType === t);
              if (!list.length) return null;
              return (
                <div key={t}><p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t} · {list.reduce((a, m) => a + m.calories, 0)} kcal</p>
                  <ul className="space-y-2">{list.map((m) => <MealRow key={m.id} m={m} onEdit={() => setEditing(m)} onDelete={() => setDeleting(m)} />)}</ul></div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Utensils} tone="success" action={<Badge tone="success">avg {d.week.avgScore ?? '--'}</Badge>}>Weekly food report</SectionTitle>
          <div className="mb-4 grid grid-cols-4 gap-2 text-center">
            {([['Outside', d.week.outside, 'danger'], ['Sugar', d.week.sugar, 'danger'], ['Junk', d.week.junk, 'danger'], ['Healthy', d.week.healthy, 'success']] as [string, number, Tone][]).map(([l, v, t]) => (
              <div key={l} className="rounded-xl bg-muted/60 py-2.5"><p className={cn('text-xl font-bold tabular-nums', t === 'danger' && v > 0 ? 'text-danger' : t === 'success' ? 'text-success' : '')}>{v}</p><p className="text-[10px] text-muted-foreground">{l}</p></div>
            ))}
          </div>
          <ChartFrame height={160} empty={!d.chart.some((x) => x.score != null)} emptyText="Log meals to see discipline by day.">
            <BarChart data={d.chart} margin={{ left: -24, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis domain={[0, 100]} {...axisProps} /><ChartTooltip formatter={(v) => `${v}/100`} />
              <ReferenceLine y={70} stroke={COLORS.success} strokeDasharray="4 4" />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>{d.chart.map((e) => <Cell key={e.day} fill={scoreColor(e.score)} />)}</Bar>
            </BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={Lightbulb} tone="fit">Indian meal ideas</SectionTitle>
          <Segmented className="mb-3" value={goalTab} onChange={setGoalTab} options={(Object.keys(MEAL_SUGGESTIONS) as (keyof typeof MEAL_SUGGESTIONS)[]).map((k) => ({ value: k, label: k }))} />
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {MEAL_SUGGESTIONS[goalTab].map((g) => (
              <div key={g.meal}><p className="mb-1 text-xs font-semibold text-muted-foreground">{g.meal}</p>
                <div className="flex flex-col gap-1.5">{g.items.map((it) => (
                  <button key={it} onClick={() => openQuick('meal', { food: it, mealType: g.meal, category: 'Home food', date })} className="rounded-xl bg-muted/60 px-3 py-2 text-left text-sm transition hover:bg-success/10">{it} <span className="text-[10px] font-semibold text-success">+ log</span></button>))}</div></div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon={Apple} tone="success">Discipline rules</SectionTitle>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-success/10 p-3.5"><p className="mb-1 font-semibold text-success">✅ Do more</p><p className="text-muted-foreground">Home-cooked meals, fruits & vegetables, eggs, dal, curd, roti, controlled rice, protein at every meal, and enough water.</p></div>
          <div className="rounded-xl bg-danger/10 p-3.5"><p className="mb-1 font-semibold text-danger">🚫 Avoid</p><p className="text-muted-foreground">Sugar, sweets, sugary drinks, bakery items, processed junk, frequent outside food, overeating and late-night meals.</p></div>
        </div>
      </Card>

      {/* History */}
      <Card>
        <SectionTitle icon={Search} tone="neutral">Meal history · last 30 days</SectionTitle>
        <div className="space-y-3">
          <Input placeholder="Search foods..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search meals" />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar"><Chip active={!cat} tone="success" onClick={() => setCat('')}>All</Chip>{MEAL_CATEGORIES.map((c) => <Chip key={c} active={cat === c} tone={CAT_TONE[c] === 'danger' ? 'danger' : 'success'} onClick={() => setCat(cat === c ? '' : c)}>{c}</Chip>)}</div>
          {history.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No meals match.</p> : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">{history.slice(0, 80).map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2"><span className="w-14 shrink-0 text-[11px] text-muted-foreground">{shortDate(m.date)}</span><span className="min-w-0 flex-1 truncate text-sm">{m.food}</span><Badge tone={CAT_TONE[m.category]}>{m.category}</Badge><button aria-label="Delete meal" onClick={() => setDeleting(m)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button></li>))}</ul>
          )}
        </div>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit meal">
        {editing && <EntityForm editing tone="success" fields={MEAL_FIELDS} onCancel={() => setEditing(null)} initial={{ ...editing, quantity: editing.quantity ?? '', notes: editing.notes ?? '' }}
          onSubmit={async (x) => { const r = await crud.update(editing.id, x, { silent: true }); if (r) { const w = mealWarning(x as unknown as Meal); if (w && x.category !== 'Cheat meal') toast.error(w); else toast.success('Meal updated. Scores refreshed!'); setEditing(null); } }} />}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this meal?" message={`"${deleting?.food}" will be removed and your score, calories and streaks recalculated.`}
        onConfirm={async () => { if (deleting) { await crud.remove(deleting.id, { message: 'Meal deleted' }); setDeleting(null); } }} />
    </div>
  );
}

function MealRow({ m, onEdit, onDelete }: { m: Meal; onEdit: () => void; onDelete: () => void }) {
  const bad = isOutside(m) || isJunk(m) || isSugar(m);
  return (
    <li className={cn('flex items-center gap-3 rounded-xl px-3.5 py-3', bad ? 'bg-danger/10 ring-1 ring-danger/30' : 'bg-muted/60')}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{m.food}</p>
        <p className="text-xs text-muted-foreground">{fmtTime12(m.time)}{m.quantity ? ` · ${m.quantity}` : ''} · {m.calories} kcal · P{m.protein} C{m.carbs} F{m.fats}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5"><Badge tone={CAT_TONE[m.category]}>{bad && <AlertTriangle size={11} />}{m.category}</Badge>{m.hasSugar && m.category !== 'Sugary food' && <Badge tone="danger">Sugar</Badge>}</div>
      </div>
      <button aria-label="Edit meal" onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-card"><Pencil size={15} /></button>
      <button aria-label="Delete meal" onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
    </li>
  );
}


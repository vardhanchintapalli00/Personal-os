'use client';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend as RLegend, Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, Crown, PiggyBank, Pencil, Plus, Repeat, Search, Settings2, Target, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { Alert, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, ProgressBar, ProgressRing, SectionTitle, Select, StatCard, type Tone } from '@/components/ui';
import { ChartFrame, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { EntityForm } from '@/components/forms';
import { BudgetEditor } from '@/components/budget-editor';
import { budgetCrossingWarning } from '@/components/quick-add';
import { useCrud, useSnapshot } from '@/lib/hooks';
import { toast, useUI } from '@/lib/store';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants';
import { SAVINGS_FIELDS, expenseFields } from '@/lib/forms';
import { diffDays, monthDays, money, shortDate, weekDays, weekStart, monthStart } from '@/lib/dates';
import { budgetAlert, categoryBudgetStatus, monthMoney, monthlySeries, moneyScore, spentInRange, spentOn } from '@/lib/scores';
import { COLORS, CATEGORY_COLORS, scoreColor } from '@/lib/theme';
import { downloadCsv } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { SavingsGoal, Transaction } from '@/types';

type Period = 'today' | 'week' | 'month' | 'all';
type Sort = 'date' | 'amount';

export default function MoneyPage() {
  const { snapshot: s, today } = useSnapshot();
  const tx = useCrud('transactions');
  const goals = useCrud('savingsGoals');
  const openQuick = useUI((u) => u.openQuick);
  const [period, setPeriod] = useState<Period>('month');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('date');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [delGoal, setDelGoal] = useState<SavingsGoal | null>(null);
  const [addTo, setAddTo] = useState<SavingsGoal | null>(null);
  const [addAmt, setAddAmt] = useState('');
  const [addErr, setAddErr] = useState('');

  const d = useMemo(() => {
    if (!s) return null;
    const m = monthMoney(s, today);
    const wk = weekDays(today);
    const catData = Object.entries(m.byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const daily = monthDays(today).filter((x) => x <= today).map((x) => ({ label: String(Number(x.slice(8))), day: x, Spent: spentOn(s, x) }));
    return {
      m, score: moneyScore(s, today), alert: budgetAlert(m.usedPct),
      today: spentOn(s, today), week: spentInRange(s, wk[0], wk[6]),
      series: monthlySeries(s, today, 6), catData, daily, cats: categoryBudgetStatus(s, today),
      savings: s.savingsGoals.reduce((a, g) => a + g.savedAmount, 0),
    };
  }, [s, today]);

  const list = useMemo(() => {
    if (!s) return [];
    const wk = weekStart(today);
    const ms = monthStart(today);
    let out = s.transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (cat && t.category !== cat) return false;
      if (q && !`${t.category} ${t.notes ?? ''} ${t.paymentMethod}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (period === 'today') return t.date === today;
      if (period === 'week') return t.date >= wk && t.date <= today;
      if (period === 'month') return t.date >= ms && t.date <= today;
      return true;
    });
    out = [...out].sort(sort === 'amount' ? (a, b) => b.amount - a.amount : (a, b) => b.date.localeCompare(a.date));
    return out;
  }, [s, period, type, cat, q, sort, today]);

  if (!s || !d) return null;
  const cur = s.user.currency;
  const m = d.m;
  const tone: Tone = d.alert.level === 'ok' ? 'success' : d.alert.level === 'warn' ? 'warn' : 'danger';

  const submitGoalMoney = async () => {
    const n = Number(addAmt);
    if (!addTo) return;
    if (!Number.isFinite(n) || n <= 0) return setAddErr('Enter an amount greater than 0.');
    setAddErr('');
    const next = Math.min(addTo.targetAmount * 10, addTo.savedAmount + n);
    const reached = next >= addTo.targetAmount && addTo.savedAmount < addTo.targetAmount;
    const r = await goals.update(addTo.id, { savedAmount: next }, { silent: true });
    if (r) { if (reached) toast.success(`🎉 Goal reached: ${addTo.name}!`); else toast.success(`${money(n, cur)} added to ${addTo.name}`); setAddTo(null); setAddAmt(''); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Money" icon={Wallet} tone="success" subtitle="Track every rupee, stay inside your budget"
        action={<>
          <Button variant="outline" size="sm" onClick={() => downloadCsv('transactions', s.transactions.map((t) => ({ date: t.date, type: t.type, category: t.category, amount: t.amount, method: t.paymentMethod, notes: t.notes ?? '', recurring: t.recurrence })))}>CSV</Button>
          <Button variant="success" size="sm" onClick={() => openQuick('income')}><ArrowUpCircle size={16} /> Income</Button>
          <Button variant="danger" onClick={() => openQuick('expense')}><ArrowDownCircle size={17} /> Expense</Button></>} />

      {d.alert.level !== 'ok' && m.budget > 0 && <Alert tone={tone === 'warn' ? 'warn' : 'danger'} icon={AlertTriangle}>{d.alert.text}</Alert>}
      {d.cats.filter((c) => c.pct >= 100).map((c) => <Alert key={c.id} tone="danger" icon={AlertTriangle}>{c.category} is over its limit: {money(c.spent, cur)} of {money(c.monthlyLimit, cur)}.</Alert>)}

      {/* Budget overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle icon={Target} tone={tone} action={<Button size="sm" variant="soft" onClick={() => setBudgetOpen(true)}><Settings2 size={14} /> Budgets</Button>}>Monthly budget</SectionTitle>
          <div className="flex items-center gap-5">
            <ProgressRing value={m.usedPct} size={104} stroke={11} color={m.usedPct >= 90 ? COLORS.danger : m.usedPct >= 70 ? COLORS.amber : COLORS.success}>
              <div className="text-center"><p className="text-xl font-bold tabular-nums">{m.usedPct}%</p><p className="text-[10px] text-muted-foreground">used</p></div></ProgressRing>
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Spent </span><b className="tabular-nums">{money(m.spent, cur)}</b><span className="text-muted-foreground"> of </span><b className="tabular-nums">{money(m.budget, cur)}</b></p>
              <p className={cn('font-semibold tabular-nums', m.remainingBudget < 0 ? 'text-danger' : 'text-success')}>{m.remainingBudget >= 0 ? `${money(m.remainingBudget, cur)} left` : `${money(-m.remainingBudget, cur)} over budget`}</p>
              <p className="text-xs text-muted-foreground">Daily limit: <b className="text-foreground">{money(m.dailyLimit, cur)}</b> · {m.daysLeft} days left</p>
              <div className="relative pt-1"><ProgressBar value={m.usedPct} tone={m.usedPct >= 90 ? 'danger' : m.usedPct >= 70 ? 'warn' : 'success'} label="Budget used" />
                <div className="mt-1 flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>70%</span><span>90%</span><span>100%</span></div></div>
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle icon={TrendingUp} tone={d.score == null ? 'neutral' : d.score >= 70 ? 'success' : d.score >= 45 ? 'warn' : 'danger'}>Money discipline</SectionTitle>
          <div className="flex items-center gap-4"><ProgressRing value={d.score ?? 0} size={84} stroke={9} color={scoreColor(d.score)}><span className="text-xl font-bold">{d.score ?? '--'}</span></ProgressRing>
            <p className="text-sm text-muted-foreground">{d.score == null ? 'Add transactions to get your score.' : d.score >= 70 ? 'Spending is on track. Keep saving.' : d.score >= 45 ? 'Watch the pace of your spending.' : 'Overspending. Cut non-essentials.'}</p></div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income (month)" value={money(m.income, cur)} icon={ArrowUpCircle} tone="success" />
        <StatCard label="Expenses (month)" value={money(m.spent, cur)} icon={ArrowDownCircle} tone="danger" />
        <StatCard label="Balance" value={money(m.balance, cur)} icon={Banknote} tone={m.balance >= 0 ? 'success' : 'danger'} sub="income − expenses" />
        <StatCard label="Total savings" value={money(d.savings, cur)} icon={PiggyBank} tone="success" sub={`${s.savingsGoals.length} goals`} />
        <StatCard label="Spent today" value={money(d.today, cur)} icon={Wallet} tone={m.dailyLimit && d.today > m.dailyLimit ? 'danger' : 'study'} sub={`limit ${money(m.dailyLimit, cur)}`} />
        <StatCard label="This week" value={money(d.week, cur)} icon={Wallet} tone="study" />
        <StatCard label="Top category" value={m.topCategory ?? '--'} icon={Crown} tone="danger" sub={m.topCategory ? money(m.topCategoryAmount, cur) : undefined} />
        <StatCard label="Biggest expense" value={m.biggest ? money(m.biggest.amount, cur) : '--'} icon={AlertTriangle} tone="danger" sub={m.biggest ? `${m.biggest.category} · ${shortDate(m.biggest.date)}` : undefined} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={TrendingUp} tone="success">Income vs expenses</SectionTitle>
          <ChartFrame height={220} empty={!d.series.some((x) => x.income || x.expense)}>
            <BarChart data={d.series} margin={{ left: -14, right: 4, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <ChartTooltip formatter={(v) => money(Number(v), cur)} /><RLegend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" name="Income" fill={COLORS.success} radius={[6, 6, 0, 0]} /><Bar dataKey="expense" name="Expenses" fill={COLORS.danger} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={Wallet} tone="study">Expenses by category</SectionTitle>
          <ChartFrame height={220} empty={d.catData.length === 0} emptyText="No expenses this month yet.">
            <PieChart>
              <Pie data={d.catData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">{d.catData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}</Pie>
              <ChartTooltip formatter={(v) => money(Number(v), cur)} /><RLegend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={TrendingUp} tone="danger">Daily spending trend</SectionTitle>
          <ChartFrame height={200} empty={m.spent === 0}>
            <LineChart data={d.daily} margin={{ left: -14, right: 8, top: 4 }}>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} interval={3} /><YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <ChartTooltip formatter={(v) => money(Number(v), cur)} labelFormatter={(l) => `Day ${l}`} />
              {m.dailyLimit > 0 && <ReferenceLine y={m.budget / m.dim} stroke={COLORS.amber} strokeDasharray="4 4" />}
              <Line type="monotone" dataKey="Spent" stroke={COLORS.danger} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle icon={PiggyBank} tone="success">Savings growth (net)</SectionTitle>
          <ChartFrame height={200} empty={!d.series.some((x) => x.income || x.expense)}>
            <AreaChart data={d.series} margin={{ left: -14, right: 8, top: 4 }}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.success} stopOpacity={0.4} /><stop offset="100%" stopColor={COLORS.success} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid {...gridProps} /><XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : v)} />
              <ChartTooltip formatter={(v) => money(Number(v), cur)} />
              <Area type="monotone" dataKey="cumulative" name="Net savings" stroke={COLORS.success} strokeWidth={2.5} fill="url(#sg)" />
            </AreaChart>
          </ChartFrame>
        </Card>
      </div>

      {/* Category budgets */}
      <Card>
        <SectionTitle icon={Target} tone="study" action={<Button size="sm" variant="soft" onClick={() => setBudgetOpen(true)}>Edit limits</Button>}>Budget usage by category</SectionTitle>
        {d.cats.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No category limits yet. Set some to get per-category alerts.</p> : (
          <div className="grid gap-3.5 sm:grid-cols-2">{d.cats.map((c) => (
            <div key={c.id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{c.category}</span><span className={cn('tabular-nums', c.pct >= 100 ? 'font-bold text-danger' : 'text-muted-foreground')}>{money(c.spent, cur)} / {money(c.monthlyLimit, cur)}</span></div>
              <ProgressBar value={c.pct} tone={c.pct >= 100 ? 'danger' : c.pct >= 80 ? 'warn' : 'success'} label={c.category} /></div>))}</div>
        )}
      </Card>

      {/* Savings goals */}
      <Card>
        <SectionTitle icon={PiggyBank} tone="success" action={<Button size="sm" variant="soft" onClick={() => openQuick('goal')}><Plus size={14} /> Goal</Button>}>Savings goals</SectionTitle>
        {s.savingsGoals.length === 0 ? <EmptyState icon={PiggyBank} tone="success" title="No savings goals" text="Saving for a laptop, a trip or an emergency fund? Add a goal and watch it grow." action={<Button variant="success" onClick={() => openQuick('goal')}><Plus size={16} /> New goal</Button>} /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.savingsGoals.map((g) => {
              const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
              const left = g.deadline ? diffDays(g.deadline, today) : null;
              return (
                <div key={g.id} className="rounded-2xl bg-muted/60 p-4">
                  <div className="flex items-start justify-between gap-2"><p className="font-semibold">{g.name}</p>
                    <div className="flex gap-1"><button aria-label="Edit goal" onClick={() => setEditGoal(g)} className="text-muted-foreground hover:text-foreground"><Pencil size={14} /></button><button aria-label="Delete goal" onClick={() => setDelGoal(g)} className="text-muted-foreground hover:text-danger"><Trash2 size={14} /></button></div></div>
                  <p className="mt-1 text-sm tabular-nums"><b className="text-success">{money(g.savedAmount, cur)}</b> <span className="text-muted-foreground">of {money(g.targetAmount, cur)}</span></p>
                  <ProgressBar className="my-2.5" value={pct} tone="success" height={10} label={g.name} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{pct >= 100 ? '🎉 Goal reached!' : `${pct}% · ${money(g.targetAmount - g.savedAmount, cur)} to go`}</span>{left != null && <span className={left < 0 ? 'text-danger' : ''}>{left < 0 ? 'Past deadline' : `${left}d left`}</span>}</div>
                  <Button size="sm" variant="success" className="mt-3 w-full" onClick={() => { setAddTo(g); setAddAmt(''); setAddErr(''); }}><Plus size={14} /> Add money</Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Transactions */}
      <Card>
        <SectionTitle icon={Banknote} tone="study">Transactions</SectionTitle>
        <div className="mb-3 space-y-3">
          <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" placeholder="Search notes, category, method..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" /></div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">{(['today', 'week', 'month', 'all'] as Period[]).map((p) => <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>{{ today: 'Today', week: 'This week', month: 'This month', all: 'All time' }[p]}</Chip>)}
            {(['all', 'income', 'expense'] as const).map((t) => <Chip key={t} tone={t === 'income' ? 'success' : t === 'expense' ? 'danger' : 'study'} active={type === t} onClick={() => setType(t)}>{t === 'all' ? 'All types' : t[0].toUpperCase() + t.slice(1)}</Chip>)}</div>
          <div className="grid grid-cols-2 gap-2">
            <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.includes(c as never))].map((c) => <option key={c}>{c}</option>)}</Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="date">Newest first</option><option value="amount">Highest amount</option></Select>
          </div>
        </div>
        {list.length === 0 ? <EmptyState icon={Wallet} tone="success" title="No transactions" text="Add income or an expense to get started." action={<Button variant="danger" onClick={() => openQuick('expense')}>Add expense</Button>} /> : (
          <ul className="space-y-2">
            {list.slice(0, 150).map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-3">
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t.type === 'income' ? 'bg-success/15 text-success' : 'bg-danger/12 text-danger')}>{t.type === 'income' ? <ArrowUpCircle size={19} /> : <ArrowDownCircle size={19} />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.category}{t.notes ? <span className="font-normal text-muted-foreground"> · {t.notes}</span> : null}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{shortDate(t.date)} · {t.paymentMethod}{(t.recurrence !== 'none' || t.parentId) && <Badge tone="movie"><Repeat size={10} /> recurring</Badge>}</p></div>
                <p className={cn('text-sm font-bold tabular-nums', t.type === 'income' ? 'text-success' : 'text-danger')}>{t.type === 'income' ? '+' : '−'}{money(t.amount, cur)}</p>
                <button aria-label="Edit transaction" onClick={() => setEditing(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card"><Pencil size={14} /></button>
                <button aria-label="Delete transaction" onClick={() => setDeleting(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Budgets">{budgetOpen && <BudgetEditor onDone={() => setBudgetOpen(false)} />}</Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.type === 'income' ? 'Edit income' : 'Edit expense'}>
        {editing && <EntityForm editing tone={editing.type === 'income' ? 'success' : 'danger'} fields={expenseFields(editing.type)} initial={{ ...editing, notes: editing.notes ?? '' }} onCancel={() => setEditing(null)}
          onSubmit={async (x) => {
            const delta = editing.type === 'expense' ? Number(x.amount) - editing.amount : 0;
            const warn = delta > 0 ? budgetCrossingWarning(s, today, delta, String(x.date ?? editing.date)) : null;
            const r = await tx.update(editing.id, x, { silent: Boolean(warn), message: 'Transaction updated. Totals refreshed!' });
            if (r) { if (warn) toast.warning(warn); setEditing(null); }
          }} />}
      </Modal>
      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit savings goal" size="sm">
        {editGoal && <EntityForm editing tone="success" fields={SAVINGS_FIELDS} initial={{ ...editGoal, deadline: editGoal.deadline ?? '' }} onCancel={() => setEditGoal(null)} onSubmit={async (x) => { if (await goals.update(editGoal.id, x, { message: 'Goal updated' })) setEditGoal(null); }} />}
      </Modal>
      <Modal open={!!addTo} onClose={() => setAddTo(null)} title={`Add to "${addTo?.name}"`} size="sm"
        footer={<><Button variant="outline" onClick={() => setAddTo(null)}>Cancel</Button><Button variant="success" onClick={submitGoalMoney}>Add money</Button></>}>
        <Field label="Amount (₹)" error={addErr}><Input autoFocus type="number" inputMode="numeric" min={1} value={addAmt} onChange={(e) => setAddAmt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitGoalMoney()} placeholder="500" /></Field>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this transaction?" message={deleting ? `${deleting.category} · ${money(deleting.amount, cur)} will be removed and your balance, budget and charts recalculated.` : ''}
        onConfirm={async () => { if (deleting) { await tx.remove(deleting.id, { message: 'Transaction deleted. Totals updated!' }); setDeleting(null); } }} />
      <ConfirmDialog open={!!delGoal} onClose={() => setDelGoal(null)} title="Delete this goal?" message={`"${delGoal?.name}" and its saved progress will be removed.`}
        onConfirm={async () => { if (delGoal) { await goals.remove(delGoal.id, { message: 'Goal deleted' }); setDelGoal(null); } }} />
    </div>
  );
}

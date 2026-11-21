'use client';
import { useState } from 'react';
import { Button, Field, Input } from './ui';
import { useCrud, useProfileUpdate, useSnapshot } from '@/lib/hooks';
import { toast } from '@/lib/store';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

/** Monthly budget + per-category limits. Used on the Money page and in Profile settings. */
export function BudgetEditor({ onDone }: { onDone?: () => void }) {
  const { snapshot: s } = useSnapshot();
  const budgets = useCrud('budgets');
  const profile = useProfileUpdate();
  const [monthly, setMonthly] = useState(String(s?.user.monthlyBudget ?? 0));
  const [limits, setLimits] = useState<Record<string, string>>(() => Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, String(s?.budgets.find((b) => b.category === c)?.monthlyLimit ?? '')])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const m = Number(monthly);
    if (!Number.isFinite(m) || m < 0) return setError('Monthly budget must be 0 or more.');
    const entries = EXPENSE_CATEGORIES.map((c) => [c, limits[c]] as const);
    if (entries.some(([, v]) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) return setError('Category limits must be valid amounts.');
    const total = entries.reduce((a, [, v]) => a + (v === '' ? 0 : Number(v)), 0);
    setError('');
    setBusy(true);
    try {
      await profile.update({ monthlyBudget: m }, false);
      for (const [category, v] of entries) {
        const prev = s?.budgets.find((b) => b.category === category)?.monthlyLimit;
        if (v === '' || Number(v) === prev) continue;
        await budgets.create({ category, monthlyLimit: Number(v) }, { silent: true });
      }
      toast.success(total > m && m > 0 ? 'Budgets saved. Note: category limits add up to more than your monthly budget.' : 'Budgets saved. Alerts and charts updated!');
      onDone?.();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Field label="Monthly budget (₹)"><Input type="number" inputMode="numeric" min={0} value={monthly} onChange={(e) => setMonthly(e.target.value)} /></Field>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Category limits (optional)</p>
        <div className="grid grid-cols-2 gap-2.5">
          {EXPENSE_CATEGORIES.map((c) => (
            <label key={c} className="text-[11px] font-medium text-muted-foreground">{c}
              <Input type="number" inputMode="numeric" min={0} placeholder="No limit" value={limits[c]} onChange={(e) => setLimits((p) => ({ ...p, [c]: e.target.value }))} className="mt-0.5" /></label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">{onDone && <Button variant="outline" onClick={onDone}>Cancel</Button>}<Button variant="success" loading={busy} onClick={save}>Save budgets</Button></div>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, Flag } from 'lucide-react';
import { Button, Chip, SectionTitle, Card } from './ui';
import { toast } from '@/lib/store';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (sec: number) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* audio unavailable */ }
}

/** Counts from a wall-clock timestamp so it stays accurate when the tab is throttled in the background. */
function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const base = useRef(0);
  const startedAt = useRef(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(base.current + Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [running]);
  return {
    elapsed, running,
    start: () => { startedAt.current = Date.now(); setRunning(true); },
    pause: () => { base.current = elapsed; setRunning(false); },
    reset: () => { base.current = 0; setElapsed(0); setRunning(false); },
  };
}

function useCountdown(onDone: () => void) {
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(0);
  const endAt = useRef(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(rem);
      if (rem === 0) onDone();
    }, 250);
    return () => clearInterval(id);
  }, [left > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    left, total,
    start: (sec: number) => { endAt.current = Date.now() + sec * 1000; setTotal(sec); setLeft(sec); },
    stop: () => setLeft(0),
  };
}

export function WorkoutTimers({ onLog }: { onLog: (minutes: number) => void }) {
  const sw = useStopwatch();
  const rest = useCountdown(() => { beep(); toast.info('Rest over. Time for your next set! 💪'); });
  return (
    <Card>
      <SectionTitle icon={Timer} tone="fit">Workout & rest timers</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-fit/10 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-fit">Workout timer</p>
          <p className="my-2 font-mono text-4xl font-bold tabular-nums" aria-live="off">{fmt(sw.elapsed)}</p>
          <div className="flex justify-center gap-2">
            {sw.running ? <Button variant="fit" onClick={sw.pause}><Pause size={16} /> Pause</Button> : <Button variant="fit" onClick={sw.start}><Play size={16} /> {sw.elapsed ? 'Resume' : 'Start'}</Button>}
            <Button variant="outline" size="icon" aria-label="Reset timer" onClick={sw.reset}><RotateCcw size={16} /></Button>
            <Button variant="success" disabled={sw.elapsed < 60} onClick={() => { sw.pause(); onLog(Math.max(1, Math.round(sw.elapsed / 60))); sw.reset(); }}><Flag size={16} /> Log</Button>
          </div>
        </div>
        <div className="rounded-2xl bg-muted/60 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rest timer</p>
          <p className="my-2 font-mono text-4xl font-bold tabular-nums">{rest.left > 0 ? `${pad(Math.floor(rest.left / 60))}:${pad(rest.left % 60)}` : '--:--'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[30, 60, 90, 120].map((s) => <Chip key={s} tone="fit" active={rest.left > 0 && rest.total === s} onClick={() => rest.start(s)}>{s}s</Chip>)}
            {rest.left > 0 && <Button size="sm" variant="outline" onClick={rest.stop}>Stop</Button>}
          </div>
        </div>
      </div>
    </Card>
  );
}

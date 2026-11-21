'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, Clapperboard, Download, ExternalLink, Film, Heart, Pencil, Play, Plus, Search, Star, Trash2, Tv } from 'lucide-react';
import { Badge, Button, Card, Chip, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, StatCard, type Tone } from '@/components/ui';
import { EntityForm } from '@/components/forms';
import { useCrud, useSnapshot } from '@/lib/hooks';
import { useUI } from '@/lib/store';
import { GENRES, LANGUAGES, PLATFORMS } from '@/lib/constants';
import { MOVIE_FIELDS } from '@/lib/forms';
import { movieOfTheDay, movieStats } from '@/lib/scores';
import { downloadCsv } from '@/lib/export';
import { shortDate, todayStr } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { Movie } from '@/types';

type Filter = 'all' | 'Want to watch' | 'Watching' | 'Completed' | 'Dropped' | 'favorites';
const STATUS_TONE: Record<string, Tone> = { 'Want to watch': 'neutral', Watching: 'movie', Completed: 'success', Dropped: 'danger' };
const GRADIENTS = ['from-violet-600 to-indigo-800', 'from-fuchsia-600 to-purple-900', 'from-indigo-500 to-slate-900', 'from-purple-600 to-rose-800', 'from-sky-600 to-violet-900'];
const gradientFor = (t: string) => GRADIENTS[[...t].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length];

function Poster({ m, className }: { m: Movie; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (m.posterUrl && !broken) return <img src={m.posterUrl} alt={`${m.title} poster`} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn('h-full w-full object-cover', className)} />;
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-3 text-center text-white', gradientFor(m.title), className)}>
      {m.type === 'Series' ? <Tv size={26} className="mb-2 opacity-80" /> : <Film size={26} className="mb-2 opacity-80" />}
      <span className="line-clamp-3 text-sm font-bold leading-tight">{m.title}</span>
    </div>
  );
}

export default function MoviesPage() {
  const { snapshot: s, today } = useSnapshot();
  const crud = useCrud('movies');
  const openQuick = useUI((u) => u.openQuick);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [genre, setGenre] = useState('');
  const [platform, setPlatform] = useState('');
  const [language, setLanguage] = useState('');
  const [editing, setEditing] = useState<Movie | null>(null);
  const [viewing, setViewing] = useState<Movie | null>(null);
  const [deleting, setDeleting] = useState<Movie | null>(null);

  const movies = s?.movies ?? [];
  const stats = useMemo(() => (s ? movieStats(s) : null), [s]);
  const motd = useMemo(() => (s ? movieOfTheDay(s, today) : null), [s, today]);

  const list = useMemo(() => movies.filter((m) => {
    if (q && !`${m.title} ${m.genre ?? ''} ${m.review ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'favorites' ? !m.favorite : filter !== 'all' && m.status !== filter) return false;
    if (genre && m.genre !== genre) return false;
    if (platform && m.platform !== platform) return false;
    if (language && m.language !== language) return false;
    return true;
  }), [movies, q, filter, genre, platform, language]);

  if (!s || !stats) return null;

  const complete = (m: Movie) => crud.update(m.id, { status: 'Completed', watchDate: m.watchDate ?? todayStr() }, { message: `"${m.title}" marked as completed. Stats updated!` });
  const toggleFav = (m: Movie) => crud.update(m.id, { favorite: !m.favorite }, { message: m.favorite ? 'Removed from favorites' : 'Added to favorites' });
  const filters: { v: Filter; l: string }[] = [{ v: 'all', l: 'All' }, { v: 'Want to watch', l: 'Want to watch' }, { v: 'Watching', l: 'Watching' }, { v: 'Completed', l: 'Completed' }, { v: 'favorites', l: '❤ Favorites' }, { v: 'Dropped', l: 'Dropped' }];

  return (
    <div className="space-y-5">
      <PageHeader title="Movies & Series" icon={Clapperboard} tone="movie" subtitle={`${stats.total} titles in your library`}
        action={<>
          <Button variant="outline" size="sm" onClick={() => downloadCsv('movies', movies.map((m) => ({ title: m.title, type: m.type, genre: m.genre ?? '', language: m.language ?? '', platform: m.platform ?? '', status: m.status, rating: m.rating ?? '', watchDate: m.watchDate ?? '' })))}><Download size={15} /> CSV</Button>
          <Button variant="movie" onClick={() => openQuick('movie')}><Plus size={17} /> Add title</Button></>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} tone="movie" icon={Film} />
        <StatCard label="Watching" value={stats.watching} tone="movie" icon={Play} />
        <StatCard label="Completed" value={stats.completed} tone="success" icon={CheckCircle2} />
        <StatCard label="Want to watch" value={stats.wantToWatch} tone="study" icon={Clapperboard} />
        <StatCard label="Avg rating" value={stats.avgRating ?? '--'} sub="out of 10" tone="fit" icon={Star} />
        <StatCard label="Top genre" value={stats.favoriteGenre ?? '--'} tone="movie" icon={Heart} />
      </div>

      {motd && (
        <Card className="overflow-hidden p-0">
          <div className="flex gap-4 bg-gradient-to-r from-movie/15 to-transparent p-4">
            <div className="h-36 w-24 shrink-0 overflow-hidden rounded-xl shadow-pop"><Poster m={motd} /></div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <Badge tone="movie" className="self-start">🎬 Movie of the Day</Badge>
              <h3 className="mt-2 truncate text-lg font-bold">{motd.title}</h3>
              <p className="text-xs text-muted-foreground">{[motd.type, motd.genre, motd.language, motd.platform].filter(Boolean).join(' · ')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="movie" onClick={() => crud.update(motd.id, { status: 'Watching' }, { message: `Enjoy "${motd.title}"! Moved to Watching.` })}><Play size={14} /> Start watching</Button>
                <Button size="sm" variant="outline" onClick={() => setViewing(motd)}>Details</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" placeholder="Search by title, genre or review..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search movies" /></div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">{filters.map((f) => <Chip key={f.v} tone="movie" active={filter === f.v} onClick={() => setFilter(f.v)}>{f.l}</Chip>)}</div>
        <div className="grid grid-cols-3 gap-2">
          <Select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">All genres</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</Select>
          <Select aria-label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">All platforms</option>{PLATFORMS.map((g) => <option key={g}>{g}</option>)}</Select>
          <Select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}><option value="">All languages</option>{LANGUAGES.map((g) => <option key={g}>{g}</option>)}</Select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Clapperboard} tone="movie" title={movies.length ? 'Nothing matches those filters' : 'Your watchlist is empty'} text={movies.length ? 'Try a different search or clear the filters.' : 'Add a movie or series you want to watch.'}
          action={movies.length ? <Button variant="outline" onClick={() => { setQ(''); setFilter('all'); setGenre(''); setPlatform(''); setLanguage(''); }}>Clear filters</Button> : <Button variant="movie" onClick={() => openQuick('movie')}><Plus size={16} /> Add title</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((m) => (
            <div key={m.id} className="group relative animate-fade-in overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-pop">
              <button onClick={() => setViewing(m)} className="block aspect-[2/3] w-full overflow-hidden text-left" aria-label={`View ${m.title}`}>
                <Poster m={m} className="transition duration-300 group-hover:scale-105" />
              </button>
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
                <Badge tone={STATUS_TONE[m.status]} className="bg-card/90 shadow-sm backdrop-blur">{m.status}</Badge>
                {m.rating != null && <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-amber-300"><Star size={11} className="fill-current" />{m.rating}</span>}
              </div>
              <button onClick={() => toggleFav(m)} aria-label={m.favorite ? 'Remove favorite' : 'Add favorite'} className="absolute right-2 top-10 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:scale-110">
                <Heart size={15} className={m.favorite ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
              <div className="p-3">
                <p className="truncate text-sm font-bold">{m.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{[m.genre, m.platform].filter(Boolean).join(' · ') || m.type}</p>
                <div className="mt-2.5 flex gap-1.5">
                  {m.status !== 'Completed' ? <Button size="sm" variant="success" className="flex-1" onClick={() => complete(m)}><CheckCircle2 size={14} /> Done</Button> : <span className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-success/12 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Watched</span>}
                  <Button size="icon" variant="soft" className="h-8 w-8" aria-label="Edit" onClick={() => setEditing(m)}><Pencil size={14} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''} size="md"
        footer={viewing && <>
          <Button variant="outline" onClick={() => { setDeleting(viewing); setViewing(null); }}><Trash2 size={15} className="text-danger" /> Delete</Button>
          <Button variant="movie" onClick={() => { setEditing(viewing); setViewing(null); }}><Pencil size={15} /> Edit</Button></>}>
        {viewing && (
          <div className="flex gap-4">
            <div className="h-48 w-32 shrink-0 overflow-hidden rounded-2xl shadow-card"><Poster m={viewing} /></div>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <div className="flex flex-wrap gap-1.5"><Badge tone={STATUS_TONE[viewing.status]}>{viewing.status}</Badge><Badge tone="movie">{viewing.type}</Badge>{viewing.favorite && <Badge tone="danger">❤ Favorite</Badge>}{viewing.rating != null && <Badge tone="warn">★ {viewing.rating}/10</Badge>}</div>
              <p className="text-muted-foreground">{[viewing.genre, viewing.language, viewing.platform].filter(Boolean).join(' · ') || 'No details added'}</p>
              {viewing.watchDate && <p className="text-xs text-muted-foreground">Watched on {shortDate(viewing.watchDate)}</p>}
              {viewing.review && <p className="rounded-xl bg-muted/60 p-3 text-sm">{viewing.review}</p>}
              <div className="flex flex-wrap gap-3 pt-1">
                {viewing.trailerUrl && <a href={viewing.trailerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-movie"><ExternalLink size={13} /> Trailer</a>}
                {viewing.imdbUrl && <a href={viewing.imdbUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-movie"><ExternalLink size={13} /> IMDb</a>}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit title">
        {editing && <EntityForm tone="movie" editing fields={MOVIE_FIELDS} onCancel={() => setEditing(null)}
          initial={{ ...editing, rating: editing.rating ?? '', genre: editing.genre ?? '', language: editing.language ?? '', platform: editing.platform ?? '', watchDate: editing.watchDate ?? '', review: editing.review ?? '', posterUrl: editing.posterUrl ?? '', trailerUrl: editing.trailerUrl ?? '', imdbUrl: editing.imdbUrl ?? '' }}
          onSubmit={async (d) => { const r = await crud.update(editing.id, d, { message: 'Movie updated. Stats refreshed!' }); if (r) setEditing(null); }} />}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this title?" message={`"${deleting?.title}" will be removed from your library.`}
        onConfirm={async () => { if (deleting) { await crud.remove(deleting.id, { message: 'Title deleted' }); setDeleting(null); } }} />
    </div>
  );
}

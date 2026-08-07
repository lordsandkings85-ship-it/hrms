import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Bell, BookOpen, ExternalLink, Calendar, Tag,
  ChevronRight, Loader2, Search, Pin, Star, Eye, ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { announcementsApi } from '../../../api/client';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  publishedAt: string;
  author?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Events: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Policy: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Performance: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  IT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Recognition: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Company: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

export default function MyAnnouncementsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<Announcement | null>(null);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.list(),
  });
  const announcements: Announcement[] = raw.map((a: any) => ({
    id: a.id,
    title: a.title,
    content: a.body,
    category: 'Company',
    isPinned: false,
    publishedAt: a.createdAt,
    author: 'HR Team',
  }));
  const categories = Array.from(new Set(announcements.map(a => a.category)));

  const filtered = announcements.filter(a => {
    const matchSearch = !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const pinned = filtered.filter(a => a.isPinned);
  const regular = filtered.filter(a => !a.isPinned);

  if (selected) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={16} /> Back to Announcements
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-start gap-3 mb-3">
              {selected.isPinned && <Pin size={16} className="text-amber-400 flex-shrink-0 mt-1" />}
              <div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border mb-2 ${CATEGORY_COLORS[selected.category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                  {selected.category}
                </span>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  <span>{selected.author}</span>
                  <span>·</span>
                  <span>{new Date(selected.publishedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{selected.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Company Announcements"
        subtitle="Stay updated with the latest news and updates from your organization"
        icon={Megaphone}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...categories]).map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : (
        <>
          {/* Pinned Announcements */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <Pin size={12} className="text-amber-400" /> Pinned
              </div>
              {pinned.map(ann => (
                <button key={ann.id} onClick={() => setSelected(ann)}
                  className="w-full text-left rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 hover:border-amber-500/40 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Pin size={13} className="text-amber-400 flex-shrink-0" />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[ann.category] || ''}`}>{ann.category}</span>
                      </div>
                      <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{ann.title}</h3>
                      <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{ann.content}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-[var(--text-muted)]">{new Date(ann.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] mt-1 ml-auto group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Regular Announcements */}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Latest</div>
              )}
              {regular.map(ann => (
                <button key={ann.id} onClick={() => setSelected(ann)}
                  className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-indigo-500/30 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[ann.category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{ann.category}</span>
                      </div>
                      <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{ann.title}</h3>
                      <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{ann.content}</p>
                      <div className="text-xs text-[var(--text-muted)] mt-2">{ann.author} · {new Date(ann.publishedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)] mt-1 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[var(--text-muted)]">
              <Megaphone size={32} className="opacity-30" />
              <p className="text-sm">No announcements found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

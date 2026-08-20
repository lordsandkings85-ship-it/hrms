import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, Bell, Pin, Trash2 } from 'lucide-react';
import { announcementsApi } from '../../../api/client';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { fmtDate } from '../../../utils/formatDate';

const CATEGORIES = ['Company', 'Events', 'Policy', 'Performance', 'IT', 'Recognition'];

export default function AnnouncementsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const user = useAuthStore((s: any) => s.user);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Company');
  const [isPinned, setIsPinned] = useState(false);

  const { data: list, isLoading } = useQuery({
    queryKey: ['announcements-list'],
    queryFn: () => announcementsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      toastSuccess('Announcement published successfully');
      setTitle('');
      setBody('');
      setCategory('Company');
      setIsPinned(false);
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => toastError('Failed to publish announcement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: () => {
      toastSuccess('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => toastError('Failed to delete announcement'),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      announcementsApi.update(id, { isPinned }),
    onSuccess: () => {
      toastSuccess('Announcement updated');
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => toastError('Failed to update announcement'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toastError('Please enter required parameters');
    const authorName = user?.employee?.firstName
      ? `${user.employee.firstName} ${user.employee.lastName || ''}`
      : 'HR Team';
    createMutation.mutate({ title, body, category, author: authorName, isPinned });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Announcements"
          subtitle="Publish notices, pin company news, and update workspace bulletins."
          icon={Megaphone}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Publish form */}
        <div className="section-card p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Megaphone className="text-ledger" size={18} /> Publish Notice
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">Notice Title</label>
              <input
                type="text"
                placeholder="e.g. Q3 Town Hall Schedule"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Details / Body</label>
              <textarea
                placeholder="Details of the announcement..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-line"
              />
              Is Pinned
            </label>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
            >
              <Send size={14} /> Send Announcement
            </button>
          </form>
        </div>

        {/* Notices Board */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line flex items-center gap-2 bg-paper/20">
            <Bell size={16} /> Company Bulletin Board
          </div>
          {isLoading && <div className="p-6 text-sm text-muted">Loading bulletin board...</div>}
          {!isLoading && (!list || list.length === 0) && (
            <div className="p-6 text-sm text-muted text-center">No announcements published yet.</div>
          )}
          <div className="divide-y divide-line">
            {list?.map((ann: any) => (
              <div key={ann.id} className="p-6 hover:bg-paper/40">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-semibold text-ink">{ann.title}</h4>
                    {ann.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-line bg-paper/50 text-muted">
                        {ann.category}
                      </span>
                    )}
                    {ann.isPinned && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-1">
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted font-mono whitespace-nowrap">{fmtDate(ann.createdAt)}</span>
                </div>
                <p className="text-sm text-muted font-body leading-relaxed whitespace-pre-wrap">
                  {ann.body?.length > 200 ? ann.body.slice(0, 200) + '...' : ann.body}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted">{ann.author || 'HR Team'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => pinMutation.mutate({ id: ann.id, isPinned: !ann.isPinned })}
                      className="text-xs px-2 py-1 rounded border border-line text-muted hover:bg-paper/60 flex items-center gap-1"
                    >
                      <Pin size={12} /> {ann.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

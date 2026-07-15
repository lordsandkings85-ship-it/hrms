import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Megaphone, Send, Bell } from 'lucide-react';
import { announcementsApi } from '../api/client';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Fetch announcements list
  const { data: list, isLoading, refetch } = useQuery({
    queryKey: ['announcements-list'],
    queryFn: () => announcementsApi.list(),
  });

  // Create Announcement Mutation
  const createMutation = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      alert('Announcement published successfully');
      setTitle('');
      setBody('');
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return alert('Please enter required parameters');
    createMutation.mutate({ title, body });
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Announcements</h1>
        <p className="text-sm text-muted mt-1">Publish notices, pin company news, and update workspace bulletins.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Publish form */}
        <div className="bg-white border border-line rounded-lg p-6 h-fit">
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
                  <h4 className="text-base font-semibold text-ink">{ann.title}</h4>
                  <span className="text-xs text-muted font-mono whitespace-nowrap">{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted font-body leading-relaxed whitespace-pre-wrap">{ann.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

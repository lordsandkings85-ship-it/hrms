import { useState } from 'react';
import {
  MessageSquare, ThumbsUp, Lightbulb, AlertCircle, Send,
  CheckCircle, Loader2, Star, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { helpdeskApi } from '../../../api/client';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../components/ui/ToastProvider';

type FeedbackType = 'suggestion' | 'feedback' | 'complaint';

const TYPE_CONFIG: Record<FeedbackType, { label: string; description: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  suggestion: {
    label: 'Suggestion',
    description: 'Share an idea to improve our workplace',
    icon: Lightbulb,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  feedback: {
    label: 'Feedback',
    description: 'Share your thoughts and experiences',
    icon: ThumbsUp,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  complaint: {
    label: 'Complaint',
    description: 'Report an issue or concern formally',
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
};

const CATEGORIES = [
  'Work Environment', 'Management & Leadership', 'Compensation & Benefits',
  'HR Policies', 'Team Collaboration', 'Infrastructure & Tools',
  'Learning & Development', 'Work-Life Balance', 'Other',
];

function RatingStars({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
            <Star size={18} fill={(hover || value) >= i ? '#f59e0b' : 'none'}
              className={(hover || value) >= i ? 'text-amber-400' : 'text-slate-600'} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Satisfaction ratings
  const [ratings, setRatings] = useState({
    overall: 0, management: 0, workLife: 0, compensation: 0, culture: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !message.trim()) {
      toastError('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await helpdeskApi.create({
        subject: `${TYPE_CONFIG[feedbackType].label}: ${subject || category}`,
        description: message,
        priority: feedbackType === 'complaint' ? 'high' : 'medium',
        category,
        ratings: feedbackType === 'feedback' ? ratings : undefined,
      });
      setSubmitted(true);
      toastSuccess('Thank you for your feedback!');
    } catch (err: any) {
      toastError(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PageHeader title="Suggestions / Feedback / Complaints" subtitle="Share your thoughts anonymously or with your name" icon={MessageSquare} />
        <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/5 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">Feedback Received!</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Thank you for taking the time to share your thoughts. Your {feedbackType} has been submitted {isAnonymous ? 'anonymously' : 'successfully'} and will be reviewed by HR.
          </p>
          <button onClick={() => { setSubmitted(false); setSubject(''); setMessage(''); setCategory(''); setRatings({ overall: 0, management: 0, workLife: 0, compensation: 0, culture: 0 }); }}
            className="mt-2 px-6 py-2.5 border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  const selectedTypeCfg = TYPE_CONFIG[feedbackType];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Suggestions / Feedback / Complaints"
        subtitle="Your voice matters. Share your thoughts to help us improve."
        icon={MessageSquare}
      />

      {/* Type Selector */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(TYPE_CONFIG) as [FeedbackType, typeof TYPE_CONFIG[FeedbackType]][]).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={type} onClick={() => setFeedbackType(type)}
              className={`p-4 rounded-2xl border text-center transition-all ${
                feedbackType === type ? `${cfg.bg} ${cfg.border}` : 'border-[var(--border)] bg-[var(--surface)] hover:border-indigo-500/20'
              }`}>
              <Icon size={20} className={`mx-auto mb-2 ${feedbackType === type ? cfg.color : 'text-[var(--text-muted)]'}`} />
              <div className={`text-sm font-semibold ${feedbackType === type ? cfg.color : 'text-[var(--text-primary)]'}`}>{cfg.label}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">{cfg.description}</div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Satisfaction Ratings (for feedback type) */}
        {feedbackType === 'feedback' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Overall Satisfaction (Optional)</h3>
            {Object.entries({
              overall: 'Overall Experience',
              management: 'Management & Leadership',
              workLife: 'Work-Life Balance',
              compensation: 'Compensation & Benefits',
              culture: 'Company Culture',
            }).map(([key, label]) => (
              <RatingStars key={key} label={label} value={ratings[key as keyof typeof ratings]}
                onChange={v => setRatings(prev => ({ ...prev, [key]: v }))} />
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Category <span className="text-red-400">*</span></label>
          <select value={category} onChange={e => setCategory(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
            <option value="">Select a category...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder={`Brief summary of your ${feedbackType}...`}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {feedbackType === 'complaint' ? 'Describe the Issue' : feedbackType === 'suggestion' ? 'Describe Your Idea' : 'Share Your Feedback'} <span className="text-red-400">*</span>
          </label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={6}
            placeholder={
              feedbackType === 'complaint' ? 'Please describe the issue in detail, including dates, people involved, and impact...' :
              feedbackType === 'suggestion' ? 'Describe your idea in detail. How would it benefit the team or company?' :
              'Share your experience and thoughts. Be as specific as possible to help us understand better.'
            }
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
          <div className="text-xs text-[var(--text-muted)] mt-1 text-right">{message.length} characters</div>
        </div>

        {/* Anonymous Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Submit Anonymously</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Your name will not be visible to HR or management</div>
          </div>
          <button type="button" onClick={() => setIsAnonymous(!isAnonymous)}
            className={`relative w-10 h-6 rounded-full transition-all ${isAnonymous ? 'bg-indigo-600' : 'bg-slate-600'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isAnonymous ? 'left-5' : 'left-1'}`} />
          </button>
        </div>

        {!isAnonymous && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-alt)] text-xs text-[var(--text-muted)]">
            <span className="text-indigo-400">ℹ</span>
            Submitting as <span className="font-medium text-[var(--text-primary)]">{user?.employee?.firstName} {user?.employee?.lastName}</span>
          </div>
        )}

        <button type="submit" disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {isSubmitting ? 'Submitting...' : `Submit ${TYPE_CONFIG[feedbackType].label}`}
        </button>
      </form>
    </div>
  );
}

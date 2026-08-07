import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, CalendarClock, GitBranch, ClipboardList, FolderOpen, Users, FileText, Handshake, ClipboardCheck } from 'lucide-react';
import { JobsSection, PipelineSection } from './sections/RecruitmentSections';
import { PanelSection, JobDescriptionSection, ConsultantsSection } from './sections/RecruitmentConfigSections';
import RequisitionsPage from '../../hr/recruitment/RequisitionsPage';
import ResumesScreeningPage from '../../hr/recruitment/ResumesScreeningPage';
import InterviewSchedulePage from '../../hr/recruitment/InterviewSchedulePage';
import InterviewFeedbackPage from '../../hr/recruitment/InterviewFeedbackPage';
import RecruitmentFormsPage from '../../hr/recruitment/RecruitmentFormsPage';

type TabKey = 'jobs' | 'interviews' | 'pipeline' | 'requisitions' | 'resumes' | 'panel' | 'jd' | 'consultants' | 'scorecards';

const SUB_TO_TAB: Record<string, TabKey> = {
  'job-ads': 'jobs',
  forms: 'scorecards',
  'assign-screening': 'resumes',
  'interview-schedule': 'interviews',
  interviews: 'interviews',
  'interview-feedback': 'interviews',
  'interview-status': 'interviews',
  'selected-candidates': 'pipeline',
  'approved-rejected': 'pipeline',
  'offer-letters': 'pipeline',
  'declined-candidates': 'pipeline',
  'revised-offers': 'pipeline',
  'candidate-meetings': 'pipeline',
  joining: 'pipeline',
  requisitions: 'requisitions',
  'requisitions-pending': 'requisitions',
  'requisitions-assigned': 'requisitions',
  'requisitions-assign': 'requisitions',
  resumes: 'resumes',
  'resumes-pending': 'resumes',
  'resumes-comments': 'resumes',
  'resumes-references': 'resumes',
  panel: 'panel',
  'job-description': 'jd',
  consultants: 'consultants',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  jobs: 'job-ads',
  interviews: 'interviews',
  pipeline: 'selected-candidates',
  requisitions: 'requisitions',
  resumes: 'resumes',
  panel: 'panel',
  jd: 'job-description',
  consultants: 'consultants',
  scorecards: 'forms',
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'jobs', label: 'Job Openings', icon: <Briefcase size={16} /> },
  { key: 'interviews', label: 'Interviews', icon: <CalendarClock size={16} /> },
  { key: 'pipeline', label: 'Candidate Pipeline', icon: <GitBranch size={16} /> },
  { key: 'requisitions', label: 'Requisitions', icon: <ClipboardList size={16} /> },
  { key: 'resumes', label: 'Resume Bank', icon: <FolderOpen size={16} /> },
  { key: 'panel', label: 'Panel Members', icon: <Users size={16} /> },
  { key: 'jd', label: 'Job Descriptions', icon: <FileText size={16} /> },
  { key: 'consultants', label: 'Consultants', icon: <Handshake size={16} /> },
  { key: 'scorecards', label: 'Scorecards', icon: <ClipboardCheck size={16} /> },
];

export default function RecruitmentAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'job-ads';

  const initialTab = SUB_TO_TAB[subAction] || 'jobs';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/recruitment/${TAB_TO_SUB[t]}`);
  };

  const content: Record<TabKey, React.ReactNode> = {
    jobs: <JobsSection />,
    interviews: subAction === 'interview-feedback' ? <InterviewFeedbackPage /> : <InterviewSchedulePage />,
    pipeline: <PipelineSection />,
    requisitions: <RequisitionsPage />,
    resumes: <ResumesScreeningPage />,
    panel: <PanelSection />,
    jd: <JobDescriptionSection />,
    consultants: <ConsultantsSection />,
    scorecards: <RecruitmentFormsPage />,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Recruitment</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage job openings, interviews, candidates and hiring setup.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-colors ${tab === t.key ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {content[tab]}
    </div>
  );
}

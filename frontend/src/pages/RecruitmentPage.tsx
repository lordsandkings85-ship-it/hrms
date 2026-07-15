import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, UserPlus, Users, ClipboardCheck, ArrowRight, MessageSquare, Landmark } from 'lucide-react';
import { recruitmentApi } from '../api/client';

export default function RecruitmentPage() {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  // Job creation Form State
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  // Candidate creation Form State
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candResume, setCandResume] = useState('');

  // Interview scheduling Form State
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewerName, setInterviewerName] = useState('');

  // Feedback form State
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);

  // Offer form State
  const [offerCtc, setOfferCtc] = useState(600000);

  // Fetch Jobs list
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['recruitment-jobs'],
    queryFn: () => recruitmentApi.listJobs(),
  });

  // Create Job
  const createJobMutation = useMutation({
    mutationFn: recruitmentApi.createJob,
    onSuccess: () => {
      alert('Job listing posted!');
      setJobTitle('');
      setJobDesc('');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
  });

  // Add Candidate
  const addCandidateMutation = useMutation({
    mutationFn: (data: any) => recruitmentApi.addCandidate(selectedJob.id, data),
    onSuccess: () => {
      alert('Candidate added!');
      setCandName('');
      setCandEmail('');
      setCandResume('');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
  });

  // Move Stage
  const moveStageMutation = useMutation({
    mutationFn: (data: { candidateId: string; stage: string }) =>
      recruitmentApi.moveStage(data.candidateId, data.stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
  });

  // Schedule Interview
  const scheduleInterviewMutation = useMutation({
    mutationFn: (data: { candidateId: string; date: string; interviewer: string }) =>
      recruitmentApi.scheduleInterview(data.candidateId, { scheduledAt: data.date, interviewer: data.interviewer }),
    onSuccess: () => {
      alert('Interview scheduled!');
      setInterviewTime('');
      setInterviewerName('');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
  });

  // Create Offer Letter
  const createOfferMutation = useMutation({
    mutationFn: (data: { candidateId: string; ctc: number }) =>
      recruitmentApi.createOffer(data.candidateId, data.ctc),
    onSuccess: () => {
      alert('Offer letter generated!');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
  });

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    createJobMutation.mutate({ title: jobTitle, description: jobDesc });
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return alert('Select a job first');
    addCandidateMutation.mutate({ name: candName, email: candEmail, resumeUrl: candResume });
  };

  const handleScheduleInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return alert('Select a candidate first');
    scheduleInterviewMutation.mutate({
      candidateId: selectedCandidate.id,
      date: interviewTime,
      interviewer: interviewerName,
    });
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return alert('Select a candidate first');
    createOfferMutation.mutate({
      candidateId: selectedCandidate.id,
      ctc: Number(offerCtc),
    });
  };

  // Find job from list if updated
  const currentJobDetail = jobs?.find((j) => j.id === selectedJob?.id) || selectedJob;

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Recruitment Board (ATS)</h1>
        <p className="text-sm text-muted mt-1">Manage pipeline job openings, schedule interviews, and draft offer packages.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Post Job & Jobs List */}
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase size={16} className="text-ledger" /> Post Job Opening
            </h2>
            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-0.5">Job Title</label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required className="w-full border border-line px-2 py-1.5 rounded text-sm" placeholder="e.g. Senior Backend Engineer" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">Description</label>
                <textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} rows={2} className="w-full border border-line px-2 py-1 rounded text-sm" placeholder="Work parameters, tech stack..." />
              </div>
              <button type="submit" className="w-full bg-ledger text-paper rounded py-2 text-xs font-medium hover:bg-ledgerDark">Create Posting</button>
            </form>
          </div>

          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-paper/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider">Active Listings</h3>
            </div>
            {isLoadingJobs && <div className="p-4 text-xs text-muted">Loading postings...</div>}
            <div className="divide-y divide-line">
              {jobs?.map((j: any) => (
                <button
                  key={j.id}
                  onClick={() => { setSelectedJob(j); setSelectedCandidate(null); }}
                  className={`w-full text-left p-4 hover:bg-paper/40 transition-colors flex justify-between items-center ${currentJobDetail?.id === j.id ? 'bg-paper/80 border-r-2 border-ledger' : ''}`}
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{j.title}</div>
                    <div className="text-xs text-muted">{j.candidates?.length || 0} candidates</div>
                  </div>
                  <ArrowRight size={14} className="text-muted" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Candidates list */}
        <div className="bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-5 py-3 border-b border-line bg-paper/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Users size={15} /> Candidates for {currentJobDetail?.title || 'Selected Job'}
            </h3>
          </div>
          {currentJobDetail ? (
            <div>
              {/* Add candidate form */}
              <form onSubmit={handleAddCandidate} className="p-4 bg-paper/30 border-b border-line space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="text" placeholder="Name" value={candName} onChange={(e) => setCandName(e.target.value)} required className="w-full border border-line px-2 py-1 rounded text-xs" />
                  </div>
                  <div>
                    <input type="email" placeholder="Email" value={candEmail} onChange={(e) => setCandEmail(e.target.value)} required className="w-full border border-line px-2 py-1 rounded text-xs" />
                  </div>
                </div>
                <input type="text" placeholder="Resume Link (URL)" value={candResume} onChange={(e) => setCandResume(e.target.value)} className="w-full border border-line px-2 py-1 rounded text-xs" />
                <button type="submit" className="w-full flex items-center justify-center gap-1 bg-ink text-paper rounded py-1.5 text-xs hover:bg-ink/90">
                  <UserPlus size={12} /> Add to Pipeline
                </button>
              </form>

              <div className="divide-y divide-line">
                {currentJobDetail.candidates?.length === 0 && (
                  <div className="p-6 text-xs text-muted text-center">No candidates in pipeline. Add one above.</div>
                )}
                {currentJobDetail.candidates?.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    className={`w-full text-left p-4 hover:bg-paper/40 transition-colors flex justify-between items-center ${selectedCandidate?.id === c.id ? 'bg-paper/80 border-r-2 border-ledger' : ''}`}
                  >
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted flex gap-2 mt-0.5">
                        <span className="capitalize text-ledger font-semibold">{c.stage}</span>
                        <span>&bull;</span>
                        <span>{c.email}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-xs text-muted text-center">Please select a job listing from the left panel to inspect applicant pipelines.</div>
          )}
        </div>

        {/* Right Column: Candidates detail and actions (Interviews, Offers) */}
        <div className="space-y-6">
          {selectedCandidate ? (
            <div className="bg-white border border-line rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3 border-b border-line pb-2 flex items-center justify-between">
                <span>{selectedCandidate.name}</span>
                <span className="text-[11px] uppercase tracking-wider text-ledger font-mono font-semibold">{selectedCandidate.stage}</span>
              </h3>

              {/* Move Stage Selector */}
              <div className="mb-4">
                <label className="block text-xs text-muted mb-1">Set Stage</label>
                <select
                  value={selectedCandidate.stage}
                  onChange={(e) => moveStageMutation.mutate({ candidateId: selectedCandidate.id, stage: e.target.value })}
                  className="w-full border border-line px-2 py-1.5 rounded text-xs"
                >
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview scheduled</option>
                  <option value="offer">Offer Sent</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Schedule Interview */}
              <div className="border-t border-line pt-4 mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ClipboardCheck size={14} className="text-ledger" /> Schedule Interview
                </h4>
                <form onSubmit={handleScheduleInterview} className="space-y-2">
                  <input type="datetime-local" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} required className="w-full border border-line px-2 py-1 rounded text-xs" />
                  <input type="text" placeholder="Interviewer Name" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} className="w-full border border-line px-2 py-1 rounded text-xs" />
                  <button type="submit" className="w-full bg-ink text-paper rounded py-1 text-xs hover:bg-ink/90">Set Schedule</button>
                </form>
              </div>

              {/* Draft Offer package */}
              <div className="border-t border-line pt-4 mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Landmark size={14} className="text-ledger" /> Release Offer Letter
                </h4>
                <form onSubmit={handleCreateOffer} className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-muted">Annual CTC (₹)</label>
                    <input type="number" value={offerCtc} onChange={(e) => setOfferCtc(Number(e.target.value))} required className="w-full border border-line px-2 py-1 rounded text-xs font-mono" />
                  </div>
                  <button type="submit" className="w-full bg-ledger text-paper rounded py-1 text-xs font-medium hover:bg-ledgerDark">Generate Offer</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-line rounded-lg p-6 text-center text-xs text-muted">
              Select an applicant from pipeline sheet to view contact details, log interview schedules, or draft offer sheets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

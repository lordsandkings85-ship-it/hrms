import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, PlusCircle, UserPlus, Award } from 'lucide-react';
import { trainingApi, employeesApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  // Form states
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  // Fetch courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => trainingApi.listCourses(),
  });

  // Create Course
  const createCourseMutation = useMutation({
    mutationFn: trainingApi.createCourse,
    onSuccess: () => {
      alert('Training course registered successfully!');
      setCourseTitle('');
      setCourseDesc('');
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
  });

  // Enroll Employee
  const enrollMutation = useMutation({
    mutationFn: (data: { courseId: string; employeeId: string }) =>
      trainingApi.enroll(data.courseId, data.employeeId),
    onSuccess: () => {
      alert('Employee enrolled successfully');
      setSelectedEmp('');
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
  });

  // Update Progress
  const progressMutation = useMutation({
    mutationFn: (data: { enrollmentId: string; progress: number }) =>
      trainingApi.updateProgress(data.enrollmentId, data.progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
  });

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    createCourseMutation.mutate({ title: courseTitle, description: courseDesc });
  };

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedEmp) return alert('Select course and employee first');
    enrollMutation.mutate({ courseId: selectedCourse.id, employeeId: selectedEmp });
  };

  const handleProgressChange = (enrollmentId: string, val: string) => {
    progressMutation.mutate({ enrollmentId, progress: Number(val) });
  };

  const activeCourseDetail = courses?.find((c) => c.id === selectedCourse?.id) || selectedCourse;

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Training & Development"
          subtitle="Schedule training programs, track completion, and manage certifications."
          icon={GraduationCap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create Course */}
        <div className="space-y-6">
          <div className="section-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <PlusCircle className="text-ledger" size={18} /> Register Course
            </h2>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-0.5">Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Information Security 101"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  required
                  className="w-full border border-line px-2.5 py-1.5 rounded text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">Description</label>
                <textarea
                  placeholder="Course outline..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-line px-2.5 py-1 rounded text-sm focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-ledger text-paper rounded py-2 text-xs font-semibold">
                Register Program
              </button>
            </form>
          </div>

          {/* Courses List */}
          <div className="section-card overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-paper/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider">LMS Courses</h3>
            </div>
            {isLoading && <div className="p-4 text-xs text-muted">Loading courses...</div>}
            <div className="divide-y divide-line">
              {courses?.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  className={`w-full text-left p-4 hover:bg-paper/40 flex justify-between items-center ${activeCourseDetail?.id === c.id ? 'bg-paper/80 border-r-2 border-ledger' : ''}`}
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{c.title}</div>
                    <div className="text-xs text-muted">{c.enrollments?.length || 0} employees enrolled</div>
                  </div>
                  <GraduationCap size={15} className="text-muted" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Course Enrollment & Progress */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          {activeCourseDetail ? (
            <div>
              <div className="px-6 py-4 border-b border-line bg-paper/10">
                <h3 className="text-sm font-semibold">{activeCourseDetail.title}</h3>
                {activeCourseDetail.description && <p className="text-xs text-muted mt-0.5">{activeCourseDetail.description}</p>}
              </div>

              {/* Enroll form */}
              <form onSubmit={handleEnroll} className="p-4 bg-paper/30 border-b border-line flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1">Enroll Employee</label>
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    required
                    className="w-full border border-line px-2.5 py-1.5 rounded text-xs bg-white focus:outline-none"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees?.items.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-ink text-paper rounded px-4 py-1.5 text-xs hover:bg-ink/90 flex items-center gap-1">
                  <UserPlus size={12} /> Enroll
                </button>
              </form>

              {/* Enrolled list */}
              <div className="divide-y divide-line">
                {activeCourseDetail.enrollments?.length === 0 && (
                  <div className="p-8 text-xs text-muted text-center">No employees currently enrolled in this track. Register one above.</div>
                )}
                {activeCourseDetail.enrollments?.map((enroll: any) => {
                  const emp = employees?.items.find((e) => e.id === enroll.employeeId);
                  return (
                    <div key={enroll.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                      <div>
                        <div className="text-sm font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : `Employee ID: ${enroll.employeeId}`}</div>
                        <div className="text-xs text-muted mt-1 flex items-center gap-2">
                          {enroll.completedAt ? (
                            <span className="flex items-center gap-0.5 text-ledger font-semibold">
                              <Award size={12} /> Certified ({new Date(enroll.completedAt).toLocaleDateString()})
                            </span>
                          ) : (
                            <span>Progress: <span className="font-semibold text-ink">{enroll.progress}%</span></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={enroll.progress}
                          onChange={(e) => handleProgressChange(enroll.id, e.target.value)}
                          className="accent-ledger h-1.5 w-24 bg-paper rounded"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-muted">
              Select a learning track from the left console to audit enrollees or log progress.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


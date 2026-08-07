import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, UserPlus, Award, BookOpen, Loader2 } from 'lucide-react';
import { trainingApi, employeesApi } from '../../../api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { DataTable, Column } from '../../../components/ui/DataTable';

const courseSchema = z.object({
  title: z.string().min(3, 'Course title is required'),
  description: z.string().optional()
});

const enrollSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required')
});

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => trainingApi.listCourses(),
  });

  const courseForm = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: '', description: '' }
  });

  const enrollForm = useForm<z.infer<typeof enrollSchema>>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { employeeId: '' }
  });

  const createCourseMutation = useMutation({
    mutationFn: trainingApi.createCourse,
    onSuccess: () => {
      toastSuccess('Training course registered successfully!');
      courseForm.reset();
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create course')
  });

  const enrollMutation = useMutation({
    mutationFn: (data: { courseId: string; employeeId: string }) =>
      trainingApi.enroll(data.courseId, data.employeeId),
    onSuccess: () => {
      toastSuccess('Employee enrolled successfully');
      enrollForm.reset();
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to enroll')
  });

  const progressMutation = useMutation({
    mutationFn: (data: { enrollmentId: string; progress: number }) =>
      trainingApi.updateProgress(data.enrollmentId, data.progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
  });

  const handleCreateCourse = (data: z.infer<typeof courseSchema>) => {
    createCourseMutation.mutate(data);
  };

  const handleEnroll = (data: z.infer<typeof enrollSchema>) => {
    if (!selectedCourse) return toastError('Select a course first');
    enrollMutation.mutate({ courseId: selectedCourse.id, employeeId: data.employeeId });
  };

  const activeCourseDetail = courses?.find((c: any) => c.id === selectedCourse?.id) || selectedCourse;

  const enrollColumns: Column<any>[] = [
    { 
      key: 'employee', 
      header: 'Employee Name', 
      render: (row) => {
        const emp = employees?.items.find((e: any) => e.id === row.employeeId);
        return <span className="font-bold text-[var(--text-primary)]">{emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${row.employeeId}`}</span>;
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        row.completedAt ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
            <Award size={12} /> Certified
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-amber-500 bg-amber-500/10 border-amber-500/20">
            In Progress
          </span>
        )
      )
    },
    {
      key: 'progress',
      header: 'Progress Update',
      render: (row) => (
        <div className="flex items-center gap-3 w-48">
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={row.progress}
            onChange={(e) => progressMutation.mutate({ enrollmentId: row.id, progress: Number(e.target.value) })}
            className="w-full accent-blue-500"
            disabled={progressMutation.isPending}
          />
          <span className="text-xs font-bold w-8">{row.progress}%</span>
        </div>
      )
    },
    {
      key: 'date',
      header: 'Completed At',
      render: (row) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : '—'}
        </span>
      )
    }
  ];

  return (
    <div className="page-container max-w-7xl space-y-6">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
             <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Training Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage corporate training, course catalog, and employee skill tracking.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Create Course & Catalog */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Plus size={16} className="text-blue-500" /> Register Course
            </h3>
            <form onSubmit={courseForm.handleSubmit(handleCreateCourse)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Course Title</label>
                <input {...courseForm.register('title')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. InfoSec 101" />
                {courseForm.formState.errors.title && <p className="text-xs text-rose-500">{courseForm.formState.errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Description</label>
                <textarea {...courseForm.register('description')} rows={2} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="Course outline..." />
              </div>
              <button type="submit" disabled={createCourseMutation.isPending} className="w-full py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex justify-center items-center gap-2 mt-4">
                {createCourseMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Register Program
              </button>
            </form>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-alt)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2"><BookOpen size={14}/> Course Catalog</h3>
            </div>
            {isLoading && <div className="p-4 text-xs text-[var(--text-muted)] flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Loading catalog...</div>}
            <div className="divide-y divide-[var(--border)]">
              {courses?.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  className={`w-full text-left p-4 hover:bg-[var(--surface-hover)] transition-colors flex justify-between items-center ${activeCourseDetail?.id === c.id ? 'bg-[var(--surface-alt)] border-l-4 border-l-blue-500' : ''}`}
                >
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{c.title}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{c.enrollments?.length || 0} active learners</div>
                  </div>
                  <GraduationCap size={16} className={activeCourseDetail?.id === c.id ? "text-blue-500" : "text-[var(--text-muted)]"} />
                </button>
              ))}
              {courses?.length === 0 && <div className="p-4 text-xs text-[var(--text-muted)]">No courses registered.</div>}
            </div>
          </div>
        </div>

        {/* Right Side: Course Details & Enrollment Tracker */}
        <div className="lg:col-span-3 space-y-6">
          {activeCourseDetail ? (
            <>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{activeCourseDetail.title}</h3>
                {activeCourseDetail.description && <p className="text-sm text-[var(--text-muted)] mt-2 bg-[var(--surface-alt)] p-3 rounded-xl border border-[var(--border)]">{activeCourseDetail.description}</p>}
                
                <form onSubmit={enrollForm.handleSubmit(handleEnroll)} className="mt-6 flex flex-col md:flex-row gap-4 items-end bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border)]">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Enroll Employee</label>
                    <select {...enrollForm.register('employeeId')} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-blue-500">
                      <option value="">-- Choose Employee --</option>
                      {employees?.items.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                    {enrollForm.formState.errors.employeeId && <p className="text-xs text-rose-500">{enrollForm.formState.errors.employeeId.message}</p>}
                  </div>
                  <button type="submit" disabled={enrollMutation.isPending} className="py-2.5 px-6 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex justify-center items-center gap-2">
                    {enrollMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Enroll Trainee
                  </button>
                </form>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">Trainee Progress Roster</h3>
                <div className="premium-datatable">
                  <style>{`
                      .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                      .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                      .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                      .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                      .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                      .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
                  `}</style>
                  {activeCourseDetail.enrollments?.length > 0 ? (
                    <DataTable columns={enrollColumns} data={activeCourseDetail.enrollments} keyField="id" />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm font-medium border border-dashed border-[var(--border)] rounded-xl">
                      No employees enrolled in this track yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
                <BookOpen size={32} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Course Selected</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-sm">Select a learning track from the course catalog on the left to manage enrollments and audit progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

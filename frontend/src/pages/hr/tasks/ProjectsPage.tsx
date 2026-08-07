import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Target, Loader2, Plus, FolderKanban, Layers } from 'lucide-react';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { projectsApi } from '../../../api/client';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name is required'),
});

const taskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
});

type ProjectFormData = z.infer<typeof projectSchema>;
type TaskFormData = z.infer<typeof taskSchema>;

export default function HrProjectsPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;

  const createProject = useMutation({
    mutationFn: (name: string) => projectsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toastSuccess('Project created successfully');
    },
  });

  const addTask = useMutation({
    mutationFn: ({ projectId, title }: { projectId: string; title: string }) => projectsApi.addTask(projectId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toastSuccess('Task assigned successfully');
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => projectsApi.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toastSuccess('Task status updated');
    },
  });

  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '' },
  });

  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '' },
  });

  const onProjectSubmit = (data: ProjectFormData) => {
    createProject.mutate(data.name, {
      onSuccess: () => {
        projectForm.reset();
      },
    });
  };

  const onTaskSubmit = (data: TaskFormData) => {
    if (!selectedProject) return;
    addTask.mutate({ projectId: selectedProject.id, title: data.title }, {
      onSuccess: () => taskForm.reset(),
    });
  };

  const toggleTask = (taskId: string, currentStatus: string) => {
    updateTaskStatus.mutate({ taskId, status: currentStatus === 'completed' ? 'todo' : 'completed' });
  };

  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks?.length ?? 0), 0);
  const completedTasks = projects.reduce((acc, p) => acc + (p.tasks ?? []).filter((t: any) => t.status === 'completed').length, 0);

  const columns: Column<any>[] = [
    { key: 'title', header: 'Task Name', render: (row) => <span className="font-bold text-[var(--text-primary)] block">{row.title}</span> },
    { key: 'project', header: 'Project', render: (row) => <span className="text-xs text-[var(--text-muted)]">{selectedProject?.name ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (row) => (
        <button onClick={() => toggleTask(row.id, row.status)} disabled={updateTaskStatus.isPending} className="text-xs px-2 py-1 bg-[var(--surface-alt)] border border-[var(--border)] hover:bg-[var(--surface-hover)] font-bold rounded flex items-center gap-1 transition-colors disabled:opacity-50">
           {row.status === 'completed' ? 'Reopen' : 'Complete'}
        </button>
      ) 
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <Briefcase size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Project & Task Management</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage enterprise projects, tasks, and team productivity.</p>
          </div>
        </div>
        <div className="relative z-10 flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-500">{projects.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">{totalTasks - completedTasks}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Open Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-500">{completedTasks}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Completed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Plus size={16} className="text-indigo-500" /> Create New Project</h3>
            
            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Project Name</label>
                <input {...projectForm.register('name')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Q3 Product Launch" />
                {projectForm.formState.errors.name && <p className="text-xs text-rose-500">{projectForm.formState.errors.name.message}</p>}
              </div>
              <button type="submit" disabled={createProject.isPending} className="w-full py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <FolderKanban size={16} />} Create Project
              </button>
            </form>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Layers size={16} className="text-indigo-500" /> Projects</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-6 text-center">No projects yet. Create your first project.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => {
                  const open = (p.tasks ?? []).filter((t: any) => t.status !== 'completed').length;
                  const active = selectedProject?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${active ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[var(--surface-alt)] border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{p.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mt-0.5">{(p.tasks ?? []).length} tasks</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg ${open > 0 ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'}`}>
                        {open} open
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2"><Target size={18} className="text-indigo-500" /> Tasks — {selectedProject?.name ?? 'No project'}</h3>
            </div>

            {selectedProject && (
              <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="flex gap-3 mb-6">
                <input {...taskForm.register('title')} className="flex-1 px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" placeholder="Add a task title..." />
                {taskForm.formState.errors.title && <p className="text-xs text-rose-500 self-center">{taskForm.formState.errors.title.message}</p>}
                <button type="submit" disabled={addTask.isPending} className="shrink-0 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {addTask.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Assign Task
                </button>
              </form>
            )}

            <div className="premium-datatable">
              <style>{`
                 .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                 .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                 .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                 .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                 .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                 .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
              `}</style>
              <DataTable columns={columns} data={selectedProject?.tasks ?? []} keyField="id" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

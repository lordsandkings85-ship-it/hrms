import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Plus, CheckCircle, Circle, Play } from 'lucide-react';
import { projectsApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Form states
  const [projName, setProjName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  // Fetch projects list
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list(),
  });

  // Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (newProj) => {
      alert('Project workspace created!');
      setProjName('');
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setSelectedProject(newProj);
    },
  });

  // Add Task Mutation
  const addTaskMutation = useMutation({
    mutationFn: (data: { projectId: string; title: string }) =>
      projectsApi.addTask(data.projectId, data.title),
    onSuccess: () => {
      setTaskTitle('');
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  // Update Task Status Mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: (data: { taskId: string; status: string }) =>
      projectsApi.updateTaskStatus(data.taskId, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    createProjectMutation.mutate(projName);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskTitle.trim()) return;
    addTaskMutation.mutate({ projectId: selectedProject.id, title: taskTitle });
  };

  const handleStatusChange = (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'todo' ? 'in_progress' : currentStatus === 'in_progress' ? 'done' : 'todo';
    updateTaskStatusMutation.mutate({ taskId, status: nextStatus });
  };

  const activeProjDetail = projects?.find((p) => p.id === selectedProject?.id) || selectedProject;

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Projects & Teams"
          subtitle="Manage cross-functional projects and team allocations."
          icon={FolderKanban}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Lists Panel */}
        <div className="space-y-6">
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FolderKanban size={16} className="text-ledger" /> New Project
            </h2>
            <form onSubmit={handleCreateProject} className="flex gap-2">
              <input
                type="text"
                placeholder="Project Name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                required
                className="flex-1 border border-line px-2.5 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
              />
              <button type="submit" className="bg-ledger text-paper rounded px-3 py-1.5 text-xs hover:bg-ledgerDark">
                Create
              </button>
            </form>
          </div>

          <div className="section-card overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-paper/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider">Active Workspaces</h3>
            </div>
            {isLoading && <div className="p-4 text-xs text-muted">Loading projects...</div>}
            <div className="divide-y divide-line">
              {projects?.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full text-left p-4 hover:bg-paper/40 flex justify-between items-center ${activeProjDetail?.id === p.id ? 'bg-paper/80 border-r-2 border-ledger' : ''}`}
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{p.name}</div>
                    <div className="text-xs text-muted">{p.tasks?.length || 0} tasks allocated</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded capitalize font-medium ${p.status === 'active' ? 'bg-ledger/10 text-ledger' : 'bg-paper text-muted'}`}>
                    {p.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Task Workspace */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          {activeProjDetail ? (
            <div>
              <div className="px-6 py-4 border-b border-line bg-paper/10 flex justify-between items-center">
                <h3 className="text-sm font-semibold">{activeProjDetail.name} — Tasks Matrix</h3>
              </div>

              {/* Add task form */}
              <form onSubmit={handleAddTask} className="p-4 bg-paper/30 border-b border-line flex gap-2">
                <input
                  type="text"
                  placeholder="Allocate new task card..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="flex-1 border border-line px-3 py-1.5 rounded text-xs focus:outline-none"
                />
                <button type="submit" className="bg-ink text-paper rounded px-4 py-1.5 text-xs hover:bg-ink/90 flex items-center gap-1">
                  <Plus size={12} /> Add Task
                </button>
              </form>

              {/* Kanban List */}
              <div className="divide-y divide-line">
                {activeProjDetail.tasks?.length === 0 && (
                  <div className="p-8 text-xs text-muted text-center">No tasks mapped in this workspace yet. Create task cards above.</div>
                )}
                {activeProjDetail.tasks?.map((task: any) => (
                  <div key={task.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleStatusChange(task.id, task.status)}
                        className={`text-muted transition-colors hover:text-ledger`}
                      >
                        {task.status === 'done' ? (
                          <CheckCircle size={16} className="text-ledger" />
                        ) : task.status === 'in_progress' ? (
                          <Play size={16} className="text-ledger" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <span className={`text-sm ${task.status === 'done' ? 'line-through text-muted' : 'text-ink font-medium'}`}>{task.title}</span>
                    </div>

                    <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded ${
                      task.status === 'done'
                        ? 'bg-ledger/10 text-ledger'
                        : task.status === 'in_progress'
                        ? 'bg-paper text-ledger border border-ledger/20'
                        : 'bg-paper text-muted border border-line'
                    }`}>
                      {task.status === 'in_progress' ? 'in progress' : task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-muted">
              Select an active workspace from the left console to view details or log tasks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, HardDrive, Cpu, Terminal, Building, Loader2, Database, Network } from 'lucide-react';
import { superAdminApi } from '../../../api/client';
import { fmtDate, fmtDateTime } from '../../../utils/formatDate';
import { DataTable, Column } from '../../../components/ui/DataTable';

export default function SuperAdminPage() {
  const { data: tenants, isLoading: isLoadingTenants } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: () => superAdminApi.listTenants(),
  });

  const { data: health, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['superadmin-health'],
    queryFn: () => superAdminApi.health(),
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['superadmin-audit-logs'],
    queryFn: () => superAdminApi.auditLogs(),
  });

  const tenantColumns: Column<any>[] = [
    { key: 'name', header: 'Tenant Workspace', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.name}</span> },
    { key: 'id', header: 'Tenant ID', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)] font-bold">{row.id}</span> },
    { key: 'createdAt', header: 'Provisioned', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)]">{fmtDate(row.createdAt)}</span> },
  ];

  const logColumns: Column<any>[] = [
    { key: 'action', header: 'Event', render: (row) => <span className="font-mono text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">[{row.action}]</span> },
    { key: 'details', header: 'Details', render: (row) => (
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)]">{row.entity} updated (ID: {row.entityId || 'N/A'})</div>
        <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 uppercase">User ID: {row.userId || 'System'}</div>
      </div>
    )},
    { key: 'tenant', header: 'Tenant ID', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)] font-bold">{row.companyId}</span> },
    { key: 'timestamp', header: 'Timestamp', render: (row) => <span className="font-mono text-[10px] text-[var(--text-muted)]">{fmtDateTime(row.createdAt)}</span> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Super Admin Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Global tenant workspace management and master telemetry metrics.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl">
            <Cpu size={24} />
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">Core Telemetry</div>
            <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1 flex items-center gap-2">
              {isLoadingHealth ? <Loader2 size={16} className="animate-spin" /> : (health?.uptime ? `Uptime: ${Math.round(health.uptime / 60)}m` : 'Healthy (NestJS)')}
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-500 rounded-xl">
            <HardDrive size={24} />
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">Active Workspaces</div>
            <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1 flex items-center gap-2">
              {isLoadingTenants ? <Loader2 size={16} className="animate-spin" /> : `${tenants?.length || 0} Tenants`}
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl">
            <Database size={24} />
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">Database Engine</div>
            <div className="text-sm font-bold font-mono text-[var(--text-primary)] mt-1 truncate">
              hrms_saas@postgresql
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
               <Building className="text-indigo-500" size={20} /> Provisioned Tenants
             </h3>
             <div className="premium-datatable">
               <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
               `}</style>
               <DataTable columns={tenantColumns} data={tenants || []} loading={isLoadingTenants} keyField="id" />
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
               <Terminal className="text-indigo-500" size={20} /> Global Audit Firehose
             </h3>
             <div className="premium-datatable">
               <DataTable columns={logColumns} data={logs || []} loading={isLoadingLogs} keyField="id" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

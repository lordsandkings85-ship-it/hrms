import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, HardDrive, Cpu, Terminal, Building } from 'lucide-react';
import { superAdminApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

export default function SuperAdminPage() {
  // Fetch platform tenants/companies list
  const { data: tenants } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: () => superAdminApi.listTenants(),
  });

  // Fetch telemetry health metrics
  const { data: health } = useQuery({
    queryKey: ['superadmin-health'],
    queryFn: () => superAdminApi.health(),
  });

  // Fetch platform wide audit logs
  const { data: logs } = useQuery({
    queryKey: ['superadmin-audit-logs'],
    queryFn: () => superAdminApi.auditLogs(),
  });

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Super Admin"
          subtitle="Global company management, tenant overview, and system configuration."
          icon={ShieldCheck}
        />
      </div>

      {/* Roster widgets for system health metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="section-card p-5 flex items-center gap-4">
          <div className="p-3 bg-ledger/10 text-ledger rounded">
            <Cpu size={24} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">CPU &amp; Engine Telemetry</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{health?.uptime ? `Uptime: ${Math.round(health.uptime / 60)}m` : 'Healthy (Nest)'}</div>
          </div>
        </div>

        <div className="section-card p-5 flex items-center gap-4">
          <div className="p-3 bg-ledger/10 text-ledger rounded">
            <HardDrive size={24} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Platform Tenants</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{tenants?.length || 0} active organizations</div>
          </div>
        </div>

        <div className="section-card p-5 flex items-center gap-4">
          <div className="p-3 bg-ledger/10 text-ledger rounded">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Prisma Engine DB URL</div>
            <div className="text-sm font-semibold font-mono truncate mt-1">hrms_saas@postgresql</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tenants List Column */}
        <div className="section-card overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line bg-paper/20">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building size={16} /> Platform Workspace Tenants
            </h3>
          </div>
          {(!tenants || tenants.length === 0) ? (
            <div className="p-6 text-sm text-muted">No organizations registered on the platform.</div>
          ) : (
            <div className="divide-y divide-line">
              {tenants.map((t: any) => (
                <div key={t.id} className="p-4 hover:bg-paper/40">
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-xs text-muted mt-1 font-mono">{t.id}</div>
                  <div className="text-[10px] text-muted mt-0.5">Created on {new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Audit Logs Roster Column */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line bg-paper/20">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Terminal size={16} /> Platform Security Audit Logs
            </h3>
          </div>
          {(!logs || logs.length === 0) ? (
            <div className="p-6 text-sm text-muted text-center">No audit log records logged on the server.</div>
          ) : (
            <div className="divide-y divide-line font-mono text-[11px] max-h-[500px] overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="p-3 hover:bg-paper/40 flex flex-col md:flex-row justify-between gap-2">
                  <div>
                    <span className="text-ledger font-semibold uppercase">[{log.action}]</span>
                    <span className="text-ink ml-1.5">{log.entity} registry altered (ID: {log.entityId || 'N/A'})</span>
                    <div className="text-muted mt-0.5">Tenant: {log.companyId} &bull; Executed by user: {log.userId || 'system'}</div>
                  </div>
                  <span className="text-muted text-[10px] whitespace-nowrap self-end md:self-auto">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


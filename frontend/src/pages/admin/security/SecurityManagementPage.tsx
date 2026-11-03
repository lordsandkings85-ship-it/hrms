import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldAlert,
  MonitorX,
  Ban,
  Unlock,
  Save,
  RefreshCw,
  Laptop,
  Trash2,
  History,
} from 'lucide-react';
import { AdminSection, StatusBadge } from '../../../components/ui/AdminSection';
import { useToast } from '../../../components/ui/ToastProvider';
import {
  BlockedUserRecord,
  SecurityEventRecord,
  SecurityPolicy,
  securityApi,
} from '../../../api/client';

const EVENT_LABELS: Record<string, string> = {
  EMULATOR_DETECTED: 'Android emulator',
  VIRTUAL_MACHINE: 'Virtual machine',
  UNSUPPORTED_PLATFORM: 'Unsupported platform',
  UNSUPPORTED_ARCH: 'Unsupported architecture',
  UNSUPPORTED_OS_VERSION: 'Unsupported OS version',
  ACCOUNT_BLOCKED: 'Account blocked',
  ACCOUNT_UNBLOCKED: 'Account unblocked',
  SESSION_REVOKED: 'Session revoked',
};

const POLICY_FIELDS: Array<{ key: keyof SecurityPolicy; label: string; help: string }> = [
  {
    key: 'blockEmulators',
    label: 'Block Android emulators',
    help: 'Reject browsers or devices showing definitive emulator evidence (BlueStacks, Nox, LDPlayer, Android x86, no-touch mobile).',
  },
  {
    key: 'blockVirtualMachines',
    label: 'Block virtual machines',
    help: 'Reject Windows virtual machines that are not on the approved enterprise virtual-desktop list.',
  },
  {
    key: 'blockMobileClients',
    label: 'Block mobile browsers',
    help: 'Reject genuine Android/iOS browsers as well. Leave off to allow phones while still blocking emulators.',
  },
  {
    key: 'autoBlockAccounts',
    label: 'Auto-block accounts',
    help: 'Block the account and revoke live sessions as soon as a definitive violation is detected.',
  },
  {
    key: 'notifyAdmins',
    label: 'Notify administrators',
    help: 'Send the "Unsupported Device Access Attempt" alert to authorized Admins and Super Admins.',
  },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function employeeName(user: BlockedUserRecord): string {
  const e = user.employee;
  if (!e) return user.email;
  return `${e.firstName} ${e.lastName}`.trim() || e.employeeCode || user.email;
}

function deviceSummary(event: SecurityEventRecord): string {
  const info = event.deviceInfo || {};
  const label = info.deviceLabel ? ` · ${info.deviceLabel}` : '';
  return `${event.deviceId || 'Unknown device'}${label}`;
}

export default function SecurityManagementPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [policyForm, setPolicyForm] = useState<SecurityPolicy | null>(null);
  const [allowedHosts, setAllowedHosts] = useState('');
  const [eventType, setEventType] = useState('');
  const [unblockTarget, setUnblockTarget] = useState<BlockedUserRecord | null>(null);
  const [unblockReason, setUnblockReason] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['security-summary'],
    queryFn: () => securityApi.summary(),
  });

  const eventsQuery = useQuery({
    queryKey: ['security-events', eventType],
    queryFn: () => securityApi.events({ type: eventType || undefined, limit: 100 }),
  });

  const devicesQuery = useQuery({
    queryKey: ['security-devices'],
    queryFn: () => securityApi.devices(),
  });

  const policy = summaryQuery.data?.policy;

  useEffect(() => {
    if (policy && !policyForm) {
      setPolicyForm(policy);
      setAllowedHosts((policy.allowedVmHosts ?? []).join(', '));
    }
  }, [policy, policyForm]);

  const savePolicy = useMutation({
    mutationFn: () => {
      if (!policyForm) throw new Error('Policy not loaded');
      return securityApi.updatePolicy({
        ...policyForm,
        allowedVmHosts: allowedHosts
          .split(',')
          .map((host) => host.trim())
          .filter(Boolean)
          .slice(0, 50),
      });
    },
    onSuccess: (next) => {
      toast.success('Security policy saved', 'New checks apply to the next login and refresh.');
      setPolicyForm(next);
      setAllowedHosts((next.allowedVmHosts ?? []).join(', '));
      queryClient.invalidateQueries({ queryKey: ['security-summary'] });
    },
    onError: (err: any) => toast.error('Could not save policy', err?.message),
  });

  const unblock = useMutation({
    mutationFn: (payload: { userId: string; reason: string }) =>
      securityApi.unblock(payload.userId, payload.reason),
    onSuccess: () => {
      toast.success(
        'Account unblocked',
        'All sessions were revoked. The employee must sign in again.',
      );
      setUnblockTarget(null);
      setUnblockReason('');
      queryClient.invalidateQueries({ queryKey: ['security-summary'] });
      queryClient.invalidateQueries({ queryKey: ['security-events'] });
    },
    onError: (err: any) => toast.error('Could not unblock account', err?.message),
  });

  const revokeDevice = useMutation({
    mutationFn: (id: string) => securityApi.revokeDevice(id),
    onSuccess: () => {
      toast.success('Trusted device revoked');
      queryClient.invalidateQueries({ queryKey: ['security-devices'] });
    },
    onError: (err: any) => toast.error('Could not revoke device', err?.message),
  });

  const blockedUsers = summaryQuery.data?.blockedUsers ?? [];
  const events = eventsQuery.data ?? [];
  const devices = devicesQuery.data ?? [];

  const stats = useMemo(() => {
    const recent = events.filter(
      (e) => Date.now() - new Date(e.createdAt).getTime() < 24 * 60 * 60 * 1000,
    );
    return {
      blocked: blockedUsers.length,
      last24h: recent.length,
      emulators: recent.filter((e) => e.eventType === 'EMULATOR_DETECTED').length,
      vms: recent.filter((e) => e.eventType === 'VIRTUAL_MACHINE').length,
    };
  }, [blockedUsers, events]);

  function togglePolicy(key: keyof SecurityPolicy) {
    setPolicyForm((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-500" /> Security Management
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Windows-only access enforcement, blocked accounts and unsupported-device history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            summaryQuery.refetch();
            eventsQuery.refetch();
            devicesQuery.refetch();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-[var(--surface-alt)]"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Blocked accounts', value: stats.blocked, icon: Ban, tone: 'text-rose-500' },
          { label: 'Attempts (24h)', value: stats.last24h, icon: MonitorX, tone: 'text-amber-500' },
          { label: 'Emulator attempts', value: stats.emulators, icon: ShieldAlert, tone: 'text-orange-500' },
          { label: 'VM attempts', value: stats.vms, icon: Laptop, tone: 'text-indigo-500' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4"
          >
            <span className={`p-2.5 rounded-xl bg-[var(--surface-alt)] ${card.tone}`}>
              <card.icon size={18} />
            </span>
            <div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{card.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminSection
        title="Device Policy"
        icon={ShieldCheck}
        subtitle="Applies server-side to login, token refresh and protected API calls."
        right={
          <button
            type="button"
            onClick={() => savePolicy.mutate()}
            disabled={!policyForm || savePolicy.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            <Save size={14} /> {savePolicy.isPending ? 'Saving…' : 'Save policy'}
          </button>
        }
      >
        {summaryQuery.isLoading && <p className="text-sm text-[var(--text-muted)]">Loading policy…</p>}
        {summaryQuery.isError && (
          <p className="text-sm text-rose-500">
            {(summaryQuery.error as any)?.message || 'Failed to load security policy.'}
          </p>
        )}
        {policyForm && (
          <div className="space-y-3">
            {POLICY_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!policyForm[field.key]}
                  onChange={() => togglePolicy(field.key)}
                  className="mt-0.5 h-4 w-4 accent-emerald-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    {field.label}
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] mt-0.5">{field.help}</span>
                </span>
              </label>
            ))}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Approved enterprise virtual desktops (comma separated)
              </label>
              <input
                value={allowedHosts}
                onChange={(e) => setAllowedHosts(e.target.value)}
                placeholder="e.g. vmware horizon, citrix, avd"
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Matching is case-insensitive against the reported hypervisor / device label.
              </p>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Blocked Users"
        icon={Ban}
        subtitle="Accounts blocked by the security policy. Unblocking requires a reason and revokes every session."
      >
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No accounts are currently blocked.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-[var(--surface-alt)]">
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-bold">Employee</th>
                  <th className="px-4 py-3 font-bold">Company</th>
                  <th className="px-4 py-3 font-bold">Blocked at</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                  <th className="px-4 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--text-primary)]">{employeeName(user)}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {user.employee?.employeeCode || '—'} · {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.company?.displayName || user.company?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(user.securityBlockedAt)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[280px]">
                      <span className="line-clamp-3 break-words">{user.securityBlockReason || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setUnblockTarget(user);
                          setUnblockReason('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/20"
                      >
                        <Unlock size={13} /> Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Unsupported Device Attempts"
        icon={History}
        subtitle="Every blocked startup, login, refresh or API attempt with the reported device details."
        right={
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-semibold"
          >
            <option value="">All event types</option>
            {Object.entries(EVENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        }
      >
        {eventsQuery.isLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading security history…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No security events recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[940px]">
              <thead className="bg-[var(--surface-alt)]">
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Event</th>
                  <th className="px-4 py-3 font-bold">Employee</th>
                  <th className="px-4 py-3 font-bold">Operating system</th>
                  <th className="px-4 py-3 font-bold">Device info</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(event.createdAt)}
                      {event.stage && (
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                          {event.stage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={EVENT_LABELS[event.eventType] || event.eventType} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {event.employeeName || 'Unknown'}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {event.employeeCode || '—'}
                        {event.companyName ? ` · ${event.companyName}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      <div>{[event.osName, event.osVersion].filter(Boolean).join(' ') || event.platform || '—'}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {[event.platform, event.arch].filter(Boolean).join(' / ') || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[220px]">
                      <span className="break-all text-xs">{deviceSummary(event)}</span>
                      {event.ipAddress && (
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">IP {event.ipAddress}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[300px]">
                      <span className="text-xs break-words">{event.detectionReason || '—'}</span>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{event.id}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Approved Enterprise Devices"
        icon={Laptop}
        subtitle="Explicitly approved virtual desktops that bypass the virtual-machine rule."
      >
        {devices.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No approved devices yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-[var(--surface-alt)]">
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-bold">Device</th>
                  <th className="px-4 py-3 font-bold">Label</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Approved</th>
                  <th className="px-4 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device: any) => (
                  <tr key={device.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)] break-all">
                      {device.deviceId}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{device.label || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={device.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(device.approvedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => revokeDevice.mutate(device.id)}
                        disabled={revokeDevice.isPending || device.status !== 'APPROVED'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[11px] font-bold uppercase tracking-wider hover:bg-rose-500/20 disabled:opacity-40"
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {unblockTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Unblock {employeeName(unblockTarget)}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              This records an audit entry, revokes every active session and requires the employee to
              sign in again.
            </p>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-1">
              Reason (minimum 10 characters)
            </label>
            <textarea
              value={unblockReason}
              onChange={(e) => setUnblockReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Verified the new Windows 11 laptop with the employee's manager."
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setUnblockTarget(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unblockReason.trim().length < 10 || unblock.isPending}
                onClick={() =>
                  unblock.mutate({
                    userId: unblockTarget.id,
                    reason: unblockReason.trim(),
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50"
              >
                <Unlock size={14} /> {unblock.isPending ? 'Unblocking…' : 'Unblock account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

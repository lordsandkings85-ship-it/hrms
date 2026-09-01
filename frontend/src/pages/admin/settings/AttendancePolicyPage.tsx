import { useState, useEffect } from 'react';
import { Timer, MapPin, Save, Play } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminSection } from '../../../components/ui/AdminSection';
import { attendancePolicyApi, attendanceApiExt, leaveApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';

const DEFAULTS = [
  { key: 'workdays', name: 'Weekly Working Days', value: '6' },
  { key: 'dailyhours', name: 'Daily Work Hours', value: '9' },
  { key: 'grace', name: 'Grace Period (minutes)', value: '15' },
  { key: 'halfday', name: 'Half Day Threshold (hours)', value: '4.5' },
  { key: 'late', name: 'Late Mark After (minutes)', value: '15' },
  { key: 'geo', name: 'Geo-fencing Required', value: 'No' },
  { key: 'overtime', name: 'Overtime Enabled', value: 'Yes' },
  { key: 'weekend', name: 'Weekend Attendance Counting', value: 'Yes' },
  { key: 'custom.gracePeriodMins', name: 'Grace Period — Shift Start (min)', value: '10' },
  { key: 'custom.flexiTime', name: 'Flexi-Time Allowed', value: 'false' },
  { key: 'custom.coreHoursStart', name: 'Core Hours Start (HH:MM)', value: '' },
  { key: 'custom.coreHoursEnd', name: 'Core Hours End (HH:MM)', value: '' },
  { key: 'custom.overtimeThresholdMinutes', name: 'Overtime Threshold (min)', value: '480' },
  { key: 'custom.incompleteShiftEnabled', name: 'Incomplete Shift Checking', value: 'true' },
  { key: 'custom.incompleteShiftThresholdPct', name: 'Incomplete Shift Threshold (%)', value: '100' },
  { key: 'custom.incompleteShiftStatus', name: 'Incomplete Shift Status', value: 'OFF_DAY_OR_INCOMPLETE' },
  { key: 'custom.secondSaturdayOff', name: '2nd Saturday Weekly-Off', value: 'false' },
  { key: 'custom.secondSaturdayCompOffCredit', name: '2nd Saturday Comp Off Credit (days)', value: '1' },
  { key: 'custom.monthlyCasualLeave', name: 'Monthly Casual Leave', value: 'true' },
  { key: 'custom.monthlyCasualLeaveAmount', name: 'Monthly Casual Leave (days/mo)', value: '1' },
];

export default function AttendancePolicyPage() {
  const [rows, setRows] = useState<any[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: geofenceConfig } = useQuery({
    queryKey: ['geofence-config'],
    queryFn: () => attendanceApiExt.getGeofence(),
  });

  const { data: allocationStatus, refetch: refetchAllocationStatus } = useQuery({
    queryKey: ['monthly-allocation-status'],
    queryFn: () => leaveApi.monthlyAllocationStatus(),
  });

  const [geoForm, setGeoForm] = useState({ lat: '', lng: '', radius: '200' });

  const geofence = (geofenceConfig || {}) as any;
  const configuredLat = geofence.lat ?? geofence.geofenceLat;
  const configuredLng = geofence.lng ?? geofence.geofenceLng;
  const configuredRadius = geofence.radius ?? geofence.geofenceRadius;
  const isGeofenceConfigured = !!(configuredLat && configuredLng);

  useEffect(() => {
    if (geofenceConfig) {
      const lat = geofence.lat ?? geofence.geofenceLat;
      const lng = geofence.lng ?? geofence.geofenceLng;
      const radius = geofence.radius ?? geofence.geofenceRadius;
      if (lat != null && lng != null) {
        setGeoForm({ lat: String(lat), lng: String(lng), radius: String(radius ?? '200') });
      }
    }
  }, [geofenceConfig]);

  const saveGeofence = useMutation({
    mutationFn: () => attendanceApiExt.setGeofence({
      lat: parseFloat(geoForm.lat),
      lng: parseFloat(geoForm.lng),
      radius: parseFloat(geoForm.radius) || 200,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-config'] });
      toastSuccess('Geofence coordinates saved');
    },
    onError: (e: any) => toastError(e?.message || 'Failed to save geofence'),
  });

  useEffect(() => {
    let cancelled = false;
    attendancePolicyApi.list()
      .then((data: any[]) => {
        if (cancelled) return;
        const stored = Array.isArray(data) ? data : [];
        const map = new Map(stored.map((r: any) => [r.key, r.value]));
        setRows(DEFAULTS.map((d) => ({ ...d, value: map.get(d.key) ?? d.value })));
      })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load policy'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = async (key: string, value: string) => {
    const next = rows.map((r) => r.key === key ? { ...r, value } : r);
    setRows(next);
    setError('');
    try {
      await attendancePolicyApi.upsert(key, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Attendance Policy</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Configure working hours, grace period and attendance rules.</p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider ${saved ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-[var(--text-muted)] border-[var(--border)]'}`}>{saved ? 'Saved' : 'Auto-save'}</span>
      </div>
      <AdminSection title="Policy Rules" icon={Timer} subtitle="Stored in the attendance policy endpoint">
        {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-alt)]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3 font-bold">Rule</th>
                <th className="px-4 py-3 font-bold">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.key} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{r.name}</td>
                  <td className="px-4 py-3">
                    <input value={r.value} disabled={loading} onChange={(e) => update(r.key, e.target.value)} className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-48 focus:outline-none focus:border-indigo-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
      <AdminSection title="Geofence Coordinates" icon={MapPin} subtitle="Office location used for attendance geo-fencing">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Latitude</label>
            <input type="number" step="any" value={geoForm.lat} onChange={(e) => setGeoForm({ ...geoForm, lat: e.target.value })} placeholder="e.g. 12.9716" aria-label="Latitude" className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-48 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Longitude</label>
            <input type="number" step="any" value={geoForm.lng} onChange={(e) => setGeoForm({ ...geoForm, lng: e.target.value })} placeholder="e.g. 77.5946" aria-label="Longitude" className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-48 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Radius (meters)</label>
            <input type="number" min="1" value={geoForm.radius} onChange={(e) => setGeoForm({ ...geoForm, radius: e.target.value })} placeholder="200" aria-label="Radius" className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-48 focus:outline-none focus:border-indigo-500" />
          </div>
          <button onClick={() => saveGeofence.mutate()} disabled={!geoForm.lat.trim() || !geoForm.lng.trim() || isNaN(parseFloat(geoForm.lat)) || isNaN(parseFloat(geoForm.lng)) || saveGeofence.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            <Save size={14} /> {saveGeofence.isPending ? 'Saving…' : 'Save Geofence'}
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-4">
          {isGeofenceConfigured
            ? `Configured: Latitude ${configuredLat}, Longitude ${configuredLng}${configuredRadius ? `, Radius ${configuredRadius}m` : ''}`
            : 'Not configured yet'}
        </p>
      </AdminSection>
      <AdminSection title="Monthly Casual Leave Allocation" icon={Play} subtitle="Manually trigger the monthly casual leave allocation job for the current or past months">
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 space-y-2 text-sm">
          <p className="text-[var(--text-primary)] font-semibold">
            Current month: <span className="font-mono">
              {(allocationStatus?.currentMonth ?? '—') + '/' + (allocationStatus?.currentYear ?? '—')}
            </span>
          </p>
          <p className={allocationStatus?.currentMonthCredited ? 'text-emerald-500' : 'text-amber-500'}>
            {allocationStatus?.currentMonthCredited
              ? `Credited: ${allocationStatus.currentMonthAllocated} employee(s) have this month's casual leave`
              : 'Not credited yet for the current month — run the allocation below.'}
          </p>
          <p className="text-[var(--text-muted)]">
            Last allocation run: <span className="font-mono">{allocationStatus?.lastRun ? new Date(allocationStatus.lastRun).toLocaleString() : 'Never'}</span>
          </p>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          If the automatic cron job missed a month (e.g. server was down), use this to backfill casual leaves for eligible employees.
          The job runs automatically every few hours and is idempotent (never double-credits).
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Year</label>
            <input type="number" defaultValue={new Date().getFullYear()} id="alloc-year"
              className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-32 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Month</label>
            <input type="number" min={1} max={12} defaultValue={new Date().getMonth() + 1} id="alloc-month"
              className="px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm w-32 focus:outline-none focus:border-indigo-500" />
          </div>
          <button
            onClick={async () => {
              const y = (document.getElementById('alloc-year') as HTMLInputElement)?.value || String(new Date().getFullYear());
              const m = (document.getElementById('alloc-month') as HTMLInputElement)?.value || String(new Date().getMonth() + 1);
              try {
                const result = await leaveApi.runMonthlyAllocation(y, m);
                toastSuccess(`Allocation complete: ${result?.allocated ?? 0} record(s) created, ${result?.skipped ?? 0} already allocated`);
                refetchAllocationStatus();
              } catch (e: any) {
                toastError(e?.message || 'Allocation failed');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 text-xs font-bold uppercase tracking-wider"
          >
            <Play size={14} /> Run Allocation
          </button>
        </div>
      </AdminSection>
    </div>
  );
}

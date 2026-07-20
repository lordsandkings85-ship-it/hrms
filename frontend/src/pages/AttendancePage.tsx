import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fingerprint, Play, Square, MapPin, AlertTriangle, CheckCircle2,
  BarChart2, Clock, Settings2, RefreshCw,
} from 'lucide-react';
import { attendanceApi, attendanceApiExt, employeesApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

type TabKey = 'checkin' | 'summary' | 'geofence' | 'regularize';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const myEmpId = user?.employee?.id || '';

  const [tab, setTab] = useState<TabKey>('checkin');
  const [selectedEmp, setSelectedEmp] = useState(isAdmin ? '' : myEmpId);
  const [method, setMethod] = useState('web');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [withinFence, setWithinFence] = useState<boolean | null>(null);
  // Geofence form state
  const [gfLat, setGfLat] = useState('12.9716');
  const [gfLng, setGfLng] = useState('77.5946');
  const [gfRadius, setGfRadius] = useState('500');
  // Summary
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  // Regularize
  const [regLogId, setRegLogId] = useState('');
  const [regNote, setRegNote] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: todayLogs, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceApi.listToday(),
    refetchInterval: 30000,
  });

  const { data: geofence } = useQuery({
    queryKey: ['attendance-geofence'],
    queryFn: attendanceApiExt.getGeofence,
    enabled: tab === 'geofence',
  });

  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', selectedEmp, summaryYear, summaryMonth],
    queryFn: () => attendanceApiExt.getMonthlySummary(selectedEmp, summaryYear, summaryMonth),
    enabled: !!selectedEmp && tab === 'summary',
  });

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-today'] }),
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-today'] }),
  });

  const geofenceMutation = useMutation({
    mutationFn: attendanceApiExt.setGeofence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-geofence'] }),
  });

  const regularizeMutation = useMutation({
    mutationFn: ({ logId, note }: { logId: string; note: string }) =>
      attendanceApiExt.regularize(logId, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-today'] }),
  });

  const requestGPS = useCallback(() => {
    setGpsStatus('loading');
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsStatus('ok');
        // check against known geofence
        if (geofence?.geofenceLat) {
          const R = 6371000;
          const dLat = ((geofence.geofenceLat - latitude) * Math.PI) / 180;
          const dLon = ((geofence.geofenceLng - longitude) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos((latitude * Math.PI) / 180) * Math.cos((geofence.geofenceLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          setWithinFence(dist <= (geofence.geofenceRadius ?? 500));
        }
      },
      () => setGpsStatus('error'),
    );
  }, [geofence]);

  useEffect(() => {
    if (method === 'gps') requestGPS();
  }, [method, requestGPS]);

  const handleCheckIn = () => {
    if (!selectedEmp) return alert('Select an employee first');
    checkInMutation.mutate({
      employeeId: selectedEmp,
      method,
      lat: gpsCoords?.lat,
      lng: gpsCoords?.lng,
    });
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'checkin', label: 'Check-In / Log', icon: <Fingerprint size={16} /> },
    { key: 'summary', label: 'Monthly Summary', icon: <BarChart2 size={16} /> },
    ...(isAdmin ? [{ key: 'geofence' as TabKey, label: 'Geo-Fence', icon: <MapPin size={16} /> }] : []),
    { key: 'regularize', label: 'Regularize', icon: <RefreshCw size={16} /> },
  ];

  const filteredLogs = isAdmin 
    ? todayLogs 
    : todayLogs?.filter((log: any) => log.employeeId === myEmpId);

  const hasCheckedInToday = todayLogs?.some((log: any) => log.employeeId === selectedEmp);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-amber-100 text-amber-700',
      absent: 'bg-red-100 text-red-700',
      half_day: 'bg-blue-100 text-blue-700',
      on_leave: 'bg-purple-100 text-purple-700',
    };
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${map[status] || 'bg-line text-muted'}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Attendance Tracker</h1>
        <p className="text-sm text-muted mt-1">GPS/Geofence check-in, daily rosters, monthly analytics, and regularization.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-line gap-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-ledger text-ledger' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === Check-In Tab === */}
      {tab === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {!isAdmin && (
            <div className="bg-white border border-line rounded-lg p-6 h-fit space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
                <Fingerprint size={16} className="text-ledger" /> Telemetry Check-In
              </h2>
              <div>
                <label className="block text-xs text-muted mb-1">Employee</label>
                <div className="w-full px-3 py-2 rounded-md border border-line bg-gray-50 text-sm text-muted cursor-not-allowed">
                  {user?.employee?.firstName} {user?.employee?.lastName} ({user?.employee?.employeeCode})
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                >
                  <option value="web">Web Browser</option>
                  <option value="gps">GPS Location</option>
                  <option value="biometric">Biometric</option>
                  <option value="selfie">Face / Selfie</option>
                </select>
              </div>

              {/* GPS status indicator */}
              {method === 'gps' && (
                <div className={`p-3 rounded-md text-xs flex items-center gap-2 ${
                  gpsStatus === 'ok' ? 'bg-green-50 text-green-700' :
                  gpsStatus === 'error' ? 'bg-red-50 text-red-700' :
                  gpsStatus === 'loading' ? 'bg-blue-50 text-blue-700' :
                  'bg-paper text-muted'
                }`}>
                  <MapPin size={14} />
                  {gpsStatus === 'idle' && 'GPS not requested yet'}
                  {gpsStatus === 'loading' && 'Locating…'}
                  {gpsStatus === 'ok' && gpsCoords && (
                    <span>
                      GPS acquired: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}<br />
                      {withinFence === true && '✅ Within office zone'}
                      {withinFence === false && '⚠️ Outside geofence'}
                      {withinFence === null && '(Geofence not configured)'}
                    </span>
                  )}
                  {gpsStatus === 'error' && 'Could not get GPS. Allow location in browser.'}
                </div>
              )}

              {method === 'web' && (
                <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-md flex items-center gap-2">
                  <AlertTriangle size={13} /> Web method bypasses geofencing validation.
                </div>
              )}

              <button
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending || hasCheckedInToday}
                className="w-full flex items-center justify-center gap-2 bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark disabled:opacity-50 transition-colors"
              >
                {hasCheckedInToday ? (
                  <>
                    <CheckCircle2 size={16} /> Already Checked In Today
                  </>
                ) : (
                  <>
                    <Play size={16} /> Check In Now
                  </>
                )}
              </button>
            </div>
          )}

          <div className={`${isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white border border-line rounded-lg overflow-hidden`}>
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h3 className="text-sm font-semibold">{isAdmin ? "Today's Attendance Sheet" : "My Attendance Today"}</h3>
              <span className="text-xs text-muted">{filteredLogs?.length || 0} records</span>
            </div>
            {isLoading && <div className="p-6 text-sm text-muted">Loading today's logs…</div>}
            {!isLoading && (!filteredLogs || filteredLogs.length === 0) && (
              <div className="p-6 text-sm text-muted">No attendance records for today.</div>
            )}
            <div className="divide-y divide-line">
              {filteredLogs?.map((log: any) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-ledger/10 text-ledger font-bold text-sm flex items-center justify-center">
                      {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{log.employee?.firstName} {log.employee?.lastName}</div>
                      <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{log.employee?.employeeCode}</span>
                        <span>·</span>
                        <span className="capitalize">{log.method}</span>
                        {log.isWithinGeofence === true && <span className="text-green-600">✅ In-zone</span>}
                        {log.isWithinGeofence === false && <span className="text-amber-600">⚠️ Out-zone</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {statusBadge(log.status)}
                    <div className="text-right text-xs text-muted">
                      <div>In: {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</div>
                      <div>Out: {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}</div>
                    </div>
                    {!log.checkOut ? (
                      <button
                        onClick={() => checkOutMutation.mutate(log.id)}
                        disabled={checkOutMutation.isPending}
                        className="flex items-center gap-1.5 border border-rust text-rust hover:bg-rust/5 px-3 py-1 rounded text-xs"
                      >
                        <Square size={12} /> Out
                      </button>
                    ) : (
                      <span className="text-xs text-ledger bg-ledger/10 px-2 py-0.5 rounded font-medium">Done</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === Monthly Summary Tab === */}
      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-lg p-5 flex items-end gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Employee</label>
              {isAdmin ? (
                <select
                  value={selectedEmp}
                  onChange={e => setSelectedEmp(e.target.value)}
                  className="border border-line rounded px-3 py-2 text-sm"
                >
                  <option value="">-- Select Employee --</option>
                  {employees?.items.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              ) : (
                <div className="border border-line rounded px-3 py-2 text-sm bg-gray-50 text-muted cursor-not-allowed">
                  {user?.employee?.firstName} {user?.employee?.lastName}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Month</label>
              <select value={summaryMonth} onChange={e => setSummaryMonth(Number(e.target.value))} className="border border-line rounded px-3 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Year</label>
              <select value={summaryYear} onChange={e => setSummaryYear(Number(e.target.value))} className="border border-line rounded px-3 py-2 text-sm">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Present', value: summary.present, color: 'bg-green-500' },
                  { label: 'Late', value: summary.late, color: 'bg-amber-500' },
                  { label: 'Absent', value: summary.absent, color: 'bg-red-500' },
                  { label: 'Half Day', value: summary.halfDay, color: 'bg-blue-500' },
                  { label: 'On Leave', value: summary.onLeave, color: 'bg-purple-500' },
                ].map(c => (
                  <div key={c.label} className="bg-white border border-line rounded-lg p-4 text-center">
                    <div className={`w-2 h-2 rounded-full ${c.color} mx-auto mb-2`} />
                    <div className="font-display text-2xl font-bold">{c.value}</div>
                    <div className="text-xs text-muted">{c.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-line rounded-lg p-4 text-sm text-muted">
                Overtime this month: <span className="font-mono font-semibold text-ink">{Math.floor(summary.totalOvertimeMins / 60)}h {summary.totalOvertimeMins % 60}m</span>
              </div>
            </>
          )}
          {selectedEmp && !summary && <div className="text-sm text-muted">No data for selected period.</div>}
        </div>
      )}

      {/* === Geofence Tab === */}
      {tab === 'geofence' && (
        <div className="max-w-lg">
          <div className="bg-white border border-line rounded-lg p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <Settings2 size={16} /> Office Geofence Configuration
            </h2>
            {geofence?.geofenceLat && (
              <div className="p-3 bg-ledger/5 rounded-md text-xs text-ledger">
                Current: {geofence.geofenceLat}, {geofence.geofenceLng} · Radius: {geofence.geofenceRadius}m
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Office Latitude</label>
                <input type="number" step="0.0001" value={gfLat} onChange={e => setGfLat(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Office Longitude</label>
                <input type="number" step="0.0001" value={gfLng} onChange={e => setGfLng(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Radius (metres)</label>
              <input type="number" value={gfRadius} onChange={e => setGfRadius(e.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm" />
            </div>
            <button
              onClick={() => geofenceMutation.mutate({ lat: Number(gfLat), lng: Number(gfLng), radius: Number(gfRadius) })}
              disabled={geofenceMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark disabled:opacity-50"
            >
              <CheckCircle2 className="inline mr-2" size={16} />
              {geofenceMutation.isPending ? 'Saving…' : 'Save Geofence'}
            </button>
            <div className="text-xs text-muted">
              Tip: Employees checking in via GPS will be validated against this boundary. Web check-ins bypass geofencing.
            </div>
          </div>
        </div>
      )}

      {/* === Regularize Tab === */}
      {tab === 'regularize' && (
        <div className="max-w-lg">
          <div className="bg-white border border-line rounded-lg p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              <RefreshCw size={16} /> Attendance Regularization
            </h2>
            <p className="text-xs text-muted">Paste the Attendance Log ID (from today's sheet) and provide a reason to raise a correction request.</p>
            <div>
              <label className="block text-xs text-muted mb-1">Attendance Log ID</label>
              <input
                type="text"
                value={regLogId}
                onChange={e => setRegLogId(e.target.value)}
                placeholder="UUID of the log entry"
                className="w-full border border-line rounded px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Reason / Note</label>
              <textarea
                rows={3}
                value={regNote}
                onChange={e => setRegNote(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm resize-none"
                placeholder="Was marked absent/late due to…"
              />
            </div>
            <button
              onClick={() => {
                if (!regLogId || !regNote) return alert('Fill Log ID and reason');
                regularizeMutation.mutate({ logId: regLogId, note: regNote });
                if (!regularizeMutation.isError) { setRegLogId(''); setRegNote(''); }
              }}
              disabled={regularizeMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark disabled:opacity-50"
            >
              {regularizeMutation.isPending ? 'Submitting…' : 'Submit Regularization Request'}
            </button>
            {regularizeMutation.isSuccess && (
              <div className="text-xs text-ledger bg-ledger/10 p-2 rounded text-center">Request submitted. Pending manager approval.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

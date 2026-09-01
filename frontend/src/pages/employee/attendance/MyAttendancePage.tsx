import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Fingerprint, Play, Square, RefreshCw, Send, MapPin, Navigation, AlertTriangle
} from 'lucide-react';
import { attendanceApi, attendanceApiExt } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../components/ui/ToastProvider';
import { getServerDate, getServerYear, getServerMonth, getServerISO } from '../../../utils/serverTime';
import { useShiftRemaining, fmtShiftHM } from '../../../hooks/useShiftRemaining';
import { fmtDateShort, fmtTime12, fmt24To12 } from '../../../utils/formatDate';

type TabKey = 'checkin' | 'regularize';

const SUB_TO_TAB: Record<string, TabKey> = {
  daily: 'checkin',
  regularization: 'regularize'
};

const TAB_TO_SUB: Record<TabKey, string> = {
  checkin: 'daily',
  regularize: 'regularization'
};

export default function MyAttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const myEmpId = user?.employee?.id || '';
  const initialTab = sub ? SUB_TO_TAB[sub] || 'checkin' : 'checkin';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [currentYear] = useState(() => getServerYear());
  const [currentMonth] = useState(() => getServerMonth());

  // Regularization state
  const [selectedLogId, setSelectedLogId] = useState('');
  const [regularizeReason, setRegularizeReason] = useState('');
  const [regularizeType, setRegularizeType] = useState<'full_day' | 'regularization'>('full_day');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');

  // GPS Geolocation state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return; }
    setGpsLoading(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      (err) => { setGpsError(err.message || 'Location access denied'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => { fetchGPS(); }, [fetchGPS]);

  const { data: geofenceConfig } = useQuery({
    queryKey: ['geofence-config'],
    queryFn: () => attendanceApiExt.getGeofence(),
  });

  const geofenceRadius = geofenceConfig?.geofenceRadius ?? 500;
  const isGeofenceConfigured = !!(geofenceConfig?.geofenceLat && geofenceConfig?.geofenceLng);

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const geoDistance = gpsCoords && isGeofenceConfigured
    ? calcDistance(gpsCoords.lat, gpsCoords.lng, geofenceConfig.geofenceLat, geofenceConfig.geofenceLng)
    : null;
  const isWithinGeofence = geoDistance !== null ? geoDistance <= geofenceRadius : null;

  useEffect(() => {
    if (sub && SUB_TO_TAB[sub]) {
      setTab(SUB_TO_TAB[sub]);
    }
  }, [sub]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/attendance/${TAB_TO_SUB[t]}`);
  };

  // Queries
  const { data: todayLogs } = useQuery({
    queryKey: ['attendance-today', myEmpId],
    queryFn: async () => {
      const localISODate = getServerDate();
      return await attendanceApi.list(myEmpId, localISODate, localISODate) || [];
    },
    enabled: !!myEmpId
  });

  const { data: historyLogs, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['attendance-history', myEmpId],
    queryFn: async () => {
      const formatLocal = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const firstDay = formatLocal(new Date(currentYear, currentMonth - 1, 1));
      const lastDay = formatLocal(new Date(currentYear, currentMonth, 0));
      return await attendanceApi.list(myEmpId, firstDay, lastDay) || [];
    },
    enabled: !!myEmpId,
    refetchInterval: 30_000
  });

  const { data: todayStatus } = useQuery({
    queryKey: ['attendance-today-status', myEmpId],
    queryFn: () => attendanceApi.todayStatus(myEmpId),
    enabled: !!myEmpId,
    refetchInterval: 60_000
  });

  const liveRemaining = useShiftRemaining(todayStatus) ?? todayStatus?.remainingMinutes ?? null;



  // Check check-in status
  const activeLog = todayLogs?.find((log: any) => !log.checkOut);
  const isCheckedIn = !!activeLog;

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn({ 
      employeeId: myEmpId, 
      method: 'WEB',
      ...(gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : {})
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today-status', myEmpId] });
      toastSuccess('Successfully Checked In');
    },
    onError: (err: any) => toastError(err.message || 'Failed to check in'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (logId: string) => attendanceApi.checkOut(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today-status', myEmpId] });
      toastSuccess('Successfully Checked Out');
    },
    onError: (err: any) => toastError(err.message || 'Failed to check out'),
  });

  const regularizeMutation = useMutation({
    mutationFn: ({ logId, reason }: { logId: string; reason: string }) => {
      if (regularizeType === 'full_day') {
        return attendanceApi.regularize(logId, {
          employeeId: myEmpId,
          reason,
          type: 'full_day'
        });
      }
      const logDate = historyLogs?.find((l: any) => l.id === logId)?.date || getServerISO();
      const dateStr = new Date(logDate).toISOString().split('T')[0];
      return attendanceApi.regularize(logId, { 
        employeeId: myEmpId, 
        requestedCheckIn: checkInTime ? `${dateStr}T${checkInTime}:00+05:30` : null, 
        requestedCheckOut: checkOutTime ? `${dateStr}T${checkOutTime}:00+05:30` : null, 
        reason 
      });
    },
    onSuccess: () => {
      toastSuccess('Regularization request submitted successfully!');
      setSelectedLogId('');
      setRegularizeReason('');
      queryClient.invalidateQueries({ queryKey: ['attendance-history', myEmpId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today-status', myEmpId] });
      handleTabChange('checkin');
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit regularization'),
  });

  const handleRegularizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogId || !regularizeReason) {
      toastError('Please fill in all fields');
      return;
    }
    regularizeMutation.mutate({ logId: selectedLogId, reason: regularizeReason });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Attendance & Check-in" 
        subtitle="Manage daily shifts, request attendance regularization, and track hours."
        icon={Fingerprint}
      />

      {/* Stats Summary Cards Removed - Now in dedicated View Attendance Page */}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-alt)] rounded-xl w-fit flex-wrap">
        {([
          ['checkin', 'Daily Check-in', Play],
          ['regularize', 'Regularization', RefreshCw]
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Check-in panel */}
        {tab === 'checkin' && (
          <div className="max-w-md mx-auto w-full space-y-4">
            {/* Live GPS Geofence Status Widget */}
            <div className={`rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
              gpsLoading ? 'border-[var(--border)] bg-[var(--surface-alt)]' :
              gpsError ? 'border-red-500/30 bg-red-500/5' :
              isWithinGeofence === true ? 'border-emerald-500/30 bg-emerald-500/5' :
              isWithinGeofence === false ? 'border-amber-500/30 bg-amber-500/5' :
              'border-[var(--border)] bg-[var(--surface-alt)]'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                gpsLoading ? 'bg-[var(--surface)] text-[var(--text-muted)]' :
                gpsError ? 'bg-red-500/10 text-red-400' :
                isWithinGeofence === true ? 'bg-emerald-500/10 text-emerald-500' :
                isWithinGeofence === false ? 'bg-amber-500/10 text-amber-500' :
                'bg-[var(--surface)] text-[var(--text-muted)]'
              }`}>
                {gpsLoading ? <Navigation size={18} className="animate-pulse" /> : <MapPin size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                {gpsLoading && <p className="text-sm font-semibold text-[var(--text-muted)]">Detecting location...</p>}
                {gpsError && <>
                  <p className="text-sm font-bold text-red-400">Location Unavailable</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{gpsError}</p>
                </>}
                {!gpsLoading && !gpsError && isWithinGeofence === true && <>
                  <p className="text-sm font-bold text-emerald-500">Inside Geofence ✓</p>
                  <p className="text-xs text-[var(--text-muted)]">{Math.round(geoDistance!)}m from office ({geofenceRadius}m radius)</p>
                </>}
                {!gpsLoading && !gpsError && isWithinGeofence === false && <>
                  <p className="text-sm font-bold text-amber-500">Outside Geofence ⚠</p>
                  <p className="text-xs text-[var(--text-muted)]">{Math.round(geoDistance!)}m from office (max {geofenceRadius}m) — punch will be flagged</p>
                </>}
                {!gpsLoading && !gpsError && !isGeofenceConfigured && <>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Geofence not configured</p>
                  <p className="text-xs text-[var(--text-muted)]">Contact HR admin to set up office location</p>
                </>}
              </div>
              <button onClick={fetchGPS} className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Refresh location">
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Punch Card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-6">
              {todayStatus && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {todayStatus.shiftName ?? 'No shift assigned'}
                    </p>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                      {todayStatus.shiftStartTime && todayStatus.shiftEndTime
                        ? `${fmt24To12(todayStatus.shiftStartTime)} – ${fmt24To12(todayStatus.shiftEndTime)}`
                        : '—'}
                    </span>
                  </div>
                  {todayStatus.todayIsSecondSaturday && (
                    <p className="text-[11px] font-semibold text-emerald-500">Weekly Off · 2nd Saturday — working optional (earns Comp Off)</p>
                  )}
                  {isCheckedIn && liveRemaining != null && (
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                      {liveRemaining > 0
                        ? `Remaining: ${fmtShiftHM(liveRemaining)} of ${todayStatus.requiredMinutes != null ? fmtShiftHM(todayStatus.requiredMinutes) : 'shift'}`
                        : 'Shift duration complete'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {todayStatus.lateStatus === 'LATE' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                        Late by {fmtShiftHM(todayStatus.lateMinutes ?? 0)}
                      </span>
                    )}
                    {todayStatus.attendanceStatus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)]">
                        {String(todayStatus.attendanceStatus).replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {todayStatus.attendanceStatus === 'OFF_DAY_OR_INCOMPLETE' && todayStatus.checkOut && (
                    <button
                      onClick={() => handleTabChange('regularize')}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                    >
                      <AlertTriangle size={12} /> Shift marked incomplete — raise correction
                    </button>
                  )}
                </div>
              )}

              <div className="relative w-28 h-28 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
                <Fingerprint size={48} className={isCheckedIn ? 'text-green-400' : 'text-indigo-400'} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{isCheckedIn ? 'You are Checked In' : 'Ready to Start Work?'}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {isCheckedIn
                    ? `Shift started at ${activeLog?.checkIn ? fmtTime12(activeLog.checkIn) : '—'}`
                    : 'Check in to record your shift timings for today.'}
                </p>
              </div>
              <div>
                {isCheckedIn ? (
                  <button
                    onClick={() => checkOutMutation.mutate(activeLog.id)}
                    disabled={checkOutMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/20"
                  >
                    <Square size={16} /> Check Out Now
                  </button>
                ) : (
                  <button
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Play size={16} /> Check In Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}




        {/* Regularize */}
        {tab === 'regularize' && (
          <div className="max-w-xl mx-auto w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
              <RefreshCw size={16} className="text-indigo-500" /> Attendance Regularization
            </h3>
            <form onSubmit={handleRegularizeSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Correction Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setRegularizeType('full_day')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      regularizeType === 'full_day'
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400'
                        : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)]'
                    }`}
                  >
                    Full-day Correction
                    <span className="block text-[9px] font-medium mt-0.5 opacity-70">I worked the full day</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegularizeType('regularization')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      regularizeType === 'regularization'
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400'
                        : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)]'
                    }`}
                  >
                    Time Change
                    <span className="block text-[9px] font-medium mt-0.5 opacity-70">Fix check-in / check-out times</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Select Date to Regularize</label>
                <select
                  value={selectedLogId}
                  onChange={(e) => setSelectedLogId(e.target.value)}
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none"
                  required
                >
                  <option value="">Choose log entry...</option>
                  {historyLogs?.map((log: any) => (
                    <option key={log.id} value={log.id}>
                      {fmtDateShort(log.date)}
                      {log.attendanceStatus === 'OFF_DAY_OR_INCOMPLETE' ? ' (Incomplete)' : ''}
                      {' '}(In: {log.checkIn ? fmtTime12(log.checkIn) : 'Missed'})
                    </option>
                  ))}
                </select>
              </div>

              {regularizeType === 'regularization' && (
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Actual Check-In Time</label>
                  <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-blue-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Actual Check-Out Time</label>
                  <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>
              )}

              {regularizeType === 'full_day' && (
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                  Your original check-in/out punches will be preserved. HR will review and mark the day as full-day present.
                </p>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Reason for Regularization</label>
                <textarea
                  rows={4}
                  value={regularizeReason}
                  onChange={(e) => setRegularizeReason(e.target.value)}
                  placeholder="Explain why the regularization is required (e.g. client meeting, network issue, forgot check-in)..."
                  className="w-full bg-[var(--surface-alt)] text-sm text-[var(--text-primary)] px-3 py-2 mt-1 rounded-lg border border-[var(--border)] focus:outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={regularizeMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                <Send size={15} /> Submit Request
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, Crosshair, Search } from 'lucide-react';
import { attendanceApi, attendanceApiExt } from '../../../api/client';
import { fmtTime12 } from '../../../utils/formatDate';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../../components/ui/ToastProvider';
import { DataTable, Column } from '../../../components/ui/DataTable';

function useIsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.name?.toLowerCase() || '';
  return !!user?.isSuperAdmin || !!user?.role?.isSystem || ['admin','hr','human resource','manager'].some(r => role.includes(r));
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AdminGeofence() {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => { const r = await attendanceApi.listToday(); return Array.isArray(r) ? r : []; },
    refetchInterval: 30000,
  });

  const filteredLogs = (logs || []).filter((log: any) => {
    const name = ((log.employee?.firstName || '') + ' ' + (log.employee?.lastName || '')).toLowerCase();
    const matchName = name.includes(searchTerm.toLowerCase());
    let matchZone = true;
    if (zoneFilter === 'in-zone') matchZone = log.isWithinGeofence === true;
    else if (zoneFilter === 'out-zone') matchZone = log.isWithinGeofence === false;
    else if (zoneFilter === 'no-location') matchZone = log.latitude == null;
    return matchName && matchZone;
  });

  const openLocation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  };

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (log: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-xs flex items-center justify-center shrink-0">
          {log.employee?.firstName?.[0] || 'E'}{log.employee?.lastName?.[0] || ''}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text-primary)] truncate">{log.employee?.firstName} {log.employee?.lastName}</div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider font-mono">{log.employee?.employeeCode}</div>
        </div>
      </div>
    )},
    { key: 'method', header: 'Method', render: (log: any) => (
      <div className="text-xs">
        <span className="capitalize block font-semibold text-[var(--text-primary)]">{log.method}</span>
        {log.isWithinGeofence === true && <span className="text-emerald-500 block mt-0.5 font-bold">In-zone</span>}
        {log.isWithinGeofence === false && <span className="text-amber-500 block mt-0.5 font-bold">Out-zone</span>}
      </div>
    )},
    { key: 'status', header: 'Status', render: (log: any) => {
      const map: Record<string, string> = {
        present: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        late: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        absent: 'bg-red-500/10 text-red-500 border-red-500/20',
      };
      return <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${map[log.status] || ''}`}>{log.status?.replace('_', ' ')}</span>;
    }},
    { key: 'time', header: 'Check In/Out', render: (log: any) => (
      <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
        <div><span className="text-[var(--text-primary)]">In:</span> {log.checkIn ? fmtTime12(log.checkIn) : '--'}</div>
        <div><span className="text-[var(--text-primary)]">Out:</span> {log.checkOut ? fmtTime12(log.checkOut) : 'Pending'}</div>
      </div>
    )},
    { key: 'actions', header: 'Location', render: (row: any) => (
      row.latitude != null ? (
        <button onClick={() => openLocation(row.latitude, row.longitude)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-[10px] rounded-lg font-bold uppercase tracking-wider transition-all">
          <MapPin size={12} /> View Map
        </button>
      ) : <span className="text-[var(--text-muted)] text-xs font-semibold">No GPS</span>
    )},
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
            <MapPin size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Geo Attendance</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Review employee geo-fenced attendance and locations.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Geo Attendance Records</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors w-64" />
            </div>
            <div className="relative">
              <button onClick={() => setFilterOpen(o => !o)} className="p-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-colors bg-[var(--surface-alt)]">
                <Navigation size={16} />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-1">
                    {['all', 'in-zone', 'out-zone', 'no-location'].map(opt => (
                      <button key={opt} onClick={() => { setZoneFilter(opt); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold capitalize transition-colors ${zoneFilter === opt ? 'text-emerald-500 bg-emerald-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}>
                        {opt === 'all' ? 'All' : opt === 'in-zone' ? 'In-zone' : opt === 'out-zone' ? 'Out-zone' : 'No location'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <DataTable columns={columns} data={filteredLogs} loading={isLoading} keyField="id" showToolbar={false} selectable={false} />
      </div>
    </div>
  );
}

function EmployeeGeofence() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const myEmpId = user?.employee?.id || '';
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geofenceConfig, setGeofenceConfig] = useState<any>(null);

  const fetchGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return; }
    setGpsLoading(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      (err) => { setGpsError(err.message || 'Location access denied'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    attendanceApiExt.getGeofence().then((cfg: any) => { if (cfg && typeof cfg === 'object') setGeofenceConfig(cfg); }).catch(() => setGeofenceConfig(null));
  }, []);
  useEffect(() => { fetchGPS(); }, [fetchGPS]);

  const geofenceRadius = geofenceConfig?.geofenceRadius ?? 500;
  const isGeofenceConfigured = !!(geofenceConfig?.geofenceLat && geofenceConfig?.geofenceLng);
  const distance = gpsCoords && isGeofenceConfigured ? calcDistance(gpsCoords.lat, gpsCoords.lng, geofenceConfig.geofenceLat, geofenceConfig.geofenceLng) : null;
  const isWithin = distance !== null ? distance <= geofenceRadius : null;

  const punchInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn({ employeeId: myEmpId, method: 'location', lat: gpsCoords?.lat, lng: gpsCoords?.lng }),
    onSuccess: () => { toastSuccess('Punched in from current location.'); queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); },
    onError: (err: any) => toastError(err.message || 'Punch-in failed'),
  });

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
            <MapPin size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Geofence Attendance</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">View your authorized remote punching locations.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
             <Navigation className="text-emerald-500" size={20} /> Current Location Tracking
           </h3>
           <div className="bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border)] mb-4">
             <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Latitude / Longitude</div>
             <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
               {gpsCoords ? `${gpsCoords.lat.toFixed(6)} N, ${gpsCoords.lng.toFixed(6)} E` : (gpsError ? 'Unavailable' : 'Acquiring...')}
             </div>
             {isGeofenceConfigured && distance !== null && (
               <div className="text-xs font-bold mt-2">
                 <span className={isWithin ? 'text-emerald-500' : 'text-rose-500'}>
                   {Math.round(distance)}m from office ({geofenceRadius}m radius) -- {isWithin ? 'within geofence' : 'outside geofence'}
                 </span>
               </div>
             )}
           </div>
           <div className="flex gap-2">
             <button onClick={fetchGPS} disabled={gpsLoading} className="flex-1 py-3 border border-[var(--border)] bg-[var(--surface-alt)] rounded-xl text-sm font-bold hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
               <Crosshair size={18} className={gpsLoading ? 'animate-spin' : ''} /> {gpsLoading ? 'Locating...' : 'Refresh Location'}
             </button>
             <button onClick={() => punchInMutation.mutate()} disabled={!gpsCoords || punchInMutation.isPending}
               className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
               <MapPin size={18} /> {punchInMutation.isPending ? 'Punching in...' : 'Punch In From Current Location'}
             </button>
           </div>
           <p className="text-xs text-center text-[var(--text-muted)] mt-4">Browser location services must be enabled.</p>
         </div>

         <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Authorized Zones</h3>
           {isGeofenceConfigured ? (
             <div className="space-y-3">
               <div className="p-4 border border-[var(--border)] rounded-xl flex justify-between items-center bg-emerald-500/5">
                 <div>
                   <div className="font-bold text-[var(--text-primary)] text-sm">Office Location</div>
                   <div className="text-xs text-[var(--text-muted)] mt-1">
                     Radius: {geofenceRadius}m -- {geofenceConfig.geofenceLat.toFixed(4)}, {geofenceConfig.geofenceLng.toFixed(4)}
                   </div>
                 </div>
                 <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase">Active</span>
               </div>
             </div>
           ) : (
             <div className="p-6 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
               No geofence zone is configured for your company yet.
             </div>
           )}
         </div>
      </div>
    </div>
  );
}

export default function GeofencePage() {
  return useIsAdmin() ? <AdminGeofence /> : <EmployeeGeofence />;
}

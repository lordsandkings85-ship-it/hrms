import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Navigation, Crosshair } from 'lucide-react';
import { attendanceApi, attendanceApiExt } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../../components/ui/ToastProvider';

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GeofencePage() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const myEmpId = user?.employee?.id || '';

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geofenceConfig, setGeofenceConfig] = useState<any>(null);

  const fetchGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported by your browser'); return; }
    setGpsLoading(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      (err) => { setGpsError(err.message || 'Location access denied'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    attendanceApiExt.getGeofence().then((cfg: any) => {
      if (cfg && typeof cfg === 'object') setGeofenceConfig(cfg);
    }).catch(() => setGeofenceConfig(null));
  }, []);

  useEffect(() => { fetchGPS(); }, [fetchGPS]);

  const geofenceRadius = geofenceConfig?.geofenceRadius ?? 500;
  const isGeofenceConfigured = !!(geofenceConfig?.geofenceLat && geofenceConfig?.geofenceLng);
  const distance = gpsCoords && isGeofenceConfigured
    ? calcDistance(gpsCoords.lat, gpsCoords.lng, geofenceConfig.geofenceLat, geofenceConfig.geofenceLng)
    : null;
  const isWithin = distance !== null ? distance <= geofenceRadius : null;

  const punchInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn({
      employeeId: myEmpId,
      method: 'location',
      lat: gpsCoords?.lat,
      lng: gpsCoords?.lng,
    }),
    onSuccess: () => {
      toastSuccess('Punched in from current location.');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
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
               {gpsCoords ? `${gpsCoords.lat.toFixed(6)}° N, ${gpsCoords.lng.toFixed(6)}° E` : (gpsError ? 'Unavailable' : 'Acquiring...')}
             </div>
             {isGeofenceConfigured && distance !== null && (
               <div className="text-xs font-bold mt-2">
                 <span className={isWithin ? 'text-emerald-500' : 'text-rose-500'}>
                   {Math.round(distance)}m from office ({geofenceRadius}m radius) — {isWithin ? 'within geofence' : 'outside geofence'}
                 </span>
               </div>
             )}
           </div>
           <div className="flex gap-2">
             <button onClick={fetchGPS} disabled={gpsLoading} className="flex-1 py-3 border border-[var(--border)] bg-[var(--surface-alt)] rounded-xl text-sm font-bold hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
               <Crosshair size={18} className={gpsLoading ? 'animate-spin' : ''} /> {gpsLoading ? 'Locating...' : 'Refresh Location'}
             </button>
             <button
               onClick={() => punchInMutation.mutate()}
               disabled={!gpsCoords || punchInMutation.isPending}
               className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
             >
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
                     Radius: {geofenceRadius}m &nbsp;·&nbsp; {geofenceConfig.geofenceLat.toFixed(4)}, {geofenceConfig.geofenceLng.toFixed(4)}
                   </div>
                 </div>
                 <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase">Active</span>
               </div>
             </div>
           ) : (
             <div className="p-6 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
               No geofence zone is configured for your company yet. Geofence attendance will be enforced once your administrator sets a location and radius.
             </div>
           )}
         </div>
      </div>
    </div>
  );
}

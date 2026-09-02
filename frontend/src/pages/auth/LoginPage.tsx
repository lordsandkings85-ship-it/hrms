import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2, Fingerprint, BarChart3, ShieldCheck, Mail, Lock } from 'lucide-react';
import { authApi } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { Spinner } from '../../components/ui/Spinner';
import workoraIcon from '../../assets/brand/workora-icon.png';
import { version as APP_VERSION } from '../../../package.json';

const VERSION = `v${APP_VERSION}`;

const FEATURES = [
  { icon: Fingerprint, text: 'Geofenced GPS attendance', desc: 'Pinpoint accuracy for distributed teams' },
  { icon: BarChart3,   text: 'Automated payroll & tax', desc: 'Zero manual calculations needed' },
  { icon: ShieldCheck, text: 'Role-based access control', desc: 'Enterprise-grade security controls' },
  { icon: CheckCircle2,text: 'Exit management & FnF', desc: 'Smooth offboarding experiences' },
];

export default function LoginPage() {
  useEffect(() => { useAuthStore.getState().logout(); }, []);

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authApi.login({ email: form.email, password: form.password });
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex bg-surface overflow-hidden">
      {/* ── Left Brand Panel ──────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden bg-[#070e07]">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#4f772d]/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-teal-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-[#4f772d]/20 blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        </div>

        <div className="relative z-10 p-10 xl:p-12">
          <div className="flex items-center gap-4 animate-slideDown">
            <img src={workoraIcon} alt="Workora HRMS" className="w-14 h-14 rounded-2xl object-cover shadow-xl shadow-black/50 ring-1 ring-white/20" />
            <div>
              <div className="font-display text-3xl font-bold text-white tracking-tight">Workora <span className="text-[#52b788] text-xl font-medium">HRMS</span></div>
              <div className="text-[10px] font-semibold text-[#52b788] uppercase tracking-widest mt-0.5">Smart People. Stronger Organizations.</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-10 xl:px-12 pb-10 flex-1 flex flex-col justify-center">
          <div className="animate-slideUp" style={{ animationDelay: '100ms' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-300 mb-6 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52b788] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2d6a4f]"></span>
              </span>
              {VERSION} Now Available
            </div>
            <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Elevate your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400">
                workforce experience
              </span>
            </h2>
            <p className="text-white/60 mt-5 text-lg leading-relaxed max-w-lg font-light">
              The intelligent OS for modern enterprises. Manage payroll, leaves, attendance, and compliance beautifully.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10 animate-slideUp" style={{ animationDelay: '200ms' }}>
            {FEATURES.map(({ icon: Icon, text, desc }) => (
              <div key={text} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#2d6a4f]/30 transition-all duration-300">
                  <Icon size={16} className="text-[#52b788]" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-0.5">{text}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-10 xl:p-12 pt-0 flex items-center justify-between animate-slideUp" style={{ animationDelay: '300ms' }}>
          <p className="text-sm font-medium text-white/30">Trusted by 500+ growing companies</p>
          <div className="flex gap-4 opacity-40 grayscale">
            <div className="h-6 w-20 bg-white/20 rounded-md"></div>
            <div className="h-6 w-20 bg-white/20 rounded-md"></div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ──────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-y-auto p-6 sm:p-8 lg:p-12 bg-surface relative">
        {/* Mobile Logo */}
        <div className="lg:hidden flex-shrink-0 flex items-center gap-3 mb-8">
          <img src={workoraIcon} alt="Workora" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
          <span className="font-display font-bold text-xl text-ink tracking-tight">Workora HRMS</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2">Welcome back</h1>
            <p className="text-muted text-sm sm:text-base">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-ink">Email</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full bg-white border border-border rounded-xl py-3 pl-11 pr-4 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-action-primary focus:ring-4 focus:ring-action-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-ink">Password</label>
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#132a13] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#0b170b] hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Spinner size="sm" className="border-t-white mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-widest text-muted/50">
          Workora HRMS · {VERSION}
        </p>
      </div>
    </div>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="w-full bg-white border border-border rounded-xl py-3 pl-11 pr-11 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-action-primary focus:ring-4 focus:ring-action-primary/10 transition-all"
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

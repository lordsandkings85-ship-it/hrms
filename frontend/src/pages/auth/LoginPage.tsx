import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2, Fingerprint, BarChart3, ShieldCheck, Mail, Lock, Building, User } from 'lucide-react';
import { authApi } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { Spinner } from '../../components/ui/Spinner';
import workoraIcon from '../../assets/brand/workora-icon.png';

const FEATURES = [
  { icon: Fingerprint, text: 'Geofenced GPS attendance tracking', desc: 'Pinpoint accuracy for distributed teams' },
  { icon: BarChart3,   text: 'Automated payroll & tax compliance', desc: 'Zero manual calculations needed' },
  { icon: ShieldCheck, text: 'Role-based access & audit logs', desc: 'Enterprise-grade security controls' },
  { icon: CheckCircle2,text: 'Exit management & FnF automation', desc: 'Smooth offboarding experiences' },
];

export default function LoginPage() {
  useEffect(() => { useAuthStore.getState().logout(); }, []);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ companyName: '', fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register(form);
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
    <div className="min-h-screen flex bg-surface">
      {/* ── Left Brand Panel (Premium Dark Mode) ──────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden bg-[#070e07]">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#4f772d]/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-teal-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-[#4f772d]/20 blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        </div>

        {/* Header / Logo */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-4 animate-slideDown">
            <img
              src={workoraIcon}
              alt="Workora HRMS Logo"
              className="w-14 h-14 rounded-2xl object-cover shadow-xl shadow-black/50 ring-1 ring-white/20"
            />
            <div>
              <div className="font-display text-3xl font-bold text-white tracking-tight">Workora <span className="text-[#52b788] text-xl font-medium">HRMS</span></div>
              <div className="text-[10px] font-semibold text-[#52b788] uppercase tracking-widest mt-0.5">Smart People. Stronger Organizations.</div>
            </div>
          </div>
        </div>

        {/* Main Value Proposition */}
        <div className="relative z-10 px-12 pb-12 flex-1 flex flex-col justify-center">
          <div className="animate-slideUp" style={{ animationDelay: '100ms' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-300 mb-6 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52b788] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2d6a4f]"></span>
              </span>
              v2.0 Now Available
            </div>
            <h2 className="font-display text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Elevate your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400">
                workforce experience
              </span>
            </h2>
            <p className="text-white/60 mt-6 text-lg leading-relaxed max-w-lg font-light">
              The intelligent OS for modern enterprises. Manage payroll, leaves, attendance, and compliance beautifully.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 mt-12 animate-slideUp" style={{ animationDelay: '200ms' }}>
            {FEATURES.map(({ icon: Icon, text, desc }, idx) => (
              <div key={text} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#2d6a4f]/30 transition-all duration-300">
                  <Icon size={18} className="text-[#52b788]" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">{text}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-12 pt-0 flex items-center justify-between animate-slideUp" style={{ animationDelay: '300ms' }}>
          <p className="text-sm font-medium text-white/30">
            Trusted by 500+ growing companies
          </p>
          <div className="flex gap-4 opacity-40 grayscale">
            <div className="h-6 w-20 bg-white/20 rounded-md"></div>
            <div className="h-6 w-20 bg-white/20 rounded-md"></div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-surface relative z-20">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
          <img src={workoraIcon} alt="Workora" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
          <span className="font-display font-bold text-xl text-ink tracking-tight">Workora HRMS</span>
        </div>

        <div className="w-full max-w-[420px] animate-scaleIn">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create workspace'}
            </h1>
            <p className="text-muted text-base">
              {mode === 'login'
                ? 'Enter your credentials to access your account'
                : 'Start managing your team in minutes'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="space-y-5 animate-slideDown">
                <Field
                  label="Company Name"
                  icon={Building}
                  value={form.companyName}
                  onChange={(v) => setForm({ ...form, companyName: v })}
                  placeholder="Acme Corp Pvt. Ltd."
                />
                <Field
                  label="Full Name"
                  icon={User}
                  value={form.fullName}
                  onChange={(v) => setForm({ ...form, fullName: v })}
                  placeholder="Rahul Sharma"
                />
              </div>
            )}
            
            <Field
              label="Work Email"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="you@company.com"
            />
            
            <div className="space-y-1">
              <Field
                label="Password"
                icon={Lock}
                type="password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                placeholder="••••••••"
              />
              {mode === 'login' && (
                <div className="flex justify-end pt-1">
                  <a href="#" className="text-sm font-medium text-[#132a13] hover:text-[#0b170b] transition-colors">
                    Forgot password?
                  </a>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl animate-slideInLeft">
                <div className="text-red-500 mt-0.5"><ShieldCheck size={16} /></div>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r bg-[#132a13] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgba(19,42,19,0.39)] hover:shadow-[0_6px_20px_rgba(19,42,19,0.23)] hover:bg-[rgba(19,42,19,0.9)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out"></div>
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <Spinner size="sm" className="border-t-white" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In to Workspace' : 'Create Workspace'}
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
            
          </form>

          <div className="mt-8 pt-8 border-t border-border flex items-center justify-center gap-2 text-sm">
            <span className="text-muted">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold text-[#132a13] hover:text-[#0b170b] transition-colors"
            >
              {mode === 'login' ? 'Request Access' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder, icon: Icon
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: any;
}) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPass ? 'text' : 'password') : type;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="group">
      <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      <div className={`relative flex items-center transition-all duration-200 rounded-xl bg-white border ${isFocused ? 'border-action-primary ring-4 ring-action-primary/10 shadow-sm' : 'border-border hover:border-border-strong'}`}>
        {Icon && (
          <div className={`absolute left-3.5 transition-colors duration-200 ${isFocused ? 'text-action-primary' : 'text-muted group-hover:text-ink/70'}`}>
            <Icon size={18} />
          </div>
        )}
        <input
          type={inputType}
          required
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent py-3 text-sm text-ink placeholder:text-muted/60 outline-none ${Icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-11' : 'pr-4'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3.5 p-1 rounded-md text-muted hover:text-ink hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary/20"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}





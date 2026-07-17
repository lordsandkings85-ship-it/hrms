import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2, Fingerprint, BarChart3, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { Spinner } from '../components/ui/Spinner';

const FEATURES = [
  { icon: Fingerprint, text: 'Geofenced GPS attendance tracking' },
  { icon: BarChart3,   text: 'Automated payroll & tax compliance' },
  { icon: ShieldCheck, text: 'Role-based access & audit logs' },
  { icon: CheckCircle2,text: 'Exit management & FnF automation' },
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
    <div className="min-h-screen flex">
      {/* ── Left Brand Panel ──────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br from-ink via-ink2 to-ledgerDark p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-ledger/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-ledger/15 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ledger flex items-center justify-center">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div>
              <div className="font-display text-xl font-bold text-white tracking-tight">Ledger HRMS</div>
              <div className="text-xs text-white/40">Workforce &amp; Payroll Platform</div>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold text-white leading-tight">
              Modern HR for<br />
              <span className="text-ledgerLight">growing teams</span>
            </h2>
            <p className="text-white/55 mt-4 text-sm leading-relaxed max-w-sm">
              From hiring to exit — run payroll, track attendance, and stay compliant with a single unified platform built for Indian businesses.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-ledgerLight" />
                </div>
                <span className="text-sm text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-xs text-white/25">
          Trusted by growing Indian companies · SOC 2 Type II compliant
        </p>
      </div>

      {/* ── Right Form Panel ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-paper">
        <div className="w-full max-w-sm animate-slideUp">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ledger flex items-center justify-center">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg text-ink">Ledger HRMS</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your workspace'}
          </h1>
          <p className="text-sm text-muted mt-1.5 mb-8">
            {mode === 'login'
              ? 'Sign in to your company workspace'
              : 'Set up Ledger HRMS for your organization'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <Field
                  label="Company name"
                  value={form.companyName}
                  onChange={(v) => setForm({ ...form, companyName: v })}
                  placeholder="Acme Pvt. Ltd."
                />
                <Field
                  label="Your full name"
                  value={form.fullName}
                  onChange={(v) => setForm({ ...form, fullName: v })}
                  placeholder="Rahul Sharma"
                />
              </>
            )}
            <Field
              label="Work email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="you@company.com"
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="••••••••"
            />

            {error && (
              <div className="flex items-start gap-2 p-3 bg-danger-light border border-danger/20 rounded-lg">
                <p className="text-xs text-danger-dark">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-60"
            >
              {loading ? (
                <Spinner size="sm" className="border-t-white border-white/30" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create workspace'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
            
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setForm({ ...form, email: 'admin@company.com', password: 'password123' })}
                className="w-full text-center text-xs text-ledger font-semibold hover:underline mt-2"
              >
                Use HR / Admin Demo Login
              </button>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-line text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              {mode === 'login'
                ? "Don't have a workspace? "
                : 'Already have a workspace? '}
              <span className="font-semibold text-ledger">
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPass ? 'text' : 'password') : type;

  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

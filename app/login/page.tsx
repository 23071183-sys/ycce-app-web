'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Eye, EyeOff, ShieldCheck, GraduationCap, Users, BarChart2, Megaphone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'super_admin' && data.user.role !== 'professor' && data.user.role !== 'admin') {
        setError('Access denied. Admin & Professor accounts only.');
        return;
      }
      setToken(data.token, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, label: 'Student Management', desc: 'Approve, manage & monitor all students' },
    { icon: BarChart2, label: 'Attendance Tracking', desc: 'Calendar view with live analytics' },
    { icon: Megaphone, label: 'Announcements', desc: 'Post to all years or specific batches' },
    { icon: GraduationCap, label: 'Results & SGPA', desc: 'Manage academic records & CGPA' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 border-r border-zinc-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Top badges */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="border border-zinc-700 rounded-md px-4 py-2">
            <span className="text-zinc-100 text-sm font-bold tracking-widest">YCCE</span>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div className="border border-zinc-700 rounded-md px-4 py-2">
            <span className="text-zinc-100 text-sm font-bold tracking-widest">CT</span>
          </div>
          <span className="text-zinc-600 text-xs tracking-widest uppercase ml-1">Admin Portal</span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h1 className="text-5xl font-extralight text-white tracking-tight mb-3 leading-tight">
            Computer<br />Technology<br />
            <span className="text-zinc-500">Department</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide mt-4 mb-12 leading-relaxed max-w-xs">
            Yashwantrao Chavan College of Engineering, Nagpur — unified admin platform for faculty and administrators.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} className="text-zinc-400" />
                </div>
                <div>
                  <p className="text-zinc-200 text-sm font-medium">{label}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="text-zinc-700 text-xs tracking-widest uppercase relative z-10">
          © 2025 YCCE — Computer Technology
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="border border-border rounded-md px-4 py-2">
            <span className="text-foreground text-sm font-bold tracking-widest">YCCE</span>
          </div>
          <div className="border border-border rounded-md px-4 py-2">
            <span className="text-foreground text-sm font-bold tracking-widest">CT</span>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-light text-foreground tracking-wide">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Sign in to your admin account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground tracking-widest uppercase">Email</label>
              <input
                type="email"
                placeholder="admin@ycce.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground tracking-widest uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-lg px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background rounded-lg py-3 text-sm font-medium tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-8">
            <ShieldCheck size={12} className="text-muted-foreground/50" />
            <p className="text-muted-foreground/50 text-xs tracking-wider">Admin & Professor access only</p>
          </div>
        </div>
      </div>
    </div>
  );
}

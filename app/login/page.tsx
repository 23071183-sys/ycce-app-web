'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Eye, EyeOff, ShieldCheck, GraduationCap, Users, BarChart2, Megaphone, CircleAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

// The page is prerendered at build time; if the year has rolled over since,
// the footer text differs from the server copy, which suppressHydrationWarning
// on that one element accepts.
const YEAR = new Date().getFullYear();

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
      // Only a response from the server can tell us the sign-in was refused.
      // Without one the request never arrived — the API is unreachable, asleep,
      // or misconfigured — and calling that "invalid credentials" sends people
      // off resetting a password that was never the problem.
      if (err.response) {
        setError(err.response.data?.error || 'Invalid credentials');
      } else if (err.code === 'ECONNABORTED') {
        setError('The server took too long to respond. It may be waking up — try again in a moment.');
      } else {
        setError(`Could not reach the server at ${api.defaults.baseURL}. Check your connection and try again.`);
      }
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
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border flex-col justify-between p-12 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04] text-foreground"
          style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Top badges */}
        <div className="flex items-center gap-3 relative z-10">
          <span className="rounded-md border border-foreground px-3 py-1.5 text-sm font-semibold tracking-widest">YCCE</span>
          <span className="h-6 w-px bg-border" />
          <span className="rounded-md border border-foreground px-3 py-1.5 text-sm font-semibold tracking-widest">CT</span>
          <span className="label ml-1">Admin Portal</span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h1 className="text-5xl font-extralight tracking-tight mb-3 leading-tight">
            Computer<br />Technology<br />
            <span className="text-muted-foreground">Department</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-4 mb-12 leading-relaxed max-w-xs">
            Yashwantrao Chavan College of Engineering, Nagpur — unified admin platform for faculty and administrators.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="label relative z-10" suppressHydrationWarning>© {YEAR} YCCE — Computer Technology</p>
      </div>

      {/* Right panel — login form */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <span className="rounded-md border border-foreground px-3 py-1.5 text-sm font-semibold tracking-widest">YCCE</span>
          <span className="rounded-md border border-foreground px-3 py-1.5 text-sm font-semibold tracking-widest">CT</span>
        </div>

        <Card className="w-full max-w-sm">
          <CardContent className="py-4">
            <div className="mb-8">
              <h2 className="text-2xl font-light tracking-wide">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1.5">Sign in to your admin account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <FormField label="Email" htmlFor="login-email">
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@ycce.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </FormField>

              <FormField label="Password" htmlFor="login-password">
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormField>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-sm text-destructive">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-10 w-full">
                {loading ? <Loader2 className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-1.5 mt-8 text-muted-foreground">
          <ShieldCheck size={12} />
          <p className="text-xs tracking-wider">Admin & Professor access only</p>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'super_admin' && data.user.role !== 'professor') {
        setError('Access denied. Admin accounts only.');
        return;
      }
      setToken(data.token, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-6">
      {/* Subtle radial glow in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-zinc-800/20 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex items-center justify-between mb-10">
          <div className="border border-zinc-700 rounded-md px-4 py-2">
            <span className="text-zinc-200 text-sm font-bold tracking-widest">YCCE</span>
          </div>
          <div className="border border-zinc-700 rounded-md px-4 py-2">
            <span className="text-zinc-200 text-sm font-bold tracking-widest">CT</span>
          </div>
        </div>

        <h1 className="text-foreground text-2xl font-light tracking-[0.2em] uppercase text-center mb-2">
          Admin Portal
        </h1>
        <div className="flex justify-center mb-10">
          <span className="bg-foreground text-background text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-md">
            Computer Technology
          </span>
        </div>

        {/* Card with animated glow on focus */}
        <div className={`rounded-xl transition-all duration-300 ${
          focused
            ? 'shadow-[0_0_0_1px_rgba(161,161,170,0.4),0_0_20px_rgba(161,161,170,0.1)]'
            : 'shadow-none'
        }`}>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <form
                onSubmit={handleLogin}
                className="space-y-5"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              >
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-widest uppercase">Email</Label>
                  <Input
                    type="email"
                    placeholder="admin@ycce.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-widest uppercase">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="pr-10"
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
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-light tracking-widest uppercase text-sm"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Access hint */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <ShieldCheck size={12} className="text-zinc-600" />
          <p className="text-zinc-600 text-xs tracking-wider">Admin &amp; Professor access only</p>
        </div>

        <p className="text-muted-foreground text-xs text-center mt-6 tracking-wider">
          Yashwantrao Chavan College of Engineering
        </p>
      </div>
    </div>
  );
}

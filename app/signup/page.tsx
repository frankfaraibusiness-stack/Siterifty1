'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { card, input, btn, errorText } from '@/components/authStyles';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [visitorId, setVisitorId] = useState<string>();

  // Lets Sitevento credit the sign-up to the channel that brought this visitor in.
  useEffect(() => {
    (window as any).sitevento?.('visitor', (v: string) => setVisitorId(v));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(name, email, password, visitorId);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={card}>
      <h1 style={{ margin: 0, fontSize: 20 }}>Create an account</h1>
      {error && <p style={errorText}>{error}</p>}
      <input style={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input style={input} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input style={input} placeholder="Password (6+ characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      <button style={btn} disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
      <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>No real login in this test app — signing up again just creates another account.</p>
    </form>
  );
}

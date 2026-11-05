import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from '../store.js';

export function LoginGate() {
  const login = useStore((s) => s.login);
  const loginError = useStore((s) => s.loginError);
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => field.current?.focus(), []);

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setPending(true);
    void login(password).finally(() => setPending(false));
  };

  return (
    <section id="login" className="gate">
      <form id="login-form" className="card gate-card" onSubmit={submit}>
        <h1>Garmin Companion</h1>
        <p className="muted">This dashboard is private.</p>
        <label htmlFor="pw">Password</label>
        <input ref={field} id="pw" type={shown ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="showpw"><input id="showpw" type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} /> Show password</label>
        <p id="login-err" className="err" role="alert" hidden={!loginError}>{loginError}</p>
        <button className="btn primary" type="submit" disabled={pending}>Unlock</button>
      </form>
    </section>
  );
}

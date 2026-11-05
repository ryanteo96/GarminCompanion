import { useEffect, useRef } from 'react';
import { friendly } from '../logic/errors.js';
import { useStore } from '../store.js';

export function ErrorGate() {
  const error = useStore((s) => s.error);
  const retry = useStore((s) => s.retry);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => button.current?.focus(), []);

  const [title, hint] = friendly(error ?? { status: 'unknown' });
  const detail = error?.message && error.status !== 0 ? `Details: ${error.message}` : ''; // offline detail is browser jargon

  return (
    <section id="error" className="gate">
      <div className="card gate-card" role="alert">
        <h1 id="err-title">{title}</h1>
        <p id="err-hint">{hint}</p>
        <p id="err-detail" className="muted small">{detail}</p>
        <button ref={button} id="err-retry" className="btn primary" type="button" onClick={() => void retry()}>Try again</button>
      </div>
    </section>
  );
}

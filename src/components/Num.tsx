import { useLayoutEffect, useRef } from 'react';

const NUM = /\d[\d,]*(?:\.\d+)?/g;
const dec = (s: string) => s.split('.')[1]?.length ?? 0;
const read = (s: string) => parseFloat(s.replace(/,/g, ''));

// Counts every number in a string up from the previous value (0 on first show); the final text is always the real one.
export function Num({ children: text }: { children: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef<string | null>(null);

  useLayoutEffect(() => {
    const node = el.current;
    const from = prev.current;
    prev.current = text;
    const to = text.match(NUM);
    const calm = typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!node || !to || calm) return;
    const was = from?.match(NUM);
    const start = to.map((t, i) => (was && was.length === to.length ? read(was[i]) : 0));
    if (from === text) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // expo-out
      let i = 0;
      node.textContent = text.replace(NUM, (m) => {
        const v = start[i] + (read(m) - start[i]) * e;
        i++;
        return v.toLocaleString('en-US', { minimumFractionDigits: dec(m), maximumFractionDigits: dec(m), useGrouping: m.includes(',') });
      });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); node.textContent = text; };
  }, [text]);

  return <span ref={el} key={text}>{text}</span>;
}

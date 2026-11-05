import { useEffect, useRef, useState, type ReactNode } from 'react';

// A scrolling region must be reachable by keyboard; one that fits is not a tab stop.
export function ScrollRegion({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  const region = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const el = region.current;
    if (!el) return;
    const check = () => setScrolls(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of el.children) observer.observe(child); // the table can grow without the region changing size
    return () => observer.disconnect();
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be keyboard-focusable, and only while it overflows
    <div ref={region} id={id} className="tablewrap" role="region" aria-label={label} tabIndex={scrolls ? 0 : -1}>
      {children}
    </div>
  );
}

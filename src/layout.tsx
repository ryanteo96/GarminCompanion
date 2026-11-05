import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Layout {
  /** Changes when the colour scheme or the window width changes, so charts rebuild with fresh colours and tick counts. */
  key: number;
  /** A CSS custom property resolved against the current theme, e.g. token('--ink-hrv'). */
  token: (name: string) => string;
}

const LayoutContext = createContext<Layout>({ key: 0, token: () => '' });
export const useLayout = (): Layout => useContext(LayoutContext);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const bump = () => setKey((k) => k + 1);
    const dark = matchMedia('(prefers-color-scheme: dark)');
    dark.addEventListener('change', bump);
    // Re-lay out when the width changes (rotation, window resize); height-only changes (mobile URL bar) are ignored.
    let lastW = innerWidth;
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (innerWidth !== lastW) {
          lastW = innerWidth;
          bump();
        }
      }, 250);
    };
    addEventListener('resize', onResize);
    return () => {
      dark.removeEventListener('change', bump);
      removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
  }, []);

  // `key` is the cache's lifetime: a new key means a new theme or size, so tokens are read again.
  const value = useMemo<Layout>(() => {
    const cache = new Map<string, string>();
    const token = (name: string): string => {
      let v = cache.get(name);
      if (v === undefined) cache.set(name, (v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()));
      return v;
    };
    return { key, token };
  }, [key]);

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

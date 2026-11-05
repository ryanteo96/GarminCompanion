// In-memory stand-ins for the browser's localStorage. Methods are non-enumerable so Object.keys() lists only stored keys, as it does in a browser.
export function memoryStorage(): Storage {
  const items: Record<string, string> = {};
  Object.defineProperties(items, {
    getItem: { value: (k: string): string | null => (Object.hasOwn(items, k) ? items[k] : null) },
    setItem: { value: (k: string, v: string): void => { items[k] = String(v); } },
    removeItem: { value: (k: string): void => { delete items[k]; } },
    clear: { value: (): void => { for (const k of Object.keys(items)) delete items[k]; } },
    key: { value: (i: number): string | null => Object.keys(items)[i] ?? null },
    length: { get: (): number => Object.keys(items).length },
  });
  return items as unknown as Storage;
}

// Every access throws, like storage in a private window or with site data blocked.
export function throwingStorage(): Storage {
  const fail = (): never => {
    throw new Error('storage is unavailable');
  };
  return new Proxy({}, { get: fail, set: fail, ownKeys: fail, has: fail, getOwnPropertyDescriptor: fail, deleteProperty: fail }) as Storage;
}

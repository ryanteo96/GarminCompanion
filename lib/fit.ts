import { Decoder, Stream } from '@garmin/fitsdk';
import { unzipSync } from 'fflate';

// Bump PARSER_VERSION when the stored shape changes (Sessions are re-parsed); METHOD_VERSION when decoupling or Z2 efficiency are computed differently.
export const PARSER_VERSION = 2;
export const METHOD_VERSION = 1;
const POINTS = 500;

export interface Rec {
  t: number; // seconds from the first record
  hr?: number;
  speed?: number; // m/s
  cadence?: number;
  alt?: number;
  lat?: number;
  lon?: number;
}
export interface Lap { startS: number; durationS: number | null; distanceM: number | null; avgHr: number | null; avgSpeed: number | null }
export interface SetRow { setType: string | null; category: string | null; subtype: string | null; reps: number | null; weightKg: number | null; durationS: number | null }
export interface Detail {
  series: { t: number[]; hr: (number | null)[]; speed: (number | null)[]; cadence: (number | null)[]; alt: (number | null)[] };
  route: [number, number][];
  laps: Lap[];
  sets: SetRow[];
  metrics: { decoupling: number | null; z2Efficiency: number | null; z2Speed: number | null; z2Hr: number | null; methodVersion: number };
}

// Evenly spaced picks that always keep the first and last point.
export function downsample<T>(a: T[], n = POINTS): T[] {
  if (a.length <= n) return a;
  return Array.from({ length: n }, (_, i) => a[Math.round((i * (a.length - 1)) / (n - 1))]);
}

const mean = (a: number[]): number => a.reduce((s, x) => s + x, 0) / a.length;
const moving = (r: Rec): r is Rec & { hr: number; speed: number } => (r.hr ?? 0) > 0 && (r.speed ?? 0) > 0;

// Aerobic decoupling (Pa:Hr, Friel / TrainingPeaks): efficiency factor (speed / heart rate) of the first half against the second, as a percent drop.
// shortcut: no warm-up trim and no check that the effort was steady, so intervals and hilly runs read as drift; refine with a real-data look.
export function decoupling(recs: Rec[]): number | null {
  const m = recs.filter(moving);
  if (m.length < 600) return null;
  const half = Math.floor(m.length / 2);
  const ef = (r: (Rec & { hr: number; speed: number })[]): number => mean(r.map((x) => x.speed)) / mean(r.map((x) => x.hr));
  const [a, b] = [ef(m.slice(0, half)), ef(m.slice(half))];
  return ((a - b) / a) * 100;
}

// Records at a moving heart rate inside zone 2. Null without zone bounds or with under 5 minutes in the zone.
const inZ2 = (recs: Rec[], z2: [number, number] | null): (Rec & { hr: number; speed: number })[] | null => {
  if (!z2) return null;
  const m = recs.filter(moving).filter((r) => r.hr >= z2[0] && r.hr <= z2[1]);
  return m.length < 300 ? null : m;
};

// Z2 efficiency: metres per minute per beat while heart rate sits inside zone 2.
export function z2Efficiency(recs: Rec[], z2: [number, number] | null): number | null {
  const m = inZ2(recs, z2);
  return m && (mean(m.map((r) => r.speed)) * 60) / mean(m.map((r) => r.hr));
}

// Mean speed (m/s) and heart rate (bpm) while in zone 2: the pace you ran at an easy heart rate.
export function z2Mean(recs: Rec[], z2: [number, number] | null): { speed: number; hr: number } | null {
  const m = inZ2(recs, z2);
  return m && { speed: mean(m.map((r) => r.speed)), hr: mean(m.map((r) => r.hr)) };
}

type Mesg = Record<string, unknown>;
export interface Messages { recordMesgs?: Mesg[]; lapMesgs?: Mesg[]; setMesgs?: Mesg[]; hrZoneMesgs?: Mesg[] }
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ts = (v: unknown): number | null => (v instanceof Date ? v.getTime() : n(v));
const DEG = 180 / 2 ** 31; // semicircles to degrees

export function buildDetail(m: Messages): Detail {
  const raw = m.recordMesgs ?? [];
  const t0 = ts(raw[0]?.timestamp) ?? 0;
  const all: Rec[] = raw.map((r) => ({
    t: Math.round(((ts(r.timestamp) ?? t0) - t0) / 1000),
    hr: n(r.heartRate) ?? undefined,
    speed: n(r.enhancedSpeed ?? r.speed) ?? undefined,
    cadence: n(r.cadence) ?? undefined,
    alt: n(r.enhancedAltitude ?? r.altitude) ?? undefined,
    lat: n(r.positionLat) == null ? undefined : (r.positionLat as number) * DEG,
    lon: n(r.positionLong) == null ? undefined : (r.positionLong as number) * DEG,
  }));
  // Metrics use every record; only what is stored is thinned.
  const z = (m.hrZoneMesgs ?? []).map((x) => n(x.highBpm));
  const z2: [number, number] | null = z[0] != null && z[1] != null ? [z[0], z[1]] : null;
  const z2m = z2Mean(all, z2);
  const pts = downsample(all);
  const col = (k: 'hr' | 'speed' | 'cadence' | 'alt'): (number | null)[] => pts.map((r) => r[k] ?? null);
  return {
    series: { t: pts.map((r) => r.t), hr: col('hr'), speed: col('speed'), cadence: col('cadence'), alt: col('alt') },
    route: downsample(all.filter((r) => r.lat != null && r.lon != null).map((r): [number, number] => [r.lat as number, r.lon as number])),
    laps: (m.lapMesgs ?? []).map((l) => ({ startS: Math.round(((ts(l.startTime) ?? t0) - t0) / 1000), durationS: n(l.totalElapsedTime), distanceM: n(l.totalDistance), avgHr: n(l.avgHeartRate), avgSpeed: n(l.avgSpeed) })),
    sets: (m.setMesgs ?? []).map((s) => ({
      setType: typeof s.setType === 'string' ? s.setType : null,
      category: Array.isArray(s.category) && typeof s.category[0] === 'string' ? s.category[0] : null,
      subtype: Array.isArray(s.categorySubtype) && typeof s.categorySubtype[0] === 'number' ? String(s.categorySubtype[0]) : null,
      reps: n(s.repetitions),
      weightKg: n(s.weight),
      durationS: n(s.duration),
    })),
    metrics: { decoupling: decoupling(all), z2Efficiency: z2Efficiency(all, z2), z2Speed: z2m?.speed ?? null, z2Hr: z2m?.hr ?? null, methodVersion: METHOD_VERSION },
  };
}

const isFit = (b: Uint8Array): boolean => String.fromCharCode(...b.slice(8, 12)) === '.FIT';

// Garmin's activity download is a ZIP holding one .fit file.
// shortcut: decoded in memory with no size cap beyond Garmin's own, fine for one owner's activities; add a cap before other users.
export function parseFit(download: Uint8Array): Detail {
  const bytes = isFit(download) ? download : Object.entries(unzipSync(download)).find(([name]) => name.toLowerCase().endsWith('.fit'))?.[1];
  if (!bytes) throw new Error('no .fit file in the download');
  const { messages, errors } = new Decoder(Stream.fromByteArray([...bytes])).read();
  if (errors.length && !messages.recordMesgs?.length) throw new Error(`FIT decode failed: ${String(errors[0])}`);
  return buildDetail(messages as Messages);
}

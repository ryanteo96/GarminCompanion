// The contract between the server (normalize/sample) and the UI. Metrics are optional because a day
// may have a daily summary but no sleep record, or the reverse.
type Metric = number | null | undefined;

export interface Day {
  date: string;
  steps?: Metric;
  calories?: Metric;
  restingHr?: Metric;
  intensityMin?: Metric;
  stress?: Metric;
  bbHigh?: Metric;
  bbLow?: Metric;
  hrv?: Metric;
  hrvWeekly?: Metric;
  sleepH?: Metric;
  deepH?: Metric;
  remH?: Metric;
  lightH?: Metric;
  awakeH?: Metric;
  sleepScore?: Metric;
  bedtime?: string | null;
  wake?: string | null;
}

export type DayWithLoad = Day & { load: number };

export type DayKey =
  | 'steps' | 'calories' | 'restingHr' | 'intensityMin' | 'stress' | 'bbHigh' | 'bbLow' | 'hrv' | 'hrvWeekly'
  | 'sleepH' | 'deepH' | 'remH' | 'lightH' | 'awakeH' | 'sleepScore' | 'load';

export interface Activity {
  id: number;
  date: string;
  name: string;
  type: string;
  minutes: number | null;
  km: number | null;
  avgHr: number | null;
  load: number | null;
  te: number | null;
  zones: number[];
}

// The Home card layout: shown card ids in order, and when it was last changed (ms since epoch). Shared by the UI and /api/layout.
export interface HomeLayout {
  cards: string[];
  updatedAt: number;
}

export interface Skipped {
  daily: number;
  hrv: number;
  sleep: number;
  activities: number;
}

export interface Payload {
  demo: boolean;
  fetchedAt: string;
  days: Day[];
  activities: Activity[];
  skipped?: Skipped;
}

// Garmin Connect Personal API records, only the fields normalize() reads.
type Raw<T> = T | null;
export interface RawDaily {
  calendarDate?: string | null;
  movement?: { steps?: Metric };
  calories?: { burnedTotal?: Metric };
  heartRate?: { restingValue?: Metric };
  intensityMinutes?: { moderate?: Metric; vigorous?: Metric };
  stress?: { avgLevel?: Metric };
  bodyBattery?: { maxValue?: Metric; minValue?: Metric };
}
export interface RawHrv {
  calendarDate?: string | null;
  lastNightAvg?: Metric;
  weeklyAvg?: Metric;
}
export interface RawSleep {
  calendarDate?: string | null;
  sleepTimeSeconds?: Metric;
  deepSleepSeconds?: Metric;
  remSleepSeconds?: Metric;
  lightSleepSeconds?: Metric;
  awakeSleepSeconds?: Metric;
  sleepScores?: { overall?: { value?: Metric } };
  sleepStartTimestampLocal?: string | number | null;
  sleepEndTimestampLocal?: string | number | null;
}
export interface RawActivity {
  activityId: number;
  startTimeLocal?: string | null;
  activityName?: string | null;
  activityType?: { typeKey?: string };
  duration?: Metric;
  distance?: Metric;
  averageHR?: Metric;
  activityTrainingLoad?: Metric;
  aerobicTrainingEffect?: Metric;
  hrTimeInZone_1?: Metric;
  hrTimeInZone_2?: Metric;
  hrTimeInZone_3?: Metric;
  hrTimeInZone_4?: Metric;
  hrTimeInZone_5?: Metric;
}
export interface RawInput {
  daily: Raw<RawDaily>[];
  hrv: Raw<RawHrv>[];
  sleep: Raw<RawSleep>[];
  acts: Raw<RawActivity>[];
}

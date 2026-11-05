export const TABS = ['recovery', 'training', 'activity', 'insights'] as const;
export type Tab = (typeof TABS)[number];
export const TAB_NAMES: Record<Tab, string> = { recovery: 'Recovery', training: 'Training', activity: 'Activity', insights: 'Insights' };
export const APP_TITLE = 'Garmin Companion';
export const isTab = (s: string | undefined): s is Tab => TABS.some((t) => t === s);

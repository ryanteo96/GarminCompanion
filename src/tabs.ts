export const TABS = ['home', 'activity', 'recovery'] as const;
export type Tab = (typeof TABS)[number];
export const TAB_NAMES: Record<Tab, string> = { home: 'Home', activity: 'Activity', recovery: 'Recovery' };
export const APP_TITLE = 'Garmin Companion';
export const isTab = (s: string | undefined): s is Tab => TABS.some((t) => t === s);

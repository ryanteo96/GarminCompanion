import type { ComponentType } from 'react';
import type { Tab } from '../tabs.js';

// Each tab's content. The panels land one task at a time; until then a tab renders empty.
export const PANELS: Record<Tab, ComponentType> = {
  recovery: () => null,
  training: () => null,
  activity: () => null,
  insights: () => null,
};

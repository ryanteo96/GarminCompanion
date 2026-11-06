import type { ComponentType } from 'react';
import type { Tab } from '../tabs.js';
import { ActivityRoute } from './ActivityRoute.js';
import { HomePanel } from './HomePanel.js';
import { RecoveryPanel } from './RecoveryPanel.js';

// Each tab's content.
export const PANELS: Record<Tab, ComponentType> = {
  home: HomePanel,
  activity: ActivityRoute,
  recovery: RecoveryPanel,
};

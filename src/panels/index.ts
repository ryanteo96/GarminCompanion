import type { ComponentType } from 'react';
import type { Tab } from '../tabs.js';
import { ActivityPanel } from './ActivityPanel.js';
import { InsightsPanel } from './InsightsPanel.js';
import { RecoveryPanel } from './RecoveryPanel.js';
import { TrainingPanel } from './TrainingPanel.js';

// Each tab's content.
export const PANELS: Record<Tab, ComponentType> = {
  recovery: RecoveryPanel,
  training: TrainingPanel,
  activity: ActivityPanel,
  insights: InsightsPanel,
};

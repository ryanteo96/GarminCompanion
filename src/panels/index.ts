import type { ComponentType } from 'react';
import type { Tab } from '../tabs.js';
import { ActivityPanel } from './ActivityPanel.js';
import { RecoveryPanel } from './RecoveryPanel.js';
import { TrainingPanel } from './TrainingPanel.js';

// Each tab's content. The remaining panels land one task at a time; until then a tab renders empty.
export const PANELS: Record<Tab, ComponentType> = {
  recovery: RecoveryPanel,
  training: TrainingPanel,
  activity: ActivityPanel,
  insights: () => null,
};

import { Chart, registerables } from 'chart.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { App } from './App.js';
import { LayoutProvider } from './layout.js';
import { useStore } from './store.js';
import { TABS } from './tabs.js';
import './style.css';

Chart.register(...registerables);
// Chart.js reads the font from its defaults; a per-chart options.font.family is ignored by this build.
Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim();

// Old bookmarks use #recovery; the router wants #/recovery.
const legacy = /^#(\w+)$/.exec(location.hash);
if (legacy && TABS.some((t) => t === legacy[1])) history.replaceState(null, '', `#/${legacy[1]}`);

const router = createHashRouter([
  { path: '/:tab', element: <App /> },
  { path: '*', element: <Navigate to="/recovery" replace /> },
]);

// Started here, not in an effect, so StrictMode cannot fire the first load twice.
void useStore.getState().load();

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');
createRoot(root).render(
  <StrictMode>
    <LayoutProvider>
      <RouterProvider router={router} />
    </LayoutProvider>
  </StrictMode>,
);

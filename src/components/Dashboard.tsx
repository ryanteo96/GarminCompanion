import { PANELS } from '../panels/index.js';
import { TABS, type Tab } from '../tabs.js';
import { Account } from './Account.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { Header } from './Header.js';
import { Notice } from './Notice.js';
import { Sidebar } from './Sidebar.js';

export function Dashboard({ tab }: { tab: Tab }) {
  const Panel = PANELS[tab];
  return (
    <div id="app" className="shell">
      <Sidebar tab={tab} />
      <div className="col">
        <Header tab={tab} />
        <main id="main" tabIndex={-1}>
          <Notice />
          {/* Every tab's panel stays in the DOM so every tab's aria-controls resolves; only the selected one has content. */}
          {TABS.map((t) => (
            <section key={t} id={`p-${t}`} role="tabpanel" aria-labelledby={`t-${t}`} hidden={t !== tab}>
              {t === tab && (
                <ErrorBoundary key={t}>
                  <Panel />
                </ErrorBoundary>
              )}
            </section>
          ))}
          <Account where="foot" />
        </main>
      </div>
    </div>
  );
}

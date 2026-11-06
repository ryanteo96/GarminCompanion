import { useStore } from '../store.js';

// Sign out and the stored-data reset: the sidebar foot on a laptop, the end of the page on a phone (CSS picks one).
export function Account({ where }: { where: 'side' | 'foot' }) {
  const { demo, logout, deleteStored } = useStore();
  return (
    <div className={`account account-${where}`}>
      <div className="account-actions">
        <button className="link" type="button" onClick={() => void logout()}>Sign out</button>
        <button className="link" type="button" hidden={demo} onClick={() => window.confirm('Delete all stored activity data? Daily data is not affected, and the last 90 days are stored again on the next load.') && void deleteStored()}>Delete stored data</button>
      </div>
      <p className="small muted">Signing out also clears the copy of your data cached in this browser.</p>
    </div>
  );
}

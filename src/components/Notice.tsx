import { useStore } from '../store.js';

// Always in the DOM so assistive tech sees the live region before its text changes.
export function Notice() {
  const notice = useStore((s) => s.notice);
  const retry = useStore((s) => s.retry);
  return (
    <p id="notice" className="notice" role="status" hidden={!notice}>
      <span id="notice-text">{notice?.text}</span>{' '}
      <button id="notice-retry" className="btn small" type="button" hidden={!notice?.retry} onClick={() => void retry()}>Retry</button>
    </p>
  );
}

import { Component, type ReactNode } from 'react';
import { useStore } from '../store.js';

// One panel failing to draw must not blank the app: show the notice and leave the rest of the page working.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    useStore.getState().notify(`Couldn't draw this view: ${error.message}`);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

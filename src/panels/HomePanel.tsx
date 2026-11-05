import { CARDS } from '../home/cards.js';
import { DEFAULT_CARDS } from '../home/layout.js';

export function HomePanel() {
  return (
    <div className="home-grid">
      {DEFAULT_CARDS.map((id) => {
        const { Component, span } = CARDS[id];
        return (
          <div key={id} className="home-cell" data-card={id} data-span={String(span)}>
            <Component />
          </div>
        );
      })}
    </div>
  );
}

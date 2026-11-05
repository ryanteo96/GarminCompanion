import { useEffect, useRef } from 'react';
import { CARDS } from '../home/cards.js';
import { CustomizeSheet } from '../home/CustomizeSheet.js';
import { flush, pull, useHome } from '../home/store.js';

export function HomePanel() {
  const sheet = useRef<HTMLDialogElement>(null);
  const cards = useHome((s) => s.cards);

  useEffect(() => {
    void pull(() => sheet.current?.open ?? false);
    addEventListener('pagehide', flush);
    return () => {
      removeEventListener('pagehide', flush);
      flush();
    };
  }, []);
  return (
    <>
      <button type="button" className="btn home-customize" onClick={() => sheet.current?.showModal()}>Customize</button>
      {cards.length === 0 && <p className="card home-empty">Every card is hidden. Use Customize to bring them back.</p>}
      <div className="home-grid">
        {cards.map((id) => {
          const { Component, span } = CARDS[id];
          return (
            <div key={id} className="home-cell" data-card={id} data-span={String(span)}>
              <Component />
            </div>
          );
        })}
      </div>
      <CustomizeSheet ref={sheet} />
    </>
  );
}

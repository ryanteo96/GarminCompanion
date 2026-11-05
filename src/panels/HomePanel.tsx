import { useRef } from 'react';
import { CARDS } from '../home/cards.js';
import { CustomizeSheet } from '../home/CustomizeSheet.js';
import { DEFAULT_CARDS } from '../home/layout.js';

export function HomePanel() {
  const sheet = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="btn home-customize" onClick={() => sheet.current?.showModal()}>Customize</button>
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
      <CustomizeSheet ref={sheet} />
    </>
  );
}

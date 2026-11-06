import { useEffect, useRef } from 'react';
import { CARDS } from '../home/cards.js';
import { CustomizeSheet, GROUP } from '../home/CustomizeSheet.js';
import type { CardId } from '../home/layout.js';
import { flush, pull, useHome } from '../home/store.js';

// Consecutive cards of one group, in order.
const runs = (cards: CardId[]): CardId[][] =>
  cards.reduce<CardId[][]>((out, id) => {
    const last = out.at(-1);
    if (last && CARDS[last[0]].group === CARDS[id].group) last.push(id);
    else out.push([id]);
    return out;
  }, []);

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
      {/* A heading wherever the group changes, so sections follow the owner's own order. */}
      {runs(cards).map((run) => (
        <section key={run[0]} className="home-section" aria-labelledby={`h-${run[0]}`}>
          <h2 id={`h-${run[0]}`} className="section-title">{GROUP[CARDS[run[0]].group]}</h2>
          <div className="home-grid">
            {run.map((id) => {
              const { Component, span } = CARDS[id];
              return (
                <div key={id} className="home-cell" data-card={id} data-span={String(span)}>
                  <Component />
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <CustomizeSheet ref={sheet} />
    </>
  );
}

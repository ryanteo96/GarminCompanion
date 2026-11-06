import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useRef, useState, type Ref } from 'react';
import { useHome } from './store.js';
import { CARDS } from './cards.js';
import { CARD_IDS, type CardId } from './layout.js';

// Keeps the dragged row inside its list, vertically. A row dragged past the end would stretch the sheet's scroll
// area and auto-scroll would then run away.
const withinList: Modifier = ({ transform, draggingNodeRect, containerNodeRect }) => {
  const y = !draggingNodeRect || !containerNodeRect ? transform.y : Math.min(Math.max(transform.y, containerNodeRect.top - draggingNodeRect.top), containerNodeRect.bottom - draggingNodeRect.bottom);
  return { ...transform, x: 0, y };
};

export const GROUP = { recovery: 'Recovery', training: 'Training', today: 'Today' };

// A card's switch: on while it is shown. The row it sits in changes when it flips, so focus is put back on the switch afterwards.
function Switch({ id, on, toggle }: { id: CardId; on: boolean; toggle: (id: CardId) => void }) {
  return (
    <label className="sheet-switch">
      <input
        type="checkbox"
        role="switch"
        id={`show-${id}`}
        aria-label={`Show ${CARDS[id].title}`}
        checked={on}
        onChange={() => {
          toggle(id);
          requestAnimationFrame(() => document.getElementById(`show-${id}`)?.focus());
        }}
      />
    </label>
  );
}

function Text({ id }: { id: CardId }) {
  const { title, group } = CARDS[id];
  return (
    <span className="sheet-text">
      <span className="sheet-title">{title}</span>
      <span className="sheet-group">{GROUP[group]}</span>
    </span>
  );
}

function Row({ id, toggle }: { id: CardId; toggle: (id: CardId) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? 'sheet-row dragging' : 'sheet-row'}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
    >
      <button type="button" ref={setActivatorNodeRef} className="sheet-handle" aria-label={`Move ${CARDS[id].title}`} {...attributes} {...listeners}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
        </svg>
      </button>
      <Text id={id} />
      <Switch id={id} on toggle={toggle} />
    </li>
  );
}

export function CustomizeSheet({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const items = useHome((s) => s.cards);
  const move = useHome((s) => s.move);
  const { show, hide, reset } = useHome.getState();
  const hidden = CARD_IDS.filter((id) => !items.includes(id));
  const toggle = (id: CardId): void => (items.includes(id) ? hide(id) : show(id));
  const dragging = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const setDialogRef = (el: HTMLDialogElement | null): void => {
    setDialog(el);
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  const place = (id: string | number): string => `${CARDS[id as CardId].title}`;
  // The default live region sits on document.body, which a modal dialog makes inert, so it is rendered inside the dialog instead.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${place(active.id)}, position ${items.indexOf(active.id as CardId) + 1} of ${items.length}`,
    onDragOver: ({ active, over }) => (over && over.id !== active.id ? `${place(active.id)} moved to position ${items.indexOf(over.id as CardId) + 1} of ${items.length}` : undefined),
    onDragEnd: ({ active, over }) => `${place(active.id)} dropped at position ${items.indexOf((over?.id ?? active.id) as CardId) + 1} of ${items.length}`,
    onDragCancel: ({ active }) => `Moving ${place(active.id)} cancelled`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (over && active.id !== over.id) move(items.indexOf(active.id as CardId), items.indexOf(over.id as CardId));
  };

  return (
    <dialog
      ref={setDialogRef}
      className="sheet"
      aria-labelledby="sheet-h"
      // Escape cancels a keyboard drag first; only a second Escape closes the sheet.
      onCancel={(e) => {
        if (dragging.current) e.preventDefault();
      }}
    >
      <div className="sheet-body">
        <h2 id="sheet-h">Customize Home</h2>
        <h3>Shown</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[withinList]}
          autoScroll={{ canScroll: (el) => el === dialog }}
          accessibility={{ container: dialog ?? undefined, announcements }}
          onDragStart={() => {
            dragging.current = true;
          }}
          onDragEnd={(e) => {
            setTimeout(() => (dragging.current = false));
            onDragEnd(e);
          }}
          onDragCancel={() => setTimeout(() => (dragging.current = false))}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="sheet-list sheet-shown">
              {items.map((id) => (
                <Row key={id} id={id} toggle={toggle} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <h3>Hidden</h3>
        <ul className="sheet-list sheet-hidden">
          {hidden.map((id) => (
            <li key={id} className="sheet-row">
              <Text id={id} />
              <Switch id={id} on={false} toggle={toggle} />
            </li>
          ))}
        </ul>
      </div>
      <div className="sheet-foot">
        <button type="button" className="btn" onClick={() => reset()}>Reset to default</button>
        <button type="button" className="btn primary" onClick={() => dialog?.close()}>Done</button>
      </div>
    </dialog>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Pin, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Icon } from '@common/components/Icon';
import { PinnedNotesPanel } from '@notes/components/PinnedNotesPanel';

interface MobileHeaderProps {
  toggleSidebar: () => void;
}

export const MobileHeader = ({ toggleSidebar }: MobileHeaderProps) => {
  const location = useLocation();
  const [isPinnedNotesOpen, setIsPinnedNotesOpen] = useState(false);
  const pinnedNotesButtonRef = useRef<HTMLButtonElement>(null);
  const isNotesRoute = location.pathname.startsWith('/notes');

  const closePinnedNotes = () => {
    setIsPinnedNotesOpen(false);
    pinnedNotesButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!isPinnedNotesOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePinnedNotes();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPinnedNotesOpen]);

  // Get the current section name based on the route
  const getSectionName = () => {
    const path = location.pathname;

    let sectionName: string;
    if (path.includes('planner')) {
      sectionName = 'Planner';
    } else if (path.includes('settings')) {
      sectionName = 'Settings';
    } else {
      sectionName = 'Perga';
    }

    return sectionName;
  };

  return (
    <header className="md:hidden bg-bg-sidebar text-text-sidebar p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-40">
      <button
        onClick={toggleSidebar}
        className="p-1"
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <Icon name="hamburger" size={24} className="h-6 w-6" />
      </button>
      <h1 className="text-lg font-semibold">{getSectionName()}</h1>
      {isNotesRoute ? (
        <button
          ref={pinnedNotesButtonRef}
          type="button"
          onClick={() => setIsPinnedNotesOpen(true)}
          aria-label="Open pinned notes"
          aria-expanded={isPinnedNotesOpen}
          aria-controls="mobile-pinned-notes-drawer"
          title="Pinned notes"
          className="flex min-h-8 min-w-8 items-center justify-center rounded text-text-sidebar transition-colors hover:bg-bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Pin size={22} />
        </button>
      ) : (
        <div className="w-8" aria-hidden="true" />
      )}

      {isNotesRoute && isPinnedNotesOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            onClick={closePinnedNotes}
            aria-label="Dismiss pinned notes"
            className="absolute inset-0 h-full w-full cursor-default bg-black/50"
          />
          <aside
            id="mobile-pinned-notes-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-pinned-notes-title"
            className="absolute inset-y-0 right-0 flex w-[min(22rem,calc(100%-3.5rem))] flex-col border-l border-border-main bg-bg-main text-text-main shadow-xl"
          >
            <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-border-main px-4">
              <h2 id="mobile-pinned-notes-title" className="font-medium">
                Pinned notes
              </h2>
              <button
                type="button"
                onClick={closePinnedNotes}
                aria-label="Close pinned notes"
                title="Close pinned notes"
                autoFocus
                className="flex min-h-11 min-w-11 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-hover hover:text-text-main"
              >
                <X size={22} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <PinnedNotesPanel onNoteOpen={closePinnedNotes} />
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};

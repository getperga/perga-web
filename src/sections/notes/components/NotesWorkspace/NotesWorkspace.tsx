import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Storage from '@common/utils/storage';
import { StorageKeys } from '@common/utils/storage_keys';

interface NotesWorkspaceProps {
  editor: ReactNode;
  pinnedPanel: ReactNode;
}

export const NotesWorkspace = ({ editor, pinnedPanel }: NotesWorkspaceProps) => {
  const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(() =>
    Storage.getBoolean(StorageKeys.NotesPinnedPanelOpen, true),
  );

  const togglePinnedPanel = () => {
    const newPanelState = !isPinnedPanelOpen;
    setIsPinnedPanelOpen(newPanelState);
    Storage.setBoolean(StorageKeys.NotesPinnedPanelOpen, newPanelState);
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="relative min-w-0 flex-1 pr-4">
        <div className="h-full overflow-hidden">{editor}</div>

        <button
          type="button"
          onClick={togglePinnedPanel}
          aria-label={isPinnedPanelOpen ? 'Hide pinned notes' : 'Show pinned notes'}
          aria-pressed={isPinnedPanelOpen}
          title={isPinnedPanelOpen ? 'Hide pinned notes' : 'Show pinned notes'}
          className="absolute -right-px top-6 z-10 hidden cursor-pointer rounded-l border border-gray-600 bg-bg-main p-2 text-text-muted transition-colors hover:text-text-main md:block"
          style={{ borderRightColor: 'var(--bg-main)' }}
        >
          {isPinnedPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {isPinnedPanelOpen && (
        <aside
          aria-label="Pinned notes"
          className="hidden w-60 shrink-0 flex-col border-l border-gray-600 bg-bg-main md:flex"
        >
          <div className="min-h-0 flex-1 overflow-auto">{pinnedPanel}</div>
        </aside>
      )}
    </div>
  );
};

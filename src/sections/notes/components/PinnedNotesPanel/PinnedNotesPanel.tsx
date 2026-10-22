import { PinOff } from 'lucide-react';

import { Dropdown, DropdownItem } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { useNotes } from '@notes/context';

export const PinnedNotesPanel = () => {
  const {
    rootFolder,
    pinnedNotes,
    selectedNoteId,
    setSelectedNoteId,
    focusEditor,
    handleSetNotePinned,
  } = useNotes();

  if (pinnedNotes.length === 0) {
    return (
      <div className="mt-6 flex h-8 items-center px-4 text-sm text-text-muted">
        Pinned notes will appear here
      </div>
    );
  }

  const handleOpenNote = (noteId: number) => {
    setSelectedNoteId(noteId);
    focusEditor();
  };

  return (
    <div className="space-y-1 px-2 py-4">
      {pinnedNotes.map((note) => {
        const title = note.title || 'Untitled Note';
        const folderPath = note.folderPath.join(' / ') || rootFolder?.name || 'Notes';
        const isSelected = note.id === selectedNoteId;

        return (
          <div
            key={note.id}
            className={`group flex min-w-0 items-center rounded text-text-main hover:bg-bg-hover ${
              isSelected ? 'bg-bg-hover' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => handleOpenNote(note.id)}
              aria-label={`Open ${title}`}
              aria-current={isSelected ? 'page' : undefined}
              className="min-w-0 flex-1 px-2 py-2 text-left"
            >
              <span className="block truncate text-sm" title={title}>
                {title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-text-muted" title={folderPath}>
                {folderPath}
              </span>
            </button>

            <Dropdown
              buttonIcon={<Icon name="dots" size={18} className="h-5 w-5" />}
              buttonTitle={`Actions for ${title}`}
              buttonClassName="p-2 text-text-muted opacity-0 transition-opacity hover:text-text-main group-hover:opacity-100 focus:opacity-100"
              dropdownClassName="w-36"
            >
              <DropdownItem onClick={() => void handleSetNotePinned(note.id, false)}>
                <PinOff size={14} className="mr-2 h-4 w-4" /> Unpin
              </DropdownItem>
            </Dropdown>
          </div>
        );
      })}
    </div>
  );
};

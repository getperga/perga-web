import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, PinOff } from 'lucide-react';

import { Dropdown, DropdownItem } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { useNotes } from '@notes/context';

interface PinnedNotesPanelProps {
  onNoteOpen?: () => void;
}

export const PinnedNotesPanel = ({ onNoteOpen }: PinnedNotesPanelProps) => {
  const {
    rootFolder,
    pinnedNotes,
    selectedNoteId,
    setSelectedNoteId,
    focusEditor,
    handleSetNotePinned,
    handleReorderPinnedNotes,
  } = useNotes();
  const [draggedNoteId, setDraggedNoteId] = useState<number | null>(null);
  const [orderedNoteIds, setOrderedNoteIds] = useState(() => pinnedNotes.map((note) => note.id));

  useEffect(() => {
    if (draggedNoteId === null) {
      setOrderedNoteIds(pinnedNotes.map((note) => note.id));
    }
  }, [draggedNoteId, pinnedNotes]);

  const displayedPinnedNotes = useMemo(() => {
    const notesById = new Map(pinnedNotes.map((note) => [note.id, note]));
    const orderedNotes = orderedNoteIds
      .map((noteId) => notesById.get(noteId))
      .filter((note): note is (typeof pinnedNotes)[number] => note !== undefined);
    const orderedIds = new Set(orderedNoteIds);
    return [...orderedNotes, ...pinnedNotes.filter((note) => !orderedIds.has(note.id))];
  }, [orderedNoteIds, pinnedNotes]);

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
    onNoteOpen?.();
  };

  const moveToIndex = (noteId: number, destinationIndex: number) => {
    const ids = displayedPinnedNotes.map((note) => note.id);
    const sourceIndex = ids.indexOf(noteId);
    if (sourceIndex === -1 || sourceIndex === destinationIndex) {
      return;
    }

    ids.splice(sourceIndex, 1);
    ids.splice(Math.max(0, Math.min(destinationIndex, ids.length)), 0, noteId);
    void handleReorderPinnedNotes(ids);
  };

  const handleDragOver = (targetNoteId: number) => {
    if (draggedNoteId === null || draggedNoteId === targetNoteId) {
      return;
    }

    setOrderedNoteIds((currentIds) => {
      const sourceIndex = currentIds.indexOf(draggedNoteId);
      const targetIndex = currentIds.indexOf(targetNoteId);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return currentIds;
      }

      const reorderedIds = [...currentIds];
      const [removedId] = reorderedIds.splice(sourceIndex, 1);
      reorderedIds.splice(targetIndex, 0, removedId);
      return reorderedIds;
    });
  };

  const handleDragEnd = () => {
    setDraggedNoteId(null);
    const currentIds = pinnedNotes.map((note) => note.id);
    if (
      currentIds.length === orderedNoteIds.length &&
      currentIds.some((noteId, index) => noteId !== orderedNoteIds[index])
    ) {
      void handleReorderPinnedNotes(orderedNoteIds);
    }
  };

  return (
    <div className="space-y-1 px-2 py-4">
      {displayedPinnedNotes.map((note, index) => {
        const title = note.title || 'Untitled Note';
        const folderPath = note.folderPath.join(' / ') || rootFolder?.name || 'Notes';
        const isSelected = note.id === selectedNoteId;
        const isDragged = note.id === draggedNoteId;

        return (
          <div
            key={note.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', String(note.id));
              setDraggedNoteId(note.id);
              setOrderedNoteIds(pinnedNotes.map((pinnedNote) => pinnedNote.id));
            }}
            onDragOver={(event) => {
              event.preventDefault();
              handleDragOver(note.id);
            }}
            onDragEnd={handleDragEnd}
            className={`group flex min-w-0 cursor-grab items-center rounded text-text-main transition-opacity duration-200 hover:bg-bg-hover active:cursor-grabbing ${
              isSelected ? 'bg-bg-hover' : ''
            } ${isDragged ? 'opacity-50' : 'opacity-100'}`}
          >
            <button
              type="button"
              onClick={() => handleOpenNote(note.id)}
              aria-label={`Open ${title}`}
              aria-current={isSelected ? 'page' : undefined}
              className="min-h-11 min-w-0 flex-1 px-2 py-2 text-left"
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
              buttonClassName="flex min-h-11 min-w-11 items-center justify-center p-2 text-text-muted opacity-100 transition-opacity hover:text-text-main md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              dropdownClassName="w-44"
            >
              <DropdownItem onClick={() => moveToIndex(note.id, 0)} disabled={index === 0}>
                <ChevronsUp size={14} className="mr-2 h-4 w-4" /> Move to top
              </DropdownItem>
              <DropdownItem onClick={() => moveToIndex(note.id, index - 1)} disabled={index === 0}>
                <ArrowUp size={14} className="mr-2 h-4 w-4" /> Move up
              </DropdownItem>
              <DropdownItem
                onClick={() => moveToIndex(note.id, index + 1)}
                disabled={index === displayedPinnedNotes.length - 1}
              >
                <ArrowDown size={14} className="mr-2 h-4 w-4" /> Move down
              </DropdownItem>
              <DropdownItem
                onClick={() => moveToIndex(note.id, displayedPinnedNotes.length - 1)}
                disabled={index === displayedPinnedNotes.length - 1}
              >
                <ChevronsDown size={14} className="mr-2 h-4 w-4" /> Move to bottom
              </DropdownItem>
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

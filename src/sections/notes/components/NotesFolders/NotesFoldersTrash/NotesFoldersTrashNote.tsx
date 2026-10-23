import type { NoteMetaDTO } from '@api/notes';
import { Dropdown, DropdownItem } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { useNotes } from '@notes/context';

interface NotesFoldersTrashNoteProps {
  note: NoteMetaDTO;
  rootFolderId: number;
  onMoveNote: (noteId: number, folderId: number) => Promise<void>;
  onSelectNote: (id: number) => void;
  isSelected: boolean;
  className?: string;
}

export const NotesFoldersTrashNote = ({
  note,
  rootFolderId,
  onMoveNote,
  onSelectNote,
  isSelected,
  className = '',
}: NotesFoldersTrashNoteProps) => {
  const { trashItemIds } = useNotes();
  const title = note.title || 'Untitled Note';

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('dragType', 'note');
        event.dataTransfer.setData('dragId', note.id.toString());
      }}
      onClick={() => onSelectNote(note.id)}
      className={`group flex cursor-pointer items-center rounded text-text-main hover:bg-bg-hover ${
        isSelected ? 'bg-bg-hover' : ''
      } ${className}`}
    >
      <div
        className={`flex min-w-0 flex-1 items-center p-2 ${
          trashItemIds.noteIds.includes(note.id) ? 'opacity-50' : ''
        }`}
      >
        <Icon name="note" size="16" fill="currentColor" className="mr-2 shrink-0 opacity-70" />
        <span className="truncate">{title}</span>
      </div>

      <Dropdown
        buttonIcon={<Icon name="dots" size={20} className="h-6 w-6" />}
        buttonTitle="Note actions"
        buttonClassName="flex min-h-11 min-w-11 items-center justify-center p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        dropdownClassName="w-40"
      >
        <DropdownItem onClick={() => void onMoveNote(note.id, rootFolderId)}>
          <Icon name="refresh" size={14} className="mr-2 h-4 w-4" /> Restore
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

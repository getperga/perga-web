import { TwoPaneLayout } from '@common/components/TwoPaneLayout';
import { StorageKeys } from '@common/utils/storage_keys';
import { NotesFolders } from '@notes/components/NotesFolders/NotesFolders';
import { NotesEditor } from '@notes/components/NotesEditor/NotesEditor';
import { useNotes } from '@notes/context';

const DEFAULT_LEFT_PANE_WIDTH_PERCENT = 20; // w-1/5
const MIN_LEFT_PANE_WIDTH_PERCENT = 15;
const MAX_LEFT_PANE_WIDTH_PERCENT = 30;

const Notes = () => {
  const { selectedNote, handleUpdateNote } = useNotes();

  return (
    <TwoPaneLayout
      storageKey={StorageKeys.NotesLeftPaneWidth}
      defaultLeftWidthPercent={DEFAULT_LEFT_PANE_WIDTH_PERCENT}
      minLeftWidthPercent={MIN_LEFT_PANE_WIDTH_PERCENT}
      maxLeftWidthPercent={MAX_LEFT_PANE_WIDTH_PERCENT}
      leftPane={<NotesFolders />}
      rightPane={<NotesEditor note={selectedNote} onUpdate={handleUpdateNote} />}
    />
  );
};

export default Notes;

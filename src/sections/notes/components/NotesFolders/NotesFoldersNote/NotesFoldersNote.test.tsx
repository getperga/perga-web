import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoteMetaDTO } from '@api/notes';
import { NotesFoldersNote } from './NotesFoldersNote';

const notesContext = vi.hoisted(() => ({
  trashItemIds: { folderIds: [] as number[], noteIds: [] as number[] },
  focusEditor: vi.fn(),
  handleSetNotePinned: vi.fn(),
}));

vi.mock('@notes/context', () => ({
  useNotes: () => notesContext,
}));

const note: NoteMetaDTO = {
  id: 1,
  folder_id: 1,
  title: 'Test note',
  updated_dt: '2026-01-01T00:00:00Z',
  is_pinned: false,
};

const renderNote = (currentNote: NoteMetaDTO = note) =>
  render(
    <NotesFoldersNote
      note={currentNote}
      onRename={vi.fn()}
      onMoveToTrash={vi.fn()}
      onExport={vi.fn()}
      onSelect={vi.fn()}
    />,
  );

describe('NotesFoldersNote pin action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notesContext.trashItemIds.noteIds = [];
  });

  it('pins and unpins a note from the actions menu', () => {
    const { rerender } = renderNote();

    fireEvent.click(screen.getByRole('button', { name: 'Note actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(notesContext.handleSetNotePinned).toHaveBeenCalledWith(note.id, true);

    rerender(
      <NotesFoldersNote
        note={{ ...note, is_pinned: true }}
        onRename={vi.fn()}
        onMoveToTrash={vi.fn()}
        onExport={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Note actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(notesContext.handleSetNotePinned).toHaveBeenCalledWith(note.id, false);
  });

  it('hides the pin action in Trash', () => {
    notesContext.trashItemIds.noteIds = [note.id];
    renderNote();

    fireEvent.click(screen.getByRole('button', { name: 'Note actions' }));

    expect(screen.queryByRole('button', { name: 'Pin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Unpin' })).toBeNull();
  });
});

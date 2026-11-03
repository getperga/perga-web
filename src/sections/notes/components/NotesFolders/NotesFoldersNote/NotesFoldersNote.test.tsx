import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoteMetaDTO } from '@api/notes';
import { NotesFoldersNote } from './NotesFoldersNote';

const notesContext = vi.hoisted(() => ({
  rootFolder: {
    id: 1,
    parent_id: null,
    folder_type: 'root',
    name: 'Notes',
    notes: [],
    subfolders: [
      {
        id: 2,
        parent_id: 1,
        folder_type: 'regular',
        name: 'Projects',
        notes: [],
        subfolders: [],
      },
    ],
  },
  trashItemIds: { folderIds: [] as number[], noteIds: [] as number[] },
  focusEditor: vi.fn(),
  handleSetNotePinned: vi.fn(),
  handleDuplicateNote: vi.fn(),
  handleMoveNote: vi.fn(),
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

  it('keeps the actions button visible and touch-friendly on mobile', () => {
    renderNote();

    const actionsButton = screen.getByRole('button', { name: 'Note actions' });
    expect(actionsButton.className).toContain('opacity-100');
    expect(actionsButton.className).toContain('md:opacity-0');
    expect(actionsButton.className).toContain('min-h-11');
    expect(actionsButton.className).toContain('min-w-11');
  });

  it('hides the pin action in Trash', () => {
    notesContext.trashItemIds.noteIds = [note.id];
    renderNote();

    fireEvent.click(screen.getByRole('button', { name: 'Note actions' }));

    expect(screen.queryByRole('button', { name: 'Pin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Unpin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
  });

  it('duplicates a note from the actions menu', () => {
    renderNote();

    fireEvent.click(screen.getByRole('button', { name: 'Note actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    expect(notesContext.handleDuplicateNote).toHaveBeenCalledWith(note.id);
  });

  it('moves a note from the actions submenu', () => {
    renderNote();

    fireEvent.click(screen.getByRole('button', { name: 'Note actions' }));
    fireEvent.click(screen.getByText('Move to…'));
    expect((screen.getByRole('button', { name: 'Move to Notes' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move to Projects' }));

    expect(notesContext.handleMoveNote).toHaveBeenCalledWith(note.id, 2);
  });
});

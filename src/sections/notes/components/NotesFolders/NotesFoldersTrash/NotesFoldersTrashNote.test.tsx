import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NoteMetaDTO } from '@api/notes';
import { NotesFoldersTrashNote } from './NotesFoldersTrashNote';

vi.mock('@notes/context', () => ({
  useNotes: () => ({ trashItemIds: { folderIds: [], noteIds: [7] } }),
}));

const note: NoteMetaDTO = {
  id: 7,
  folder_id: 9,
  title: 'Deleted note',
  updated_dt: '2026-10-23T00:00:00Z',
  is_pinned: false,
};

describe('NotesFoldersTrashNote', () => {
  it('restores a trashed note to Root from its only action', () => {
    const onMoveNote = vi.fn().mockResolvedValue(undefined);
    const onSelectNote = vi.fn();

    render(
      <NotesFoldersTrashNote
        note={note}
        rootFolderId={1}
        onMoveNote={onMoveNote}
        onSelectNote={onSelectNote}
        isSelected={false}
      />,
    );

    const actionsButton = screen.getByRole('button', { name: 'Note actions' });
    expect(actionsButton.className).toContain('opacity-100');
    expect(actionsButton.className).toContain('min-h-11');

    fireEvent.click(actionsButton);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

    expect(onMoveNote).toHaveBeenCalledWith(note.id, 1);
    expect(onSelectNote).not.toHaveBeenCalled();
  });
});

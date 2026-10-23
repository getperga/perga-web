import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotes } from '@notes/context';
import { PinnedNotesPanel } from './PinnedNotesPanel';

vi.mock('@notes/context', () => ({
  useNotes: vi.fn(),
}));

const useNotesMock = vi.mocked(useNotes);
const setSelectedNoteId = vi.fn();
const focusEditor = vi.fn();
const handleSetNotePinned = vi.fn();

const notesState = {
  rootFolder: { name: 'Notes' },
  pinnedNotes: [
    {
      id: 2,
      folder_id: 4,
      title: 'Project decisions',
      updated_dt: '2026-03-01T00:00:00Z',
      is_pinned: true,
      folderPath: ['Projects', 'Perga'],
    },
    {
      id: 1,
      folder_id: 1,
      title: '',
      updated_dt: '2026-02-01T00:00:00Z',
      is_pinned: true,
      folderPath: [],
    },
  ],
  selectedNoteId: 2,
  setSelectedNoteId,
  focusEditor,
  handleSetNotePinned,
};

describe('PinnedNotesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotesMock.mockReturnValue(notesState as unknown as ReturnType<typeof useNotes>);
  });

  it('renders pinned notes, folder paths, tooltips, and selected state', () => {
    render(<PinnedNotesPanel />);

    const selectedNote = screen.getByRole('button', { name: 'Open Project decisions' });
    expect(selectedNote.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Project decisions').getAttribute('title')).toBe('Project decisions');
    expect(screen.getByText('Projects / Perga').getAttribute('title')).toBe('Projects / Perga');
    expect(screen.getByText('Untitled Note')).toBeDefined();
    expect(screen.getByText('Notes')).toBeDefined();
    expect(selectedNote.className).toContain('min-h-11');
    expect(
      screen.getByRole('button', { name: 'Actions for Project decisions' }).className,
    ).toContain('opacity-100');
  });

  it('selects a note through history and requests editor focus', () => {
    const onNoteOpen = vi.fn();
    render(<PinnedNotesPanel onNoteOpen={onNoteOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Untitled Note' }));

    expect(setSelectedNoteId).toHaveBeenCalledWith(1);
    expect(focusEditor).toHaveBeenCalledTimes(1);
    expect(onNoteOpen).toHaveBeenCalledTimes(1);
  });

  it('unpins a note from its actions menu without selecting it', () => {
    render(<PinnedNotesPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Project decisions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));

    expect(handleSetNotePinned).toHaveBeenCalledWith(2, false);
    expect(setSelectedNoteId).not.toHaveBeenCalled();
    expect(focusEditor).not.toHaveBeenCalled();
  });

  it('keeps the compact empty state at the top of the panel', () => {
    useNotesMock.mockReturnValue({
      ...notesState,
      pinnedNotes: [],
    } as unknown as ReturnType<typeof useNotes>);

    render(<PinnedNotesPanel />);

    const emptyState = screen.getByText('Pinned notes will appear here');
    expect(emptyState.className).toContain('mt-6');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

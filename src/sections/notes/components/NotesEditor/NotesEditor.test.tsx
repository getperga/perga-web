import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { NotesEditor } from './NotesEditor';
import type { NoteDTO } from '@api/notes';
import { saveNoteFindQueryToStorage } from '@notes/utils';

const notesContext = vi.hoisted(() => ({
  trashItemIds: { folderIds: [] as number[], noteIds: [] as number[] },
  focusTrigger: 0,
  titleFocusNoteId: null as number | null,
  clearTitleFocusRequest: vi.fn(),
  findInputFocusNoteId: null as number | null,
  clearFindInputFocusRequest: vi.fn(),
  findQueryTrigger: 0,
  canOpenPreviousNote: false,
  canOpenNextNote: false,
  openPreviousNote: vi.fn(),
  openNextNote: vi.fn(),
  handleSetNotePinned: vi.fn(),
}));

vi.mock('@notes/context', () => ({
  useNotes: () => notesContext,
}));

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const note: NoteDTO = {
  id: 1,
  title: 'Test note',
  body: '<p>the quick fox jumps over the lazy fox and then the fox runs</p>',
  folder_id: 1,
  updated_dt: '2026-01-01T00:00:00Z',
  is_pinned: false,
};

describe('NotesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notesContext.canOpenPreviousNote = false;
    notesContext.canOpenNextNote = false;
  });

  it('pins the current note from the editor toolbar', () => {
    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pin note' }));

    expect(notesContext.handleSetNotePinned).toHaveBeenCalledWith(note.id, true);
  });

  it('does not show the toolbar pin action for a note in Trash', () => {
    notesContext.trashItemIds.noteIds = [note.id];

    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    expect(screen.queryByRole('button', { name: 'Pin note' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Note is in Trash' })).toBeDefined();
    notesContext.trashItemIds.noteIds = [];
  });

  it('renders note history navigation and handles enabled buttons', () => {
    notesContext.canOpenPreviousNote = true;
    notesContext.canOpenNextNote = true;

    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next note' }));

    expect(notesContext.openPreviousNote).toHaveBeenCalledOnce();
    expect(notesContext.openNextNote).toHaveBeenCalledOnce();

    notesContext.canOpenPreviousNote = false;
    notesContext.canOpenNextNote = false;
  });

  it('focuses the title when the newly created note is loaded', () => {
    notesContext.titleFocusNoteId = note.id;

    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    expect(document.activeElement).toBe(screen.getByPlaceholderText('Note title'));
    expect(notesContext.clearTitleFocusRequest).toHaveBeenCalledWith(note.id);

    notesContext.titleFocusNoteId = null;
  });

  it('focuses the note search input after opening a result from the search palette', async () => {
    saveNoteFindQueryToStorage(note.id, 'fox');
    notesContext.findInputFocusNoteId = note.id;
    notesContext.findQueryTrigger += 1;

    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    const findInput = await screen.findByPlaceholderText('Find in note...');
    await waitFor(() => expect(document.activeElement).toBe(findInput));
    expect(notesContext.clearFindInputFocusRequest).toHaveBeenCalledWith(note.id);

    notesContext.findInputFocusNoteId = null;
    saveNoteFindQueryToStorage(note.id, '');
  });

  it('highlights all matches, cycles current match, and clears on close', async () => {
    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    fireEvent.click(screen.getByTitle('Find in note (Ctrl+F)'));
    const input = screen.getByPlaceholderText('Find in note...');
    fireEvent.change(input, { target: { value: 'fox' } });

    await waitFor(() => {
      expect(document.querySelectorAll('.note-find-match, .note-find-current').length).toBe(3);
    });
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(document.querySelectorAll('.note-find-current').length).toBe(1);

    fireEvent.click(screen.getByTitle('Next match'));
    await waitFor(() => expect(screen.getByText('2/3')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Next match'));
    await waitFor(() => expect(screen.getByText('3/3')).toBeTruthy());

    // wraps around
    fireEvent.click(screen.getByTitle('Next match'));
    await waitFor(() => expect(screen.getByText('1/3')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Previous match'));
    await waitFor(() => expect(screen.getByText('3/3')).toBeTruthy());

    fireEvent.click(screen.getByTitle('Close find'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Find in note...')).toBeNull();
      expect(document.querySelectorAll('.note-find-match, .note-find-current').length).toBe(0);
    });
  });

  it('navigates history with Alt+arrows from the title and editor', () => {
    notesContext.canOpenPreviousNote = true;
    notesContext.canOpenNextNote = true;
    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    expect(
      fireEvent.keyDown(screen.getByPlaceholderText('Note title'), {
        key: 'ArrowLeft',
        altKey: true,
      }),
    ).toBe(false);
    expect(
      fireEvent.keyDown(document.querySelector('.tiptap')!, {
        key: 'ArrowRight',
        altKey: true,
      }),
    ).toBe(false);

    expect(notesContext.openPreviousNote).toHaveBeenCalledOnce();
    expect(notesContext.openNextNote).toHaveBeenCalledOnce();
    expect(screen.getByTitle('Previous note (Alt+Left)')).toBeDefined();
    expect(screen.getByTitle('Next note (Alt+Right)')).toBeDefined();
  });

  it('blocks browser navigation at history boundaries and uses updated availability', () => {
    const { rerender } = render(<NotesEditor note={note} onUpdate={async () => {}} />);

    for (const key of ['ArrowLeft', 'ArrowRight']) {
      expect(fireEvent.keyDown(window, { key, altKey: true })).toBe(false);
    }
    expect(notesContext.openPreviousNote).not.toHaveBeenCalled();
    expect(notesContext.openNextNote).not.toHaveBeenCalled();

    notesContext.canOpenPreviousNote = true;
    rerender(<NotesEditor note={note} onUpdate={async () => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(notesContext.openPreviousNote).toHaveBeenCalledOnce();
  });

  it('leaves other arrow shortcuts unchanged and removes its listener on unmount', () => {
    notesContext.canOpenPreviousNote = true;
    notesContext.canOpenNextNote = true;
    const { unmount } = render(<NotesEditor note={note} onUpdate={async () => {}} />);

    for (const modifiers of [
      {},
      { altKey: true, shiftKey: true },
      { altKey: true, ctrlKey: true },
      { altKey: true, metaKey: true },
      { altKey: true, isComposing: true },
    ]) {
      expect(fireEvent.keyDown(window, { key: 'ArrowLeft', ...modifiers })).toBe(true);
    }
    const handledEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      altKey: true,
      cancelable: true,
    });
    handledEvent.preventDefault();
    fireEvent(window, handledEvent);
    expect(notesContext.openPreviousNote).not.toHaveBeenCalled();

    unmount();
    expect(fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })).toBe(true);
    expect(notesContext.openNextNote).not.toHaveBeenCalled();
  });

  it('does not intercept history shortcuts when no note is selected', () => {
    render(<NotesEditor note={null} onUpdate={async () => {}} />);
    expect(fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })).toBe(true);
    expect(notesContext.openPreviousNote).not.toHaveBeenCalled();
  });

});

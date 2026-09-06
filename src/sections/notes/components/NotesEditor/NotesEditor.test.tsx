import { describe, it, expect, vi } from 'vitest';
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
} as NoteDTO;

describe('NotesEditor find in note', () => {
  it('renders note history navigation and handles enabled buttons', () => {
    notesContext.canOpenPreviousNote = true;
    notesContext.canOpenNextNote = true;

    render(<NotesEditor note={note} onUpdate={async () => {}} />);

    fireEvent.click(screen.getByTitle('Previous note'));
    fireEvent.click(screen.getByTitle('Next note'));

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
});

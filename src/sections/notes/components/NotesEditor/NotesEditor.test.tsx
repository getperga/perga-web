import { beforeEach, describe, it, expect, vi } from 'vitest';
import { StrictMode, type ComponentProps } from 'react';
import type { Editor } from '@tiptap/react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { NotesEditor } from './NotesEditor';
import type { NoteDTO } from '@api/notes';
import { saveNoteFindQueryToStorage } from '@notes/utils';

const editorInstance = vi.hoisted(() => ({ current: null as Editor | null }));
const uploadNoteAttachment = vi.hoisted(() => vi.fn());
vi.mock('@api/notes/notesAttachments.service', () => {
  return { uploadNoteAttachment, getNoteAttachmentContent: vi.fn(() => Promise.reject()) };
});

vi.mock('@/config', () => {
  return {
    getConfig: () => {
      return { API_BASE_URL: '/api/v1' };
    },
  };
});

vi.mock('@tiptap/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/react')>();
  return {
    ...actual,
    useEditor: (...args: Parameters<typeof actual.useEditor>) => {
      const editor = actual.useEditor(...args);
      editorInstance.current = editor;
      return editor;
    },
  };
});

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

const imageFile = new File(['image bytes'], 'screenshot.png', { type: 'image/png' });
const uploadedImage = {
  data: {
    id: 42,
    url: '/api/v1/notes/1/attachments/42/content/',
    original_filename: imageFile.name,
  },
};

describe('NotesEditor', () => {
  it('waits for a live editor replacement before synchronizing a note', async () => {
    const onUpdate = async () => {};
    const { rerender } = render(<NotesEditor note={note} onUpdate={onUpdate} />);
    editorInstance.current?.destroy();
    const nextNote = { ...note, id: 2, body: '<p>Replacement editor content</p>' };
    rerender(<NotesEditor note={nextNote} onUpdate={onUpdate} />);
    await waitFor(() => {
      expect(document.querySelector('.tiptap')?.textContent).toBe('Replacement editor content');
    });
  });
  it('reopens a selected note after leaving the notes screen', async () => {
    const first = render(
      <StrictMode>
        <NotesEditor note={note} onUpdate={async () => {}} />
      </StrictMode>,
    );
    first.unmount();
    render(
      <StrictMode>
        <NotesEditor note={note} onUpdate={async () => {}} />
      </StrictMode>,
    );
    await waitFor(() => {
      expect(document.querySelector('.tiptap')?.textContent).toContain('quick fox');
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    uploadNoteAttachment.mockReset().mockResolvedValue(uploadedImage);
    notesContext.canOpenPreviousNote = false;
    notesContext.canOpenNextNote = false;
  });

  it('inserts a selected file and autosaves the attachment URL and ID', async () => {
    const onUpdate = vi.fn<ComponentProps<typeof NotesEditor>['onUpdate']>(async () => {});
    const { container } = render(<NotesEditor note={note} onUpdate={onUpdate} />);
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!;
    const openPicker = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    expect(openPicker).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { files: [imageFile] } });

    await waitFor(
      () => {
        expect(onUpdate).toHaveBeenCalledWith(
          note.id,
          undefined,
          expect.stringContaining(`src="${uploadedImage.data.url}"`),
        );
      },
      { timeout: 2000 },
    );
    expect(onUpdate.mock.lastCall?.[2]).toContain('data-attachment-id="42"');
    expect(uploadNoteAttachment).toHaveBeenCalledWith(note.id, imageFile, expect.any(AbortSignal));
  });

  it('keeps the drop position when text changes during the upload', async () => {
    const { container } = render(<NotesEditor note={note} onUpdate={async () => {}} />);
    vi.spyOn(editorInstance.current!.view, 'posAtCoords').mockReturnValue({ pos: 5, inside: 0 });
    fireEvent.drop(container.querySelector('.tiptap')!, { dataTransfer: { files: [imageFile] } });
    act(() => {
      editorInstance.current?.commands.insertContentAt(1, 'Before ');
    });
    await waitFor(() => {
      expect(editorInstance.current?.getHTML()).toContain('<p>Before the <img');
    });
  });

  it('cancels a clipboard upload on note switch and ignores a late response', async () => {
    let finishUpload!: (response: typeof uploadedImage) => void;
    uploadNoteAttachment.mockImplementation(() => {
      return new Promise((resolve) => {
        finishUpload = resolve;
      });
    });
    const onUpdate = vi.fn(async () => {});
    const { container, rerender } = render(<NotesEditor note={note} onUpdate={onUpdate} />);
    fireEvent.paste(container.querySelector('.tiptap')!, { clipboardData: { files: [imageFile] } });
    expect(screen.getByText('Uploading images…')).toBeDefined();
    act(() => {
      editorInstance.current?.commands.insertContentAt(1, 'Edited ');
    });
    const signal = uploadNoteAttachment.mock.lastCall?.[2];
    rerender(
      <NotesEditor note={{ ...note, id: 2, body: '<p>Another note</p>' }} onUpdate={onUpdate} />,
    );
    expect(signal.aborted).toBe(true);
    expect(onUpdate).toHaveBeenCalledWith(note.id, undefined, expect.stringContaining('Edited '));
    await act(async () => {
      finishUpload(uploadedImage);
    });
    expect(editorInstance.current?.getHTML()).toBe('<p>Another note</p>');
    expect(screen.queryByText('Uploading images…')).toBeNull();
  });

  it('autosaves the current body when image insertion is undone before leaving the note', async () => {
    const onUpdate = vi.fn(async () => {});
    const { container, unmount } = render(<NotesEditor note={note} onUpdate={onUpdate} />);
    fireEvent.paste(container.querySelector('.tiptap')!, { clipboardData: { files: [imageFile] } });
    await waitFor(() => {
      expect(editorInstance.current?.getHTML()).toContain('data-attachment-id="42"');
    });
    act(() => {
      editorInstance.current?.commands.undo();
    });
    unmount();
    expect(onUpdate).toHaveBeenLastCalledWith(note.id, undefined, note.body);
  });

  it('shows the upload limit error without inserting an image', async () => {
    uploadNoteAttachment.mockRejectedValue({
      isAxiosError: true,
      response: { status: 413, data: { detail: 'Attachment exceeds file size limit' } },
    });
    const { container } = render(<NotesEditor note={note} onUpdate={async () => {}} />);
    fireEvent.paste(container.querySelector('.tiptap')!, { clipboardData: { files: [imageFile] } });
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Attachment exceeds file size limit',
    );
    expect(editorInstance.current?.getHTML()).toBe(note.body);
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

  it('autosaves removal and restores the same attachment when the user undoes it', async () => {
    const src = uploadedImage.data.url;
    const body = `<p>Before<img src="${src}" data-attachment-id="42">After</p>`;
    const onUpdate = vi.fn<ComponentProps<typeof NotesEditor>['onUpdate']>(async () => {});
    const { unmount } = render(<NotesEditor note={{ ...note, body }} onUpdate={onUpdate} />);

    act(() => {
      const editor = editorInstance.current!;
      const imagePosition = 1 + 'Before'.length;
      editor.commands.setNodeSelection(imagePosition);
      editor.commands.deleteSelection();
    });
    await waitFor(
      () => {
        expect(onUpdate).toHaveBeenLastCalledWith(note.id, undefined, '<p>BeforeAfter</p>');
      },
      { timeout: 2000 },
    );

    act(() => {
      editorInstance.current?.commands.undo();
    });
    unmount();
    expect(onUpdate.mock.lastCall?.[2]).toContain(`src="${src}"`);
    expect(onUpdate.mock.lastCall?.[2]).toContain('data-attachment-id="42"');
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(uploadNoteAttachment).not.toHaveBeenCalled();
  });

  it('does not undo edits from a previously opened note', () => {
    const onUpdate = vi.fn(async () => {});
    const { rerender } = render(<NotesEditor note={note} onUpdate={onUpdate} />);
    act(() => {
      editorInstance.current?.commands.insertContentAt(1, 'Edited ');
    });
    const nextNote = { ...note, id: 2, body: '<p>Another note</p>' };
    rerender(<NotesEditor note={nextNote} onUpdate={onUpdate} />);
    expect(editorInstance.current?.commands.undo()).toBe(false);
    expect(editorInstance.current?.getHTML()).toBe(nextNote.body);
  });

});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKeys } from '@common/utils/storage_keys';
import { useNotesState } from './useNotesState';

const apiMocks = vi.hoisted(() => ({
  getFolders: vi.fn(),
  getNote: vi.fn(),
  updateNote: vi.fn(),
}));

vi.mock('@api/notes', () => ({
  getFolders: apiMocks.getFolders,
  getNote: apiMocks.getNote,
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  createNote: vi.fn(),
  updateNote: apiMocks.updateNote,
  emptyTrash: vi.fn(),
  exportNotes: vi.fn(),
  importNotes: vi.fn(),
}));

const notes = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  folder_id: 1,
  title: `Note ${index + 1}`,
  updated_dt: '2026-01-01T00:00:00Z',
}));

const foldersResponse = {
  root_folder: {
    id: 1,
    parent_id: null,
    folder_type: 'root',
    name: 'Notes',
    notes,
    subfolders: [],
  },
  trash_folder: {
    id: 2,
    parent_id: null,
    folder_type: 'trash',
    name: 'Trash',
    notes: [],
    subfolders: [],
  },
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('useNotesState note history', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    apiMocks.getFolders.mockResolvedValue({ data: foldersResponse });
    apiMocks.getNote.mockImplementation((id: number) =>
      Promise.resolve({ data: { ...notes[id - 1], body: '' } }),
    );
    apiMocks.updateNote.mockImplementation(
      (id: number, changes: { title?: string; body?: string }) =>
        Promise.resolve({
          data: {
            ...notes[id - 1],
            title: changes.title ?? notes[id - 1]?.title ?? '',
            body: changes.body ?? '',
            updated_dt: '2026-02-01T00:00:00Z',
          },
        }),
    );
  });

  it('keeps the latest 50 ids and supports previous, next, and branched navigation', async () => {
    const { result } = renderHook(() => useNotesState());

    act(() => {
      for (let noteId = 1; noteId <= 55; noteId += 1) {
        result.current.setSelectedNoteId(noteId);
      }
    });

    await waitFor(() => expect(result.current.selectedNoteId).toBe(55));
    expect(JSON.parse(localStorage.getItem(StorageKeys.NotesHistory) ?? '[]')).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 6),
    );
    expect(result.current.canOpenPreviousNote).toBe(true);
    expect(result.current.canOpenNextNote).toBe(false);

    act(() => result.current.openPreviousNote());
    expect(result.current.selectedNoteId).toBe(54);
    expect(result.current.canOpenNextNote).toBe(true);

    act(() => result.current.openNextNote());
    expect(result.current.selectedNoteId).toBe(55);

    act(() => result.current.openPreviousNote());
    act(() => result.current.setSelectedNoteId(99));
    expect(result.current.selectedNoteId).toBe(99);
    expect(result.current.canOpenNextNote).toBe(false);
    expect(JSON.parse(localStorage.getItem(StorageKeys.NotesHistory) ?? '[]').slice(-2)).toEqual([
      54, 99,
    ]);
  });

  it('exposes the 10 most recently visited existing notes without duplicates', async () => {
    const { result } = renderHook(() => useNotesState());

    act(() => {
      for (let noteId = 1; noteId <= 12; noteId += 1) {
        result.current.setSelectedNoteId(noteId);
      }
      result.current.setSelectedNoteId(11);
    });

    await waitFor(() => expect(result.current.recentNotes).toHaveLength(10));
    expect(result.current.recentNotes.map((note) => note.id)).toEqual([
      11, 12, 10, 9, 8, 7, 6, 5, 4, 3,
    ]);
  });

  it('aborts the previous request when another note is selected', async () => {
    const first = deferred<{ data: (typeof notes)[number] & { body: string } }>();
    const second = deferred<{ data: (typeof notes)[number] & { body: string } }>();
    apiMocks.getNote.mockImplementation((id: number) =>
      id === 1 ? first.promise : second.promise,
    );

    const { result } = renderHook(() => useNotesState());

    act(() => result.current.setSelectedNoteId(1));
    await waitFor(() => expect(apiMocks.getNote.mock.calls[0]?.[0]).toBe(1));
    act(() => result.current.setSelectedNoteId(2));
    await waitFor(() => expect(apiMocks.getNote.mock.calls[1]?.[0]).toBe(2));
    expect(apiMocks.getNote.mock.calls[0]?.[1].aborted).toBe(true);

    await act(async () => second.resolve({ data: { ...notes[1], body: 'second' } }));
    expect(result.current.selectedNote?.id).toBe(2);
  });

  it('reloads the folders tree after updating or renaming a note', async () => {
    const { result } = renderHook(() => useNotesState());
    await waitFor(() => expect(result.current.rootFolder).not.toBeNull());
    expect(apiMocks.getFolders).toHaveBeenCalledTimes(1);

    await act(async () => result.current.handleUpdateNote(2, undefined, '<p>Body</p>'));
    expect(apiMocks.getFolders).toHaveBeenCalledTimes(2);

    await act(async () => result.current.handleRenameNote(2, 'Updated title'));
    expect(apiMocks.getFolders).toHaveBeenCalledTimes(3);
  });

  it('does not load selected note content while the editor route is inactive', async () => {
    localStorage.setItem(StorageKeys.NotesSelectedNoteId, '1');
    const { rerender } = renderHook(({ loadSelectedNote }) => useNotesState({ loadSelectedNote }), {
      initialProps: { loadSelectedNote: false },
    });

    await waitFor(() => expect(apiMocks.getFolders).toHaveBeenCalledTimes(1));
    expect(apiMocks.getNote).not.toHaveBeenCalled();

    rerender({ loadSelectedNote: true });
    await waitFor(() => expect(apiMocks.getNote).toHaveBeenCalledWith(1, expect.any(AbortSignal)));
  });
});

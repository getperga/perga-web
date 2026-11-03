import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoteSearchResultDTO } from '@api/notes';

import { SearchModal } from './SearchModal';

const apiMocks = vi.hoisted(() => ({
  searchNotes: vi.fn(),
}));

const notesContext = vi.hoisted(() => ({
  openNoteFromSearch: vi.fn(),
  setSelectedNoteId: vi.fn(),
  recentNotes: [
    {
      id: 42,
      folder_id: 1,
      title: 'Recent note',
      updated_dt: '2026-01-01T00:00:00Z',
      is_pinned: false,
    },
  ],
}));

vi.mock('@notes/context', () => ({
  useNotes: () => notesContext,
}));

vi.mock('@api/notes', () => ({
  searchNotes: apiMocks.searchNotes,
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const searchResult = (overrides: Partial<NoteSearchResultDTO> = {}): NoteSearchResultDTO => ({
  id: 7,
  folder_id: 1,
  title: 'Project roadmap',
  updated_dt: '2026-01-01T00:00:00Z',
  is_pinned: false,
  folders_path: [],
  matched_in_title: true,
  matched_in_body: false,
  match_kind: 'exact',
  find_query: null,
  ...overrides,
});

describe('SearchModal keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('follows the visible section-first order', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <SearchModal isOpen onClose={onClose} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Search notes or jump to a section...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(notesContext.setSelectedNoteId).toHaveBeenCalledWith(42);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not show an empty result early and aborts an outdated request', async () => {
    vi.useFakeTimers();
    const first = deferred<{
      data: Array<{ id: number; title: string; folders_path: string[] }>;
    }>();
    const second = deferred<{
      data: Array<{ id: number; title: string; folders_path: string[] }>;
    }>();
    apiMocks.searchNotes.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    render(
      <MemoryRouter>
        <SearchModal isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('Search notes or jump to a section...');
    fireEvent.change(input, { target: { value: 'old' } });
    expect(screen.queryByText('No notes found')).toBeNull();
    await act(async () => vi.advanceTimersByTime(300));

    fireEvent.change(input, { target: { value: 'new' } });
    await act(async () => vi.advanceTimersByTime(300));
    expect(apiMocks.searchNotes.mock.calls[0][1].aborted).toBe(true);

    await act(async () => second.resolve({ data: [] }));
    expect(screen.getByText('No notes found')).toBeTruthy();

    expect(screen.getByText('No notes found')).toBeTruthy();
  });

  it('opens a title-only result without opening find in note', async () => {
    vi.useFakeTimers();
    apiMocks.searchNotes.mockResolvedValue({ data: [searchResult()] });

    render(
      <MemoryRouter>
        <SearchModal isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Search notes or jump to a section...'), {
      target: { value: 'roadmap' },
    });
    await act(async () => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByText('Project roadmap'));

    expect(notesContext.setSelectedNoteId).toHaveBeenCalledWith(7);
    expect(notesContext.openNoteFromSearch).not.toHaveBeenCalled();
  });

  it('opens find in note when the API returns a literal body query', async () => {
    vi.useFakeTimers();
    apiMocks.searchNotes.mockResolvedValue({
      data: [
        searchResult({
          matched_in_title: false,
          matched_in_body: true,
          find_query: 'roadmap',
        }),
      ],
    });

    render(
      <MemoryRouter>
        <SearchModal isOpen onClose={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Search notes or jump to a section...'), {
      target: { value: 'roadmap' },
    });
    await act(async () => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByText('Project roadmap'));

    expect(notesContext.openNoteFromSearch).toHaveBeenCalledWith(7, 'roadmap');
    expect(notesContext.setSelectedNoteId).not.toHaveBeenCalled();
  });
});

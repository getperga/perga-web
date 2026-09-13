import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('SearchModal keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.useRealTimers();
  });
});

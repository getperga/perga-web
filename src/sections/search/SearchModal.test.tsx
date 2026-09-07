import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SearchModal } from './SearchModal';

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
  searchNotes: vi.fn(),
}));

describe('SearchModal keyboard navigation', () => {
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
});

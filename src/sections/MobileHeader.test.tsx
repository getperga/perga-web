import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { MobileHeader } from './MobileHeader';

vi.mock('@notes/components/PinnedNotesPanel', () => ({
  PinnedNotesPanel: ({ onNoteOpen }: { onNoteOpen?: () => void }) => (
    <button type="button" onClick={onNoteOpen}>
      Open example note
    </button>
  ),
}));

const renderHeader = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <MobileHeader toggleSidebar={vi.fn()} />
    </MemoryRouter>,
  );

describe('MobileHeader pinned notes drawer', () => {
  it('only exposes pinned notes from the Notes route', () => {
    const { unmount } = renderHeader('/planner/');
    expect(screen.queryByRole('button', { name: 'Open pinned notes' })).toBeNull();

    unmount();
    renderHeader('/notes/');
    expect(screen.getByRole('button', { name: 'Open pinned notes' })).toBeDefined();
  });

  it('opens the drawer and closes it after selecting a note', () => {
    renderHeader('/notes/');
    const openButton = screen.getByRole('button', { name: 'Open pinned notes' });

    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Pinned notes' })).toBeDefined();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Open example note' }));

    expect(screen.queryByRole('dialog', { name: 'Pinned notes' })).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(openButton);
  });

  it('closes the drawer with Escape and returns focus to its trigger', () => {
    renderHeader('/notes/');
    const openButton = screen.getByRole('button', { name: 'Open pinned notes' });
    fireEvent.click(openButton);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Pinned notes' })).toBeNull();
    expect(document.activeElement).toBe(openButton);
  });

  it('closes the drawer from its backdrop', () => {
    renderHeader('/notes/');
    const openButton = screen.getByRole('button', { name: 'Open pinned notes' });
    fireEvent.click(openButton);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss pinned notes' }));

    expect(screen.queryByRole('dialog', { name: 'Pinned notes' })).toBeNull();
    expect(document.activeElement).toBe(openButton);
  });
});

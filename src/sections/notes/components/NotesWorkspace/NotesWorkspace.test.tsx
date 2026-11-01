import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageKeys } from '@common/utils/storage_keys';

import { NotesWorkspace } from './NotesWorkspace';

describe('NotesWorkspace', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the editor with the pinned notes panel closed by default', () => {
    render(
      <NotesWorkspace
        editor={<div>Note editor</div>}
        pinnedPanel={<div>Pinned notes content</div>}
      />,
    );

    expect(screen.getByText('Note editor')).toBeDefined();
    expect(screen.queryByText('Pinned notes content')).toBeNull();
    expect(screen.queryByLabelText('Pinned notes')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show pinned notes' })).toBeDefined();
  });

  it('shows and hides the pinned notes panel without moving its toggle', () => {
    render(
      <NotesWorkspace
        editor={<div>Note editor</div>}
        pinnedPanel={<div>Pinned notes content</div>}
      />,
    );

    const showButton = screen.getByRole('button', { name: 'Show pinned notes' });
    expect(showButton.className).toContain('top-6');
    expect(showButton.className).toContain('-right-px');
    expect(showButton.className).toContain('z-10');
    expect(showButton.className).toContain('border-gray-600');
    expect(showButton.style.borderRightColor).toBe('var(--bg-main)');
    expect(showButton.querySelector('.lucide-chevron-left')).not.toBeNull();

    fireEvent.click(showButton);

    expect(screen.getByText('Pinned notes content')).toBeDefined();
    expect(screen.getByLabelText('Pinned notes').className).toContain('w-60');
    expect(screen.getByLabelText('Pinned notes').className).toContain('border-gray-600');
    expect(localStorage.getItem(StorageKeys.NotesPinnedPanelOpen)).toBe('true');

    const hideButton = screen.getByRole('button', { name: 'Hide pinned notes' });
    expect(hideButton.className).toContain('top-6');
    expect(hideButton.className).toContain('-right-px');
    expect(hideButton.querySelector('.lucide-chevron-right')).not.toBeNull();

    fireEvent.click(hideButton);

    expect(screen.queryByText('Pinned notes content')).toBeNull();
    expect(screen.queryByLabelText('Pinned notes')).toBeNull();
    expect(localStorage.getItem(StorageKeys.NotesPinnedPanelOpen)).toBe('false');
  });

  it('restores an open pinned notes panel from storage', () => {
    localStorage.setItem(StorageKeys.NotesPinnedPanelOpen, 'true');

    render(
      <NotesWorkspace
        editor={<div>Note editor</div>}
        pinnedPanel={<div>Pinned notes content</div>}
      />,
    );

    expect(screen.getByText('Pinned notes content')).toBeDefined();
    expect(screen.getByLabelText('Pinned notes')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Hide pinned notes' })).toBeDefined();
  });
});

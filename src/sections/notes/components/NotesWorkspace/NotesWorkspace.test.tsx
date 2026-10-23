import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageKeys } from '@common/utils/storage_keys';

import { NotesWorkspace } from './NotesWorkspace';

describe('NotesWorkspace', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the editor and the fixed pinned notes panel', () => {
    render(
      <NotesWorkspace
        editor={<div>Note editor</div>}
        pinnedPanel={<div>Pinned notes content</div>}
      />,
    );

    expect(screen.getByText('Note editor')).toBeDefined();
    expect(screen.getByText('Pinned notes content')).toBeDefined();
    expect(screen.getByLabelText('Pinned notes').className).toContain('w-60');
    expect(screen.getByLabelText('Pinned notes').className).toContain('border-gray-600');
  });

  it('removes and restores the pinned notes panel without moving its toggle', () => {
    render(
      <NotesWorkspace
        editor={<div>Note editor</div>}
        pinnedPanel={<div>Pinned notes content</div>}
      />,
    );

    const hideButton = screen.getByRole('button', { name: 'Hide pinned notes' });
    expect(hideButton.className).toContain('top-6');
    expect(hideButton.className).toContain('-right-px');
    expect(hideButton.className).toContain('z-10');
    expect(hideButton.className).toContain('border-gray-600');
    expect(hideButton.style.borderRightColor).toBe('var(--bg-main)');
    expect(hideButton.querySelector('.lucide-chevron-right')).not.toBeNull();

    fireEvent.click(hideButton);

    expect(screen.queryByText('Pinned notes content')).toBeNull();
    expect(screen.queryByLabelText('Pinned notes')).toBeNull();
    expect(localStorage.getItem(StorageKeys.NotesPinnedPanelOpen)).toBe('false');

    const showButton = screen.getByRole('button', { name: 'Show pinned notes' });
    expect(showButton.className).toContain('top-6');
    expect(showButton.className).toContain('-right-px');
    expect(showButton.querySelector('.lucide-chevron-left')).not.toBeNull();

    fireEvent.click(showButton);

    expect(screen.getByText('Pinned notes content')).toBeDefined();
    expect(screen.getByLabelText('Pinned notes').className).toContain('w-60');
    expect(localStorage.getItem(StorageKeys.NotesPinnedPanelOpen)).toBe('true');
  });

  it('restores a closed pinned notes panel from storage', () => {
    localStorage.setItem(StorageKeys.NotesPinnedPanelOpen, 'false');

    render(
      <NotesWorkspace
        editor={<div>Note editor</div>}
        pinnedPanel={<div>Pinned notes content</div>}
      />,
    );

    expect(screen.queryByLabelText('Pinned notes')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show pinned notes' })).toBeDefined();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotesWorkspace } from './NotesWorkspace';

describe('NotesWorkspace', () => {
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
    expect(hideButton.querySelector('.lucide-pin')).not.toBeNull();

    fireEvent.click(hideButton);

    expect(screen.queryByText('Pinned notes content')).toBeNull();
    expect(screen.queryByLabelText('Pinned notes')).toBeNull();

    const showButton = screen.getByRole('button', { name: 'Show pinned notes' });
    expect(showButton.className).toContain('top-6');
    expect(showButton.className).toContain('-right-px');
    expect(showButton.querySelector('.lucide-pin')).not.toBeNull();

    fireEvent.click(showButton);

    expect(screen.getByText('Pinned notes content')).toBeDefined();
    expect(screen.getByLabelText('Pinned notes').className).toContain('w-60');
  });
});

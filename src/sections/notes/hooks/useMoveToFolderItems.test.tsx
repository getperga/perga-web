import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NotesFolderResponseDTO } from '@api/notes';
import { Dropdown, DropdownSubmenu } from '@common/components/Dropdown';

import { useMoveToFolderItems } from './useMoveToFolderItems';

const folderTree: NotesFolderResponseDTO = {
  id: 1,
  parent_id: null,
  folder_type: 'root',
  name: 'Notes',
  notes: [],
  subfolders: [
    {
      id: 2,
      parent_id: 1,
      folder_type: 'regular',
      name: 'Projects',
      notes: [],
      subfolders: [
        {
          id: 3,
          parent_id: 2,
          folder_type: 'regular',
          name: 'Archive',
          notes: [],
          subfolders: [],
        },
      ],
    },
  ],
};

interface TestMoveMenuProps {
  currentFolderId: number;
  movingFolder?: NotesFolderResponseDTO;
  onMove: (folderId: number) => void;
}

const TestMoveMenu = ({ currentFolderId, movingFolder, onMove }: TestMoveMenuProps) => {
  const items = useMoveToFolderItems({
    rootFolder: folderTree,
    currentFolderId,
    movingFolder,
    onMove,
  });

  return (
    <Dropdown buttonIcon="Actions" buttonTitle="Actions">
      <DropdownSubmenu label="Move to…" items={items} />
    </Dropdown>
  );
};

describe('useMoveToFolderItems', () => {
  it('renders the folder tree, disables invalid targets, and moves to a valid target', () => {
    const onMove = vi.fn();
    render(<TestMoveMenu currentFolderId={2} onMove={onMove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByText('Move to…'));

    expect(
      (screen.getByRole('button', { name: 'Move to Projects' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Move to Archive' }));
    expect(onMove).toHaveBeenCalledWith(3);
  });

  it('disables the moving folder and all of its descendants', () => {
    render(
      <TestMoveMenu currentFolderId={1} movingFolder={folderTree.subfolders[0]} onMove={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByText('Move to…'));

    expect(
      (screen.getByRole('button', { name: 'Move to Projects' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Move to Archive' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

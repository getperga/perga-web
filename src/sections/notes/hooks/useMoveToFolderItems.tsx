import { useMemo } from 'react';

import type { NotesFolderResponseDTO } from '@api/notes';
import type { DropdownSubmenuItem } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';

interface UseMoveToFolderItemsOptions {
  rootFolder: NotesFolderResponseDTO | null;
  currentFolderId: number | null;
  movingFolder?: NotesFolderResponseDTO;
  onMove: (folderId: number) => void;
}

const collectFolderAndDescendantIds = (folder: NotesFolderResponseDTO, ids: Set<number>) => {
  ids.add(folder.id);
  folder.subfolders.forEach((subfolder) => collectFolderAndDescendantIds(subfolder, ids));
};

export const useMoveToFolderItems = ({
  rootFolder,
  currentFolderId,
  movingFolder,
  onMove,
}: UseMoveToFolderItemsOptions): DropdownSubmenuItem[] =>
  useMemo(() => {
    if (!rootFolder) {
      return [];
    }

    const disabledFolderIds = new Set<number>();
    if (currentFolderId !== null) {
      disabledFolderIds.add(currentFolderId);
    }
    if (movingFolder) {
      collectFolderAndDescendantIds(movingFolder, disabledFolderIds);
    }

    const mapFolder = (folder: NotesFolderResponseDTO, depth: number): DropdownSubmenuItem[] => [
      {
        key: folder.id,
        onClick: () => onMove(folder.id),
        disabled: disabledFolderIds.has(folder.id),
        title: `Move to ${folder.name}`,
        className: 'min-w-0',
        label: (
          <>
            <span style={{ width: `${depth * 16}px` }} className="shrink-0" />
            <Icon name="folder" size={14} className="mr-2 h-4 w-4 shrink-0" fill="currentColor" />
            <span className="truncate">{folder.name}</span>
          </>
        ),
      },
      ...folder.subfolders.flatMap((subfolder) => mapFolder(subfolder, depth + 1)),
    ];

    return mapFolder(rootFolder, 0);
  }, [currentFolderId, movingFolder, onMove, rootFolder]);

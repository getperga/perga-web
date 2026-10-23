import React, { useState, useEffect } from 'react';

import { StorageKeys } from '@common/utils/storage_keys';
import type { NotesFolderResponseDTO } from '@api/notes';
import { Icon } from '@common/components/Icon';
import { NotesFoldersTrashNote } from '@notes/components/NotesFolders/NotesFoldersTrash/NotesFoldersTrashNote';

interface TrashItemProps {
  folder: NotesFolderResponseDTO;
  onMoveFolder: (folderId: number, parentId: number) => Promise<void>;
  onMoveNote: (noteId: number, folderId: number) => Promise<void>;
  rootFolderId: number;
  onSelectNote: (id: number) => void;
  selectedNoteId: number | null;
}

export const NotesFoldersTrashItem: React.FC<TrashItemProps> = ({
  folder,
  onMoveFolder,
  onMoveNote,
  rootFolderId,
  onSelectNote,
  selectedNoteId,
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(StorageKeys.NotesExpandedFolders);
    if (saved) {
      const expandedFolders = JSON.parse(saved) as number[];
      return expandedFolders.includes(folder.id);
    }
    return false;
  });

  useEffect(() => {
    const saved = localStorage.getItem(StorageKeys.NotesExpandedFolders);
    let expandedFolders: number[] = saved ? (JSON.parse(saved) as number[]) : [];

    if (isExpanded) {
      if (!expandedFolders.includes(folder.id)) {
        expandedFolders.push(folder.id);
      }
    } else {
      expandedFolders = expandedFolders.filter(
        (expandedFolderId) => expandedFolderId !== folder.id,
      );
    }

    localStorage.setItem(StorageKeys.NotesExpandedFolders, JSON.stringify(expandedFolders));
  }, [isExpanded, folder.id]);

  const onDragStartFolder = (e: React.DragEvent) => {
    e.dataTransfer.setData('dragType', 'folder');
    e.dataTransfer.setData('dragId', folder.id.toString());
  };

  return (
    <div className="ml-4">
      <div
        draggable
        onDragStart={onDragStartFolder}
        className={`mb-3 cursor-pointer flex items-center p-2 hover:bg-bg-hover rounded text-text-main group`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className={`mr-2 transform transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
        >
          <Icon name="rightChevron" size="24" className="h-4 w-4" />
        </div>
        <Icon name="folder" size="14" fill="currentColor" className="mr-2 opacity-70 shrink-0" />
        <span className="truncate opacity-50">{folder.name}</span>
      </div>

      {isExpanded && (
        <>
          {folder.subfolders &&
            folder.subfolders.map((subfolder) => (
              <NotesFoldersTrashItem
                key={subfolder.id}
                folder={subfolder}
                onMoveFolder={onMoveFolder}
                onMoveNote={onMoveNote}
                rootFolderId={rootFolderId}
                onSelectNote={onSelectNote}
                selectedNoteId={selectedNoteId}
              />
            ))}
          {folder.notes &&
            folder.notes.map((note) => (
              <NotesFoldersTrashNote
                key={note.id}
                note={note}
                rootFolderId={rootFolderId}
                onMoveNote={onMoveNote}
                onSelectNote={onSelectNote}
                isSelected={note.id === selectedNoteId}
                className="mb-3 ml-8"
              />
            ))}
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';

import type { NotesFolderResponseDTO } from '@api/notes';
import { Dropdown, DropdownItem } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { StorageKeys } from '@common/utils/storage_keys';
import { NotesFoldersTrashItem } from '@notes/components/NotesFolders/NotesFoldersTrash/NotesFoldersTrashItem/NotesFoldersTrashItem';

import { useNotes } from '@notes/context';

interface TrashProps {
  folder: NotesFolderResponseDTO;
  onEmptyTrash: () => Promise<void>;
  onMoveFolderToTrash: (id: number) => Promise<void>;
  onMoveNoteToTrash: (id: number) => Promise<void>;
  onMoveFolder: (folderId: number, parentId: number) => Promise<void>;
  onMoveNote: (noteId: number, folderId: number) => Promise<void>;
  onSelectNote: (id: number) => void;
  selectedNoteId: number | null;
}

export const NotesFoldersTrash: React.FC<TrashProps> = ({
  folder,
  onEmptyTrash,
  onMoveFolderToTrash,
  onMoveNoteToTrash,
  onMoveFolder,
  onMoveNote,
  onSelectNote,
  selectedNoteId,
}) => {
  const { trashItemIds } = useNotes();

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

  const [isDragOver, setIsDragOver] = useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragOver(false);
    const dragType = e.dataTransfer.getData('dragType');
    const dragId = parseInt(e.dataTransfer.getData('dragId'), 10);

    if (dragType === 'folder') {
      void onMoveFolderToTrash(dragId);
    } else if (dragType === 'note') {
      void onMoveNoteToTrash(dragId);
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`${isDragOver ? 'bg-bg-hover ring-2 ring-red-500 rounded' : ''}`}
    >
      <div className="mb-1 cursor-pointer flex items-center justify-between hover:bg-bg-hover rounded text-text-main group">
        <div
          className="flex items-center flex-1 p-2 max-w-4/5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Icon name="trash" size="16" className="mr-2 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </div>

        <Dropdown
          buttonIcon={<Icon name="dots" size={20} className="h-6 w-6" />}
          buttonTitle="Folder actions"
          buttonClassName="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          dropdownClassName="w-40"
        >
          <DropdownItem onClick={() => onEmptyTrash()}>
            <Icon name="trash" size="14" className="h-4 w-4 mr-2" /> Empty trash
          </DropdownItem>
        </Dropdown>
      </div>

      {isExpanded &&
        ((folder.subfolders && folder.subfolders.length > 0) ||
          (folder.notes && folder.notes.length > 0)) && (
          <>
            {folder.subfolders &&
              folder.subfolders.map((subfolder) => (
                <NotesFoldersTrashItem
                  key={subfolder.id}
                  folder={subfolder}
                  onMoveFolder={onMoveFolder}
                  onMoveNote={onMoveNote}
                  onSelectNote={onSelectNote}
                  selectedNoteId={selectedNoteId}
                />
              ))}
            {folder.notes &&
              folder.notes.map((note) => (
                <div
                  key={note.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('dragType', 'note');
                    e.dataTransfer.setData('dragId', note.id.toString());
                  }}
                  onClick={() => onSelectNote(note.id)}
                  className={`ml-4 mb-3 flex items-center p-2 hover:bg-bg-hover rounded text-text-main cursor-pointer ${note.id === selectedNoteId ? 'bg-bg-hover' : ''}`}
                >
                  <div
                    className={`flex items-center flex-1 truncate ${trashItemIds.noteIds.includes(note.id) ? 'opacity-50' : ''}`}
                  >
                    <Icon
                      name="note"
                      size="16"
                      fill="currentColor"
                      className="mr-2 opacity-70 shrink-0"
                    />
                    <span className="truncate">{note.title || 'Untitled Note'}</span>
                  </div>
                </div>
              ))}
          </>
        )}
    </div>
  );
};

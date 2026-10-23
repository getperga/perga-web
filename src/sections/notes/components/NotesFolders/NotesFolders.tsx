import React, { useState, useRef, useEffect } from 'react';

import { Icon } from '@common/components/Icon';
import { NotesFoldersItem } from '@notes/components/NotesFolders/NotesFoldersItem/NotesFoldersItem';
import { NotesFoldersNote } from '@notes/components/NotesFolders/NotesFoldersNote/NotesFoldersNote';
import { NotesFoldersTrash } from '@notes/components/NotesFolders/NotesFoldersTrash/NotesFoldersTrash';
import { useNotes } from '@notes/context';

export const NotesFolders: React.FC = () => {
  const {
    rootFolder,
    trashFolder,
    handleCreateFolder,
    handleRenameFolder,
    handleMoveFolder,
    handleMoveFolderToTrash,
    handleCreateNote,
    handleRenameNote,
    handleMoveNote,
    handleMoveNoteToTrash,
    handleEmptyTrash,
    handleExportNotes,
    handleImportNotes,
    selectedNoteId,
    setSelectedNoteId,
  } = useNotes();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDragHover, setIsDragHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateSubmit = async () => {
    if (!rootFolder) {
      console.error("Can't create new folder: root folder not found");
      return;
    }

    if (newFolderName.trim()) {
      await handleCreateFolder(newFolderName.trim(), rootFolder?.id);
    }
    setNewFolderName('');
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleCreateSubmit();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFolderName('');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragHover(true);
  };

  const onDragLeave = () => {
    setIsDragHover(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragHover(false);

    if (!rootFolder) {
      console.error("Can't drag to root folder: root folder not found.");
      return;
    }

    const dragType = e.dataTransfer.getData('dragType');
    const dragId = parseInt(e.dataTransfer.getData('dragId'), 10);
    if (dragType === 'folder') {
      void handleMoveFolder(dragId, rootFolder.id);
    } else if (dragType === 'note') {
      void handleMoveNote(dragId, rootFolder.id);
    }
  };

  return (
    <div className="px-4 py-5 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => rootFolder && handleCreateNote(rootFolder.id)}
          className="flex-1 flex items-center justify-center p-2 text-sm text-text-main hover:bg-bg-hover rounded border border-border-main transition-colors"
          title="Add Note"
          aria-label="Add Note"
        >
          <Icon name="plus" size={14} className="mr-2" fill="currentColor" />
          <span>Note</span>
        </button>
        <button
          onClick={() => setIsCreating(true)}
          className="flex-1 flex items-center justify-center p-2 text-sm text-text-main hover:bg-bg-hover rounded border border-border-main transition-colors"
          title="Add Folder"
          aria-label="Add Folder"
        >
          <Icon name="plus" size={14} className="mr-2" fill="currentColor" />
          <span>Folder</span>
        </button>
      </div>

      <div>
        {isCreating && (
          <div className="mb-3 flex items-center bg-bg-hover rounded text-text-main">
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCreateSubmit}
              placeholder="Folder name"
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2"
            />
          </div>
        )}
        {!isCreating &&
          rootFolder &&
          rootFolder.subfolders.length === 0 &&
          rootFolder.notes.length === 0 && (
            <div className="mb-4">
              <p className="text-sm text-text-main/60">No notes here yet</p>
            </div>
          )}
        {rootFolder?.subfolders.map((folder) => (
          <NotesFoldersItem
            key={folder.id}
            folder={folder}
            regularFolders={rootFolder.subfolders}
            onRenameFolder={handleRenameFolder}
            onRenameNote={handleRenameNote}
            onCreateSubfolder={handleCreateFolder}
            onCreateNote={handleCreateNote}
            onMoveFolderToTrash={handleMoveFolderToTrash}
            onMoveNoteToTrash={handleMoveNoteToTrash}
            onNotesExport={handleExportNotes}
            onNotesImport={handleImportNotes}
            onSelectNote={setSelectedNoteId}
            selectedNoteId={selectedNoteId}
            onMoveFolder={handleMoveFolder}
            onMoveNote={handleMoveNote}
          />
        ))}
        {rootFolder?.notes.map((note) => (
          <NotesFoldersNote
            key={note.id}
            note={note}
            onRename={handleRenameNote}
            onMoveToTrash={handleMoveNoteToTrash}
            onExport={handleExportNotes}
            onSelect={setSelectedNoteId}
            isSelected={note.id === selectedNoteId}
          />
        ))}
      </div>

      {trashFolder && rootFolder && (
        <NotesFoldersTrash
          folder={trashFolder}
          rootFolderId={rootFolder.id}
          onEmptyTrash={handleEmptyTrash}
          onMoveFolderToTrash={handleMoveFolderToTrash}
          onMoveNoteToTrash={handleMoveNoteToTrash}
          onSelectNote={setSelectedNoteId}
          selectedNoteId={selectedNoteId}
          onMoveFolder={handleMoveFolder}
          onMoveNote={handleMoveNote}
        />
      )}

      <div
        className={`h-full ${isDragHover ? 'bg-bg-hover ring-2 ring-blue-500 rounded' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      ></div>
    </div>
  );
};

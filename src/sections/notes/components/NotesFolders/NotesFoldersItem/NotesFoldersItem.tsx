import React, { useState, useRef, useEffect } from 'react';

import type {
  NotesFolderResponseDTO,
  NotesExportTypeDTO,
  NotesExportTargetDTO,
  NotesImportResponseDTO,
} from '@api/notes';
import { Dropdown, DropdownItem, DropdownSubmenu, useDropdown } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { useToast } from '@common/contexts/toast/useToast';
import { StorageKeys } from '@common/utils/storage_keys';
import { pluralize } from '@common/utils/string_utils';
import { NotesFoldersNote } from '@notes/components/NotesFolders/NotesFoldersNote/NotesFoldersNote';
import { useNotes } from '@notes/context';

interface FoldersItemProps {
  folder: NotesFolderResponseDTO;
  regularFolders: NotesFolderResponseDTO[];
  onCreateSubfolder: (name: string, parentId: number) => Promise<void>;
  onRenameFolder: (id: number, name: string) => Promise<void>;
  onMoveFolder: (folderId: number, parentId: number) => Promise<void>;
  onMoveFolderToTrash: (id: number) => Promise<void>;
  onCreateNote: (folderId: number) => Promise<void>;
  onRenameNote: (id: number, title: string) => Promise<void>;
  onMoveNote: (noteId: number, folderId: number) => Promise<void>;
  onMoveNoteToTrash: (id: number) => Promise<void>;
  onNotesExport: (
    type: NotesExportTypeDTO,
    target: NotesExportTargetDTO,
    id: number,
  ) => Promise<void>;
  onNotesImport: (files: File[], folderId: number) => Promise<NotesImportResponseDTO>;
  onSelectNote: (id: number) => void;
  selectedNoteId: number | null;
  wrapperClass?: string;
}

interface NotesImportDropdownItemProps {
  folderId: number;
  isImporting: boolean;
  onImport: (
    event: React.ChangeEvent<HTMLInputElement>,
    closeDropdown?: () => void,
  ) => Promise<void>;
}

const NotesImportDropdownItem = ({ isImporting, onImport }: NotesImportDropdownItemProps) => {
  const dropdown = useDropdown();

  return (
    <DropdownItem
      className={isImporting ? 'opacity-50 cursor-not-allowed' : ''}
      closeOnClick={false}
    >
      <label className="flex items-center w-full cursor-pointer">
        <Icon name="upload" size={14} className="h-4 w-4 mr-2" fill="currentColor" />
        <span>{isImporting ? 'Importing...' : 'Import'}</span>
        <input
          type="file"
          multiple
          accept=".md,.markdown,.html,.htm,.txt,.pdf,.zip"
          className="hidden"
          onChange={(event) => void onImport(event, () => dropdown?.close())}
          disabled={isImporting}
        />
      </label>
    </DropdownItem>
  );
};

export const NotesFoldersItem = ({
  folder,
  regularFolders,
  onRenameFolder,
  onRenameNote,
  onCreateSubfolder,
  onCreateNote,
  onMoveFolderToTrash,
  onMoveNoteToTrash,
  onNotesExport,
  onNotesImport,
  onSelectNote,
  selectedNoteId,
  onMoveFolder,
  onMoveNote,
  wrapperClass = '',
}: FoldersItemProps) => {
  const { showToast, showError } = useToast();
  const { trashItemIds } = useNotes();
  const [isEditing, setIsEditing] = useState(false);
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

  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [isDragHover, setIsDragHover] = useState(false);
  const [renamevalue, setRenamevalue] = useState(folder.name);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const subfolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRenamevalue(folder.name);
  }, [folder.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isCreatingSubfolder && subfolderInputRef.current) {
      subfolderInputRef.current.focus();
    }
  }, [isCreatingSubfolder]);

  const handleRenameSubmit = async () => {
    if (renamevalue && renamevalue !== folder.name) {
      await onRenameFolder(folder.id, renamevalue);
    } else {
      setRenamevalue(folder.name);
    }
    setIsEditing(false);
  };

  const handleSubfolderSubmit = async () => {
    if (newSubfolderName.trim()) {
      await onCreateSubfolder(newSubfolderName.trim(), folder.id);
      setIsExpanded(true);
    }
    setNewSubfolderName('');
    setIsCreatingSubfolder(false);
  };

  const onImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
    closeDropdown?: () => void,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const response = await onNotesImport(Array.from(files), folder.id);
      showToast(
        `Successfully imported ${response.imported_count} ${pluralize(response.imported_count, 'note')}`,
        'success',
      );
      setIsExpanded(true);
    } catch (error) {
      showError(`Failed to import notes: ${error}`);
    } finally {
      // reset state and input
      setIsImporting(false);
      event.target.value = '';
      closeDropdown?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setRenamevalue(folder.name);
    }
  };

  const handleSubfolderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSubfolderSubmit();
    } else if (e.key === 'Escape') {
      setIsCreatingSubfolder(false);
      setNewSubfolderName('');
    }
  };

  const handleTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    void onMoveFolderToTrash(folder.id);
  };

  const onDragStartFolder = (e: React.DragEvent) => {
    e.dataTransfer.setData('dragType', 'folder');
    e.dataTransfer.setData('dragId', folder.id.toString());
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
    e.stopPropagation();

    setIsDragHover(false);
    const dragType = e.dataTransfer.getData('dragType');
    const dragId = parseInt(e.dataTransfer.getData('dragId'), 10);

    if (dragType === 'folder' && dragId !== folder.id) {
      // Check if we are trying to move a folder into its own subfolder
      const isSubfolder = (parent: NotesFolderResponseDTO, childId: number): boolean => {
        if (parent.id === childId) {
          return true;
        }
        if (parent.subfolders) {
          // recursively check subfolders tree
          return parent.subfolders.some((subfolder) => isSubfolder(subfolder, childId));
        }
        return false;
      };

      const findFolderInList = (
        id: number,
        folders: NotesFolderResponseDTO[],
      ): NotesFolderResponseDTO | null => {
        for (const folder of folders) {
          const found = findFolderById(id, folder);
          if (found) {
            return found;
          }
        }
        return null;
      };

      const movingFolder = findFolderInList(dragId, regularFolders);
      if (movingFolder && isSubfolder(movingFolder, folder.id)) {
        return;
      }

      void onMoveFolder(dragId, folder.id);
    } else if (dragType === 'note') {
      void onMoveNote(dragId, folder.id);
    }
  };

  const findFolderById = (
    id: number,
    currentFolder: NotesFolderResponseDTO,
  ): NotesFolderResponseDTO | null => {
    if (currentFolder.id === id) {
      return currentFolder;
    }
    if (currentFolder.subfolders) {
      for (const sub of currentFolder.subfolders) {
        const found = findFolderById(id, sub);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  return (
    <div className={wrapperClass}>
      <div
        draggable
        onDragStart={onDragStartFolder}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mb-1 cursor-pointer flex items-center justify-between hover:bg-bg-hover rounded text-text-main group ${isDragHover ? 'bg-bg-hover ring-2 ring-blue-500' : ''}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={renamevalue}
            onChange={(e) => setRenamevalue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRenameSubmit}
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2"
          />
        ) : (
          <div
            className="flex items-center flex-1 p-2 max-w-4/5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div
              className={`mr-2 transform transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            >
              <Icon name="rightChevron" size="24" className="h-4 w-4" />
            </div>
            <Icon name="folder" size="14" fill="currentColor" className="mr-2 shrink-0" />
            <span
              className={`truncate ${trashItemIds.folderIds.includes(folder.id) ? 'opacity-50' : ''}`}
            >
              {folder.name}
            </span>
          </div>
        )}

        <Dropdown
          buttonIcon={<Icon name="dots" size={20} className="h-6 w-6" />}
          buttonTitle="Folder actions"
          buttonClassName="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          dropdownClassName="w-40"
        >
          <DropdownItem
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <Icon name="edit" size={14} className="h-4 w-4 mr-2" /> Rename
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              e.stopPropagation();
              setIsCreatingSubfolder(true);
              setIsExpanded(true);
            }}
          >
            <Icon name="folderPlus" size={14} className="h-4 w-4 mr-2" fill="currentColor" /> Add
            subfolder
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              e.stopPropagation();
              void onCreateNote(folder.id);
              setIsExpanded(true);
            }}
          >
            <Icon name="notePlus" size={14} className="h-4 w-4 mr-2" fill="currentColor" /> Add note
          </DropdownItem>
          <NotesImportDropdownItem
            folderId={folder.id}
            isImporting={isImporting}
            onImport={onImport}
          />
          <DropdownSubmenu
            label={
              <>
                <Icon name="download" size={14} className="h-4 w-4 mr-2" /> Export
              </>
            }
          >
            <DropdownItem
              onClick={(e) => {
                e.stopPropagation();
                void onNotesExport('markdown', 'folder_notes', folder.id);
              }}
            >
              Markdown
            </DropdownItem>
            <DropdownItem
              onClick={(e) => {
                e.stopPropagation();
                void onNotesExport('html', 'folder_notes', folder.id);
              }}
            >
              HTML
            </DropdownItem>
            <DropdownItem
              onClick={(e) => {
                e.stopPropagation();
                void onNotesExport('pdf', 'folder_notes', folder.id);
              }}
            >
              PDF
            </DropdownItem>
          </DropdownSubmenu>
          <DropdownItem onClick={handleTrash}>
            <Icon name="trash" size={14} className="h-4 w-4 mr-2" /> Move to Trash
          </DropdownItem>
        </Dropdown>
      </div>

      {isExpanded &&
        (isCreatingSubfolder ||
          (folder.subfolders && folder.subfolders.length > 0) ||
          (folder.notes && folder.notes.length > 0)) && (
          <>
            {isCreatingSubfolder && (
              <div className="ml-6 mb-3 flex items-center bg-bg-hover rounded text-text-main">
                <input
                  ref={subfolderInputRef}
                  type="text"
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  onKeyDown={handleSubfolderKeyDown}
                  onBlur={handleSubfolderSubmit}
                  placeholder="Subfolder name"
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2"
                />
              </div>
            )}
            {folder.subfolders &&
              folder.subfolders.map((subfolder) => (
                <NotesFoldersItem
                  key={subfolder.id}
                  folder={subfolder}
                  regularFolders={regularFolders}
                  onRenameFolder={onRenameFolder}
                  onRenameNote={onRenameNote}
                  onCreateSubfolder={onCreateSubfolder}
                  onCreateNote={onCreateNote}
                  onMoveFolderToTrash={onMoveFolderToTrash}
                  onMoveNoteToTrash={onMoveNoteToTrash}
                  onNotesExport={onNotesExport}
                  onNotesImport={onNotesImport}
                  onSelectNote={onSelectNote}
                  selectedNoteId={selectedNoteId}
                  onMoveFolder={onMoveFolder}
                  onMoveNote={onMoveNote}
                  wrapperClass="ml-6"
                />
              ))}
            {folder.notes &&
              folder.notes.map((note) => (
                <NotesFoldersNote
                  key={note.id}
                  note={note}
                  onRename={onRenameNote}
                  onMoveToTrash={onMoveNoteToTrash}
                  onExport={onNotesExport}
                  onSelect={onSelectNote}
                  isSelected={note.id === selectedNoteId}
                  className="ml-6"
                />
              ))}
          </>
        )}
    </div>
  );
};

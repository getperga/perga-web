import React, { useState, useRef, useEffect } from 'react';

import type { NoteMetaDTO, NotesExportTypeDTO, NotesExportTargetDTO } from '@api/notes';
import { Dropdown, DropdownItem, DropdownSubmenu } from '@common/components/Dropdown';
import { Icon } from '@common/components/Icon';
import { useNotes } from '@notes/context';

interface FoldersNoteProps {
  note: NoteMetaDTO;
  onRename: (id: number, title: string) => Promise<void>;
  onMoveToTrash: (id: number) => Promise<void>;
  onExport: (type: NotesExportTypeDTO, target: NotesExportTargetDTO, id: number) => Promise<void>;
  onSelect: (id: number) => void;
  isSelected?: boolean;
  className?: string;
}

export const NotesFoldersNote = ({
  note,
  onRename,
  onMoveToTrash,
  onExport,
  onSelect,
  isSelected = false,
  className = '',
}: FoldersNoteProps) => {
  const { trashItemIds, focusEditor } = useNotes();
  const isInTrash = trashItemIds.noteIds.includes(note.id);

  const [isEditing, setIsEditing] = useState(false);
  const [renameValue, setRenameValue] = useState(note.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRenameValue(note.title || '');
  }, [note.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSelect = () => {
    onSelect(note.id);
    focusEditor();
  };

  const handleRenameSubmit = async () => {
    if (renameValue !== note.title) {
      await onRename(note.id, renameValue);
    }
    setIsEditing(false);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setRenameValue(note.title || '');
    }
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('dragType', 'note');
    e.dataTransfer.setData('dragId', note.id.toString());
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={handleSelect}
      className={`mb-1 flex items-center justify-between hover:bg-bg-hover rounded text-text-main cursor-pointer group ${isSelected ? 'bg-bg-hover' : ''} ${className}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRenameSubmit}
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2"
        />
      ) : (
        <div className={`flex items-center flex-1 p-2 max-w-4/5 ${isInTrash ? 'opacity-50' : ''}`}>
          <Icon name="note" size="16" fill="currentColor" className="mr-2 opacity-70 shrink-0" />
          <span className="truncate">{note.title || 'Untitled Note'}</span>
        </div>
      )}

      <Dropdown
        buttonIcon={<Icon name="dots" size={20} className="h-6 w-6" />}
        buttonTitle="Note actions"
        buttonClassName="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        dropdownClassName="w-40"
      >
        <DropdownItem onClick={handleRenameClick}>
          <Icon name="edit" size={14} className="h-4 w-4 mr-2" /> Rename
        </DropdownItem>
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
              void onExport('markdown', 'single_note', note.id);
            }}
            className="pl-10"
          >
            Markdown
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              e.stopPropagation();
              void onExport('html', 'single_note', note.id);
            }}
            className="pl-10"
          >
            HTML
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              e.stopPropagation();
              void onExport('pdf', 'single_note', note.id);
            }}
            className="pl-10"
          >
            PDF
          </DropdownItem>
        </DropdownSubmenu>
        <DropdownItem
          onClick={(e) => {
            e.stopPropagation();
            void onMoveToTrash(note.id);
          }}
        >
          <Icon name="trash" size={14} className="h-4 w-4 mr-2" /> Move to Trash
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

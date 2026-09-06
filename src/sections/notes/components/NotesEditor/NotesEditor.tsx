import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskItem, TaskList } from '@tiptap/extension-list';

import type { NoteDTO } from '@api/notes';
import { cleanEditorHTML } from '@common/utils/string_utils';
import { NoteFind } from '@notes/components/NotesEditor/extensions/noteFind.ts';
import {
  NoteLink,
  openLinkOnModifierClick,
} from '@notes/components/NotesEditor/extensions/noteLink';
import { NotesEditorFindBar } from '@notes/components/NotesEditor/NotesEditorFindBar/NotesEditorFindBar';
import { NotesEditorMenuBar } from '@notes/components/NotesEditor/NotesEditorMenuBar/NotesEditorMenuBar';
import { useNotesDebounceUpdate } from '@notes/components/NotesEditor/useNotesDebounceUpdate';
import { useNotesFind } from '@notes/components/NotesEditor/useNotesFind';
import '@notes/components/NotesEditor/notes_editor.css';
import { useNotes } from '@notes/context';

interface NotesEditorProps {
  note: NoteDTO | null;
  onUpdate: (id: number, title: string | undefined, body: string | undefined) => Promise<void>;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({ note, onUpdate }) => {
  const { trashItemIds, focusTrigger, findQueryTrigger } = useNotes();
  const isInTrash = note?.id ? trashItemIds.noteIds.includes(note.id) : false;

  const [title, setTitle] = useState(note?.title || '');
  const lastSyncedNoteIdRef = useRef<number | undefined>(undefined);
  const { debounceUpdate, hasPendingUpdate } = useNotesDebounceUpdate({
    selectedNote: note,
    onUpdate,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      NoteLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      NoteFind,
    ],
    content: note?.body || '',
    onUpdate: () => {
      handleBodyChange();
    },
    editorProps: {
      handleClick: (_view, _pos, event) => openLinkOnModifierClick(event),
      attributes: {
        class: `flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 text-text-main resize-none placeholder:text-text-main/30 leading-relaxed overflow-y-auto min-h-[200px] ${
          isInTrash ? 'opacity-50' : ''
        }`,
      },
    },
    editable: !isInTrash,
  });

  // extract note values for using in dependencies
  const noteId = note?.id;
  const noteTitle = note?.title;
  const noteBody = note?.body;

  // sync external changes to editor
  useEffect(() => {
    // update values if user switched note and there is no pending update
    if (lastSyncedNoteIdRef.current !== noteId && !hasPendingUpdate) {
      // normalize vars that can be various types for comparing
      const normalizedNoteTitle = noteTitle || '';
      const normalizedNoteBody = noteBody || '';

      lastSyncedNoteIdRef.current = noteId;
      setTitle(normalizedNoteTitle);
      if (editor) {
        editor.commands.setContent(normalizedNoteBody, { emitUpdate: false });
      }
    }
  }, [noteId, noteTitle, noteBody, editor, hasPendingUpdate]);

  // focus editor when focusTrigger changes
  useEffect(() => {
    if (focusTrigger > 0 && editor) {
      editor.commands.focus('start');
    }
  }, [focusTrigger, editor]);

  const {
    isFindBarOpen,
    findQuery,
    findMatchCount,
    findCurrentIndex,
    findInputRef,
    toggleFindBar,
    closeFindBar,
    handleFindQueryChange,
    handleFindNext,
    handleFindPrev,
  } = useNotesFind({
    editor,
    noteId,
    noteBody,
    lastSyncedNoteIdRef,
    findQueryTrigger,
  });

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debounceUpdate(newTitle, undefined);
  };

  const handleBodyChange = () => {
    if (!editor) {
      return;
    }

    const newBody = cleanEditorHTML(editor.getHTML());
    debounceUpdate(undefined, newBody);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFindBar();
    }
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-text-main/40">
        <p>Select a note to edit</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full p-6 space-y-4 overflow-hidden"
      onKeyDown={handleEditorKeyDown}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Note title"
        className={`text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-text-main placeholder:text-text-main/30 ${
          isInTrash ? 'opacity-50' : ''
        }`}
      />
      <NotesEditorMenuBar editor={editor} onFindClick={toggleFindBar} />
      {isFindBarOpen && (
        <NotesEditorFindBar
          query={findQuery}
          matchCount={findMatchCount}
          currentIndex={findCurrentIndex}
          inputRef={findInputRef}
          onQueryChange={handleFindQueryChange}
          onNext={handleFindNext}
          onPrev={handleFindPrev}
          onClose={closeFindBar}
        />
      )}
      <EditorContent editor={editor} className="flex-1 overflow-hidden flex flex-col" />
    </div>
  );
};

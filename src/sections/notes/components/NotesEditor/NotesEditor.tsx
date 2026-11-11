import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { NoteDTO } from '@api/notes';
import { cleanEditorHTML } from '@common/utils/string_utils';
import { NoteFind } from '@notes/components/NotesEditor/extensions/noteFind.ts';
import { NoteImage } from '@notes/components/NotesEditor/extensions/noteImage';
import {
  NoteLink,
  openLinkOnModifierClick,
} from '@notes/components/NotesEditor/extensions/noteLink';
import { NoteList } from '@notes/components/NotesEditor/extensions/noteList';
import { NotesEditorFindBar } from '@notes/components/NotesEditor/NotesEditorFindBar/NotesEditorFindBar';
import { NotesEditorMenuBar } from '@notes/components/NotesEditor/NotesEditorMenuBar/NotesEditorMenuBar';
import {
  isImageFile,
  NOTE_IMAGE_ACCEPT,
  useNoteImageUpload,
} from '@notes/components/NotesEditor/useNoteImageUpload';
import { useNotesDebounceUpdate } from '@notes/components/NotesEditor/useNotesDebounceUpdate';
import { useNotesFind } from '@notes/components/NotesEditor/useNotesFind';
import { useNotesEditorHotkeys } from '@notes/components/NotesEditor/useNotesEditorHotkeys';
import '@notes/components/NotesEditor/notes_editor.css';
import { useNotes } from '@notes/context';

interface NotesEditorProps {
  note: NoteDTO | null;
  onUpdate: (id: number, title: string | undefined, body: string | undefined) => Promise<void>;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({ note, onUpdate }) => {
  const {
    trashItemIds,
    focusTrigger,
    titleFocusNoteId,
    clearTitleFocusRequest,
    findInputFocusNoteId,
    clearFindInputFocusRequest,
    findQueryTrigger,
    canOpenPreviousNote,
    canOpenNextNote,
    openPreviousNote,
    openNextNote,
    handleSetNotePinned,
  } = useNotes();
  const isInTrash = note?.id ? trashItemIds.noteIds.includes(note.id) : false;

  const [title, setTitle] = useState(note?.title || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedNoteIdRef = useRef<number | undefined>(undefined);
  const { debounceUpdate } = useNotesDebounceUpdate({
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
      NoteList,
      NoteImage,
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
  const { uploadImages, isUploading, uploadError } = useNoteImageUpload(
    editor,
    isInTrash ? undefined : noteId,
  );

  // sync external changes to editor
  useEffect(() => {
    // useEditor can replace an unmounted instance before this effect runs.
    // wait for its live replacement before marking the note as synchronized.
    if (!editor || editor.isDestroyed) {
      return;
    }

    // autosave hook flushes changes to the previous note on switch
    if (lastSyncedNoteIdRef.current !== noteId) {
      // normalize vars that can be various types for comparing
      const normalizedNoteTitle = noteTitle || '';
      const normalizedNoteBody = noteBody || '';

      lastSyncedNoteIdRef.current = noteId;
      setTitle(normalizedNoteTitle);
      if (editor) {
        editor.commands.setContent(normalizedNoteBody, { emitUpdate: false });
      }
    }
  }, [noteId, noteTitle, noteBody, editor]);

  // focus editor when focusTrigger changes
  useEffect(() => {
    if (focusTrigger > 0 && editor && !editor.isDestroyed) {
      editor.commands.focus('start');
    }
  }, [focusTrigger, editor]);

  // A newly created note is loaded asynchronously, so wait for its id before focusing the title.
  useEffect(() => {
    if (noteId === titleFocusNoteId && titleInputRef.current) {
      titleInputRef.current.focus();
      clearTitleFocusRequest(noteId);
    }
  }, [noteId, titleFocusNoteId, clearTitleFocusRequest]);

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

  useEffect(() => {
    if (noteId === findInputFocusNoteId && isFindBarOpen && findInputRef.current) {
      findInputRef.current.focus();
      findInputRef.current.select();
      clearFindInputFocusRequest(noteId);
    }
  }, [noteId, findInputFocusNoteId, isFindBarOpen, findInputRef, clearFindInputFocusRequest]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debounceUpdate(newTitle, undefined);
  };

  const handleImageFiles = (files: File[], position?: number) => {
    if (lastSyncedNoteIdRef.current === noteId) {
      void uploadImages(files, position);
    }
  };

  const handleImagePaste = (event: React.ClipboardEvent) => {
    const files = Array.from(event.clipboardData.files).filter(isImageFile);
    if (files.length) {
      event.preventDefault();
      event.stopPropagation();
      handleImageFiles(files);
    }
  };

  const handleImageDrop = (event: React.DragEvent) => {
    const files = Array.from(event.dataTransfer.files);
    if (files.length) {
      event.preventDefault();
      event.stopPropagation();
      const position = editor?.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });
      handleImageFiles(files, position?.pos);
    }
  };

  const handleBodyChange = () => {
    if (!editor) {
      return;
    }

    const newBody = cleanEditorHTML(editor.getHTML());
    debounceUpdate(undefined, newBody);
  };

  const { handleEditorKeyDown } = useNotesEditorHotkeys({
    noteId,
    canOpenPreviousNote,
    canOpenNextNote,
    openPreviousNote,
    openNextNote,
    toggleFindBar,
  });

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
      <div className="flex items-center gap-2">
        <div className="flex shrink-0">
          <button
            type="button"
            onClick={openPreviousNote}
            disabled={!canOpenPreviousNote}
            title="Previous note (Alt+Left)"
            aria-label="Previous note"
            aria-keyshortcuts="Alt+ArrowLeft"
            className="p-1 rounded text-text-muted hover:bg-bg-hover hover:text-text-main transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={openNextNote}
            disabled={!canOpenNextNote}
            title="Next note (Alt+Right)"
            aria-label="Next note"
            aria-keyshortcuts="Alt+ArrowRight"
            className="p-1 rounded text-text-muted hover:bg-bg-hover hover:text-text-main transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className={`min-w-0 flex-1 text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-text-main placeholder:text-text-main/30 ${
            isInTrash ? 'opacity-50' : ''
          }`}
        />
      </div>
      <NotesEditorMenuBar
        editor={editor}
        onFindClick={toggleFindBar}
        isPinned={note.is_pinned}
        isInTrash={isInTrash}
        onPinClick={isInTrash ? undefined : () => void handleSetNotePinned(note.id, !note.is_pinned)}
        onImageClick={isInTrash ? undefined : () => imageInputRef.current?.click()}
        isUploadingImage={isUploading}
      />
      <input
        key={noteId}
        ref={imageInputRef}
        type="file"
        accept={NOTE_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          handleImageFiles(files);
        }}
      />
      {isUploading && (
        <div role="status" className="text-sm text-text-muted">
          Uploading images…
        </div>
      )}
      {uploadError && (
        <div role="alert" className="text-sm text-text-main">
          {uploadError}
        </div>
      )}
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
      <EditorContent
        editor={editor}
        onPasteCapture={handleImagePaste}
        onDropCapture={handleImageDrop}
        className="flex-1 overflow-hidden flex flex-col"
      />
    </div>
  );
};

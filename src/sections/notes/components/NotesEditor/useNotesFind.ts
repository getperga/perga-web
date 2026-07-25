import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';

import Storage from '@common/utils/storage';
import { StorageKeys } from '@common/utils/storage_keys';
import { getFindState, scrollToMatch } from '@notes/components/NotesEditor/extensions/noteFind.ts';
import { saveNoteFindQueryToStorage } from '@notes/utils';

interface UseNotesFindProps {
  editor: Editor | null;
  noteId: number | undefined;
  noteBody: string | undefined;
  lastSyncedNoteIdRef: RefObject<number | undefined>;
  findQueryTrigger: number;
}

export const useNotesFind = ({
  editor,
  noteId,
  noteBody,
  lastSyncedNoteIdRef,
  findQueryTrigger,
}: UseNotesFindProps) => {
  const lastAppliedFindRef = useRef<{ noteId: number | undefined; trigger: number }>({
    noteId: undefined,
    trigger: -1,
  });

  const [isFindBarOpen, setIsFindBarOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatchCount, setFindMatchCount] = useState(0);
  const [findCurrentIndex, setFindCurrentIndex] = useState(-1);
  const findInputRef = useRef<HTMLInputElement>(null);

  // load the saved find query once the matching note is loaded, or reset the find bar
  useEffect(() => {
    if (!editor || lastSyncedNoteIdRef.current !== noteId) {
      return;
    }
    if (lastAppliedFindRef.current.noteId === noteId && lastAppliedFindRef.current.trigger === findQueryTrigger) {
      return;
    }
    lastAppliedFindRef.current = {
      noteId,
      trigger: findQueryTrigger
    };

    const findQueries = Storage.getJSON<Record<string, string>>(StorageKeys.NotesFindQuery, {});
    const savedQuery = noteId ? findQueries[noteId] : null;
    if (savedQuery) {
      setFindQuery(savedQuery);
      setIsFindBarOpen(true);
      editor.commands.setFindQuery(savedQuery);

      const findState = getFindState(editor);
      setFindMatchCount(findState.results.length);
      setFindCurrentIndex(findState.currentIndex);
      if (findState.currentIndex >= 0) {
        scrollToMatch(editor, findState.results[findState.currentIndex].from);
      }
    } else {
      setIsFindBarOpen(false);
      setFindQuery('');
      setFindMatchCount(0);
      setFindCurrentIndex(-1);
      editor.commands.clearFind();
    }
  }, [noteId, editor, findQueryTrigger, noteBody, lastSyncedNoteIdRef]);

  const applyFindState = () => {
    if (!editor) {
      return;
    }

    const findState = getFindState(editor);
    setFindMatchCount(findState.results.length);
    setFindCurrentIndex(findState.currentIndex);
    if (findState.currentIndex >= 0) {
      scrollToMatch(editor, findState.results[findState.currentIndex].from);
    }
  };

  const handleFindQueryChange = (query: string) => {
    setFindQuery(query);
    if (noteId) {
      saveNoteFindQueryToStorage(noteId, query);
    }
    if (!editor) {
      return;
    }

    editor.commands.setFindQuery(query);
    applyFindState();
  };

  const handleFindNext = () => {
    editor?.commands.findNext();
    applyFindState();
  };

  const handleFindPrev = () => {
    editor?.commands.findPrev();
    applyFindState();
  };

  const closeFindBar = () => {
    setIsFindBarOpen(false);
    setFindQuery('');
    setFindMatchCount(0);
    setFindCurrentIndex(-1);
    if (noteId) {
      saveNoteFindQueryToStorage(noteId, '');
    }
    editor?.commands.clearFind();
    editor?.commands.focus(1);
  };

  const toggleFindBar = () => {
    if (isFindBarOpen) {
      closeFindBar();
    } else {
      setIsFindBarOpen(true);
      requestAnimationFrame(() => findInputRef.current?.focus());
    }
  };

  return {
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
  };
};

import { useEffect, useRef } from 'react';

import type { NoteDTO } from '@api/notes';

interface UseNotesDebounceUpdateProps {
  selectedNote: NoteDTO | null;
  onUpdate: (id: number, title: string | undefined, body: string | undefined) => Promise<void>;
}

export const useNotesDebounceUpdate = ({ selectedNote, onUpdate }: UseNotesDebounceUpdateProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingNoteId = useRef(selectedNote?.id);
  const pendingChangesRef = useRef<{
    title?: string;
    body?: string;
  }>({});
  const selectedNoteId = selectedNote?.id;

  // Update tracking ref on the note change
  useEffect(() => {
    if (editingNoteId.current !== selectedNoteId) {
      // reset ref values if selected note changed
      editingNoteId.current = selectedNoteId;
      pendingChangesRef.current = {};
    }
  }, [selectedNoteId]);

  // Use debounce timer to reduce number of update api requests
  // send request only when user stopped typing for 1000ms
  const debounceUpdate = (newTitle: string | undefined, newBody: string | undefined) => {
    if (!selectedNoteId) {
      return;
    }

    if (newTitle !== undefined && newTitle !== selectedNote?.title) {
      pendingChangesRef.current.title = newTitle;
    }
    if (newBody !== undefined && newBody !== selectedNote?.body) {
      pendingChangesRef.current.body = newBody;
    }

    // clear timer on every user input
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // in case of actual changes, start timer
    if (pendingChangesRef.current) {
      timerRef.current = setTimeout(() => {
        // Ensure we are still editing the same note
        if (editingNoteId.current === selectedNote.id) {
          const { title: currentTitle, body: currentBody } = pendingChangesRef.current;
          void onUpdate(selectedNote.id, currentTitle, currentBody);
          pendingChangesRef.current = {};
        }

        timerRef.current = null;
      }, 1000);
    }
  };

  // save pending changes when switching notes or unmounting
  useEffect(() => {
    return () => {
      // clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // save pending changes for editing note
      if (selectedNoteId && editingNoteId.current === selectedNoteId && pendingChangesRef.current) {
        const { title: pendingTitle, body: pendingBody } = pendingChangesRef.current;
        void onUpdate(selectedNoteId, pendingTitle, pendingBody);
      }
    };
  }, [selectedNoteId, onUpdate]);

  return {
    debounceUpdate,
    hasPendingUpdate: !!timerRef.current,
  };
};

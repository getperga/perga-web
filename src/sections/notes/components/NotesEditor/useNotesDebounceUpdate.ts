import { useCallback, useEffect, useRef } from 'react';

import type { NoteDTO } from '@api/notes';

const AUTOSAVE_DELAY_MS = 1000;

interface UseNotesDebounceUpdateProps {
  selectedNote: NoteDTO | null;
  onUpdate: (id: number, title: string | undefined, body: string | undefined) => Promise<void>;
}

export const useNotesDebounceUpdate = ({ selectedNote, onUpdate }: UseNotesDebounceUpdateProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChanges = useRef<{ title?: string; body?: string }>({});
  const noteId = selectedNote?.id;

  const flush = useCallback(
    (id: number) => {
      const { title, body } = pendingChanges.current;

      pendingChanges.current = {};
      if (title !== undefined || body !== undefined) {
        void onUpdate(id, title, body);
      }
    },
    [onUpdate],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (noteId === undefined) {
        return;
      }

      flush(noteId);
    };
  }, [noteId, flush]);

  const debounceUpdate = (title: string | undefined, body: string | undefined) => {
    if (noteId === undefined) {
      return;
    }
    if (title !== undefined) {
      pendingChanges.current.title = title;
    }
    if (body !== undefined) {
      pendingChanges.current.body = body;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush(noteId);
    }, AUTOSAVE_DELAY_MS);
  };

  return { debounceUpdate };
};

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useToast } from '@common/contexts/toast/useToast';
import { useNotes } from '@notes/context';

const NOTES_PATH = '/notes/';

export const useNoteRoute = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { openNote } = useNotes();
  const { showError } = useToast();

  useEffect(() => {
    if (noteId === undefined) {
      return;
    }

    const parsedNoteId = Number(noteId);
    if (!/^\d+$/.test(noteId) || !Number.isSafeInteger(parsedNoteId) || parsedNoteId <= 0) {
      showError('Invalid note link');
      void navigate(NOTES_PATH, { replace: true });
      return;
    }

    const controller = new AbortController();
    const openLinkedNote = async () => {
      try {
        await openNote(parsedNoteId, controller.signal);
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        showError('Could not open this note. Please check access and try again.');
        void navigate(NOTES_PATH, { replace: true });
        return;
      }

      if (controller.signal.aborted) {
        return;
      }

      void navigate(NOTES_PATH, { replace: true });
    };

    void openLinkedNote();
    return () => {
      controller.abort();
    };
  }, [noteId, navigate, openNote, showError]);

  return noteId !== undefined;
};

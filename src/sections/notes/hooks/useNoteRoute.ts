import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getNote } from '@api/notes';
import { useToast } from '@common/contexts/toast/useToast';
import { useNotes } from '@notes/context';

const NOTES_PATH = '/notes/';

export const useNoteRoute = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { setSelectedNoteId } = useNotes();
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
    const openNote = async () => {
      try {
        await getNote(parsedNoteId, controller.signal);
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

      setSelectedNoteId(parsedNoteId);
      void navigate(NOTES_PATH, { replace: true });
    };

    void openNote();
    return () => {
      controller.abort();
    };
  }, [noteId, navigate, setSelectedNoteId, showError]);

  return noteId !== undefined;
};

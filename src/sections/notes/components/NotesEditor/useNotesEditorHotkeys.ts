import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';

interface UseNotesEditorHotkeysProps {
  noteId: number | undefined;
  canOpenPreviousNote: boolean;
  canOpenNextNote: boolean;
  openPreviousNote: () => void;
  openNextNote: () => void;
  toggleFindBar: () => void;
}

export const useNotesEditorHotkeys = ({
  noteId,
  canOpenPreviousNote,
  canOpenNextNote,
  openPreviousNote,
  openNextNote,
  toggleFindBar,
}: UseNotesEditorHotkeysProps) => {
  useEffect(() => {
    if (noteId === undefined) {
      return;
    }

    const handleHistoryKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
        return;
      }

      // keep browser history unchanged
      event.preventDefault();

      if (event.key === 'ArrowLeft' && canOpenPreviousNote) {
        openPreviousNote();
      } else if (event.key === 'ArrowRight' && canOpenNextNote) {
        openNextNote();
      }
    };

    window.addEventListener('keydown', handleHistoryKeyDown);
    return () => window.removeEventListener('keydown', handleHistoryKeyDown);
  }, [noteId, canOpenPreviousNote, canOpenNextNote, openPreviousNote, openNextNote]);

  const handleEditorKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFindBar();
    }
  };

  return { handleEditorKeyDown };
};

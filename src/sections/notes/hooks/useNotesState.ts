import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import type {
  NotesFolderResponseDTO,
  NoteDTO,
  NoteMetaDTO,
  NotesExportTypeDTO,
  NotesExportTargetDTO,
} from '@api/notes';
import {
  getFolders,
  createFolder,
  updateFolder,
  getNote,
  createNote,
  updateNote,
  emptyTrash,
  exportNotes,
  importNotes,
} from '@api/notes';
import { REFRESH_EVENT } from '@common/events';
import { downloadFile } from '@common/utils/download_utils';
import Storage from '@common/utils/storage';
import { StorageKeys } from '@common/utils/storage_keys';
import { NOTES_DEFAULT_EXTENSION, NOTES_EXTENSION_MAP } from '@notes/const';
import { NotesTrashItemIds } from '@notes/types.ts';
import { saveNoteFindQueryToStorage } from '@notes/utils';

const NOTE_HISTORY_LIMIT = 50;
const RECENT_NOTES_LIMIT = 10;

interface NotesHistoryState {
  ids: number[];
  index: number;
}

const getNotesHistoryFromStorage = (): number[] => {
  const notesHistory = Storage.getJSON<unknown>(StorageKeys.NotesHistory, []);
  if (!Array.isArray(notesHistory)) {
    return [];
  }

  const seenNotes = new Set<number>();
  return notesHistory
    .filter((noteId): noteId is number => Number.isInteger(noteId) && noteId > 0)
    .reverse()
    .filter((noteId) => {
      if (seenNotes.has(noteId)) {
        return false;
      }
      seenNotes.add(noteId);
      return true;
    })
    .reverse()
    .slice(-NOTE_HISTORY_LIMIT);
};

export const useNotesState = () => {
  const [rootFolder, setRootFolder] = useState<NotesFolderResponseDTO | null>(null);
  const [trashFolder, setTrashFolder] = useState<NotesFolderResponseDTO | null>(null);
  const [trashItemIds, setTrashItemIds] = useState<NotesTrashItemIds>({
    folderIds: [],
    noteIds: [],
  });
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(() => {
    const saved = Storage.get(StorageKeys.NotesSelectedNoteId);
    const parsed = saved ? Number.parseInt(saved, 10) : Number.NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [notesHistoryState, setNotesHistoryState] = useState<NotesHistoryState>(() => {
    let noteIds = getNotesHistoryFromStorage();
    let index = selectedNoteId === null ? noteIds.length - 1 : noteIds.lastIndexOf(selectedNoteId);

    if (selectedNoteId !== null && index === -1) {
      noteIds = [...noteIds, selectedNoteId].slice(-NOTE_HISTORY_LIMIT);
      index = noteIds.length - 1;
    }

    return { ids: noteIds, index };
  });
  const notesHistoryRef = useRef(notesHistoryState);
  const [selectedNote, setSelectedNote] = useState<NoteDTO | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [titleFocusNoteId, setTitleFocusNoteId] = useState<number | null>(null);
  const [findInputFocusNoteId, setFindInputFocusNoteId] = useState<number | null>(null);
  const [findQueryTrigger, setFindQueryTrigger] = useState(0);

  // use ref to avoid infinite loop when updating selectedNote in handleUpdateNote
  const selectedNoteRef = useRef(selectedNote);
  useEffect(() => {
    selectedNoteRef.current = selectedNote;
  }, [selectedNote]);

  const saveNotesHistory = useCallback((nextHistory: NotesHistoryState) => {
    notesHistoryRef.current = nextHistory;
    setNotesHistoryState(nextHistory);
  }, []);

  const selectNote = useCallback(
    (noteId: number | null) => {
      if (noteId === null) {
        setSelectedNoteId(null);
        return;
      }

      const currentHistory = notesHistoryRef.current;
      if (currentHistory.ids[currentHistory.index] !== noteId) {
        const previousIds = currentHistory.ids
          .slice(0, currentHistory.index + 1)
          .filter((historyNoteId) => historyNoteId !== noteId);
        const ids = [...previousIds, noteId].slice(-NOTE_HISTORY_LIMIT);
        saveNotesHistory({ ids, index: ids.length - 1 });
      }

      setSelectedNoteId(noteId);
    },
    [saveNotesHistory],
  );

  const openPreviousNote = useCallback(() => {
    const currentHistory = notesHistoryRef.current;
    if (currentHistory.index <= 0) {
      return;
    }

    const index = currentHistory.index - 1;
    saveNotesHistory({ ...currentHistory, index });
    setSelectedNoteId(currentHistory.ids[index] ?? null);
  }, [saveNotesHistory]);

  const openNextNote = useCallback(() => {
    const currentHistory = notesHistoryRef.current;
    if (currentHistory.index >= currentHistory.ids.length - 1) {
      return;
    }

    const index = currentHistory.index + 1;
    saveNotesHistory({ ...currentHistory, index });
    setSelectedNoteId(currentHistory.ids[index] ?? null);
  }, [saveNotesHistory]);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await getFolders();
      setRootFolder(response.data.root_folder);
      setTrashFolder(response.data.trash_folder);
    } catch (error) {
      console.error('Error fetching notes folders:', error);
    }
  }, []);

  const fetchNoteContent = useCallback(async (noteId: number) => {
    try {
      const response = await getNote(noteId);
      setSelectedNote(response.data);
    } catch (error) {
      console.error('Error fetching note content:', error);
    }
  }, []);

  const handleMoveFolderToTrash = useCallback(
    async (folderId: number) => {
      if (!trashFolder) {
        return;
      }

      try {
        await updateFolder(folderId, { parent_id: trashFolder.id });
        await fetchFolders();
      } catch (error) {
        console.error('Error moving folder to trash:', error);
      }
    },
    [fetchFolders, trashFolder],
  );

  const handleRenameFolder = useCallback(
    async (folderId: number, name: string) => {
      try {
        await updateFolder(folderId, { name });
        await fetchFolders();
      } catch (error) {
        console.error('Error renaming folder:', error);
      }
    },
    [fetchFolders],
  );

  const handleCreateFolder = useCallback(
    async (name: string, parentId: number) => {
      try {
        await createFolder({ name, parent_id: parentId });
        await fetchFolders();
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    },
    [fetchFolders],
  );

  const handleCreateNote = useCallback(
    async (folderId: number) => {
      try {
        const response = await createNote({ body: '', folder_id: folderId });
        selectNote(response.data.id);
        setTitleFocusNoteId(response.data.id);
        await fetchFolders();
      } catch (error) {
        console.error('Error creating note:', error);
      }
    },
    [fetchFolders, selectNote],
  );

  const handleMoveNoteToTrash = useCallback(
    async (noteId: number) => {
      if (!trashFolder) {
        return;
      }

      try {
        await updateNote(noteId, { folder_id: trashFolder.id });
        await fetchFolders();
      } catch (error) {
        console.error('Error moving note to trash:', error);
      }
    },
    [fetchFolders, trashFolder],
  );

  const handleEmptyTrash = useCallback(async () => {
    try {
      await emptyTrash();

      if (selectedNoteId && trashItemIds.noteIds.includes(selectedNoteId)) {
        selectNote(null);
      }

      await fetchFolders();
    } catch (error) {
      console.error('Error emptying trash:', error);
    }
  }, [fetchFolders, selectedNoteId, selectNote, trashItemIds.noteIds]);

  const handleMoveFolder = useCallback(
    async (folderId: number, parentId: number) => {
      try {
        await updateFolder(folderId, { parent_id: parentId });
        await fetchFolders();
      } catch (error) {
        console.error('Error moving folder:', error);
      }
    },
    [fetchFolders],
  );

  const handleMoveNote = useCallback(
    async (noteId: number, folderId: number) => {
      try {
        await updateNote(noteId, { folder_id: folderId });
        await fetchFolders();
      } catch (error) {
        console.error('Error moving note:', error);
      }
    },
    [fetchFolders],
  );

  const handleRenameNote = useCallback(
    async (noteId: number, title: string) => {
      try {
        await updateNote(noteId, { title });
        await fetchFolders();
      } catch (error) {
        console.error('Error renaming note:', error);
      }
    },
    [fetchFolders],
  );

  const handleUpdateNote = useCallback(
    async (noteId: number, title: string | undefined, body: string | undefined) => {
      try {
        const response = await updateNote(noteId, { title, body });
        if (selectedNoteRef.current?.id === noteId) {
          setSelectedNote(response.data);
        }
        await fetchFolders();
      } catch (error) {
        console.error('Error updating note:', error);
      }
    },
    [fetchFolders],
  );

  const handleExportNotes = useCallback(
    async (
      exportType: NotesExportTypeDTO,
      exportTarget: NotesExportTargetDTO,
      exportTargetId?: number | null,
    ) => {
      try {
        const response = await exportNotes({
          export_type: exportType,
          export_target: exportTarget,
          export_target_id: exportTargetId,
        });

        const contentDisposition = response.headers['content-disposition'] as string;
        let filename = '';
        if (contentDisposition) {
          const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
          if (filenameStarMatch?.[1]) {
            filename = decodeURIComponent(filenameStarMatch[1]);
          } else {
            const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
            if (filenameMatch?.[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '').trim();
            }
          }
        }

        if (!filename) {
          // generate filename as a fallback
          const extension = NOTES_EXTENSION_MAP[exportType] || NOTES_DEFAULT_EXTENSION;
          filename = `notes_export_${new Date().getTime()}.${extension}`;
        }

        downloadFile(response.data as Blob, filename);
      } catch (error) {
        console.error('Error exporting notes:', error);
      }
    },
    [],
  );

  const handleImportNotes = useCallback(
    async (files: File[], folderId?: number) => {
      try {
        const response = await importNotes(files, folderId);
        await fetchFolders();
        return response.data;
      } catch (error) {
        console.error('Error importing notes:', error);
        throw error;
      }
    },
    [fetchFolders],
  );

  // initial fetch for folders
  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  // fetch selected note
  useEffect(() => {
    if (selectedNoteId) {
      void fetchNoteContent(selectedNoteId);
    } else {
      setSelectedNote(null);
    }
  }, [selectedNoteId, fetchNoteContent]);

  useEffect(() => {
    if (!trashFolder) {
      return;
    }

    const folderIds: number[] = [];
    const noteIds: number[] = [];

    const collectIds = (folder: NotesFolderResponseDTO) => {
      folder.subfolders.forEach((subfolder) => {
        folderIds.push(subfolder.id);
        collectIds(subfolder);
      });
      folder.notes.forEach((note) => {
        noteIds.push(note.id);
      });
    };

    collectIds(trashFolder);

    setTrashItemIds({ folderIds, noteIds });
  }, [trashFolder]);

  // save selectedNoteId to localStorage
  useEffect(() => {
    if (selectedNoteId) {
      Storage.set(StorageKeys.NotesSelectedNoteId, selectedNoteId.toString());
    } else {
      Storage.remove(StorageKeys.NotesSelectedNoteId);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    Storage.setJSON(StorageKeys.NotesHistory, notesHistoryState.ids);
  }, [notesHistoryState.ids]);

  // Refresh listener
  useEffect(() => {
    const handler = () => {
      void fetchFolders();
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => {
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [fetchFolders]);

  const focusEditor = useCallback(() => {
    // change trigger number to focus on every note title click
    setFocusTrigger((prev) => prev + 1);
  }, []);

  const clearTitleFocusRequest = useCallback((noteId: number) => {
    setTitleFocusNoteId((pendingNoteId) => (pendingNoteId === noteId ? null : pendingNoteId));
  }, []);

  const clearFindInputFocusRequest = useCallback((noteId: number) => {
    setFindInputFocusNoteId((pendingNoteId) => (pendingNoteId === noteId ? null : pendingNoteId));
  }, []);

  const openNoteFromSearch = useCallback(
    (noteId: number, query: string) => {
      saveNoteFindQueryToStorage(noteId, query);
      selectNote(noteId);
      setFindInputFocusNoteId(noteId);
      setFindQueryTrigger((prev) => prev + 1);
    },
    [selectNote],
  );

  const recentNotes = useMemo(() => {
    const notesById = new Map<number, NoteMetaDTO>();
    const collectNotes = (folder: NotesFolderResponseDTO | null) => {
      if (!folder) {
        return;
      }
      folder.notes.forEach((note) => notesById.set(note.id, note));
      folder.subfolders.forEach(collectNotes);
    };

    collectNotes(rootFolder);
    collectNotes(trashFolder);

    const seen = new Set<number>();
    return [...notesHistoryState.ids]
      .reverse()
      .filter((noteId) => {
        if (seen.has(noteId)) {
          return false;
        }
        seen.add(noteId);
        return true;
      })
      .map((noteId) => notesById.get(noteId))
      .filter((note): note is NoteMetaDTO => note !== undefined)
      .slice(0, RECENT_NOTES_LIMIT);
  }, [notesHistoryState.ids, rootFolder, trashFolder]);

  return {
    rootFolder,
    trashFolder,
    handleCreateFolder,
    handleRenameFolder,
    handleMoveFolder,
    handleMoveFolderToTrash,
    handleCreateNote,
    handleRenameNote,
    handleUpdateNote,
    handleMoveNote,
    handleMoveNoteToTrash,
    handleEmptyTrash,
    handleExportNotes,
    handleImportNotes,
    setSelectedNoteId: selectNote,
    recentNotes,
    canOpenPreviousNote: notesHistoryState.index > 0,
    canOpenNextNote: notesHistoryState.index < notesHistoryState.ids.length - 1,
    openPreviousNote,
    openNextNote,
    focusEditor,
    focusTrigger,
    titleFocusNoteId,
    clearTitleFocusRequest,
    findInputFocusNoteId,
    clearFindInputFocusRequest,
    selectedNote,
    selectedNoteId,
    trashItemIds,
    openNoteFromSearch,
    findQueryTrigger,
  };
};

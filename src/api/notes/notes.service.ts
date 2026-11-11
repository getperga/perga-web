import axios from 'axios';

import { getConfig } from '@/config';
import type {
  NoteDTO,
  NoteCreateDTO,
  NoteUpdateDTO,
  NoteSearchResultDTO,
  NotesExportRequestSchema,
  NotesImportResponseDTO,
  PinnedNotesReorderDTO,
} from './notes.dto';

// API URLs
const { API_BASE_URL } = getConfig();
const NOTES_API_URL = `${API_BASE_URL}/notes`;

// Notes API methods
export const getNote = (noteId: number, signal?: AbortSignal) =>
  axios.get<NoteDTO>(`${NOTES_API_URL}/${noteId}/`, { signal });

export const createNote = (note: NoteCreateDTO) => axios.post<NoteDTO>(`${NOTES_API_URL}/`, note);

export const updateNote = (noteId: number, changes: NoteUpdateDTO) =>
  axios.patch<NoteDTO>(`${NOTES_API_URL}/${noteId}/`, changes);

export const searchNotes = (query: string, signal?: AbortSignal) =>
  axios.get<NoteSearchResultDTO[]>(`${NOTES_API_URL}/search/`, {
    params: { query },
    signal,
  });

export const exportNotes = (params: NotesExportRequestSchema) =>
  axios.get(`${NOTES_API_URL}/export/`, { params, responseType: 'blob' });

export const importNotes = (files: File[], folderId?: number) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return axios.post<NotesImportResponseDTO>(`${NOTES_API_URL}/import/`, formData, {
    params: { folder_id: folderId },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const reorderPinnedNotes = (data: PinnedNotesReorderDTO) =>
  axios.post<NoteDTO[]>(`${NOTES_API_URL}/pinned/reorder/`, data);

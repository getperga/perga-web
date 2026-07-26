import axios from 'axios';

import { getConfig } from '@/config';
import type {
  NoteDTO,
  NoteCreateDTO,
  NoteUpdateDTO,
  NoteSearchResultDTO,
  NotesFolderDTO,
  NotesFolderCreateDTO,
  NotesFolderUpdateDTO,
  NotesFoldersResponseSchemaDTO,
  NotesExportRequestSchema,
  NotesImportResponseDTO,
} from './notes.dto';

// API URLs
const { API_BASE_URL } = getConfig();
const NOTES_API_URL = `${API_BASE_URL}/notes`;

// Notes API methods
export const getNote = (noteId: number) => axios.get<NoteDTO>(`${NOTES_API_URL}/${noteId}/`);

export const createNote = (note: NoteCreateDTO) => axios.post<NoteDTO>(`${NOTES_API_URL}/`, note);

export const updateNote = (noteId: number, changes: NoteUpdateDTO) =>
  axios.patch<NoteDTO>(`${NOTES_API_URL}/${noteId}/`, changes);

export const searchNotes = (query: string) =>
  axios.get<NoteSearchResultDTO[]>(`${NOTES_API_URL}/search/`, { params: { query } });

// Notes Folders API methods
export const getFolders = () =>
  axios.get<NotesFoldersResponseSchemaDTO>(`${NOTES_API_URL}/folders/`);

export const createFolder = (folder: NotesFolderCreateDTO) =>
  axios.post<NotesFolderDTO>(`${NOTES_API_URL}/folders/`, folder);

export const updateFolder = (folderId: number, changes: NotesFolderUpdateDTO) =>
  axios.patch<NotesFolderDTO>(`${NOTES_API_URL}/folders/${folderId}/`, changes);

export const emptyTrash = () => axios.post(`${NOTES_API_URL}/folders/empty-trash/`);

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

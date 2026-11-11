import axios from 'axios';

import { getConfig } from '@/config';
import type {
  NotesFolderCreateDTO,
  NotesFolderDTO,
  NotesFoldersResponseSchemaDTO,
  NotesFolderUpdateDTO,
} from './notes.dto';

const { API_BASE_URL } = getConfig();
const NOTES_FOLDERS_API_URL = `${API_BASE_URL}/notes/folders`;

export const getFolders = () => {
  return axios.get<NotesFoldersResponseSchemaDTO>(`${NOTES_FOLDERS_API_URL}/`);
};

export const createFolder = (folder: NotesFolderCreateDTO) => {
  return axios.post<NotesFolderDTO>(`${NOTES_FOLDERS_API_URL}/`, folder);
};

export const updateFolder = (folderId: number, changes: NotesFolderUpdateDTO) => {
  return axios.patch<NotesFolderDTO>(`${NOTES_FOLDERS_API_URL}/${folderId}/`, changes);
};

export const emptyTrash = () => {
  return axios.post(`${NOTES_FOLDERS_API_URL}/empty-trash/`);
};

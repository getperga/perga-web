import axios from 'axios';

import { getConfig } from '@/config';
import type { NotesAttachmentDTO } from './notes.dto';

const { API_BASE_URL } = getConfig();
const NOTES_API_URL = `${API_BASE_URL}/notes`;

export const uploadNoteAttachment = (noteId: number, file: File, signal: AbortSignal) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post<NotesAttachmentDTO>(`${NOTES_API_URL}/${noteId}/attachments/`, formData, {
    signal,
  });
};

export const getNoteAttachmentContent = (
  noteId: string,
  attachmentId: string,
  signal: AbortSignal,
) => {
  return axios.get<Blob>(`${NOTES_API_URL}/${noteId}/attachments/${attachmentId}/content/`, {
    responseType: 'blob',
    signal,
  });
};

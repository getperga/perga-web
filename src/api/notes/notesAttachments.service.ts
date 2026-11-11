import axios from 'axios';

import { getConfig } from '@/config';

const { API_BASE_URL } = getConfig();
const NOTES_API_URL = `${API_BASE_URL}/notes`;

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

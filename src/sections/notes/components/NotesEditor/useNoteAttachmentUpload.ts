import { isAxiosError } from 'axios';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Transaction } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

import { uploadNoteAttachment } from '@api/notes';
import { NoteImage } from './extensions/noteImage';
import { NoteFile } from './extensions/noteFile';

export const NOTE_IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp';
export const NOTE_ATTACHMENT_ACCEPT = '.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip';
const UPLOAD_FAILED_MESSAGE = 'Unable to upload attachment';
const INSERT_FAILED_MESSAGE = 'Unable to insert attachment here';

const getUploadError = (error: unknown) => {
  if (isAxiosError<{ detail?: unknown }>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail) {
      return detail;
    }
    if (error.response?.status === 413) {
      return 'Attachment exceeds the upload limit';
    }
  }
  return UPLOAD_FAILED_MESSAGE;
};

export const useNoteAttachmentUpload = (editor: Editor | null, noteId: number | undefined) => {
  const activeUpload = useRef<AbortController | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useLayoutEffect(() => {
    setIsUploading(false);
    setUploadError('');
    return () => {
      activeUpload.current?.abort();
      activeUpload.current = null;
    };
  }, [editor, noteId]);

  const uploadAttachments = async (files: File[], insertAt?: number) => {
    if (
      !editor ||
      editor.isDestroyed ||
      !editor.isEditable ||
      !noteId ||
      !files.length ||
      activeUpload.current
    ) {
      return;
    }

    const controller = new AbortController();
    activeUpload.current = controller;

    setIsUploading(true);
    setUploadError('');
    let position = insertAt ?? editor.state.selection.from;
    const trackPosition = ({ transaction }: { transaction: Transaction }) => {
      position = transaction.mapping.map(position);
    };
    editor.on('transaction', trackPosition);

    try {
      for (const file of files) {
        if (controller.signal.aborted || editor.isDestroyed || !editor.isEditable) {
          break;
        }

        try {
          const { data } = await uploadNoteAttachment(noteId, file, controller.signal);
          if (controller.signal.aborted || editor.isDestroyed || !editor.isEditable) {
            break;
          }

          const content =
            data.attachment_type === 'file'
              ? {
                  type: NoteFile.name,
                  attrs: {
                    href: data.url,
                    'data-attachment-id': data.id,
                    filename: data.original_filename,
                  },
                }
              : {
                  type: NoteImage.name,
                  attrs: {
                    src: data.url,
                    'data-attachment-id': data.id,
                    alt: data.original_filename,
                  },
                };

          const inserted = editor.commands.insertContentAt(position, content);
          if (!inserted) {
            setUploadError(`${file.name}: ${INSERT_FAILED_MESSAGE}`);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setUploadError(`${file.name}: ${getUploadError(error)}`);
          }
        }
      }
    } finally {
      editor.off('transaction', trackPosition);
      if (activeUpload.current === controller) {
        activeUpload.current = null;
        setIsUploading(false);
      }
    }
  };

  return { uploadAttachments, isUploading, uploadError };
};

import { Node, mergeAttributes } from '@tiptap/core';

import { getNoteAttachmentContent } from '@api/notes/notesAttachments.service';

const ATTACHMENT_PATH_PATTERN = /\/notes\/([1-9]\d*)\/attachments\/([1-9]\d*)\/content\/$/;
const IMAGE_ATTRIBUTES = ['src', 'alt', 'title', 'width', 'height', 'data-attachment-id'];
const IMAGE_LOADING_MESSAGE = 'Loading image…';
const IMAGE_ERROR_MESSAGE = 'Unable to load image';

export const NoteImage = Node.create({
  name: 'noteImage',
  inline: true,
  group: 'inline',
  atom: true,
  draggable: true,

  addAttributes() {
    return Object.fromEntries(
      IMAGE_ATTRIBUTES.map((name) => {
        return [name, { default: null }];
      }),
    );
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'note-image';
      dom.contentEditable = 'false';
      const image = document.createElement('img');
      const status = document.createElement('span');
      status.setAttribute('role', 'status');
      dom.append(image, status);

      const controller = new AbortController();
      let objectUrl: string | undefined;
      const showError = () => {
        image.hidden = true;
        status.hidden = false;
        status.textContent = IMAGE_ERROR_MESSAGE;
      };
      image.onload = () => {
        status.hidden = true;
      };
      image.onerror = showError;
      for (const name of ['alt', 'title', 'width', 'height']) {
        if (node.attrs[name] !== null) {
          image.setAttribute(name, String(node.attrs[name]));
        }
      }

      const src = String(node.attrs.src || '');
      const attachmentId = node.attrs['data-attachment-id'];
      const attachmentPath = src.match(ATTACHMENT_PATH_PATTERN);
      if (attachmentId) {
        status.textContent = IMAGE_LOADING_MESSAGE;
        if (!attachmentPath || attachmentPath[2] !== String(attachmentId)) {
          showError();
        } else {
          // construct the request from IDs so document URLs cannot receive the bearer token
          void getNoteAttachmentContent(attachmentPath[1], attachmentPath[2], controller.signal)
            .then(({ data }) => {
              if (controller.signal.aborted) {
                return;
              }
              objectUrl = URL.createObjectURL(data);
              image.src = objectUrl;
            })
            .catch(() => {
              if (!controller.signal.aborted) {
                showError();
              }
            });
        }
      } else if (/^(https?:\/\/|\/(?!\/))/i.test(src)) {
        // preserve display of legacy images without sending application creds
        status.hidden = true;
        image.src = src;
      } else {
        showError();
      }

      return {
        dom,
        ignoreMutation: () => {
          return true;
        },
        destroy: () => {
          controller.abort();
          image.onload = null;
          image.onerror = null;
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        },
      };
    };
  },
});

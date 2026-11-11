import { Node, mergeAttributes } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';

import { getNoteAttachmentContent } from '@api/notes/notesAttachments.service';

const ATTACHMENT_PATH_PATTERN = /\/notes\/([1-9]\d*)\/attachments\/([1-9]\d*)\/content\/$/;
const IMAGE_ATTRIBUTES = ['src', 'alt', 'title', 'width', 'height', 'data-attachment-id'];
const IMAGE_LOADING_MESSAGE = 'Loading image…';
const IMAGE_ERROR_MESSAGE = 'Unable to load image';
const MIN_IMAGE_WIDTH = 24;
const IMAGE_RESIZE_STEP = 10;
const RESIZE_IMAGE_LABEL = 'Resize image (Left and Right arrows)';
const DISPLAY_ATTRIBUTES = ['alt', 'title', 'width', 'height'];

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
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      const dom = document.createElement('span');
      dom.className = 'note-image';
      dom.contentEditable = 'false';
      const image = document.createElement('img');
      const status = document.createElement('span');
      status.setAttribute('role', 'status');
      dom.append(image, status);

      const resizeHandle = document.createElement('button');
      resizeHandle.type = 'button';
      resizeHandle.className = 'note-image-resize';
      resizeHandle.title = RESIZE_IMAGE_LABEL;
      resizeHandle.setAttribute('aria-label', RESIZE_IMAGE_LABEL);
      resizeHandle.hidden = true;
      if (node.attrs['data-attachment-id']) {
        dom.append(resizeHandle);
      }

      const applyDisplayAttributes = () => {
        for (const name of DISPLAY_ATTRIBUTES) {
          const value = currentNode.attrs[name];
          if (value === null) {
            image.removeAttribute(name);
          } else {
            image.setAttribute(name, String(value));
          }
        }
      };
      applyDisplayAttributes();

      const clampWidth = (width: number) => {
        const max = editor.view.dom.clientWidth;
        return Math.round(Math.min(max, Math.max(MIN_IMAGE_WIDTH, width)));
      };
      const commitWidth = (width: number) => {
        const pos = getPos();
        if (!editor.isEditable || pos === undefined || width <= 0) {
          return;
        }
        editor.view.dispatch(
          closeHistory(
            editor.state.tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              width,
              height: null,
            }),
          ),
        );
      };

      let drag:
        | {
            pointerId: number;
            startX: number;
            startY: number;
            startWidth: number;
            heightPerWidth: number;
            width: number;
          }
        | undefined;
      resizeHandle.addEventListener('pointerdown', (event) => {
        if (!editor.isEditable || event.button !== 0 || drag) {
          return;
        }
        event.preventDefault();
        const { width, height } = image.getBoundingClientRect();
        if (width <= 0) {
          return;
        }
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: width,
          heightPerWidth: height / width,
          width,
        };
        resizeHandle.setPointerCapture(event.pointerId);
      });
      resizeHandle.addEventListener('pointermove', (event) => {
        if (drag?.pointerId === event.pointerId) {
          const deltaX = event.clientX - drag.startX;
          const deltaY = event.clientY - drag.startY;
          const ratio = drag.heightPerWidth;
          // project the pointer movement onto the image diagonal
          const widthChange = (deltaX + deltaY * ratio) / (1 + ratio * ratio);
          drag.width = clampWidth(drag.startWidth + widthChange);
          image.style.width = `${drag.width}px`;
        }
      });
      const clearPreview = () => {
        drag = undefined;
        image.style.removeProperty('width');
      };
      resizeHandle.addEventListener('pointerup', (event) => {
        if (drag?.pointerId === event.pointerId) {
          const { width, startWidth } = drag;
          clearPreview();
          if (width !== startWidth) {
            commitWidth(width);
          }
        }
      });
      resizeHandle.addEventListener('lostpointercapture', clearPreview);
      resizeHandle.addEventListener('pointercancel', clearPreview);
      resizeHandle.onkeydown = (event) => {
        if (!event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault();
          const currentWidth = image.getBoundingClientRect().width;
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          const width = clampWidth(currentWidth + direction * IMAGE_RESIZE_STEP);
          if (width !== currentWidth) {
            commitWidth(width);
          }
        }
      };
      resizeHandle.ondragstart = (event) => {
        event.preventDefault();
      };

      const controller = new AbortController();
      let objectUrl: string | undefined;
      const showError = () => {
        image.hidden = true;
        resizeHandle.hidden = true;
        status.hidden = false;
        status.textContent = IMAGE_ERROR_MESSAGE;
      };
      image.onload = () => {
        status.hidden = true;
        resizeHandle.hidden = false;
      };
      image.onerror = showError;

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
        update: (updatedNode) => {
          if (
            updatedNode.type !== currentNode.type ||
            updatedNode.attrs.src !== currentNode.attrs.src ||
            updatedNode.attrs['data-attachment-id'] !== currentNode.attrs['data-attachment-id']
          ) {
            return false;
          }
          currentNode = updatedNode;
          applyDisplayAttributes();
          return true;
        },
        stopEvent: (event) => {
          return event.target === resizeHandle;
        },
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

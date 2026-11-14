import { Node, mergeAttributes } from '@tiptap/core';

import { getNoteAttachmentContent } from '@api/notes/notesAttachments.service';

const FILE_PATH = /\/notes\/([1-9]\d*)\/attachments\/([1-9]\d*)\/content\/$/;
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

export const NoteFile = Node.create({
  name: 'noteFile',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      href: { default: null },
      'data-attachment-id': { default: null },
      filename: {
        default: 'Attachment',
        parseHTML: (element) => {
          return element.textContent || 'Attachment';
        },
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-attachment-id]', priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes), node.attrs.filename];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('button');
      dom.type = 'button';
      dom.contentEditable = 'false';
      dom.className = 'note-file-download';
      dom.textContent = node.attrs.filename;
      const controller = new AbortController();

      const path = String(node.attrs.href).match(FILE_PATH);
      if (!path || path[2] !== String(node.attrs['data-attachment-id'])) {
        dom.disabled = true;
      }

      dom.onclick = async () => {
        if (!path || dom.disabled) {
          return;
        }

        dom.disabled = true;
        dom.textContent = 'Downloading…';
        try {
          // build the authenticated URL from IDs, never from the note HTML
          const { data } = await getNoteAttachmentContent(path[1], path[2], controller.signal, false);
          if (controller.signal.aborted) {
            return;
          }

          const url = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = url;
          link.download = node.attrs.filename;
          link.click();
          window.setTimeout(() => {
            URL.revokeObjectURL(url);
          }, DOWNLOAD_URL_LIFETIME_MS);
          dom.textContent = node.attrs.filename;
        } catch {
          if (!controller.signal.aborted) {
            dom.textContent = `Download failed: ${node.attrs.filename}`;
          }
        } finally {
          dom.disabled = false;
        }
      };
      return {
        dom,
        stopEvent: () => {
          return true;
        },
        destroy: () => {
          controller.abort();
        },
      };
    };
  },
});

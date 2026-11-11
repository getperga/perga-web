import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { getNoteAttachmentContent } from '@api/notes/notesAttachments.service';
import { NoteImage } from './noteImage';

vi.mock('@api/notes/notesAttachments.service', () => {
  return { getNoteAttachmentContent: vi.fn() };
});

const CONTENT_URL = '/api/v1/notes/42/attachments/123/content/';
const IMAGE_HTML = `<p>Before<img src="${CONTENT_URL}" data-attachment-id="123" alt="Screenshot">After</p>`;
const BLOB_URL = 'blob:test-image';

describe('NoteImage', () => {
  const editors: Editor[] = [];
  const createEditor = (content = IMAGE_HTML) => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit, NoteImage],
      content,
    });
    editors.push(editor);
    return editor;
  };
  beforeEach(() => {
    vi.mocked(getNoteAttachmentContent).mockReset();
    vi.mocked(getNoteAttachmentContent).mockResolvedValue({ data: new Blob(['image']) } as never);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => {
          return BLOB_URL;
        });
        static revokeObjectURL = vi.fn();
      },
    );
  });
  afterEach(() => {
    editors.splice(0).forEach((editor) => {
      editor.destroy();
    });
    vi.unstubAllGlobals();
  });
  it('loads private bytes while preserving canonical HTML and surrounding text', async () => {
    const editor = createEditor();
    await waitFor(() => {
      expect(
        editor.view.dom.querySelector<HTMLImageElement>('.note-image img')?.getAttribute('src'),
      ).toBe(BLOB_URL);
    });
    expect(getNoteAttachmentContent).toHaveBeenCalledWith('42', '123', expect.any(AbortSignal));
    expect(editor.getHTML()).toContain(`src="${CONTENT_URL}"`);
    expect(editor.getHTML()).toContain('data-attachment-id="123"');
    expect(editor.getHTML()).toContain('alt="Screenshot"');
    expect(editor.getHTML()).not.toContain('blob:');
    expect(editor.getHTML()).not.toContain('Loading image');
    expect(editor.getText()).toBe('BeforeAfter');
  });
  it('releases the URL and cancels the request when switching notes', async () => {
    const editor = createEditor();
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });
    const signal = vi.mocked(getNoteAttachmentContent).mock.calls[0][2];
    editor.commands.setContent('<p>Another note</p>', { emitUpdate: false });
    expect(signal.aborted).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
    expect(editor.view.dom.querySelector<HTMLImageElement>('.note-image img')).toBeNull();
  });
  it('does not trigger autosave on download and keeps canonical URLs after text edits', async () => {
    const editor = createEditor();
    const onUpdate = vi.fn();
    editor.on('update', onUpdate);
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });
    expect(onUpdate).not.toHaveBeenCalled();
    editor.commands.insertContentAt(1, 'Edited ');
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(editor.getHTML()).toContain(`src="${CONTENT_URL}"`);
    expect(editor.getHTML()).not.toContain('blob:');
  });
  it('ignores a response arriving after the image has been removed', async () => {
    let resolveRequest!: (value: Awaited<ReturnType<typeof getNoteAttachmentContent>>) => void;
    vi.mocked(getNoteAttachmentContent).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    });
    const editor = createEditor();
    editor.commands.setContent('<p>Removed</p>');
    resolveRequest({ data: new Blob(['late']) } as never);
    await Promise.resolve();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('shows a failed download without changing saved HTML', async () => {
    vi.mocked(getNoteAttachmentContent).mockRejectedValue(new Error('Forbidden'));
    const editor = createEditor();
    await waitFor(() => {
      expect(editor.view.dom.textContent).toContain('Unable to load image');
    });
    expect(editor.getHTML()).toContain(`src="${CONTENT_URL}"`);
    expect(editor.view.dom.querySelector<HTMLImageElement>('.note-image img')?.hidden).toBe(true);
  });
  it('uses only IDs from document URLs for authenticated requests', async () => {
    createEditor(IMAGE_HTML.replace(CONTENT_URL, `https://untrusted.example${CONTENT_URL}`));
    await waitFor(() => {
      expect(getNoteAttachmentContent).toHaveBeenCalledWith('42', '123', expect.any(AbortSignal));
    });
  });
  it('rejects mismatching IDs without requesting a file', () => {
    const editor = createEditor(
      IMAGE_HTML.replace('data-attachment-id="123"', 'data-attachment-id="999"'),
    );
    expect(getNoteAttachmentContent).not.toHaveBeenCalled();
    expect(editor.view.dom.textContent).toContain('Unable to load image');
  });
  it('displays legacy external images without an authenticated request', () => {
    const editor = createEditor('<p><img src="https://example.com/legacy.png" alt="Legacy"></p>');
    expect(
      editor.view.dom.querySelector<HTMLImageElement>('.note-image img')?.getAttribute('src'),
    ).toBe('https://example.com/legacy.png');
    expect(getNoteAttachmentContent).not.toHaveBeenCalled();
    expect(editor.getHTML()).toContain('https://example.com/legacy.png');
  });
  it('releases the URL on editor destruction', async () => {
    const editor = createEditor();
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });
    editor.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
  });
});

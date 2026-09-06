import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NoteLink, normalizeLinkHref, openLinkOnModifierClick } from './noteLink';

const createEditor = (content = '<p>hello world</p>') =>
  new Editor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      NoteLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
    ],
    content,
  });

describe('NoteLink', () => {
  const editors: Editor[] = [];

  afterEach(() => {
    editors.splice(0).forEach((editor) => editor.destroy());
    vi.restoreAllMocks();
  });

  it('does not extend a link when text is inserted at its right boundary', () => {
    const editor = createEditor();
    editors.push(editor);

    editor
      .chain()
      .setTextSelection({ from: 1, to: 6 })
      .setLink({ href: 'https://example.com' })
      .setTextSelection(6)
      .insertContent(' after')
      .run();

    expect(editor.getHTML()).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">hello</a> after world</p>',
    );
  });

  it('registers Link and Underline only once', () => {
    const editor = createEditor();
    editors.push(editor);

    const extensionNames = editor.extensionManager.extensions.map((extension) => extension.name);
    expect(extensionNames.filter((name) => name === 'link')).toHaveLength(1);
    expect(extensionNames.filter((name) => name === 'underline')).toHaveLength(1);
  });

  it('keeps automatic linking enabled', () => {
    const editor = createEditor('<p></p>');
    editors.push(editor);

    editor.commands.insertContent('example.com ');

    expect(editor.getHTML()).toContain('href="https://example.com"');
  });
});

describe('normalizeLinkHref', () => {
  it.each([
    [' example.com/path ', 'https://example.com/path'],
    ['https://example.com', 'https://example.com'],
    ['mailto:person@example.com', 'mailto:person@example.com'],
    ['person@example.com', 'mailto:person@example.com'],
    ['/notes/1', '/notes/1'],
    ['#section', '#section'],
    ['   ', ''],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLinkHref(input)).toBe(expected);
  });
});

describe('openLinkOnModifierClick', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it.each([{ metaKey: true }, { ctrlKey: true }])(
    'opens a link for a modifier click',
    (modifier) => {
      document.body.innerHTML =
        '<a href="https://example.com" target="_blank"><span>open</span></a>';
      const target = document.querySelector('span');
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const event = new MouseEvent('click', {
        cancelable: true,
        button: 0,
        ...modifier,
      });
      Object.defineProperty(event, 'target', { value: target });

      expect(openLinkOnModifierClick(event)).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
    },
  );

  it('leaves an ordinary click to the editor', () => {
    document.body.innerHTML = '<a href="https://example.com">open</a>';
    const target = document.querySelector('a');
    const event = new MouseEvent('click', { cancelable: true, button: 0 });
    Object.defineProperty(event, 'target', { value: target });

    expect(openLinkOnModifierClick(event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
});

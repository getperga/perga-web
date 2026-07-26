import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotesEditorMenuBar } from './NotesEditorMenuBar';
import type { Editor } from '@tiptap/react';

// Mock the editorIcons to simplify rendering
vi.mock('../notes_editor_icons', () => ({
  editorIcons: {
    bold: <div data-testid="icon-bold" />,
    italic: <div data-testid="icon-italic" />,
    strike: <div data-testid="icon-strike" />,
    h1: <div data-testid="icon-h1" />,
    h2: <div data-testid="icon-h2" />,
    h3: <div data-testid="icon-h3" />,
    h4: <div data-testid="icon-h4" />,
    bulletList: <div data-testid="icon-bulletList" />,
    orderedList: <div data-testid="icon-orderedList" />,
    todoList: <div data-testid="icon-todoList" />,
    blockquote: <div data-testid="icon-blockquote" />,
    codeBlock: <div data-testid="icon-codeBlock" />,
    horizontalRule: <div data-testid="icon-horizontalRule" />,
    undo: <div data-testid="icon-undo" />,
    redo: <div data-testid="icon-redo" />,
    underline: <div data-testid="icon-underline" />,
    link: <div data-testid="icon-link" />,
  },
}));

describe('NotesEditorMenuBar', () => {
  const createMockEditor = () => {
    const chainMock = {
      focus: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleUnderline: vi.fn().mockReturnThis(),
      toggleStrike: vi.fn().mockReturnThis(),
      toggleHeading: vi.fn().mockReturnThis(),
      toggleBulletList: vi.fn().mockReturnThis(),
      toggleOrderedList: vi.fn().mockReturnThis(),
      toggleTaskList: vi.fn().mockReturnThis(),
      toggleBlockquote: vi.fn().mockReturnThis(),
      toggleCodeBlock: vi.fn().mockReturnThis(),
      setHorizontalRule: vi.fn().mockReturnThis(),
      undo: vi.fn().mockReturnThis(),
      redo: vi.fn().mockReturnThis(),
      extendMarkRange: vi.fn().mockReturnThis(),
      setLink: vi.fn().mockReturnThis(),
      unsetLink: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };

    return {
      chain: vi.fn(() => chainMock),
      isActive: vi.fn().mockReturnValue(false),
      getAttributes: vi.fn().mockReturnValue({ href: '' }),
    } as unknown as Editor;
  };

  it('renders nothing when editor is null', () => {
    const { container } = render(<NotesEditorMenuBar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls toggleBold when Bold button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Bold'));
    expect(editor.chain().focus().toggleBold().run).toHaveBeenCalled();
  });

  it('calls toggleItalic when Italic button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Italic'));
    expect(editor.chain().focus().toggleItalic().run).toHaveBeenCalled();
  });

  it('calls toggleUnderline when Underline button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Underline'));
    expect(editor.chain().focus().toggleUnderline().run).toHaveBeenCalled();
  });

  it('calls toggleStrike when Strike button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Strike'));
    expect(editor.chain().focus().toggleStrike().run).toHaveBeenCalled();
  });

  it('calls toggleHeading with level 1 when Heading 1 button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Heading 1'));
    expect(editor.chain().focus().toggleHeading).toHaveBeenCalledWith({ level: 1 });
    expect(editor.chain().focus().toggleHeading({ level: 1 }).run).toHaveBeenCalled();
  });

  it('calls toggleBulletList when Bullet List button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Bullet List'));
    expect(editor.chain().focus().toggleBulletList().run).toHaveBeenCalled();
  });

  it('calls toggleOrderedList when Ordered List button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Ordered List'));
    expect(editor.chain().focus().toggleOrderedList().run).toHaveBeenCalled();
  });

  it('calls toggleTaskList when Todo List button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Todo List'));
    expect(editor.chain().focus().toggleTaskList().run).toHaveBeenCalled();
  });

  it('correctly identifies active taskList', () => {
    const editor = createMockEditor();
    editor.isActive = vi.fn((name) => name === 'taskList');

    render(<NotesEditorMenuBar editor={editor} />);

    const todoButton = screen.getByTitle('Todo List');
    expect(todoButton.className).toContain('bg-bg-hover');
  });

  it('calls toggleBlockquote when Blockquote button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Blockquote'));
    expect(editor.chain().focus().toggleBlockquote().run).toHaveBeenCalled();
  });

  it('calls toggleCodeBlock when Code Block button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Code Block'));
    expect(editor.chain().focus().toggleCodeBlock().run).toHaveBeenCalled();
  });

  it('calls setHorizontalRule when Horizontal Line button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Horizontal Line'));
    expect(editor.chain().focus().setHorizontalRule().run).toHaveBeenCalled();
  });

  it('calls undo when Undo button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Undo'));
    expect(editor.chain().focus().undo().run).toHaveBeenCalled();
  });

  it('calls redo when Redo button is clicked', () => {
    const editor = createMockEditor();
    render(<NotesEditorMenuBar editor={editor} />);

    fireEvent.click(screen.getByTitle('Redo'));
    expect(editor.chain().focus().redo().run).toHaveBeenCalled();
  });

  describe('setLink', () => {
    it('sets link when URL is provided', () => {
      const editor = createMockEditor();
      vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');
      render(<NotesEditorMenuBar editor={editor} />);

      fireEvent.click(screen.getByTitle('Link'));

      expect(editor.chain().focus().extendMarkRange).toHaveBeenCalledWith('link');
      expect(editor.chain().focus().setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
      expect(
        editor.chain().focus().setLink({ href: 'https://example.com' }).run,
      ).toHaveBeenCalled();
    });

    it('unsets link when URL is empty', () => {
      const editor = createMockEditor();
      vi.spyOn(window, 'prompt').mockReturnValue('');
      render(<NotesEditorMenuBar editor={editor} />);

      fireEvent.click(screen.getByTitle('Link'));

      expect(editor.chain().focus().extendMarkRange).toHaveBeenCalledWith('link');
      expect(editor.chain().focus().unsetLink().run).toHaveBeenCalled();
    });

    it('does nothing when prompt is cancelled', () => {
      const editor = createMockEditor();
      vi.spyOn(window, 'prompt').mockReturnValue(null);
      render(<NotesEditorMenuBar editor={editor} />);

      fireEvent.click(screen.getByTitle('Link'));

      expect(editor.chain).not.toHaveBeenCalled();
    });
  });

  it('applies active class when button is active', () => {
    const editor = createMockEditor();
    editor.isActive = vi.fn((name) => name === 'bold');

    render(<NotesEditorMenuBar editor={editor} />);

    const boldButton = screen.getByTitle('Bold');
    expect(boldButton.className).toContain('bg-bg-hover');
    expect(boldButton.className).toContain('text-text-main');

    const italicButton = screen.getByTitle('Italic');
    // every button has `hover:bg-bg-hover`, so check for the active-only `bg-bg-hover` token instead
    expect(italicButton.className.split(' ')).not.toContain('bg-bg-hover');
    expect(italicButton.className).toContain('text-text-muted');
  });
});

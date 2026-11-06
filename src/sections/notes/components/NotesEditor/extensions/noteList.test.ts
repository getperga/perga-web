import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoteList } from './noteList';

const editors: Editor[] = [];
const createEditor = (content: string) => {
  const editor = new Editor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), NoteList],
    content,
  });
  editors.push(editor);
  return editor;
};
const selectText = (editor: Editor, text: string, full = false) => {
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === text) {
      editor.commands.setTextSelection({ from: pos, to: pos + (full ? text.length : 0) });
    }
  });
};
const move = (editor: Editor, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
  const event = new KeyboardEvent('keydown', {
    key,
    altKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  editor.view.dom.dispatchEvent(event);
  return event;
};
const cut = (editor: Editor) => {
  const data: Record<string, string> = {};
  const event = new Event('cut', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      clearData: vi.fn(),
      setData: (type: string, value: string) => {
        data[type] = value;
      },
    },
  });
  editor.view.dom.dispatchEvent(event);
  return { event, data };
};

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe('list item movement', () => {
  it.each(['ul', 'ol'])('moves %s items, preserves selection and supports undo', (tag) => {
    const original = `<${tag}><li><p>one</p></li><li><p>two</p></li><li><p>three</p></li></${tag}>`;
    const editor = createEditor(original);
    selectText(editor, 'two', true);
    expect(move(editor, 'ArrowUp').defaultPrevented).toBe(true);
    expect(editor.state.doc.textContent).toBe('twoonethree');
    expect(
      editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to),
    ).toBe('two');
    move(editor, 'ArrowDown');
    expect(editor.state.doc.textContent).toBe('onetwothree');
    editor.commands.undo();
    expect(editor.state.doc.textContent).toBe('twoonethree');
  });

  it('moves a checked task with its nested list', () => {
    const editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>parent</p><ul data-type="taskList"><li data-type="taskItem"><p>child</p></li></ul></li><li data-type="taskItem"><p>next</p></li></ul>',
    );
    selectText(editor, 'parent');
    move(editor, 'ArrowDown');
    expect(editor.state.doc.textContent).toBe('nextparentchild');
    expect(editor.state.doc.firstChild?.lastChild?.attrs.checked).toBe(true);
    expect(editor.state.selection.$from.parent.textContent).toBe('parent');
    selectText(editor, 'child');
    const before = editor.getJSON();
    move(editor, 'ArrowUp');
    expect(editor.getJSON()).toEqual(before);
  });

  it('moves selected siblings as a group and stops at list boundaries', () => {
    const editor = createEditor('<ul><li><p>a</p></li><li><p>b</p></li><li><p>c</p></li></ul>');
    editor.commands.setTextSelection({ from: 8, to: 14 });
    move(editor, 'ArrowUp');
    expect(editor.state.doc.textContent).toBe('bca');
    const before = editor.getJSON();
    move(editor, 'ArrowUp');
    expect(editor.getJSON()).toEqual(before);
  });
});

describe('cutting complete list items', () => {
  it.each(['ul', 'ol', 'task'])(
    'removes the complete %s item and preserves clipboard structure',
    (kind) => {
      const editor = createEditor(
        kind === 'task'
          ? '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>one</p></li><li data-type="taskItem"><p>two</p></li></ul>'
          : `<${kind}><li><p>one</p></li><li><p>two</p></li></${kind}>`,
      );
      const original = editor.getJSON();
      selectText(editor, 'one', true);
      const { event, data } = cut(editor);
      expect(event.defaultPrevented).toBe(true);
      expect(editor.state.doc.firstChild?.childCount).toBe(1);
      expect(editor.state.doc.textContent).toBe('two');
      expect(data['text/plain']).toBe('one');
      const copied = createEditor(data['text/html']);
      expect(copied.state.doc.firstChild?.firstChild?.toJSON()).toEqual(
        original.content![0].content![0],
      );
      editor.commands.undo();
      expect(editor.state.doc.firstChild?.toJSON()).toEqual(original.content![0]);
      expect(editor.state.doc.textContent).toBe('onetwo');
    },
  );

  it('removes the final checkbox and leaves an editable paragraph', () => {
    const editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem"><p>last</p></li></ul>',
    );
    selectText(editor, 'last', true);
    cut(editor);
    expect(editor.getHTML()).toBe('<p></p>');
  });

  it('keeps the task item when only part of its text is cut', () => {
    const editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem"><p>hello</p></li></ul>',
    );
    editor.commands.setTextSelection({ from: 3, to: 5 });
    cut(editor);
    expect(editor.state.doc.textContent).toBe('llo');
    expect(editor.state.doc.firstChild?.firstChild?.type.name).toBe('taskItem');
  });
});

describe('list editing edge cases', () => {
  it('does not move items in a read-only editor or paragraphs outside lists', () => {
    const editor = createEditor('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
    selectText(editor, 'two');
    editor.setEditable(false);
    move(editor, 'ArrowUp');
    move(editor, 'ArrowRight');
    move(editor, 'ArrowLeft');
    expect(editor.state.doc.textContent).toBe('onetwo');
    const paragraph = createEditor('<p>plain text</p>');
    selectText(paragraph, 'plain text');
    expect(move(paragraph, 'ArrowDown').defaultPrevented).toBe(false);
  });

  it('cuts multiple complete items together', () => {
    const editor = createEditor('<ul><li><p>a</p></li><li><p>b</p></li><li><p>c</p></li></ul>');
    editor.commands.setTextSelection({ from: 3, to: 9 });
    const { data } = cut(editor);
    expect(editor.state.doc.textContent).toBe('c');
    expect(editor.state.doc.firstChild?.childCount).toBe(1);
    expect(createEditor(data['text/html']).state.doc.textContent).toBe('ab');
  });

  it('removes an entire nested list without removing its parent task', () => {
    const editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem"><p>parent</p><ul data-type="taskList"><li data-type="taskItem"><p>child</p></li></ul></li></ul>',
    );
    selectText(editor, 'child', true);
    cut(editor);
    expect(editor.state.doc.textContent).toBe('parent');
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(1);
  });
});

describe('pasting cut items into an empty list item', () => {
  it.each(['ul', 'ol', 'task'])('replaces the empty %s item without adding nesting', (kind) => {
    const task = kind === 'task';
    const tag = task ? 'ul data-type="taskList"' : kind;
    const close = task ? 'ul' : kind;
    const item = task ? 'li data-type="taskItem" data-checked="true"' : 'li';
    const editor = createEditor(
      `<${tag}><${item}><p>cut me</p></li><${item}><p>target</p></li></${close}>`,
    );
    selectText(editor, 'cut me', true);
    const { data } = cut(editor);
    selectText(editor, 'target');
    editor.commands.setTextSelection(editor.state.selection.from + 'target'.length);
    editor.commands.splitListItem(task ? 'taskItem' : 'listItem');
    const beforePaste = editor.getJSON();
    expect(editor.view.pasteHTML(data['text/html'], new Event('paste') as ClipboardEvent)).toBe(
      true,
    );
    const list = editor.state.doc.firstChild!;
    expect(list.childCount).toBe(2);
    expect(list.child(1).textContent).toBe('cut me');
    expect(list.child(1).childCount).toBe(1);
    if (task) expect(list.child(1).attrs.checked).toBe(true);
    editor.commands.undo();
    expect(editor.getJSON()).toEqual(beforePaste);
    editor.commands.redo();
    expect(editor.state.doc.firstChild?.child(1).textContent).toBe('cut me');
  });

  it('preserves multiple items and their nested content when pasting', () => {
    const source = createEditor(
      '<ul><li><p>one</p><ul><li><p>child</p></li></ul></li><li><p>two</p></li></ul>',
    );
    let end = 0;
    source.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'two') end = pos + 3;
    });
    source.commands.setTextSelection({ from: 3, to: end });
    const { data } = cut(source);
    const target = createEditor('<ul><li><p></p></li></ul>');
    target.commands.setTextSelection(3);
    target.view.pasteHTML(data['text/html'], new Event('paste') as ClipboardEvent);
    expect(target.state.doc.firstChild?.childCount).toBe(2);
    expect(target.state.doc.firstChild?.firstChild?.child(1).type.name).toBe('bulletList');
    expect(target.state.doc.textContent).toBe('onechildtwo');
  });
});

describe('list indentation shortcuts', () => {
  it.each(['ul', 'ol', 'task'])('moves %s items into and out of a sublist', (kind) => {
    const task = kind === 'task';
    const tag = task ? 'ul data-type="taskList"' : kind;
    const close = task ? 'ul' : kind;
    const item = task ? 'li data-type="taskItem" data-checked="true"' : 'li';
    const editor = createEditor(
      `<${tag}><${item}><p>parent</p></li><${item}><p>move</p></li></${close}>`,
    );
    selectText(editor, 'move', true);
    expect(move(editor, 'ArrowRight').defaultPrevented).toBe(true);
    const list = editor.state.doc.firstChild!;
    expect(list.childCount).toBe(1);
    expect(list.firstChild?.child(1).firstChild?.textContent).toBe('move');
    if (task) expect(list.firstChild?.child(1).firstChild?.attrs.checked).toBe(true);
    expect(editor.state.selection.$from.parent.textContent).toBe('move');
    expect(move(editor, 'ArrowLeft').defaultPrevented).toBe(true);
    expect(editor.state.doc.firstChild?.childCount).toBe(2);
    expect(editor.state.doc.textContent).toBe('parentmove');
  });
});

it('indents the nearest list type inside a task item', () => {
  const editor = createEditor(
    '<ul data-type="taskList"><li data-type="taskItem"><p>task</p><ul><li><p>a</p></li><li><p>b</p></li></ul></li></ul>',
  );
  selectText(editor, 'b', true);
  expect(move(editor, 'ArrowRight').defaultPrevented).toBe(true);
  const nested = editor.state.doc.firstChild!.firstChild!.child(1);
  expect(nested.childCount).toBe(1);
  expect(nested.firstChild?.child(1).firstChild?.type.name).toBe('listItem');
  expect(editor.state.selection.$from.parent.textContent).toBe('b');
  move(editor, 'ArrowLeft');
  expect(editor.state.doc.firstChild!.firstChild!.child(1).childCount).toBe(2);
});

describe('outdent boundaries', () => {
  it.each(['ul', 'ol', 'task'])('keeps top-level %s items in their list', (kind) => {
    const task = kind === 'task';
    const tag = task ? 'ul data-type="taskList"' : kind;
    const close = task ? 'ul' : kind;
    const item = task ? 'li data-type="taskItem" data-checked="true"' : 'li';
    const editor = createEditor(
      `<${tag}><${item}><p>one</p></li><${item}><p>two</p></li></${close}><p>after</p>`,
    );
    selectText(editor, 'one', true);
    const before = editor.getJSON();
    const selection = editor.state.selection.toJSON();
    expect(move(editor, 'ArrowLeft').defaultPrevented).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.state.selection.toJSON()).toEqual(selection);

    let end = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'two') end = pos + 3;
    });
    editor.commands.setTextSelection({ from: editor.state.selection.from, to: end });
    move(editor, 'ArrowLeft');
    expect(editor.getJSON()).toEqual(before);
  });

  it('keeps a list inside a blockquote at its top level', () => {
    const editor = createEditor(
      '<blockquote><ul><li><p>one</p></li></ul></blockquote><p>after</p>',
    );
    selectText(editor, 'one');
    const before = editor.getJSON();
    move(editor, 'ArrowLeft');
    expect(editor.getJSON()).toEqual(before);
  });
});

describe('moving across adjacent lists', () => {
  const listHTML = (kind: string, text: string) =>
    kind === 'task'
      ? `<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>${text}</p></li></ul>`
      : `<${kind}><li><p>${text}</p></li></${kind}>`;

  it.each(['ul', 'ol', 'task'])(
    'moves %s items across a former paragraph gap in both directions',
    (kind) => {
      const editor = createEditor(
        `${listHTML(kind, 'one')}<p></p>${listHTML(kind, 'two')}<p>after</p>`,
      );
      const firstListSize = editor.state.doc.firstChild!.nodeSize;
      editor.commands.deleteRange({ from: firstListSize, to: firstListSize + 2 });
      expect(editor.state.doc.childCount).toBe(3);
      const beforeMove = editor.getJSON();
      selectText(editor, 'two', true);
      move(editor, 'ArrowUp');
      expect(editor.state.doc.firstChild?.childCount).toBe(2);
      expect(editor.state.doc.firstChild?.textContent).toBe('twoone');
      expect(
        editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to),
      ).toBe('two');
      if (kind === 'task')
        expect(editor.state.doc.firstChild?.firstChild?.attrs.checked).toBe(true);
      editor.commands.undo();
      expect(editor.getJSON()).toEqual(beforeMove);
      selectText(editor, 'one', true);
      move(editor, 'ArrowDown');
      expect(editor.state.doc.firstChild?.textContent).toBe('twoone');
      expect(
        editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to),
      ).toBe('one');
    },
  );

  it('joins a chain of adjacent lists and keeps nested items', () => {
    const editor = createEditor(
      '<ul><li><p>a</p><ul><li><p>child</p></li></ul></li></ul><ul><li><p>b</p></li></ul><ul><li><p>c</p></li></ul><p>after</p>',
    );
    selectText(editor, 'b');
    move(editor, 'ArrowUp');
    expect(editor.state.doc.firstChild?.childCount).toBe(3);
    expect(editor.state.doc.firstChild?.textContent).toBe('bachildc');
    expect(editor.state.doc.firstChild?.child(1).child(1).type.name).toBe('bulletList');
  });

  it('moves a group selected across adjacent lists', () => {
    const editor = createEditor(
      '<ul><li><p>a</p></li><li><p>b</p></li></ul><ul><li><p>c</p></li></ul><p>after</p>',
    );
    selectText(editor, 'b');
    const from = editor.state.selection.from;
    selectText(editor, 'c', true);
    editor.commands.setTextSelection({ from, to: editor.state.selection.to });
    move(editor, 'ArrowUp');
    expect(editor.state.doc.firstChild?.textContent).toBe('bca');
    expect(
      editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ''),
    ).toBe('bc');
  });

  it('preserves actual paragraph gaps and different list types', () => {
    for (const html of [
      `${listHTML('ul', 'a')}<p></p>${listHTML('ul', 'b')}<p>after</p>`,
      `${listHTML('ul', 'a')}${listHTML('task', 'b')}<p>after</p>`,
    ]) {
      const editor = createEditor(html);
      selectText(editor, 'b');
      const before = editor.getJSON();
      move(editor, 'ArrowUp');
      expect(editor.getJSON()).toEqual(before);
    }
  });
});

it('moves items across adjacent nested lists', () => {
  const editor = createEditor(
    '<ul><li><p>parent</p><ul><li><p>a</p></li></ul><ul><li><p>b</p></li></ul></li></ul><p>after</p>',
  );
  selectText(editor, 'b');
  move(editor, 'ArrowUp');
  const parent = editor.state.doc.firstChild!.firstChild!;
  expect(parent.childCount).toBe(2);
  expect(parent.child(1).textContent).toBe('ba');
  expect(editor.state.selection.$from.parent.textContent).toBe('b');
});

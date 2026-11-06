import { Extension } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Plugin, Selection, TextSelection } from '@tiptap/pm/state';
import type { Command, Transaction } from '@tiptap/pm/state';

const listNames = new Set(['bulletList', 'orderedList', 'taskList']);

// Removing a paragraph between lists can leave adjacent list nodes in the document.
// Join the contiguous group around the selection before reordering its items.
const joinAdjacentLists = (tr: Transaction) => {
  const { $from } = tr.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const list = $from.node(depth);
    if (!listNames.has(list.type.name)) {
      continue;
    }

    const container = $from.node(depth - 1);
    const index = $from.index(depth - 1);
    let first = index;
    let last = index;
    let pos = $from.before(depth);

    while (first > 0 && container.child(first - 1).sameMarkup(list)) {
      first -= 1;
      pos -= container.child(first).nodeSize;
    }
    while (last + 1 < container.childCount && container.child(last + 1).sameMarkup(list)) {
      last += 1;
    }

    const boundaries: number[] = [];
    for (let i = first; i < last; i += 1) {
      pos += container.child(i).nodeSize;
      boundaries.push(pos);
    }
    boundaries.reverse().forEach((boundary) => {
      tr.join(boundary);
    });

    return tr;
  }

  return tr;
};

const moveListItems = (direction: -1 | 1): Command => {
  return (state, dispatch) => {
    const tr = joinAdjacentLists(closeHistory(state.tr));
    const { selection } = tr;
    const range = selection.$from.blockRange(selection.$to, (node) => {
      return listNames.has(node.type.name);
    });
    if (!range) {
      return false;
    }

    const { parent, startIndex, endIndex, start, end } = range;
    // Consume the shortcut at list boundaries without moving outside the list
    if (direction === -1 ? startIndex === 0 : endIndex === parent.childCount) {
      if (dispatch && tr.docChanged) {
        dispatch(tr);
      }
      return true;
    }
    if (!dispatch) {
      return true;
    }

    const neighbor = parent.child(direction === -1 ? startIndex - 1 : endIndex);
    const items = tr.doc.slice(start, end).content;
    const from = direction === -1 ? start - neighbor.nodeSize : start;
    const to = direction === -1 ? end : end + neighbor.nodeSize;
    const content = direction === -1
      ? items.append(Fragment.from(neighbor))
      : Fragment.from(neighbor).append(items);
    const offset = direction * neighbor.nodeSize;
    tr.replaceWith(from, to, content);
    if (selection instanceof TextSelection) {
      tr.setSelection(
        TextSelection.create(tr.doc, selection.anchor + offset, selection.head + offset),
      );
    } else {
      tr.setSelection(Selection.near(tr.doc.resolve(start + offset)));
    }
    dispatch(tr.scrollIntoView());

    return true;
  };
};

export const NoteList = Extension.create({
  name: 'noteList',

  addKeyboardShortcuts() {
    const changeIndent = (indent: boolean) => {
      if (!this.editor.isEditable) {
        return false;
      }

      const { $from, $to } = this.editor.state.selection;
      const range = $from.blockRange($to, (node) => {
        return listNames.has(node.type.name);
      });
      if (!range) {
        return false;
      }

      // Outdent only nested lists; lifting a top-level item would turn it into a paragraph.
      if (
        !indent &&
        (range.depth < 3 ||
          !['listItem', 'taskItem'].includes($from.node(range.depth - 1).type.name) ||
          !listNames.has($from.node(range.depth - 2).type.name))
      ) {
        return true;
      }

      const itemType = range.parent.child(range.startIndex).type.name;
      return indent
        ? this.editor.commands.sinkListItem(itemType)
        : this.editor.commands.liftListItem(itemType);
    };

    return {
      'Alt-Shift-ArrowUp': () => {
        return (
          this.editor.isEditable && moveListItems(-1)(this.editor.state, this.editor.view.dispatch)
        );
      },
      'Alt-Shift-ArrowDown': () => {
        return (
          this.editor.isEditable && moveListItems(1)(this.editor.state, this.editor.view.dispatch)
        );
      },
      'Alt-Shift-ArrowRight': () => {
        return changeIndent(true);
      },
      'Alt-Shift-ArrowLeft': () => {
        return changeIndent(false);
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, _event, slice) => {
            if (!view.editable || !view.state.selection.empty) {
              return false;
            }
            const list = slice.content.firstChild;
            if (slice.content.childCount !== 1 || !list || !listNames.has(list.type.name)) {
              return false;
            }

            const { $from } = view.state.selection;
            const itemDepth = $from.depth - 1;
            if (itemDepth < 1) {
              return false;
            }
            const item = $from.node(itemDepth);
            const parent = $from.node(itemDepth - 1);
            // Replace an empty destination item instead of nesting a whole list in it.
            if (
              !['listItem', 'taskItem'].includes(item.type.name) ||
              item.childCount !== 1 ||
              !item.firstChild?.isTextblock ||
              item.firstChild.content.size !== 0 ||
              !parent.type.validContent(list.content)
            ) {
              return false;
            }

            const from = $from.before(itemDepth);
            const tr = closeHistory(view.state.tr).replaceWith(
              from,
              from + item.nodeSize,
              list.content,
            );
            tr.setSelection(Selection.near(tr.doc.resolve(from + list.content.size), -1));
            view.dispatch(tr.scrollIntoView().setMeta('paste', true).setMeta('uiEvent', 'paste'));
            return true;
          },
          handleDOMEvents: {
            cut: (view, event) => {
              if (!view.editable || !event.clipboardData) {
                return false;
              }
              const { state } = view;
              const { selection } = state;
              if (selection.empty) {
                return false;
              }
              const range = selection.$from.blockRange(selection.$to, (node) => {
                return listNames.has(node.type.name);
              });
              if (!range) {
                return false;
              }

              const first = Selection.findFrom(state.doc.resolve(range.start), 1, true);
              const last = Selection.findFrom(state.doc.resolve(range.end), -1, true);
              // Partial text cuts retain the item and its checkbox as usual.
              if (!first || !last || selection.from > first.from || selection.to < last.to) {
                return false;
              }

              const items = state.doc.slice(range.start, range.end).content;
              const slice = new Slice(Fragment.from(range.parent.copy(items)), 0, 0);
              const { dom, text } = view.serializeForClipboard(slice);
              event.clipboardData.clearData();
              event.clipboardData.setData('text/html', dom.innerHTML);
              event.clipboardData.setData('text/plain', text);
              event.preventDefault();

              const entireList =
                range.startIndex === 0 && range.endIndex === range.parent.childCount;
              const from = entireList ? range.start - 1 : range.start;
              const to = entireList ? range.end + 1 : range.end;
              view.dispatch(state.tr.delete(from, to).scrollIntoView().setMeta('uiEvent', 'cut'));
              return true;
            },
          },
        },
      }),
    ];
  },
});

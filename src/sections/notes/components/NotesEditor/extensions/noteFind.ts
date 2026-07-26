import { Extension, type Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

interface FindMatch {
  from: number;
  to: number;
}

interface FindState {
  query: string;
  results: FindMatch[];
  currentIndex: number;
}

const EMPTY_FIND_STATE: FindState = {
  query: '',
  results: [],
  currentIndex: -1,
};

const findMatchesInDoc = (doc: ProseMirrorNode, query: string): FindMatch[] => {
  const lowerQuery = query.toLowerCase();
  const results: FindMatch[] = [];
  if (!lowerQuery) {
    return results;
  }

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const lowerText = node.text.toLowerCase();
    let searchFrom = 0;
    let idx = lowerText.indexOf(lowerQuery, searchFrom);
    while (idx !== -1) {
      results.push({
        from: pos + idx,
        to: pos + idx + query.length,
      });
      searchFrom = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, searchFrom);
    }

    return true;
  });

  return results;
};

const findPluginKey = new PluginKey<FindState>('noteFind');

export const getFindState = (editor: Editor): FindState => {
  return findPluginKey.getState(editor.state) ?? EMPTY_FIND_STATE;
};

export const scrollToMatch = (editor: Editor, pos: number, attemptsLeft = 3) => {
  if (editor.isDestroyed) {
    return;
  }

  try {
    const domResult = editor.view.domAtPos(pos);
    const node = domResult.node;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    element?.scrollIntoView({ block: 'center' });
  } catch {
    // the editor view may not be mounted yet (e.g., right after navigating to a freshly opened note)
    if (attemptsLeft > 0) {
      requestAnimationFrame(() => scrollToMatch(editor, pos, attemptsLeft - 1));
    }
  }
};

const buildDecorations = (doc: ProseMirrorNode, findState: FindState): DecorationSet => {
  if (!findState.results.length) {
    return DecorationSet.empty;
  }

  const decorations = findState.results.map((match, index) => {
    return Decoration.inline(match.from, match.to, {
      class: index === findState.currentIndex ? 'note-find-current' : 'note-find-match',
    });
  });

  return DecorationSet.create(doc, decorations);
};

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    noteFind: {
      setFindQuery: (query: string) => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
      clearFind: () => ReturnType;
    };
  }
}

export const NoteFind = Extension.create({
  name: 'noteFind',

  addCommands() {
    return {
      setFindQuery:
        (query: string) =>
        ({ tr, dispatch, state }) => {
          const results = findMatchesInDoc(state.doc, query);
          const newState: FindState = {
            query,
            results,
            currentIndex: results.length ? 0 : -1,
          };
          if (dispatch) {
            dispatch(tr.setMeta(findPluginKey, newState));
          }
          return true;
        },
      findNext:
        () =>
        ({ tr, dispatch, state }) => {
          const current = findPluginKey.getState(state) ?? EMPTY_FIND_STATE;
          if (!current.results.length) {
            return false;
          }

          const nextIndex = (current.currentIndex + 1) % current.results.length;
          if (dispatch) {
            dispatch(tr.setMeta(findPluginKey, { ...current, currentIndex: nextIndex }));
          }

          return true;
        },
      findPrev:
        () =>
        ({ tr, dispatch, state }) => {
          const current = findPluginKey.getState(state) ?? EMPTY_FIND_STATE;
          if (!current.results.length) {
            return false;
          }

          const prevIndex =
            (current.currentIndex - 1 + current.results.length) % current.results.length;
          if (dispatch) {
            dispatch(tr.setMeta(findPluginKey, { ...current, currentIndex: prevIndex }));
          }

          return true;
        },
      clearFind:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(findPluginKey, EMPTY_FIND_STATE));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findPluginKey,
        state: {
          init: () => EMPTY_FIND_STATE,
          apply(tr, prev) {
            const meta = tr.getMeta(findPluginKey) as FindState | undefined;
            if (meta) {
              return meta;
            }

            if (tr.docChanged && prev.query) {
              const results = findMatchesInDoc(tr.doc, prev.query);
              return {
                query: prev.query,
                results,
                currentIndex: results.length ? 0 : -1,
              };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            const findState = findPluginKey.getState(state);
            if (!findState) {
              return null;
            }

            return buildDecorations(state.doc, findState);
          },
        },
      }),
    ];
  },
});

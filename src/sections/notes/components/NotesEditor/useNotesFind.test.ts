import { renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { describe, expect, it } from 'vitest';

import { useNotesFind } from './useNotesFind';

describe('useNotesFind', () => {
  it('does not access commands on a destroyed editor', () => {
    const destroyedEditor = {
      isDestroyed: true,
      get commands(): never {
        throw new Error('commands are unavailable after the editor is destroyed');
      },
    } as unknown as Editor;

    expect(() =>
      renderHook(() =>
        useNotesFind({
          editor: destroyedEditor,
          noteId: undefined,
          noteBody: undefined,
          lastSyncedNoteIdRef: { current: undefined },
          findQueryTrigger: 0,
        }),
      ),
    ).not.toThrow();
  });
});

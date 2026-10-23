import type { NoteMetaDTO } from '@api/notes';

export interface NotesTrashItemIds {
  folderIds: number[];
  noteIds: number[];
}

export interface PinnedNote extends NoteMetaDTO {
  folderPath: string[];
}

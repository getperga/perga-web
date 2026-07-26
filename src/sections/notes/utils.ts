import Storage from '@common/utils/storage';
import { StorageKeys } from '@common/utils/storage_keys';

export const saveNoteFindQueryToStorage = (noteId: number, query: string) => {
  const findQueries = Storage.getJSON<Record<string, string>>(StorageKeys.NotesFindQuery, {});

  if (query) {
    findQueries[noteId] = query;
  } else {
    delete findQueries[noteId];
  }

  Storage.setJSON(StorageKeys.NotesFindQuery, findQueries);
};

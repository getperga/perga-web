import React, { useEffect, useRef, useState } from 'react';

import type { NoteMetaDTO } from '@api/notes';
import { searchNotes } from '@api/notes';
import { Icon } from '@common/components/Icon';
import { useNotes } from '@notes/context';

const SEARCH_DEBOUNCE_MS = 300;

export const NotesFoldersSearch: React.FC = () => {
  const { openNoteFromSearch, focusEditor } = useNotes();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteMetaDTO[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      searchNotes(trimmedQuery)
        .then((response) => {
          setResults(response.data);
          setIsOpen(true);
        })
        .catch((error) => {
          console.error('Error searching notes:', error);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target) && document.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (note: NoteMetaDTO) => {
    openNoteFromSearch(note.id, query.trim());
    focusEditor();
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative mt-2 pt-2 border-t border-border-main shrink-0">
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-y-auto bg-bg-main border border-border-main rounded shadow-lg z-10">
          {results.length === 0 ? (
            <div className="p-2 text-sm text-text-main/60">No notes found</div>
          ) : (
            results.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectResult(note)}
                className="flex items-center p-2 text-sm text-text-main hover:bg-bg-hover cursor-pointer"
              >
                <Icon
                  name="note"
                  size={14}
                  fill="currentColor"
                  className="mr-2 opacity-70 shrink-0"
                />
                <span className="truncate">{note.title || 'Untitled Note'}</span>
              </div>
            ))
          )}
        </div>
      )}
      <div className="flex items-center bg-bg-hover rounded text-text-main">
        <Icon name="search" size={14} className="ml-2 opacity-60 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2 text-sm"
        />
      </div>
    </div>
  );
};

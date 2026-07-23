import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { NoteSearchResultDTO } from '@api/notes';
import { searchNotes } from '@api/notes';
import { Icon, Modal } from '@common/components';
import { triggerOpenNoteFromSearch } from '@common/events';

const SEARCH_DEBOUNCE_TIMEOUT = 300;

interface NotesSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesSearchModal: React.FC<NotesSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSearchResultDTO[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchNotes(trimmedQuery)
        .then((response) => {
          setResults(response.data);
        })
        .catch((error) => {
          console.error('Error searching notes:', error);
        });
    }, SEARCH_DEBOUNCE_TIMEOUT);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (note: NoteSearchResultDTO) => {
    triggerOpenNoteFromSearch(note.id, query.trim());
    navigate('/notes/');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notes search">
      <div className="p-4">
        <div className="flex items-center bg-bg-hover rounded text-text-main">
          <Icon name="search" size={20} className="ml-2 opacity-60 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2 text-sm"
          />
        </div>

        {query.trim() && (
          <div className="mt-2 max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <div className="p-2 text-sm text-text-main/60">No notes found</div>
            ) : (
              results.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectResult(note)}
                  className="flex items-center p-2 text-sm text-text-main hover:bg-bg-hover rounded cursor-pointer"
                >
                  <Icon
                    name="note"
                    size={24}
                    fill="currentColor"
                    className="mr-2 opacity-70 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="truncate">{note.title || 'Untitled Note'}</div>
                    {note.folders_path.length > 0 && (
                      <div className="truncate text-xs text-text-main/60">
                        {note.folders_path.join(' › ')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

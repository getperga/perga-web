import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { NoteSearchResultDTO } from '@api/notes';
import { searchNotes } from '@api/notes';
import { Icon, Modal } from '@common/components';
import { useNotes } from '@notes/context';

const SEARCH_DEBOUNCE_TIMEOUT = 300;

interface SearchNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const SEARCH_NAV_ITEMS: SearchNavItem[] = [
  {
    path: '/planner/',
    label: 'Planner',
    icon: (
      <Icon name="planner" size={24} fill="currentColor" className="mr-2 opacity-70 shrink-0" />
    ),
  },
  {
    path: '/notes/',
    label: 'Notes',
    icon: <Icon name="note" size={24} fill="currentColor" className="mr-2 opacity-70 shrink-0" />,
  },
  {
    path: '/settings/general/',
    label: 'Settings',
    icon: <Icon name="settings" size={24} className="mr-2 opacity-70 shrink-0" />,
  },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const { openNoteFromSearch, recentNotes, setSelectedNoteId } = useNotes();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSearchResultDTO[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isTyping = query.trim().length > 0;
  const itemsCount = isTyping ? results.length : recentNotes.length + SEARCH_NAV_ITEMS.length;

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
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

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  const handleSelectResult = (note: NoteSearchResultDTO) => {
    openNoteFromSearch(note.id, query.trim());
    navigate('/notes/');
    onClose();
  };

  const handleSelectNavItem = (item: SearchNavItem) => {
    navigate(item.path);
    onClose();
  };

  const handleSelectRecentNote = (noteId: number) => {
    setSelectedNoteId(noteId);
    navigate('/notes/');
    onClose();
  };

  const handleSelect = (index: number) => {
    if (isTyping) {
      if (results[index]) {
        handleSelectResult(results[index]);
      }
    } else if (index < SEARCH_NAV_ITEMS.length) {
      const navItem = SEARCH_NAV_ITEMS[index];
      if (navItem) {
        handleSelectNavItem(navItem);
      }
    } else {
      const note = recentNotes[index - SEARCH_NAV_ITEMS.length];
      if (note) {
        handleSelectRecentNote(note.id);
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(itemsCount - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search" className="max-w-2xl">
      <div className="p-4 flex flex-col min-h-0 flex-1">
        <div className="flex items-center bg-bg-hover rounded text-text-main shrink-0">
          <Icon name="search" size={20} className="ml-2 opacity-60 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search notes or jump to a section..."
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-2 text-sm"
          />
        </div>

        <div className="mt-2 min-h-40 max-h-[60vh] sm:max-h-72 overflow-y-auto">
          {isTyping ? (
            results.length === 0 ? (
              <div className="p-2 text-sm text-text-main/60">No notes found</div>
            ) : (
              results.map((note, index) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectResult(note)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center p-2 text-sm text-text-main rounded cursor-pointer ${
                    index === selectedIndex ? 'bg-bg-hover' : ''
                  }`}
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
            )
          ) : (
            <>
              <div className="px-2 pt-1 pb-1 text-xs font-medium text-text-main/50">Sections</div>

              {SEARCH_NAV_ITEMS.map((item, index) => {
                return (
                  <div
                    key={item.path}
                    onClick={() => handleSelectNavItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center p-2 text-sm text-text-main rounded cursor-pointer ${
                      index === selectedIndex ? 'bg-bg-hover' : ''
                    }`}
                  >
                    {item.icon}
                    <div className="truncate">{item.label}</div>
                  </div>
                );
              })}

              {recentNotes.length > 0 && (
                <div className="px-2 pt-3 pb-1 text-xs font-medium text-text-main/50">
                  Recent notes
                </div>
              )}
              {recentNotes.map((note, index) => {
                const itemIndex = SEARCH_NAV_ITEMS.length + index;

                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectRecentNote(note.id)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`flex items-center p-2 text-sm text-text-main rounded cursor-pointer ${
                      itemIndex === selectedIndex ? 'bg-bg-hover' : ''
                    }`}
                  >
                    <Icon
                      name="note"
                      size={24}
                      fill="currentColor"
                      className="mr-2 opacity-70 shrink-0"
                    />
                    <div className="truncate">{note.title || 'Untitled Note'}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

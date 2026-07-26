import React from 'react';

import { Icon } from '@common/components';

interface NotesEditorFindBarProps {
  query: string;
  matchCount: number;
  currentIndex: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const NotesEditorFindBar: React.FC<NotesEditorFindBarProps> = ({
  query,
  matchCount,
  currentIndex,
  inputRef,
  onQueryChange,
  onNext,
  onPrev,
  onClose,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="flex items-center bg-bg-hover rounded text-text-main px-2 py-1 mb-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in note..."
        className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-1.5 text-sm"
      />

      <span className="text-xs text-text-main/60 whitespace-nowrap px-1">
        {query.trim() ? `${matchCount ? currentIndex + 1 : 0}/${matchCount}` : ''}
      </span>

      <button
        onClick={onPrev}
        disabled={!matchCount}
        title="Previous match"
        className="p-1 rounded hover:bg-bg-main disabled:opacity-30 transition-colors"
        tabIndex={-1}
      >
        <Icon name="rightChevron" size={14} className="rotate-180" />
      </button>

      <button
        onClick={onNext}
        disabled={!matchCount}
        title="Next match"
        className="p-1 rounded hover:bg-bg-main disabled:opacity-30 transition-colors"
        tabIndex={-1}
      >
        <Icon name="rightChevron" size={14} />
      </button>

      <button
        onClick={onClose}
        title="Close find"
        className="p-1 rounded hover:bg-bg-main transition-colors"
        tabIndex={-1}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
};

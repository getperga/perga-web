import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useNotesState } from '@notes/hooks/useNotesState';
import { NotesContext } from './NotesContext.types';

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // NotesProvider is used for SearchModal on every page
  // Loads selected note data only on notes page
  const location = useLocation();
  const isInNotesSection = location.pathname.startsWith('/notes');
  const notes = useNotesState({ loadSelectedNote: isInNotesSection });

  return <NotesContext.Provider value={notes}>{children}</NotesContext.Provider>;
};

/** Centralized list of localStorage keys used across the app */
export enum StorageKeys {
  // Auth
  AuthToken = 'auth:authToken',
  TokenType = 'auth:tokenType',
  RefreshToken = 'auth:refreshToken',

  // UI
  IsDarkThemeEnabled = 'ui:isDarkThemeEnabled',

  // Planner
  PlannerSelectedDate = 'planner:selectedDate',
  PlannerCollapsedAgendas = 'planner:collapsedAgendas',
  PlannerLeftPaneWidth = 'planner:leftPaneWidth',
  PlannerViewMode = 'planner:viewMode',

  // Notes
  NotesLeftPaneWidth = 'notes:leftPaneWidth',
  NotesExpandedFolders = 'notes:expandedFolders',
  NotesSelectedNoteId = 'notes:selectedNoteId',
  NotesFindQuery = 'notes:findQuery',
}

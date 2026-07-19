export interface NoteDTO {
  id: number;
  folder_id: number;
  title: string;
  body: string;
  updated_dt: string;
}

export type NoteMetaDTO = Omit<NoteDTO, 'body'>;

export interface NoteSearchResultDTO extends NoteMetaDTO {
  folders_path: string[];
}

export interface NoteCreateDTO {
  folder_id: number;
  title?: string;
  body?: string;
}

export interface NoteUpdateDTO {
  folder_id?: number;
  title?: string;
  body?: string;
}

export interface NotesFolderDTO {
  id: number;
  name: string;
  parent_id: number | null;
  folder_type: 'regular' | 'root' | 'trash';
}

export interface NotesFolderCreateDTO {
  name: string;
  parent_id?: number;
}

export interface NotesFolderUpdateDTO {
  name?: string;
  parent_id?: number;
}

export interface NotesFolderResponseDTO {
  id: number;
  parent_id: number | null; // null - in case of root or trash folders
  folder_type: string;
  name: string;
  notes: NoteMetaDTO[];
  subfolders: NotesFolderResponseDTO[];
}

export interface NotesFoldersResponseSchemaDTO {
  root_folder: NotesFolderResponseDTO;
  trash_folder: NotesFolderResponseDTO;
}

export type NotesExportTypeDTO = 'markdown' | 'html' | 'pdf';
export type NotesExportTargetDTO = 'single_note' | 'folder_notes' | 'all_notes';

export interface NotesExportRequestSchema {
  export_type: NotesExportTypeDTO;
  export_target: NotesExportTargetDTO;
  export_target_id?: number | null;
}

export interface NotesImportResponseDTO {
  imported_count: number;
}

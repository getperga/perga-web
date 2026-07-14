import React, { useState } from 'react';

import type { NotesExportTypeDTO } from '@api/notes';
import { Icon } from '@common/components/Icon';
import { useToast } from '@common/contexts/toast/useToast';
import { pluralize } from '@common/utils/string_utils';
import { useNotes } from '@notes/context';

export const SettingsNotes: React.FC = () => {
  const { handleExportNotes, handleImportNotes } = useNotes();
  const { showToast, showError } = useToast();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const onExport = async (type: NotesExportTypeDTO) => {
    setIsExporting(true);
    try {
      await handleExportNotes(type, 'all_notes');
    } finally {
      setIsExporting(false);
    }
  };

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const response = await handleImportNotes(Array.from(files));
      showToast(
        `Successfully imported ${response.imported_count} ${pluralize(
          response.imported_count,
          'note',
        )}.`,
        'success',
      );
    } catch (error) {
      showError(`Failed to import notes: ${error}`);
    } finally {
      setIsImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <div className="w-full md:max-w-2/5 text-text-main">
      <fieldset className="border border-border-main rounded p-8">
        <legend className="px-2">Export Notes</legend>
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-text-muted">
            Export all your notes from all folders as a single archive.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => onExport('markdown')}
              disabled={isExporting}
              className="flex items-center justify-center p-2 px-4 text-sm hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border-main transition-colors"
              title="Export as Markdown"
            >
              <Icon name="download" size={14} className="mr-2" fill="currentColor" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => onExport('html')}
              disabled={isExporting}
              className="flex items-center justify-center p-2 px-4 text-sm hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border-main transition-colors"
              title="Export as HTML"
            >
              <Icon name="download" size={14} className="mr-2" fill="currentColor" />
              <span>HTML</span>
            </button>
            <button
              onClick={() => onExport('pdf')}
              disabled={isExporting}
              className="flex items-center justify-center p-2 px-4 text-sm hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border-main transition-colors"
              title="Export as PDF"
            >
              <Icon name="download" size={14} className="mr-2" fill="currentColor" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-border-main rounded p-8 mt-8">
        <legend className="px-2">Import Notes</legend>
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-text-muted">
            Import Markdown, HTML or TXT notes. You can select multiple files at once or use zip
            archive.
          </p>
          <div className="flex">
            <label
              className={`flex items-center justify-center p-2 px-4 text-sm hover:bg-bg-hover rounded border border-border-main transition-colors cursor-pointer ${
                isImporting ? 'text-text-muted cursor-not-allowed' : ''
              }`}
              title="Import Notes"
            >
              <Icon name="upload" size={14} className="mr-2" fill="currentColor" />
              <span>{isImporting ? 'Importing...' : 'Select Files'}</span>
              <input
                type="file"
                multiple
                accept=".md,.markdown,.html,.htm,.txt,.pdf,.zip"
                className="hidden"
                onChange={onImport}
                disabled={isImporting}
              />
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

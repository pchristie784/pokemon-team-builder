import { useState, type ChangeEvent } from 'react';
import { hasDataIssues, type ImportPreview } from '../domain';
import { DataIssuesList } from './DataIssuesList';
import { useTeamBuilder } from './useTeamBuilder';

/** Export all data as a JSON file; import one after previewing what it contains and confirming. */
export function ExportImport() {
  const builder = useTeamBuilder();
  const [pending, setPending] = useState<{ json: string; preview: ImportPreview } | null>(null);

  function download() {
    const blob = new Blob([builder.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soulgold-team-builder-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    const json = await file.text();
    setPending({ json, preview: builder.previewImport(json) });
  }

  function confirm() {
    if (!pending) return;
    builder.importData(pending.json);
    setPending(null);
  }

  const preview = pending?.preview;
  return (
    <section className="export-import">
      <button type="button" onClick={download}>
        Export data
      </button>
      <label className="import-file">
        Import…
        <input type="file" accept="application/json,.json" onChange={choose} />
      </label>
      {preview && (
        <div className="import-preview">
          {preview.ok ? (
            <>
              <p>
                This file has {preview.teamNames.length} Team{preview.teamNames.length === 1 ? '' : 's'} (
                {preview.teamNames.join(', ')}), {preview.teamMemberCount} Team Members and {preview.boxEntryCount} Box
                Entries{preview.exportedAt && <>, exported {preview.exportedAt.slice(0, 10)}</>}. Importing replaces all
                your current data.
              </p>
              {hasDataIssues(preview.issues) && <DataIssuesList issues={preview.issues} />}
              <button type="button" onClick={confirm}>
                Replace my data
              </button>
            </>
          ) : (
            <p className="import-error">Can't import: {preview.error}</p>
          )}
          <button type="button" onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

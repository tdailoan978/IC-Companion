import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import {
  backupFileName,
  LAST_EXPORT_KEY,
  makeBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  themeInBackup,
  type Backup,
} from '../../lib/backup.ts';
import { allEntries, clearAll, read, replaceAll, write } from '../../lib/storage.ts';
import { THEME_CACHE_KEY, type ThemeChoice } from '../../lib/theme.ts';
import { SettingsSection } from './controls.tsx';

/** Message carried across the reload after Import or Reset. */
const NOTICE_KEY = 'ic-settings-notice';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function daysAgo(iso: string): string {
  const then = new Date(iso);
  const today = new Date();
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(today) - midnight(then)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function buildBackupFile(): Promise<File> {
  const now = new Date();
  const backup = makeBackup(await allEntries(), now);
  return new File([serializeBackup(backup)], backupFileName(now), { type: 'application/json' });
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Mirrors the restored theme for index.html's before-first-paint script, then reloads so every cache re-reads storage. */
function reloadWith(theme: ThemeChoice, notice: string) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // No localStorage: the theme still applies once the app has loaded.
  }
  try {
    sessionStorage.setItem(NOTICE_KEY, notice);
  } catch {
    // The notice is a nicety.
  }
  location.reload();
}

function takeNotice(): string | null {
  try {
    const notice = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return notice;
  } catch {
    return null;
  }
}

const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : String(err));

export function BackupSettings({ refreshKey }: { refreshKey: unknown }) {
  const [notice] = useState(takeNotice);
  return (
    <>
      <SettingsSection title="Backup">
        {notice && (
          <p className="notice settings-notice" role="status">
            {notice}
          </p>
        )}
        <p className="settings-pad settings-intro">
          Your progress lives only in this browser on this iPad. Export a backup now and then and keep it in Files or
          iCloud Drive; Import puts it back, on this iPad or another one.
        </p>
        <ExportBackup refreshKey={refreshKey} />
        <ImportBackup />
        <StorageSafety />
      </SettingsSection>
      <SettingsSection title="Reset">
        <ResetProgress />
      </SettingsSection>
    </>
  );
}

function ExportBackup({ refreshKey }: { refreshKey: unknown }) {
  const [lastExport, setLastExport] = useState<string | null | undefined>(undefined);
  // iOS only opens the share sheet straight from a tap, so the file is made ahead of time.
  const [prepared, setPrepared] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void read<string | null>(LAST_EXPORT_KEY, null).then((iso) => {
      if (!cancelled) setLastExport(iso);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    buildBackupFile().then(
      (file) => {
        if (!cancelled) setPrepared(file);
      },
      (err) => {
        if (!cancelled) setMessage({ text: `Could not read the saved data: ${errorText(err)}`, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const markExported = useCallback(async () => {
    const iso = new Date().toISOString();
    setLastExport(iso);
    await write(LAST_EXPORT_KEY, iso);
  }, []);

  const shareable = prepared !== null && canShareFile(prepared);

  const onShare = async () => {
    if (!prepared) return;
    setMessage(null);
    try {
      await navigator.share({ files: [prepared] });
      await markExported();
      setMessage({ text: `Shared ${prepared.name}.` });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // closed the share sheet
      setMessage({ text: `Sharing did not work (${errorText(err)}). Try Download instead.`, error: true });
    }
  };

  const onDownload = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const file = await buildBackupFile();
      setPrepared(file);
      download(file);
      await markExported();
      setMessage({ text: `Downloaded ${file.name}. On the iPad it is in Files → Downloads.` });
    } catch (err) {
      setMessage({ text: `Could not export: ${errorText(err)}`, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setting setting-stack">
      <div className="setting-text">
        <span className="setting-label">Export progress</span>
        <span className="setting-hint">
          {lastExport === undefined
            ? ' '
            : lastExport
              ? `Last export: ${formatWhen(lastExport)} (${daysAgo(lastExport)}).`
              : 'Not exported yet from this iPad.'}
        </span>
      </div>
      <div className="settings-actions">
        {shareable && (
          <button type="button" className="button" onClick={onShare}>
            Share backup…
          </button>
        )}
        <button
          type="button"
          className={shareable ? 'button button-quiet' : 'button'}
          onClick={onDownload}
          disabled={busy}
        >
          Download backup
        </button>
      </div>
      {shareable && <p className="setting-hint">Share opens the share sheet: choose Save to Files.</p>}
      {message && (
        <p className={message.error ? 'settings-message settings-error' : 'settings-message'} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}

type Pending = { backup: Backup; fileName: string };

function ImportBackup() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // so choosing the same file again still counts
    setPending(null);
    setError(null);
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch (err) {
      setError(`Could not open ${file.name}: ${errorText(err)}`);
      return;
    }
    const result = parseBackup(text);
    if (result.ok) setPending({ backup: result.backup, fileName: file.name });
    else setError(`${result.error} Nothing was changed.`);
  };

  const onConfirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceAll(pending.backup.entries);
    } catch (err) {
      setBusy(false);
      setError(`Import failed: ${errorText(err)}. Some data may have been removed; try the import again.`);
      return;
    }
    reloadWith(
      themeInBackup(pending.backup.entries),
      `Imported the backup from ${formatWhen(pending.backup.exportedAt)}.`,
    );
  };

  const summary = pending && summarizeBackup(pending.backup);

  return (
    <div className="setting setting-stack">
      <div className="setting-text">
        <span className="setting-label" id="import-label">
          Import progress
        </span>
        <span className="setting-hint">Choose a backup file you exported earlier. You can check it before anything changes.</span>
      </div>
      <div className="settings-actions">
        <label className="button button-quiet file-button">
          <input
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            aria-labelledby="import-label"
            onChange={onFile}
            disabled={busy}
          />
          Choose backup file…
        </label>
      </div>
      {error && (
        <p className="settings-message settings-error" role="alert">
          {error}
        </p>
      )}
      {pending && summary && (
        <div className="settings-confirm" role="region" aria-label="Backup to import">
          <p className="settings-confirm-title">{pending.fileName}</p>
          <ul className="settings-facts">
            <li>Exported {formatWhen(summary.exportedAt)}</li>
            <li>{plural(summary.lessonsWithProgress, 'lesson')} with progress</li>
            <li>{plural(summary.reviewCards, 'review card')}</li>
          </ul>
          <p>
            <strong>This replaces everything on this iPad</strong> (progress, review cards, study plan and settings) with
            the backup. The app reloads afterwards.
          </p>
          <div className="settings-actions">
            <button type="button" className="button" onClick={onConfirm} disabled={busy}>
              {busy ? 'Importing…' : 'Replace with this backup'}
            </button>
            <button type="button" className="button button-quiet" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Persist = 'unknown' | 'unsupported' | 'granted' | 'not-granted' | 'refused';

function StorageSafety() {
  const [state, setState] = useState<Persist>('unknown');

  useEffect(() => {
    let cancelled = false;
    if (!navigator.storage?.persisted) {
      setState('unsupported');
      return;
    }
    navigator.storage.persisted().then(
      (granted) => {
        if (!cancelled) setState(granted ? 'granted' : 'not-granted');
      },
      () => {
        if (!cancelled) setState('unsupported');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const onPersist = async () => {
    try {
      const granted = await navigator.storage.persist();
      setState(granted ? 'granted' : 'refused');
    } catch {
      setState('refused');
    }
  };

  const status: Record<Persist, string> = {
    unknown: 'Checking…',
    unsupported: 'This browser cannot say whether it keeps your data.',
    granted: 'Kept: this browser has agreed not to clear the app’s data on its own.',
    'not-granted': 'Not protected: iPadOS may clear website data, for example when space is low or the app is not used for weeks.',
    refused: 'The browser said no for now. Using the app from the Home Screen regularly makes it more likely to agree.',
  };

  return (
    <div className="setting setting-stack">
      <div className="setting-text">
        <span className="setting-label">Storage safety</span>
        <span className="setting-hint" role="status">
          {status[state]}
        </span>
      </div>
      {(state === 'not-granted' || state === 'refused') && (
        <div className="settings-actions">
          <button type="button" className="button button-quiet" onClick={onPersist}>
            Keep my data
          </button>
        </div>
      )}
      <p className="setting-hint">Even when kept, an exported file is the real backup.</p>
    </div>
  );
}

function ResetProgress() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setBusy(true);
    try {
      await clearAll();
    } catch (err) {
      setBusy(false);
      setError(`Could not delete: ${errorText(err)}`);
      return;
    }
    reloadWith('system', 'All progress and settings were deleted.');
  };

  return (
    <div className="setting setting-stack">
      <div className="setting-text">
        <span className="setting-label">Reset progress</span>
        <span className="setting-hint">
          Deletes everything saved on this iPad: lesson ticks, review cards, the study plan and all settings, including the
          theme.
        </span>
      </div>
      {!confirming ? (
        <div className="settings-actions">
          <button type="button" className="button button-quiet" onClick={() => setConfirming(true)}>
            Reset progress…
          </button>
        </div>
      ) : (
        <div className="settings-confirm settings-danger" role="region" aria-label="Confirm reset">
          <p>
            <strong>This cannot be undone.</strong> Export a backup first (above) if you might want any of it back.
          </p>
          <div className="settings-actions">
            <button type="button" className="button button-danger" onClick={onDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete all progress'}
            </button>
            <button type="button" className="button button-quiet" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="settings-message settings-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

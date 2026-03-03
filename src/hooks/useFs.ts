import { useState, useEffect } from 'react';

export function useFsRead(path: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to read file');
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFile();
  }, [path]);

  return { data, loading, error };
}

export function useFsScan() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function scanFiles() {
      try {
        setLoading(true);
        const res = await fetch(`/api/fs/scan`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to scan files');
        setFiles(json.files || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    scanFiles();
  }, []);

  return { files, loading, error };
}

export async function fsWrite(path: string, content: string, createBackup = false) {
  const res = await fetch('/api/fs/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content, createBackup })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to write file');
  return json;
}

export async function execCmd(command: string, args: string[] = [], cwd?: string) {
  const res = await fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args, cwd })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to execute command');
  return json;
}


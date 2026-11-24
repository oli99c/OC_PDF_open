// fichiers ouverts par Windows (double-clic, « Ouvrir avec ») quand
// l'application installee est declaree comme gestionnaire des PDF
// (file_handlers dans site.webmanifest). API Launch Handler de Chromium/Edge.

interface LaunchFileHandle {
  kind?: string;
  getFile(): Promise<File>;
}

interface LaunchParamsLike {
  files?: readonly LaunchFileHandle[];
}

interface LaunchQueueLike {
  setConsumer(consumer: (params: LaunchParamsLike) => void): void;
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}

export async function filesFromLaunchParams(
  params: LaunchParamsLike
): Promise<File[]> {
  const handles = params.files ?? [];
  const files: File[] = [];
  for (const handle of handles) {
    if (handle.kind && handle.kind !== 'file') continue;
    files.push(await handle.getFile());
  }
  return files.filter(isPdfFile);
}

/** Branche onFiles sur la file de lancement si le navigateur la propose. */
export function consumeLaunchedFiles(
  onFiles: (files: File[]) => void | Promise<void>,
  target: { launchQueue?: LaunchQueueLike } = window as unknown as {
    launchQueue?: LaunchQueueLike;
  }
): boolean {
  if (!target.launchQueue) return false;
  target.launchQueue.setConsumer(async (params) => {
    const files = await filesFromLaunchParams(params);
    if (files.length > 0) await onFiles(files);
  });
  return true;
}

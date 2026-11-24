import { describe, expect, it, vi } from 'vitest';
import {
  consumeLaunchedFiles,
  filesFromLaunchParams,
  isPdfFile,
} from '../js/utils/launch-queue';

const handle = (file: File, kind = 'file') => ({
  kind,
  getFile: async () => file,
});

describe('launch-queue (ouverture des PDF depuis Windows)', () => {
  it('reconnait un PDF par son type ou son extension', () => {
    expect(isPdfFile(new File(['x'], 'a.pdf', { type: '' }))).toBe(true);
    expect(isPdfFile(new File(['x'], 'b', { type: 'application/pdf' }))).toBe(
      true
    );
    expect(isPdfFile(new File(['x'], 'c.docx', { type: '' }))).toBe(false);
  });

  it('garde les seuls fichiers PDF et ignore les dossiers', async () => {
    const pdf = new File(['%PDF'], 'Rapport.PDF', { type: '' });
    const files = await filesFromLaunchParams({
      files: [
        handle(pdf),
        handle(new File(['x'], 'note.txt')),
        handle(pdf, 'directory'),
      ],
    });
    expect(files).toEqual([pdf]);
  });

  it('transmet les fichiers lances a la page, rien sinon', async () => {
    let consumer: ((p: { files?: never[] }) => Promise<void>) | undefined;
    const target = {
      launchQueue: {
        setConsumer: (c: never) => {
          consumer = c;
        },
      },
    };
    const onFiles = vi.fn();
    expect(consumeLaunchedFiles(onFiles, target as never)).toBe(true);
    const pdf = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
    await consumer!({ files: [handle(pdf)] as never[] });
    await consumer!({ files: [] });
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles).toHaveBeenCalledWith([pdf]);
  });

  it('ne fait rien hors application installee', () => {
    expect(consumeLaunchedFiles(vi.fn(), {})).toBe(false);
  });
});

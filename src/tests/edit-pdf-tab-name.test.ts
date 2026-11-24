import { describe, expect, it } from 'vitest';
import { tabName } from '../js/utils/deduplicate-filename';

describe('tabName (onglets de l’éditeur)', () => {
  it('garde le nom du fichier quand il est unique', () => {
    expect(tabName(0, [{ name: 'A.pdf' }, { name: 'B.pdf' }])).toBe('A.pdf');
  });
  it('préfixe l’index seulement pour les doublons', () => {
    const files = [{ name: 'A.pdf' }, { name: 'A.pdf' }, { name: 'B.pdf' }];
    expect(tabName(0, files)).toBe('0_A.pdf');
    expect(tabName(1, files)).toBe('1_A.pdf');
    expect(tabName(2, files)).toBe('B.pdf');
  });
});

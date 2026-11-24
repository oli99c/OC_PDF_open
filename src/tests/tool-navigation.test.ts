import { describe, expect, it } from 'vitest';
import {
  CLE_FAVORIS,
  OUTILS,
  basculerFavori,
  noterUtilisation,
  raccourcis,
  recents,
  suggestions,
  urlOutil,
  type Stockage,
} from '../js/utils/tool-navigation';

function memoire(init: Record<string, string> = {}): Stockage {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

describe('navigation entre outils', () => {
  it('catalogue = les 16 outils gardés, sans doublon', () => {
    expect(OUTILS).toHaveLength(16);
    expect(new Set(OUTILS.map((o) => o.id)).size).toBe(16);
  });

  it('récents : plus récent en tête, sans doublon, 6 au plus, outils connus seuls', () => {
    const s = memoire();
    for (const id of [
      'merge-pdf',
      'compress-pdf',
      'merge-pdf',
      'inconnu',
      'ocr-pdf',
      'split-pdf',
      'rotate-pdf',
      'edit-pdf',
      'page-numbers',
    ])
      noterUtilisation(s, id);
    expect(recents(s)).toEqual([
      'page-numbers',
      'edit-pdf',
      'rotate-pdf',
      'split-pdf',
      'ocr-pdf',
      'merge-pdf',
    ]);
  });

  it('favoris partagés avec l’accueil (même clé), bascule ajout/retrait', () => {
    const s = memoire({
      [CLE_FAVORIS]: JSON.stringify(['ocr-pdf', 'sign-pdf']),
    });
    expect(basculerFavori(s, 'merge-pdf')).toBe(true);
    expect(JSON.parse(s.getItem(CLE_FAVORIS)!)).toEqual([
      'ocr-pdf',
      'sign-pdf',
      'merge-pdf',
    ]);
    expect(basculerFavori(s, 'ocr-pdf')).toBe(false);
  });

  it('raccourcis : favoris puis récents hors favoris et hors outil courant', () => {
    const s = memoire({ [CLE_FAVORIS]: JSON.stringify(['edit-pdf']) });
    ['compress-pdf', 'edit-pdf', 'merge-pdf'].forEach((id) =>
      noterUtilisation(s, id)
    );
    expect(raccourcis(s, 'merge-pdf')).toEqual({
      favoris: ['edit-pdf'],
      recents: ['compress-pdf'],
    });
  });

  it('suggestions après un PDF : favoris acceptant un PDF d’abord, jamais l’outil courant', () => {
    const s = memoire({
      [CLE_FAVORIS]: JSON.stringify(['word-to-pdf', 'page-numbers']),
    });
    expect(suggestions(s, 'compress-pdf')).toEqual([
      'page-numbers',
      'edit-pdf',
      'ocr-pdf',
      'merge-pdf',
    ]);
  });

  it('stockage illisible : listes vides sans erreur', () => {
    const s = memoire({
      [CLE_FAVORIS]: '{cassé',
      recentTools: '"x"',
    });
    expect(raccourcis(s, null)).toEqual({ favoris: [], recents: [] });
  });

  it('URL de l’outil selon la langue de la page', () => {
    expect(urlOutil('ocr-pdf', '/', 'fr')).toBe('/fr/ocr-pdf.html');
    expect(urlOutil('ocr-pdf', '/app', 'en')).toBe('/app/ocr-pdf.html');
  });
});

// navigation entre outils sans repasser par l'accueil.
// Catalogue des outils gardés, favoris (même clé que l'accueil), outils
// récents, suggestions « Continuer avec ce fichier » et transmission du
// fichier produit à l'outil suivant (IndexedDB, reste dans le navigateur).

export interface OutilRapide {
  id: string;
  nom: string;
  icone: string;
  /** L'outil accepte un PDF en entrée (sinon Word, Excel ou images). */
  entreePdf: boolean;
}

export const OUTILS: readonly OutilRapide[] = [
  {
    id: 'edit-pdf',
    nom: 'Éditer / caviarder',
    icone: 'ph-pencil-simple',
    entreePdf: true,
  },
  { id: 'merge-pdf', nom: 'Fusionner', icone: 'ph-browsers', entreePdf: true },
  { id: 'split-pdf', nom: 'Scinder', icone: 'ph-scissors', entreePdf: true },
  {
    id: 'compress-pdf',
    nom: 'Compresser',
    icone: 'ph-lightning',
    entreePdf: true,
  },
  {
    id: 'ocr-pdf',
    nom: 'OCR (rendre cherchable)',
    icone: 'ph-barcode',
    entreePdf: true,
  },
  {
    id: 'organize-pdf',
    nom: 'Organiser les pages',
    icone: 'ph-files',
    entreePdf: true,
  },
  {
    id: 'extract-pages',
    nom: 'Extraire des pages',
    icone: 'ph-squares-four',
    entreePdf: true,
  },
  {
    id: 'delete-pages',
    nom: 'Supprimer des pages',
    icone: 'ph-trash',
    entreePdf: true,
  },
  {
    id: 'rotate-pdf',
    nom: 'Faire pivoter',
    icone: 'ph-arrow-clockwise',
    entreePdf: true,
  },
  {
    id: 'page-numbers',
    nom: 'Numéroter les pages',
    icone: 'ph-list-numbers',
    entreePdf: true,
  },
  {
    id: 'remove-metadata',
    nom: 'Effacer les métadonnées',
    icone: 'ph-file-x',
    entreePdf: true,
  },
  {
    id: 'unlock-pdf',
    nom: 'Déverrouiller',
    icone: 'ph-lock-open',
    entreePdf: true,
  },
  {
    id: 'pdf-to-excel',
    nom: 'PDF vers Excel',
    icone: 'ph-microsoft-excel-logo',
    entreePdf: true,
  },
  {
    id: 'word-to-pdf',
    nom: 'Word vers PDF',
    icone: 'ph-microsoft-word-logo',
    entreePdf: false,
  },
  {
    id: 'excel-to-pdf',
    nom: 'Excel vers PDF',
    icone: 'ph-microsoft-excel-logo',
    entreePdf: false,
  },
  {
    id: 'image-to-pdf',
    nom: 'Images vers PDF',
    icone: 'ph-images',
    entreePdf: false,
  },
];

const PAR_ID = new Map(OUTILS.map((o) => [o.id, o]));
export const outil = (id: string): OutilRapide | undefined => PAR_ID.get(id);

/** Suites logiques par défaut pour un PDF produit, dans cet ordre. */
const SUITES_PDF = [
  'compress-pdf',
  'edit-pdf',
  'ocr-pdf',
  'page-numbers',
  'merge-pdf',
  'organize-pdf',
  'split-pdf',
  'remove-metadata',
];

export const CLE_FAVORIS = 'favoriteTools'; // partagée avec l'accueil
export const CLE_RECENTS = 'recentTools';
const MAX_RECENTS = 6;

export interface Stockage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function lireListe(s: Stockage, cle: string): string[] {
  try {
    const v: unknown = JSON.parse(s.getItem(cle) || '[]');
    return Array.isArray(v)
      ? [...new Set(v.filter((x): x is string => typeof x === 'string'))]
      : [];
  } catch {
    return [];
  }
}

function ecrire(s: Stockage, cle: string, liste: string[]) {
  try {
    s.setItem(cle, JSON.stringify(liste));
  } catch {
    /* stockage indisponible (navigation privée) : on ignore */
  }
}

export const favoris = (s: Stockage) =>
  lireListe(s, CLE_FAVORIS).filter((id) => PAR_ID.has(id));

export function basculerFavori(s: Stockage, id: string): boolean {
  const brut = lireListe(s, CLE_FAVORIS);
  const ajoute = !brut.includes(id);
  ecrire(s, CLE_FAVORIS, ajoute ? [...brut, id] : brut.filter((x) => x !== id));
  return ajoute;
}

export const recents = (s: Stockage) =>
  lireListe(s, CLE_RECENTS).filter((id) => PAR_ID.has(id));

export function noterUtilisation(s: Stockage, id: string) {
  if (!PAR_ID.has(id)) return;
  ecrire(
    s,
    CLE_RECENTS,
    [id, ...recents(s).filter((x) => x !== id)].slice(0, MAX_RECENTS)
  );
}

/** Raccourcis de la barre : favoris d'abord, puis récents non favoris. */
export function raccourcis(s: Stockage, courant: string | null, max = 6) {
  const fav = favoris(s);
  const rec = recents(s).filter((id) => !fav.includes(id) && id !== courant);
  return {
    favoris: fav.slice(0, max),
    recents: rec.slice(0, Math.max(0, Math.min(3, max - fav.length))),
  };
}

export const estPdf = (nom: string, type = '') =>
  type === 'application/pdf' || /\.pdf$/i.test(nom);

/** Outils proposés après production d'un PDF : favoris PDF puis suites logiques. */
export function suggestions(s: Stockage, courant: string | null, max = 4) {
  const fav = favoris(s).filter((id) => outil(id)?.entreePdf);
  return [...new Set([...fav, ...SUITES_PDF])]
    .filter((id) => id !== courant)
    .slice(0, max);
}

export function urlOutil(id: string, base: string, langue: string): string {
  const b = base.endsWith('/') ? base : base + '/';
  return `${b}${langue && langue !== 'en' ? langue + '/' : ''}${id}.html`;
}

// --- Fichier à reprendre dans l'outil suivant (IndexedDB) ---------------

const BASE_IDB = 'pdftools-handoff';
const MAGASIN = 'reprise';
const CLE = 'fichier';
export const DUREE_REPRISE_MS = 15 * 60 * 1000;

interface Reprise {
  nom: string;
  type: string;
  blob: Blob;
  pour: string;
  le: number;
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(BASE_IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function requete<T>(
  mode: IDBTransactionMode,
  fn: (m: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await ouvrir();
  try {
    return await new Promise<T>((ok, ko) => {
      const r = fn(db.transaction(MAGASIN, mode).objectStore(MAGASIN));
      r.onsuccess = () => ok(r.result as T);
      r.onerror = () => ko(r.error);
    });
  } finally {
    db.close();
  }
}

export async function deposerReprise(blob: Blob, nom: string, pour: string) {
  const r: Reprise = {
    nom,
    type: blob.type || 'application/pdf',
    blob,
    pour,
    le: Date.now(),
  };
  await requete<IDBValidKey>('readwrite', (m) => m.put(r, CLE));
}

/** Rend le fichier destiné à cet outil (une seule fois), sinon null. */
export async function reprendre(
  pour: string,
  maintenant = Date.now()
): Promise<File | null> {
  let r: Reprise | undefined;
  try {
    r = await requete<Reprise | undefined>('readonly', (m) => m.get(CLE));
  } catch {
    return null;
  }
  if (!r) return null;
  if (r.pour !== pour && maintenant - r.le <= DUREE_REPRISE_MS) return null;
  try {
    await requete<undefined>('readwrite', (m) => m.delete(CLE));
  } catch {
    /* effacement impossible : sans conséquence, la reprise expire */
  }
  if (r.pour !== pour || maintenant - r.le > DUREE_REPRISE_MS) return null;
  return new File([r.blob], r.nom, { type: r.type });
}

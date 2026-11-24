// barre d'outils rapide (favoris, récents, tous les outils) dans
// l'en-tête de chaque outil, et carte « Continuer avec ce fichier » après un
// téléchargement de PDF. Logique dans tool-navigation.ts.
import { getLanguageFromUrl, onPageReady } from '../i18n/i18n.js';
import { getToolIdFromPath } from './disabled-tools.js';
import {
  OUTILS,
  basculerFavori,
  deposerReprise,
  estPdf,
  favoris,
  noterUtilisation,
  outil,
  raccourcis,
  reprendre,
  suggestions,
  urlOutil,
  type Stockage,
} from './tool-navigation.js';

const stockage: Stockage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignoré */
    }
  },
};

const courant = getToolIdFromPath();
const lien = (id: string) =>
  urlOutil(id, import.meta.env.BASE_URL || '/', getLanguageFromUrl());

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  texte = ''
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texte) e.textContent = texte;
  return e;
}

function icone(nom: string) {
  const i = el('i', `ph ${nom}`);
  i.setAttribute('aria-hidden', 'true');
  return i;
}

// Fichier en attente de passage à un autre outil (carte « Continuer »)
let fichierProduit: { blob: Blob; nom: string } | null = null;

async function continuerAvec(id: string) {
  if (fichierProduit) {
    try {
      await deposerReprise(fichierProduit.blob, fichierProduit.nom, id);
    } catch {
      /* IndexedDB indisponible : on ouvre l'outil sans le fichier */
    }
  }
  window.location.href = lien(id);
}

// --- Barre dans l'en-tête ------------------------------------------------

function puce(id: string, genre: 'favori' | 'recent') {
  const o = outil(id)!;
  const a = el('a', `ap-puce${id === courant ? ' ap-puce-active' : ''}`);
  a.href = lien(id);
  a.title = genre === 'favori' ? `Favori : ${o.nom}` : `Récent : ${o.nom}`;
  a.append(
    icone(genre === 'favori' ? 'ph-star' : 'ph-clock-counter-clockwise')
  );
  a.append(el('span', '', o.nom));
  return a;
}

function construireBarre(): HTMLElement {
  const barre = el('div', 'ap-barre');
  barre.id = 'ap-barre';
  const zone = el('div', 'ap-raccourcis');
  const majRaccourcis = () => {
    zone.replaceChildren();
    const r = raccourcis(stockage, courant);
    r.favoris.forEach((id) => zone.append(puce(id, 'favori')));
    r.recents.forEach((id) => zone.append(puce(id, 'recent')));
  };
  majRaccourcis();

  const bouton = el('button', 'ap-tous');
  bouton.type = 'button';
  bouton.setAttribute('aria-haspopup', 'true');
  bouton.setAttribute('aria-expanded', 'false');
  bouton.append(
    icone('ph-squares-four'),
    el('span', '', 'Tous les outils'),
    icone('ph-caret-down')
  );

  const panneau = construirePanneau(majRaccourcis);
  const ouvrir = (oui: boolean) => {
    panneau.hidden = !oui;
    bouton.setAttribute('aria-expanded', String(oui));
    if (oui) (panneau.querySelector('input') as HTMLInputElement)?.focus();
  };
  bouton.addEventListener('click', (e) => {
    e.stopPropagation();
    ouvrir(panneau.hidden);
  });
  document.addEventListener('click', (e) => {
    if (!panneau.hidden && !panneau.contains(e.target as Node)) ouvrir(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ouvrir(false);
  });
  (barre as HTMLElement & { ouvrirPanneau?: () => void }).ouvrirPanneau = () =>
    ouvrir(true);

  barre.append(zone, bouton, panneau);
  return barre;
}

function construirePanneau(majRaccourcis: () => void): HTMLElement {
  const p = el('div', 'ap-panneau');
  p.hidden = true;
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'Tous les outils');
  const titre = el('div', 'ap-panneau-titre', 'Aller à un outil');
  const recherche = el('input', 'ap-recherche') as HTMLInputElement;
  recherche.type = 'search';
  recherche.placeholder = 'Rechercher un outil…';
  const liste = el('ul', 'ap-liste');

  const dessiner = () => {
    const fav = favoris(stockage);
    const q = recherche.value.trim().toLowerCase();
    const ordre = [...OUTILS].sort(
      (a, b) => Number(fav.includes(b.id)) - Number(fav.includes(a.id))
    );
    liste.replaceChildren();
    titre.textContent = fichierProduit
      ? `Continuer avec « ${fichierProduit.nom} » dans :`
      : 'Aller à un outil';
    for (const o of ordre) {
      if (q && !o.nom.toLowerCase().includes(q)) continue;
      if (fichierProduit && !o.entreePdf) continue;
      const li = el('li', 'ap-ligne');
      const a = el('a', `ap-lien${o.id === courant ? ' ap-lien-actif' : ''}`);
      a.href = lien(o.id);
      a.append(icone(o.icone), el('span', '', o.nom));
      a.addEventListener('click', (e) => {
        if (!fichierProduit) return;
        e.preventDefault();
        void continuerAvec(o.id);
      });
      const etoile = el(
        'button',
        `ap-etoile${fav.includes(o.id) ? ' ap-etoile-on' : ''}`
      );
      etoile.type = 'button';
      const estFav = fav.includes(o.id);
      etoile.setAttribute('aria-pressed', String(estFav));
      etoile.setAttribute(
        'aria-label',
        estFav ? `Retirer ${o.nom} des favoris` : `Ajouter ${o.nom} aux favoris`
      );
      etoile.title = estFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
      etoile.append(icone(estFav ? 'ph-fill ph-star' : 'ph-star'));
      etoile.addEventListener('click', (e) => {
        e.stopPropagation();
        basculerFavori(stockage, o.id);
        dessiner();
        majRaccourcis();
      });
      li.append(a, etoile);
      liste.append(li);
    }
    if (!liste.children.length)
      liste.append(el('li', 'ap-vide', 'Aucun outil trouvé'));
  };
  recherche.addEventListener('input', dessiner);
  recherche.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')
      (liste.querySelector('a') as HTMLAnchorElement)?.click();
  });
  p.addEventListener('click', (e) => e.stopPropagation());
  (p as HTMLElement & { redessiner?: () => void }).redessiner = dessiner;
  dessiner();
  p.append(titre, recherche, liste);
  return p;
}

// --- Carte « Continuer avec ce fichier » --------------------------------

function afficherCarte(nom: string) {
  document.getElementById('ap-carte')?.remove();
  const c = el('div', 'ap-carte');
  c.id = 'ap-carte';
  c.setAttribute('role', 'status');
  const fermer = el('button', 'ap-carte-fermer');
  fermer.type = 'button';
  fermer.setAttribute('aria-label', 'Fermer');
  fermer.append(icone('ph-x'));
  fermer.addEventListener('click', () => {
    c.remove();
    fichierProduit = null;
  });
  const tete = el('div', 'ap-carte-tete');
  tete.append(
    icone('ph-check-circle'),
    el('strong', '', 'Fichier prêt'),
    fermer
  );
  const fichier = el('div', 'ap-carte-fichier', nom);
  const invite = el('div', 'ap-carte-invite', 'Continuer avec ce fichier :');
  const boutons = el('div', 'ap-carte-boutons');
  for (const id of suggestions(stockage, courant)) {
    const o = outil(id)!;
    const b = el('button', 'ap-carte-bouton');
    b.type = 'button';
    b.append(icone(o.icone), el('span', '', o.nom));
    b.addEventListener('click', () => void continuerAvec(id));
    boutons.append(b);
  }
  const autre = el('button', 'ap-carte-autre', 'Autre outil…');
  autre.type = 'button';
  autre.addEventListener('click', (e) => {
    e.stopPropagation();
    const barre = document.getElementById('ap-barre') as
      | (HTMLElement & { ouvrirPanneau?: () => void })
      | null;
    const panneau = barre?.querySelector('.ap-panneau') as
      | (HTMLElement & { redessiner?: () => void })
      | null;
    panneau?.redessiner?.();
    barre?.ouvrirPanneau?.();
  });
  c.append(tete, fichier, invite, boutons, autre);
  document.body.append(c);
}

window.addEventListener('pdftools:file-produced', (e) => {
  const d = (e as CustomEvent<{ blob: Blob; filename: string }>).detail;
  if (!d || !estPdf(d.filename, d.blob.type)) return;
  fichierProduit = { blob: d.blob, nom: d.filename };
  afficherCarte(d.filename);
});

// --- Reprise du fichier transmis par l'outil précédent -----------------

function deposerDansOutil(f: File): boolean {
  const input =
    (document.getElementById('file-input') as HTMLInputElement | null) ||
    (document.querySelector('input[type=file]') as HTMLInputElement | null);
  if (!input) return false;
  const dt = new DataTransfer();
  dt.items.add(f);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function noteReprise(nom: string) {
  const n = el('div', 'ap-carte ap-carte-courte');
  n.setAttribute('role', 'status');
  n.append(
    icone('ph-arrow-bend-down-right'),
    el('span', '', `Fichier repris : ${nom}`)
  );
  document.body.append(n);
  setTimeout(() => n.remove(), 4000);
}

// --- Démarrage --------------------------------------------------------

if (courant && outil(courant)) {
  noterUtilisation(stockage, courant);
  const zoneNav = document.querySelector(
    'nav[data-simple-nav] .container > div'
  );
  if (zoneNav) zoneNav.append(construireBarre());
  onPageReady(() => {
    // laisser l'outil brancher ses propres écouteurs avant de lui donner le fichier
    setTimeout(async () => {
      const f = await reprendre(courant);
      if (f && deposerDansOutil(f)) noteReprise(f.name);
    }, 300);
  });
}

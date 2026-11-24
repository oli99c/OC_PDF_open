export function deduplicateFileName(
  name: string,
  usedNames: Set<string>
): string {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const dotIndex = name.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const baseName = hasExtension ? name.slice(0, dotIndex) : name;
  const extension = hasExtension ? name.slice(dotIndex) : '';

  let counter = 1;
  let candidate = `${baseName} (${counter})${extension}`;
  while (usedNames.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})${extension}`;
  }

  usedNames.add(candidate);
  return candidate;
}

export function makeUniqueFileKey(index: number, name: string): string {
  return `${index}_${name}`;
}

// nom d'onglet lisible dans l'éditeur ; préfixe d'index seulement
// en cas de doublon dans le lot (il sert aussi de clé onglet <-> liste).
export function tabName(
  index: number,
  files: readonly { name: string }[]
): string {
  const name = files[index].name;
  const twins = files.filter((f) => f.name === name).length;
  return twins > 1 ? makeUniqueFileKey(index, name) : name;
}

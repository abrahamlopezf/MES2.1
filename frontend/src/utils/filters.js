export const normalizeText = (value = '') => {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const includesNormalized = (source, searchTerm) => {
  const normalizedSource = normalizeText(source);
  const normalizedSearch = normalizeText(searchTerm);

  if (!normalizedSearch) return true;

  return normalizedSource.includes(normalizedSearch);
};
export type SearchableResource = {
  id: string;
  name: string;
  code: string;
  category?: string | null;
  location?: string | null;
  operationalStatus?: string;
  laboratory?: { name: string } | null;
  media?: Array<{ kind: string; url: string }>;
};

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}

export function searchResources<T extends SearchableResource>(records: readonly T[], value: string): T[] {
  const query = normalize(value);
  if (!query) return [...records];
  const terms = query.split(/\s+/);
  return records.flatMap(record => {
    const name = normalize(record.name), code = normalize(record.code);
    const text = `${name} ${code} ${normalize(record.laboratory?.name || '')} ${normalize(record.location || '')}`;
    if (!terms.every(term => term.length === 1 ? text.split(/[^a-z0-9]+/).includes(term) : text.includes(term))) return [];
    const rank = code === query ? 0 : name === query ? 1 : code.startsWith(query) || name.startsWith(query) ? 2 : 3;
    return [{ record, rank }];
  }).sort((a, b) => a.rank - b.rank).map(match => match.record);
}

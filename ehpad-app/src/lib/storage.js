function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function setAll(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function makeEntity(storageKey) {
  return {
    list: (sortField, limit = 200) => {
      let items = getAll(storageKey);
      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = desc ? sortField.slice(1) : sortField;
        items = [...items].sort((a, b) => {
          const va = a[field] ?? 0;
          const vb = b[field] ?? 0;
          if (va < vb) return desc ? 1 : -1;
          if (va > vb) return desc ? -1 : 1;
          return 0;
        });
      }
      return Promise.resolve(items.slice(0, limit));
    },

    filter: (query, sortField, limit = 200) => {
      let items = getAll(storageKey).filter(item =>
        Object.entries(query).every(([k, v]) => item[k] === v)
      );
      if (sortField) {
        const desc = sortField.startsWith('-');
        const field = desc ? sortField.slice(1) : sortField;
        items = [...items].sort((a, b) => {
          const va = a[field] ?? '';
          const vb = b[field] ?? '';
          if (va < vb) return desc ? 1 : -1;
          if (va > vb) return desc ? -1 : 1;
          return 0;
        });
      }
      return Promise.resolve(items.slice(0, limit));
    },

    create: (data) => {
      const items = getAll(storageKey);
      const item = { ...data, id: genId(), created_date: new Date().toISOString() };
      items.push(item);
      setAll(storageKey, items);
      return Promise.resolve(item);
    },

    update: (id, data) => {
      const items = getAll(storageKey);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return Promise.reject(new Error('Not found: ' + id));
      items[idx] = { ...items[idx], ...data };
      setAll(storageKey, items);
      return Promise.resolve(items[idx]);
    },

    delete: (id) => {
      const items = getAll(storageKey).filter(i => i.id !== id);
      setAll(storageKey, items);
      return Promise.resolve();
    },

    subscribe: () => () => {},
  };
}

export const Resident = makeEntity('ehpad_residents');
export const FloorInfo = makeEntity('ehpad_floor_info');
export const ConsigneNuit = makeEntity('ehpad_consignes_nuit');
export const EtiquetteSelection = makeEntity('ehpad_etiquette_sel');
export const FicheDePoste = makeEntity('ehpad_fiches_poste');
export const PAP = makeEntity('ehpad_pap');
export const PAPVersion = makeEntity('ehpad_pap_versions');
export const PVI = makeEntity('ehpad_pvi');
export const SuiviAntalgique = makeEntity('ehpad_suivi_antalgiques');

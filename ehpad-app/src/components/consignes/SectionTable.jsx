import React, { useState } from "react";
import ResidentRow from "./ResidentRow";

export default function SectionTable({ title, residents, onUpdate, taOffset = 0, fontSize = 11 }) {
  const [editingId, setEditingId] = useState(null);

  const sorted = [...residents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleUpdate = async (id, data) => {
    await onUpdate(id, data);
    setEditingId(null);
  };

  // Calculer la largeur max nécessaire pour les colonnes Nom et Infos
  const maxNameWidth = Math.max(
    ...sorted.map(r => {
      const nameLength = ((r.title || '') + ' ' + (r.last_name || '')).length;
      const firstNameLength = (r.first_name || '').length;
      return Math.max(nameLength, firstNameLength);
    }),
    0
  ) * 6.2 + 10; // estimation: 6.2px par caractère + padding

  const maxInfosWidth = Math.max(
    ...sorted.map(r => (r.annotations || "").split('\n').reduce((max, line) => Math.max(max, line.length), 0)),
    0
  ) * 5.5 + 12; // estimation: 5.5px par caractère + padding

  return (
    <div className="mb-4">
      <table className="w-full" style={{borderCollapse: 'collapse', border: '1px solid #475569'}}>
        <thead>
          <tr className="bg-slate-100/80">
            <th style={{border: '1px solid #475569'}} className="px-1 py-1 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-10">Ch.</th>
            <th style={{border: '1px solid #475569', width: `${maxNameWidth}px`}} className="px-1 py-1 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nom</th>
            <th style={{border: '1px solid #475569', width: `${maxInfosWidth}px`}} className="px-1 py-1 text-left text-[10px] font-semibold text-red-600 uppercase tracking-wider">Infos</th>
            <th style={{border: '1px solid #475569'}} className="px-2 py-1 text-left text-[10px] font-semibold text-slate-800 uppercase tracking-wider">{title} — Consignes</th>
            <th style={{border: '1px solid #475569'}} className="px-1 py-1 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-8 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => (
            <ResidentRow
              key={r.id}
              resident={r}
              taDay={Math.ceil((taOffset + idx + 1) / 2)}
              onUpdate={handleUpdate}
              isEditing={editingId === r.id}
              onStartEdit={setEditingId}
              onCancelEdit={() => setEditingId(null)}
              maxNameWidth={maxNameWidth}
              maxInfosWidth={maxInfosWidth}
              fontSize={fontSize}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
import React, { useState, useMemo } from "react";
import ResidentRow from "./ResidentRow";

const measureTextWidth = (text, fontSize, fontWeight = 'normal') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`;
  return ctx.measureText(text).width;
};

export default function SectionTable({ title, residents, onUpdate, taOffset = 0, fontSize = 11, niveauSoinMap = {} }) {
  const [editingId, setEditingId] = useState(null);

  const sorted = [...residents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleUpdate = async (id, data) => {
    await onUpdate(id, data);
    setEditingId(null);
  };

  // Mesurer les largeurs réelles du texte
  const maxNameWidth = useMemo(() => {
    const widths = sorted.map(r => {
      const lastName = (r.last_name || '').toUpperCase();
      const firstName = (r.first_name || '').toUpperCase();
      const w1 = lastName ? measureTextWidth(lastName, 12, '600') : 0;
      const w2 = firstName ? measureTextWidth(firstName, 11, '600') : 0;
      return Math.max(w1, w2);
    });
    return Math.max(...widths, 0) - 4;
  }, [sorted]);

  const maxInfosWidth = useMemo(() => {
    const widths = sorted.map(r => {
      const lines = (r.annotations || '').split('\n').filter(l => !l.startsWith('---SUPPL:'));
      return Math.max(...lines.map(line => measureTextWidth(line, 11, '600')), 0);
    });
    return Math.max(...widths, 0) + 8;
  }, [sorted]);

  return (
    <div className="mb-4">
      <table className="w-full" style={{borderCollapse: 'collapse', border: '1px solid #475569'}}>
        <thead>
          <tr className="bg-slate-100/80">
            <th style={{border: '1px solid #475569'}} className="px-1 py-1 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-10">Ch.</th>
            <th style={{border: '1px solid #475569', width: `${maxNameWidth}px`}} className="px-1 py-1 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nom</th>
            <th style={{border: '1px solid #475569', width: `${maxInfosWidth}px`}} className="px-1 py-1 text-left text-[10px] font-semibold text-red-600 uppercase tracking-wider">Infos</th>
            <th style={{border: '1px solid #475569', width: '75%'}} className="px-2 py-1 text-left text-[10px] font-semibold text-slate-800 uppercase tracking-wider">{title} — Consignes</th>
            <th style={{border: '1px solid #475569'}} className="px-1 py-1 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-8 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => (
            <ResidentRow
              key={r.id}
              resident={r}
              niveauSoinRecord={niveauSoinMap[r.id] || {}}
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
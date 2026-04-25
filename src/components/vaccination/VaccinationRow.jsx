import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, Pencil, Save } from "lucide-react";

const STATUTS = ["REFUS", "???", "-", "Attente info"];

function CellInput({ value, onChange }) {
  return (
    <input
      type="text"
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder="JJ/MM/AAAA ou REFUS"
      className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
    />
  );
}

function CellDisplay({ value }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isRefus = value.toLowerCase().includes("refus");
  const isWarning = value === "???" || value === "-";
  if (isDate) {
    const [y, m, d] = value.split("-");
    return <span className="text-slate-700 font-medium">{d}/{m}/{y}</span>;
  }
  if (isRefus) return <span className="text-red-500 font-semibold text-xs">{value}</span>;
  if (isWarning) return <span className="text-amber-500 text-xs">{value}</span>;
  return <span className="text-slate-500 text-xs">{value}</span>;
}

function normalizeDate(val) {
  if (!val) return "";
  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // dd/mm/yyyy
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return val; // keep as-is for statuts texte
}

export default function VaccinationRow({ record, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    covid_inj1: record.covid_inj1 || "",
    covid_inj2: record.covid_inj2 || "",
    covid_inj3: record.covid_inj3 || "",
    grippe_inj1: record.grippe_inj1 || "",
    infos: record.infos || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      covid_inj1: normalizeDate(form.covid_inj1) || null,
      covid_inj2: normalizeDate(form.covid_inj2) || null,
      covid_inj3: normalizeDate(form.covid_inj3) || null,
      grippe_inj1: normalizeDate(form.grippe_inj1) || null,
      infos: form.infos || null,
    };
    await base44.entities.Vaccination.update(record.id, data);
    setSaving(false);
    setEditing(false);
    onSaved();
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2 text-sm font-medium text-slate-800 w-40">{record.year}</td>
      {editing ? (
        <>
          <td className="px-2 py-1"><CellInput value={form.covid_inj1} onChange={v => setForm(f => ({ ...f, covid_inj1: v }))} /></td>
          <td className="px-2 py-1"><CellInput value={form.covid_inj2} onChange={v => setForm(f => ({ ...f, covid_inj2: v }))} /></td>
          <td className="px-2 py-1"><CellInput value={form.covid_inj3} onChange={v => setForm(f => ({ ...f, covid_inj3: v }))} /></td>
          <td className="px-2 py-1"><CellInput value={form.grippe_inj1} onChange={v => setForm(f => ({ ...f, grippe_inj1: v }))} /></td>
          <td className="px-2 py-1 col-span-1">
            <input
              type="text"
              value={form.infos}
              onChange={e => setForm(f => ({ ...f, infos: e.target.value }))}
              placeholder="Infos..."
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
            />
          </td>
          <td className="px-2 py-1">
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                <Save className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditing(false)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 text-center"><CellDisplay value={record.covid_inj1} /></td>
          <td className="px-3 py-2 text-center"><CellDisplay value={record.covid_inj2} /></td>
          <td className="px-3 py-2 text-center"><CellDisplay value={record.covid_inj3} /></td>
          <td className="px-3 py-2 text-center"><CellDisplay value={record.grippe_inj1} /></td>
          <td className="px-3 py-2 text-xs text-slate-500 max-w-xs truncate">{record.infos || ""}</td>
          <td className="px-3 py-2">
            <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </td>
        </>
      )}
    </tr>
  );
}
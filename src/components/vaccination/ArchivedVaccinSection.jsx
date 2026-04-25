import React, { useState } from "react";
import { ChevronDown, ChevronUp, Archive } from "lucide-react";
import VaccinationRow from "./VaccinationRow";

export default function ArchivedVaccinSection({ records, onRefresh }) {
  const [open, setOpen] = useState(false);

  // Group by resident_name
  const byResident = {};
  records.forEach(r => {
    const key = r.resident_name;
    if (!byResident[key]) byResident[key] = [];
    byResident[key].push(r);
  });

  const names = Object.keys(byResident).sort();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        <Archive className="h-4 w-4 text-slate-500" />
        <span className="font-semibold text-slate-700">Archives — Résidents sortis</span>
        <span className="text-xs text-slate-400 ml-1">({names.length} résidents)</span>
        <div className="ml-auto">
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {names.map(name => (
            <div key={name} className="bg-white">
              <div className="px-4 py-2 bg-slate-50">
                <span className="font-medium text-slate-700 text-sm">{name}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400">
                      <th className="px-3 py-1 text-left">Année</th>
                      <th className="px-3 py-1 text-center">Covid 1</th>
                      <th className="px-3 py-1 text-center">Covid 2</th>
                      <th className="px-3 py-1 text-center">Covid 3</th>
                      <th className="px-3 py-1 text-center">Grippe</th>
                      <th className="px-3 py-1 text-left">Infos</th>
                      <th className="px-3 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {byResident[name]
                      .sort((a, b) => b.year - a.year)
                      .map(r => (
                        <VaccinationRow key={r.id} record={r} onSaved={onRefresh} />
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
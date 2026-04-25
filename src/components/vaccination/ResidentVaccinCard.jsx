import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import VaccinationRow from "./VaccinationRow";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

export default function ResidentVaccinCard({ resident, records, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAddYear = async (year) => {
    await base44.entities.Vaccination.create({
      resident_id: resident.id,
      resident_name: `${resident.last_name} ${resident.first_name || ""}`.trim(),
      year,
      archived: resident.archived || false,
    });
    onRefresh();
    setAdding(false);
  };

  const usedYears = records.map(r => r.year);
  const availableYears = YEARS.filter(y => !usedYears.includes(y));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">
            {resident.last_name} {resident.first_name || ""}
          </span>
          <span className="text-xs text-slate-400">Ch. {resident.room}</span>
          {records.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {records.length} année{records.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left">Année</th>
                  <th className="px-3 py-2 text-center">Covid Inj. 1</th>
                  <th className="px-3 py-2 text-center">Covid Inj. 2</th>
                  <th className="px-3 py-2 text-center">Covid Inj. 3</th>
                  <th className="px-3 py-2 text-center">Grippe</th>
                  <th className="px-3 py-2 text-left">Infos</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {records
                  .sort((a, b) => b.year - a.year)
                  .map(r => (
                    <VaccinationRow key={r.id} record={r} onSaved={onRefresh} />
                  ))}
              </tbody>
            </table>
          </div>

          {availableYears.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Ajouter une année :</span>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => handleAddYear(y)}
                  className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100"
                >
                  + {y}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
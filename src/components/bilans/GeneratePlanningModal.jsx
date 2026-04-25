import React, { useState } from "react";
import { X, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOIS_LABELS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function mod12(n) {
  return ((n - 1 + 12) % 12) + 1;
}

// Standard protocol: B3×4, B6×2, BC×1 spread over 7 different months
// Starting from startMonth:
// B3: s, s+3, s+6, s+9
// B6: s+1, s+7
// BC: s+2
function buildSchedule(startMonth) {
  const s = parseInt(startMonth, 10);
  return [
    { mois: mod12(s),     type: "B3" },
    { mois: mod12(s + 1), type: "B6" },
    { mois: mod12(s + 2), type: "BC" },
    { mois: mod12(s + 3), type: "B3" },
    { mois: mod12(s + 6), type: "B3" },
    { mois: mod12(s + 7), type: "B6" },
    { mois: mod12(s + 9), type: "B3" },
  ];
}

function suggestDay(mois, annee, floor, medecin, bilanConfigs, allCells) {
  const config = bilanConfigs.find(c => c.medecin_name === medecin);
  const joursAllowed = config?.jours || [];
  if (!joursAllowed.length) return null;
  const joursMap = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5 };
  const allowedWeekdays = joursAllowed.map(j => joursMap[j]).filter(Boolean);
  const daysInMonth = new Date(annee, mois, 0).getDate();
  const dayCount = {};
  allCells
    .filter(c => c.floor === floor && c.mois === mois && c.annee === annee && c.jour)
    .forEach(c => { dayCount[c.jour] = (dayCount[c.jour] || 0) + 1; });
  let best2 = null, best3 = null;
  for (let d = 1; d <= daysInMonth; d++) {
    const wd = new Date(annee, mois - 1, d).getDay();
    if (allowedWeekdays.includes(wd)) {
      const cnt = dayCount[d] || 0;
      if (cnt < 2 && !best2) best2 = d;
      else if (cnt < 3 && !best3) best3 = d;
    }
  }
  return best2 ?? best3 ?? null;
}

export default function GeneratePlanningModal({ residents, referentiels, bilanConfigs, existingCells, annee, onGenerate, onClose }) {
  const [startMonth, setStartMonth] = useState(1);
  const [loading, setLoading] = useState(false);

  const refMap = {};
  referentiels.forEach(r => { refMap[r.code] = r; });

  const schedule = buildSchedule(startMonth);

  const handleGenerate = async () => {
    setLoading(true);
    const toCreate = [];
    const trackedCells = [...existingCells];

    for (const resident of residents) {
      for (const slot of schedule) {
        const ref = refMap[slot.type];
        if (!ref) continue;
        const jour = suggestDay(slot.mois, annee, resident.floor, resident.medecin, bilanConfigs, [...trackedCells, ...toCreate]);
        const cell = {
          resident_id: resident.id,
          resident_name: `${resident.last_name || ""}${resident.first_name ? " " + resident.first_name : ""}`.trim(),
          room: resident.room,
          floor: resident.floor,
          medecin: resident.medecin || "",
          annee,
          mois: slot.mois,
          bilan_ref_id: ref.id,
          bilan_ref_code: ref.code,
          extra_examens: [],
          bilan_label: ref.code,
          jour: jour || null,
        };
        toCreate.push(cell);
      }
    }
    onGenerate(toCreate);
    setLoading(false);
  };

  const missingRefs = ["B3", "B6", "BC"].filter(c => !refMap[c]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Générer le planning {annee}</h2>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {missingRefs.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              ⚠️ Référentiels manquants dans la base : <strong>{missingRefs.join(", ")}</strong>. Créez-les dans "Référentiels bilans" avant de générer.
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Protocole standard appliqué :</p>
            <p>• <strong>B3</strong> × 4 (trimestriel)</p>
            <p>• <strong>B6</strong> × 2 (semestriel)</p>
            <p>• <strong>BC</strong> × 1 (annuel)</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Mois de départ du cycle</label>
            <select
              value={startMonth}
              onChange={e => setStartMonth(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-slate-400"
            >
              {MOIS_LABELS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Répartition résultante :</p>
            <div className="flex flex-wrap gap-1.5">
              {schedule.map((slot, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                  slot.type === "B3" ? "bg-green-100 text-green-800" :
                  slot.type === "B6" ? "bg-blue-100 text-blue-800" :
                  "bg-purple-100 text-purple-800"
                }`}>
                  {MOIS_LABELS[slot.mois - 1]} → {slot.type}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Les jours sont assignés automatiquement selon les jours de prélèvement du médecin de chaque résident (max 2 bilans/jour/étage, 3 si nécessaire). Cette génération remplacera le planning existant pour {annee}.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || missingRefs.length > 0}
            className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Générer pour {residents.length} résidents
          </Button>
        </div>
      </div>
    </div>
  );
}
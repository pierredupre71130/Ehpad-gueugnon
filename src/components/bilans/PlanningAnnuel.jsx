import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, X, Check, Loader2, Calendar, Trash2, CalendarDays } from "lucide-react";
import GenerateDatesModal from "./GenerateDatesModal";
import { CATALOGUE } from "./BilanDatabase";

const ALL_EXAMENS_STATIC = CATALOGUE.flatMap(cat => cat.examens.map(e => ({ nom: e, tube: cat.tube, categorie: cat.categorie })));
import { Button } from "@/components/ui/button";

const MOIS_LABELS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MOIS_SHORT  = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const REF_COLORS = {
  B3: { bg: "bg-green-100", text: "text-green-900", border: "border-green-400" },
  B6: { bg: "bg-blue-100",  text: "text-blue-900",  border: "border-blue-400"  },
  BC: { bg: "bg-orange-100",text: "text-orange-900",border: "border-orange-400"},
};
function getColor(code) {
  return REF_COLORS[code] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" };
}

function truncateLabel(label) {
  // Extraire le suffixe de périodicité ex: " x2"
  const match = label.match(/( x\d+)$/);
  const suffix = match ? match[1] : "";
  const base = suffix ? label.slice(0, -suffix.length) : label;
  const truncated = base.split(" + ").map(part => part.length > 3 ? part.slice(0, 3).toUpperCase() : part).join("+");
  return truncated + suffix;
}

const EXTRA_SHORTCUTS = ["HBG","TSH","PSA","Glycémie","Digoxine","PTH","Ferritine","CRP","Vitamine D","Ionogramme","Créatinine"];

function CellEditor({ cell, resident, mois, annee, referentiels, specialBilans, customExamens, onSave, onDelete, onClose }) {
  const allExamens = useMemo(() => {
    const custom = customExamens.map(e => ({ nom: e.nom, tube: e.tube, categorie: e.categorie || "Personnalisé" }));
    const staticNames = new Set(ALL_EXAMENS_STATIC.map(e => e.nom));
    const onlyNew = custom.filter(e => !staticNames.has(e.nom));
    return [...ALL_EXAMENS_STATIC, ...onlyNew];
  }, [customExamens]);
  const [refId, setRefId]     = useState(cell?.bilan_ref_id || "");
  const [extras, setExtras]   = useState(cell?.extra_examens || []);
  const [extraInput, setExtraInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [periodicite, setPeriodicite] = useState(cell?.periodicite || 1);
  const initJours = () => {
    const p = cell?.periodicite || 1;
    const stored = cell?.jours && cell.jours.length > 0 ? cell.jours : (cell?.jour ? [cell.jour] : []);
    const arr = Array.from({ length: p }, (_, i) => stored[i] ? String(stored[i]) : "");
    return arr;
  };
  const [jours, setJours] = useState(initJours);

  const suggestions = extraInput.trim().length >= 1
    ? allExamens.filter(e =>
        e.nom.toLowerCase().includes(extraInput.toLowerCase()) &&
        !extras.includes(e.nom)
      ).slice(0, 8)
    : [];

  const toggleExtra = (val) =>
    setExtras(prev => prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val]);

  const addCustom = (val) => {
    const v = (val || extraInput).trim();
    if (v && !extras.includes(v)) setExtras(prev => [...prev, v]);
    setExtraInput("");
    setShowSuggestions(false);
  };

  const buildDates = (joursNum, annee, mois) => {
    return joursNum.map(j => {
      const mm = String(mois).padStart(2, '0');
      const dd = String(j).padStart(2, '0');
      return `${annee}-${mm}-${dd}`;
    });
  };

  const handleSave = () => {
    const ref = referentiels.find(r => r.id === refId);
    let label;
    if (ref && extras.length > 0) label = `${ref.code} + ${extras.join(" + ")}`;
    else if (ref) label = ref.code;
    else label = extras.join(" + ");
    if (periodicite > 1) label = `${label} x${periodicite}`;
    const joursNum = jours.map(j => j ? parseInt(j, 10) : null).filter(Boolean);
    const datesPrescription = buildDates(joursNum, annee, mois);
    onSave({
      resident_id:    resident.id,
      resident_name:  `${resident.last_name || ""}${resident.first_name ? " " + resident.first_name : ""}`.trim(),
      room:           resident.room,
      floor:          resident.floor,
      medecin:        resident.medecin || "",
      annee, mois,
      bilan_ref_id:   ref?.id || "",
      bilan_ref_code: ref?.code || "",
      extra_examens:  extras,
      bilan_label:    label,
      jour:           joursNum[0] || null,
      jours:          joursNum,
      periodicite:    periodicite > 1 ? periodicite : null,
      date_prescription:  datesPrescription[0] || null,
      dates_prescription: datesPrescription,
    }, cell?.id);
  };

  const selectedRef = referentiels.find(r => r.id === refId);
  const color = selectedRef ? getColor(selectedRef.code) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              {resident.last_name} {resident.first_name || ""} — {MOIS_LABELS[mois - 1]}
            </h3>
            {color && (
              <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded border ${color.bg} ${color.text} ${color.border}`}>
                {selectedRef.code}
              </span>
            )}
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">

          {/* Référentiel */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Référentiel</label>
            <div className="flex gap-2 flex-wrap">
              {referentiels.map(r => {
                const c = getColor(r.code);
                return (
                  <button
                    key={r.id}
                    onClick={() => setRefId(r.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      refId === r.id
                        ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-slate-400`
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {r.code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Examens supplémentaires</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {specialBilans.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleExtra(s.code)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    extras.includes(s.code)
                      ? "bg-purple-700 text-white border-purple-700"
                      : "bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400"
                  }`}
                  title={s.indication || s.nom}
                >
                  {s.code}
                </button>
              ))}
              {EXTRA_SHORTCUTS.filter(sh => !specialBilans.find(s => s.code === sh)).map(s => (
                <button
                  key={s}
                  onClick={() => toggleExtra(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    extras.includes(s)
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <div className="flex gap-1">
                <input
                  value={extraInput}
                  onChange={e => { setExtraInput(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={e => e.key === "Enter" && addCustom()}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Rechercher un examen…"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                />
                <button onClick={() => addCustom()} className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200">+</button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(s => (
                    <button
                      key={s.nom}
                      onMouseDown={() => addCustom(s.nom)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0"
                    >
                      <span className="flex-1 text-slate-700">{s.nom}</span>
                      <span className="text-slate-400 italic">{s.categorie}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {extras.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {extras.map(e => (
                  <span key={e} className="text-xs px-2 py-0.5 bg-slate-100 rounded flex items-center gap-1">
                    {e}
                    <button onClick={() => toggleExtra(e)} className="text-slate-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Périodicité */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Périodicité (par mois)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => { setPeriodicite(n); setJours(prev => Array.from({ length: n }, (_, i) => prev[i] || "")); }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    periodicite === n
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {n === 1 ? "1×" : `${n}×/mois`}
                </button>
              ))}
            </div>
          </div>

          {/* Jours */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">
              {periodicite > 1 ? `Jours dans le mois (${periodicite} passages)` : "Jour dans le mois (optionnel)"}
            </label>
            <div className="flex gap-2 flex-wrap">
              {jours.map((j, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  {periodicite > 1 && <span className="text-xs text-slate-400">{idx + 1}.</span>}
                  <input
                    type="number" min="1" max="31"
                    value={j}
                    onChange={e => setJours(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                    className="w-20 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                    placeholder="Jour"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100">
          {cell ? (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" onClick={handleSave} disabled={!refId && extras.length === 0}>
              <Check className="h-3.5 w-3.5 mr-1" /> Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanningAnnuel() {
  const queryClient = useQueryClient();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("RDC");
  const [editingCell, setEditingCell] = useState(null);
  const [generateMois, setGenerateMois] = useState(null); // mois number 1-12 // { cell|null, resident, mois }

  const { data: residents = [] } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: medecinConfigs = [] } = useQuery({
    queryKey: ["medecinBilanConfig"],
    queryFn: () => base44.entities.MedecinBilanConfig.list(),
  });

  const { data: medecinMainConfigs = [] } = useQuery({
    queryKey: ["medecinConfig"],
    queryFn: () => base44.entities.MedecinConfig.list(),
  });
  const medecinColorMap = useMemo(() => {
    const config = medecinMainConfigs[0];
    if (!config) return {};
    const map = {};
    [1,2,3,4,5].forEach(i => {
      const name = config[`dr${i}`];
      const color = config[`dr${i}_color`];
      if (name && color) map[name] = color;
    });
    return map;
  }, [medecinMainConfigs]);

  const { data: referentiels = [] } = useQuery({
    queryKey: ["bilanReferentiel"],
    queryFn: () => base44.entities.BilanReferentiel.list(),
  });

  const { data: customExamens = [] } = useQuery({
    queryKey: ["catalogueExamen"],
    queryFn: () => base44.entities.CatalogueExamen.list(),
  });

  const { data: specialBilans = [] } = useQuery({
    queryKey: ["bilanSpecial"],
    queryFn: () => base44.entities.BilanSpecial.list(),
  });

  const { data: cells = [], isLoading } = useQuery({
    queryKey: ["planningBilanCell", annee],
    queryFn: () => base44.entities.PlanningBilanCell.filter({ annee }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ data, existingId }) =>
      existingId
        ? base44.entities.PlanningBilanCell.update(existingId, data)
        : base44.entities.PlanningBilanCell.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningBilanCell", annee] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningBilanCell.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningBilanCell", annee] }),
  });

  const cellMap = useMemo(() => {
    const map = {};
    cells.forEach(c => {
      const key = `${c.resident_id}_${c.mois}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [cells]);

  const sortedResidents = useMemo(() =>
    [...residents].sort((a, b) => {
      if (a.floor !== b.floor) return a.floor < b.floor ? -1 : 1;
      return String(a.room).localeCompare(String(b.room), undefined, { numeric: true });
    }), [residents]);

  const filteredResidents = useMemo(() => {
    if (!search.trim()) return sortedResidents;
    const q = search.toLowerCase();
    return sortedResidents.filter(r =>
      `${r.last_name || ""} ${r.first_name || ""}`.toLowerCase().includes(q) ||
      String(r.room).includes(q)
    );
  }, [sortedResidents, search]);

  const floors = useMemo(() => {
    const s = new Set(sortedResidents.map(r => r.floor || "?"));
    return [...s].sort();
  }, [sortedResidents]);

  const byFloor = useMemo(() => {
    const g = {};
    filteredResidents
      .filter(r => (r.floor || "?") === selectedFloor)
      .forEach(r => { const f = r.floor || "?"; if (!g[f]) g[f] = []; g[f].push(r); });
    return g;
  }, [filteredResidents, selectedFloor]);

  const searchInfo = useMemo(() => {
    if (!search.trim()) return null;
    const results = [];
    filteredResidents.forEach(r => {
      for (let m = 1; m <= 12; m++) {
        const cell = cellMap[`${r.id}_${m}`];
        if (cell) results.push({ resident: r, mois: m, cell });
      }
    });
    return results;
  }, [filteredResidents, cellMap, search]);

  const handleSaveCell = (data, existingId) => {
    saveMutation.mutate({ data, existingId });
    setEditingCell(null);
  };

  const handleDeleteCell = () => {
    if (editingCell?.cell?.id) deleteMutation.mutate(editingCell.cell.id);
    setEditingCell(null);
  };

  const openNewCell = (resident, mois, e) => {
    e.stopPropagation();
    setEditingCell({ cell: null, resident, mois });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl mt-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Planning annuel des bilans</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAnnee(a => a - 1)} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="h-4 w-4 text-slate-500" /></button>
          <span className="text-sm font-bold text-slate-800 w-12 text-center">{annee}</span>
          <button onClick={() => setAnnee(a => a + 1)} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="flex gap-1">
          {["RDC","1ER"].map(f => (
            <button
              key={f}
              onClick={() => setSelectedFloor(f)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                selectedFloor === f
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              {f === "RDC" ? "Rez-de-chaussée" : "1er Étage"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un résident…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Search results */}
      {search.trim() && searchInfo && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
          {searchInfo.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Aucun bilan prévu.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {searchInfo.map(({ resident, mois, cell }) => {
                const c = getColor(cell.bilan_ref_code);
                return (
                  <span key={`${resident.id}_${mois}`} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${c.bg} ${c.text} ${c.border}`}>
                    <strong>{MOIS_SHORT[mois - 1]}</strong>{cell.jour ? ` – ${cell.jour}` : ""} : {cell.bilan_label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Légende */}
      <div className="px-5 py-2 border-b border-slate-100 flex flex-wrap gap-2 items-center">
        {Object.entries(REF_COLORS).map(([code, c]) => (
          <span key={code} className={`text-xs px-2.5 py-0.5 rounded border font-bold ${c.bg} ${c.text} ${c.border}`}>{code}</span>
        ))}
        <span className="text-xs text-slate-400 ml-1">— Cliquer sur une case pour ajouter/modifier un bilan</span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 860 }}>
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="sticky left-0 z-10 bg-slate-100 border border-slate-300 px-2 py-2 font-semibold text-slate-600 w-12 text-center">N°CH</th>
                <th className="sticky left-12 z-10 bg-slate-100 border border-slate-300 px-2 py-2 font-semibold text-slate-600 w-36 text-left">Nom Prénom</th>
                {MOIS_SHORT.map((m, i) => {
                  const moisNum = i + 1;
                  return (
                    <th key={i} className="border border-slate-300 px-1 py-2 font-semibold text-slate-600 text-center" style={{ minWidth: 55 }}>
                      <div className="flex flex-col items-center gap-1">
                        <span>{m}</span>
                        <button
                          onClick={() => setGenerateMois(moisNum)}
                          className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                          title={`Générer les dates — ${MOIS_LABELS[i]}`}
                        >
                          <CalendarDays className="h-3 w-3 text-slate-400 hover:text-slate-700" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(byFloor).map(([floor, floorResidents]) => (
                <React.Fragment key={floor}>
                  <tr>
                    <td colSpan={14} className="bg-slate-700 text-white font-bold px-3 py-1.5 text-xs uppercase tracking-widest border border-slate-600">
                      RÉSIDENTS {floor === "RDC" ? "REZ-DE-CHAUSSÉE" : floor === "1ER" ? "1ER ÉTAGE" : floor}
                    </td>
                  </tr>
                  {floorResidents.map((resident, rIdx) => {
                    const bgRow = rIdx % 2 === 0 ? "#fff" : "#f8fafc";
                    return (
                      <tr key={resident.id}>
                        <td className="sticky left-0 z-10 border border-slate-200 px-2 py-1 text-center font-bold text-slate-600" style={{ backgroundColor: bgRow }}>{resident.room}</td>
                        <td className="sticky left-12 z-10 border border-slate-200 px-2 py-1 font-semibold text-slate-800 whitespace-nowrap overflow-hidden max-w-[140px] text-ellipsis" style={{ backgroundColor: bgRow }}>
                          <div className="flex items-center gap-1">
                            {resident.medecin && medecinColorMap[resident.medecin] && (
                              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: medecinColorMap[resident.medecin] }} title={resident.medecin} />
                            )}
                            <span className="truncate">{resident.last_name} {resident.first_name ? resident.first_name.charAt(0) + "." : ""}</span>
                          </div>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(mois => {
                           const cellList = cellMap[`${resident.id}_${mois}`] || [];
                           return (
                             <td key={mois} className="border border-slate-200 p-0.5" style={{ backgroundColor: bgRow }}>
                               <div className="flex flex-col gap-0.5 min-h-[38px] relative group">
                                 {cellList.length === 0 ? (
                                   <button
                                     onClick={() => setEditingCell({ cell: null, resident, mois })}
                                     className="w-full flex-1 min-h-[38px] rounded border border-transparent hover:bg-slate-100 hover:border-slate-200 flex items-center justify-center"
                                   >
                                     <span className="text-slate-200 text-base leading-none">+</span>
                                   </button>
                                 ) : (
                                   <>
                                     {cellList.map(cell => {
                                       const c = getColor(cell.bilan_ref_code);
                                       const match = cell.bilan_label.match(/( x\d+)$/);
                                       const suffix = match ? match[1] : "";
                                       const base = suffix ? cell.bilan_label.slice(0, -suffix.length) : cell.bilan_label;
                                       const parts = base.split(" + ").map(p => p.length > 3 ? p.slice(0, 3).toUpperCase() : p);
                                       return (
                                         <button
                                           key={cell.id}
                                           onClick={() => setEditingCell({ cell, resident, mois })}
                                           className={`w-full rounded text-center px-0.5 py-0.5 border ${c.bg} ${c.text} ${c.border} hover:opacity-75 transition-all`}
                                         >
                                           <div className="flex flex-col items-center leading-tight gap-px">
                                             {parts.map((p, i) => (
                                               <span key={i} className="font-bold text-xs leading-none">
                                                 {p}{i === parts.length - 1 ? suffix : ""}
                                               </span>
                                             ))}
                                             {(() => {
                                               const days = cell.jours && cell.jours.length > 0 ? cell.jours : (cell.jour ? [cell.jour] : []);
                                               return days.length > 0 ? (
                                                 <span className="text-xs opacity-60">{days.join(", ")}</span>
                                               ) : null;
                                             })()}
                                           </div>
                                         </button>
                                       );
                                     })}
                                     <button
                                       onClick={(e) => { e.stopPropagation(); setEditingCell({ cell: null, resident, mois }); }}
                                       className="w-full text-center text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded text-xs py-0.5 leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                                       title="Ajouter un bilan"
                                     >+</button>
                                   </>
                                 )}
                               </div>
                             </td>
                           );
                        })}
                        </tr>
                        );
                        })}
                        </React.Fragment>
              ))}
            </tbody>
          </table>
          {filteredResidents.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-8">Aucun résident trouvé.</p>
          )}
        </div>
      )}

      {editingCell && (
        <CellEditor
          cell={editingCell.cell}
          resident={editingCell.resident}
          mois={editingCell.mois}
          annee={annee}
          referentiels={referentiels}
          specialBilans={specialBilans}
          customExamens={customExamens}
          onSave={handleSaveCell}
          onDelete={handleDeleteCell}
          onClose={() => setEditingCell(null)}
        />
      )}

      {generateMois && (
        <GenerateDatesModal
          mois={generateMois}
          annee={annee}
          cellsForMonth={cells.filter(c => c.mois === generateMois)}
          allCells={cells}
          residents={residents}
          medecinConfigs={medecinConfigs}
          referentiels={referentiels}
          onSave={async (results) => {
            await Promise.all(results.map(({ cellId, jours }) => {
              const mm = String(generateMois).padStart(2, '0');
              const datesPrescription = jours.filter(Boolean).map(j => `${annee}-${mm}-${String(j).padStart(2,'0')}`);
              return base44.entities.PlanningBilanCell.update(cellId, {
                jours,
                jour: jours[0] || null,
                date_prescription: datesPrescription[0] || null,
                dates_prescription: datesPrescription,
              });
            }));
            queryClient.invalidateQueries({ queryKey: ["planningBilanCell", annee] });
            setGenerateMois(null);
          }}
          onClear={async (results) => {
            await Promise.all(results.map(({ cellId }) =>
              base44.entities.PlanningBilanCell.update(cellId, {
                jours: [],
                jour: null,
              })
            ));
            queryClient.invalidateQueries({ queryKey: ["planningBilanCell", annee] });
            setGenerateMois(null);
          }}
          onClose={() => setGenerateMois(null)}
        />
      )}
    </div>
  );
}
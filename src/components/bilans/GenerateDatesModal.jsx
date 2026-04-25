import React, { useState, useMemo, useEffect } from "react";
import { X, Check, AlertTriangle, Info, Loader2, Lock, RotateCcw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { CATALOGUE } from "./BilanDatabase";

const TUBE_ROUGE_EXAMENS = new Set(
  CATALOGUE.filter(cat => cat.tube === "rouge").flatMap(cat => cat.examens.map(e => e.toLowerCase()))
);

const MOIS_LABELS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

const JOUR_TO_WEEKDAY = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5,
};

function getDaysOfMonthForWeekdays(annee, mois, weekdays) {
  const result = [];
  const daysInMonth = new Date(annee, mois, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const wd = new Date(annee, mois - 1, d).getDay();
    if (weekdays.includes(wd)) result.push(d);
  }
  return result;
}

function getHistoricalDay(residentId, mois, allCells) {
  const previous = allCells.filter(c => c.resident_id === residentId && c.mois < mois);
  if (previous.length === 0) return null;
  const days = previous.flatMap(c => c.jours && c.jours.length > 0 ? c.jours : (c.jour ? [c.jour] : []));
  if (days.length === 0) return null;
  const freq = {};
  days.forEach(d => { freq[d] = (freq[d] || 0) + 1; });
  return parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0], 10);
}

function assignDays(cell, resident, annee, mois, allCells, medecinConfigs, loadCounter) {
  const periodicite = cell.periodicite || 1;
  const medecin = resident?.medecin || "";
  const config = medecinConfigs.find(c => c.medecin_name === medecin);
  const hasConfig = !!(config && config.jours && config.jours.length > 0);

  if (!hasConfig) return { days: Array(periodicite).fill(""), noConfig: true };

  const weekdays = config.jours.map(j => JOUR_TO_WEEKDAY[j.toLowerCase()]).filter(Boolean);
  const allowedDays = getDaysOfMonthForWeekdays(annee, mois, weekdays);

  if (allowedDays.length === 0) return { days: Array(periodicite).fill(""), noConfig: true };

  const historicalDay = getHistoricalDay(cell.resident_id, mois, allCells);
  const result = [];

  for (let i = 0; i < periodicite; i++) {
    let candidates = allowedDays;
    if (periodicite > 1) {
      const daysInMonth = new Date(annee, mois, 0).getDate();
      const sliceSize = Math.floor(daysInMonth / periodicite);
      const sliceStart = sliceSize * i + 1;
      const sliceEnd = i === periodicite - 1 ? daysInMonth : sliceSize * (i + 1);
      candidates = allowedDays.filter(d => d >= sliceStart && d <= sliceEnd);
      if (candidates.length === 0) candidates = allowedDays;
    }

    const referenceDay = historicalDay && periodicite === 1 ? historicalDay : null;
    const sortedCandidates = [...candidates].sort((a, b) => {
      const loadA = loadCounter[a] || 0;
      const loadB = loadCounter[b] || 0;
      if (loadA !== loadB) return loadA - loadB;
      if (referenceDay) return Math.abs(a - referenceDay) - Math.abs(b - referenceDay);
      return 0;
    });

    const chosen = sortedCandidates[0] || candidates[0];
    result.push(chosen);
    loadCounter[chosen] = (loadCounter[chosen] || 0) + 1;
  }

  return { days: result, noConfig: false };
}

const CREATININE_KEYWORDS = ["créatinine", "creatinine"];

const AJEUN_KEYWORDS = ["glycémie", "glycemie", "phénobarbitalémie", "phenobarbititemie", "phénobarbital", "phenobarbital", "eal"];

function getExamensForCell(cell, referentiels) {
  const examens = [];
  if (cell.bilan_ref_id || cell.bilan_ref_code) {
    const ref = referentiels?.find(r => r.id === cell.bilan_ref_id || r.code === cell.bilan_ref_code);
    if (ref?.examens) examens.push(...ref.examens);
  }
  if (cell.extra_examens) examens.push(...cell.extra_examens);
  return examens;
}

function isAJeunRequired(cell, referentiels) {
  const examens = getExamensForCell(cell, referentiels);
  return examens.some(e => {
    const normalized = e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywordMatch = AJEUN_KEYWORDS.some(kw => normalized.includes(kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    const tubeRouge = TUBE_ROUGE_EXAMENS.has(e.toLowerCase());
    return keywordMatch || tubeRouge;
  });
}

function isCreatininePresent(cell, referentiels) {
  const examens = getExamensForCell(cell, referentiels);
  return examens.some(e =>
    CREATININE_KEYWORDS.some(kw => e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(kw))
  );
}

function getLatestWeight(residentId, residentName, weightRecords) {
  const records = weightRecords.filter(w =>
    w.resident_id === residentId || (residentName && w.resident_name === residentName)
  );
  if (records.length === 0) return null;
  records.sort((a, b) => new Date(b.weighing_date || b.created_date) - new Date(a.weighing_date || a.created_date));
  return records[0].weight;
}

// Vérifie si une cellule a déjà des dates renseignées
function cellHasDates(cell) {
  if (cell.jours && cell.jours.length > 0 && cell.jours.some(j => j > 0)) return true;
  if (cell.jour && cell.jour > 0) return true;
  return false;
}

export default function GenerateDatesModal({ mois, annee, cellsForMonth, allCells, residents, medecinConfigs, referentiels, onSave, onClear, onClose }) {
  const [view, setView] = useState("recap"); // "recap" | "generate"

  // Exclure les cellules sans résident identifié (chambre non occupée)
  const activeCells = cellsForMonth.filter(cell => {
    const resident = residents.find(r => r.id === cell.resident_id);
    return resident && (resident.last_name || resident.first_name);
  });

  const initialAssignments = useMemo(() => {
    const loadCounter = {};
    cellsForMonth.forEach(cell => {
      if (cellHasDates(cell)) {
        const days = cell.jours && cell.jours.length > 0 ? cell.jours : (cell.jour ? [cell.jour] : []);
        days.forEach(d => { if (d > 0) loadCounter[d] = (loadCounter[d] || 0) + 1; });
      }
    });
    return activeCells.map(cell => {
      const resident = residents.find(r => r.id === cell.resident_id);
      const preFilled = cellHasDates(cell);
      if (preFilled) {
        const existingDays = cell.jours && cell.jours.length > 0 ? cell.jours.filter(j => j > 0) : (cell.jour ? [cell.jour] : []);
        return { cellId: cell.id, cell, resident, days: existingDays.map(String), noConfig: false, locked: true };
      }
      const { days, noConfig } = assignDays(cell, resident, annee, mois, allCells, medecinConfigs, loadCounter);
      return { cellId: cell.id, cell, resident, days: days.map(d => d !== "" ? String(d) : ""), noConfig, locked: false };
    });
  }, [cellsForMonth, residents, allCells, medecinConfigs, annee, mois]);

  const [assignments, setAssignments] = useState(initialAssignments);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const updateDay = (cellId, dayIdx, value) => {
    setAssignments(prev => prev.map(a =>
      a.cellId === cellId && !a.locked
        ? { ...a, days: a.days.map((d, i) => i === dayIdx ? value : d) }
        : a
    ));
  };

  const loadPerDay = useMemo(() => {
    const counter = {};
    assignments.forEach(a => {
      a.days.forEach(d => {
        const n = parseInt(d, 10);
        if (!isNaN(n) && n > 0) counter[n] = (counter[n] || 0) + 1;
      });
    });
    return counter;
  }, [assignments]);

  const overloadedDays = Object.entries(loadPerDay).filter(([, v]) => v >= 3).map(([k]) => parseInt(k, 10));
  const noConfigCount = assignments.filter(a => !a.locked && a.noConfig).length;
  const generatedCount = assignments.filter(a => !a.locked).length;
  const lockedCount = assignments.filter(a => a.locked).length;

  const handleSave = async () => {
    setSaving(true);
    // Sauvegarder seulement les cellules NON verrouillées
    const result = assignments
      .filter(a => !a.locked)
      .map(a => ({
        cellId: a.cellId,
        jours: a.days.map(d => parseInt(d, 10)).filter(n => !isNaN(n) && n > 0),
      }));
    await onSave(result);
    setSaving(false);
  };

  const handleClear = async () => {
    setClearing(true);
    // Vider seulement les cellules non verrouillées (annuler les dates générées)
    const result = assignments
      .filter(a => !a.locked)
      .map(a => ({ cellId: a.cellId, jours: [] }));
    await onClear(result);
    setClearing(false);
  };

  const handleClearAll = async () => {
    if (!confirm("Effacer TOUTES les dates de ce mois (y compris les dates saisies manuellement) ?")) return;
    setClearing(true);
    const result = assignments.map(a => ({ cellId: a.cellId, jours: [] }));
    await onClear(result);
    setClearing(false);
  };

  const totalWithDates = assignments.filter(a => a.days.some(d => d && parseInt(d) > 0)).length;

  const [printingId, setPrintingId] = useState(null);
  const [weightRecords, setWeightRecords] = useState([]);

  useEffect(() => {
    base44.entities.WeightMonitoring.list().then(setWeightRecords).catch(() => {});
  }, []);

  const [croixSeulement, setCroixSeulement] = useState(false);
  const [aJeunMap, setAJeunMap] = useState(() => {
    const initial = {};
    cellsForMonth.forEach(cell => {
      if (isAJeunRequired(cell, referentiels)) initial[cell.id] = true;
    });
    return initial;
  });

  const toggleAJeun = (cellId) => setAJeunMap(prev => ({ ...prev, [cellId]: !prev[cellId] }));

  const handlePrintBilan = async (cell, resident, aJeunOverride) => {
    setPrintingId(cell.id);
    const examens = [];
    if (cell.bilan_ref_id || cell.bilan_ref_code) {
      const ref = referentiels?.find(r => r.id === cell.bilan_ref_id || r.code === cell.bilan_ref_code);
      if (ref && ref.examens) examens.push(...ref.examens);
    }
    if (cell.extra_examens) examens.push(...cell.extra_examens);

    const days = cell.jours && cell.jours.length > 0 ? cell.jours : (cell.jour ? [cell.jour] : []);
    const day = days[0] ? String(days[0]).padStart(2,'0') : "__";
    const monthStr = String(mois).padStart(2,'0');
    const datePrescription = `${day}/${monthStr}/${annee}`;

    const res = await base44.functions.invoke('generateBilanPDF', {
      patientName: resident.last_name || "",
      prenom: resident.first_name || "",
      dateNaissance: resident.date_naissance || "",
      prescripteur: resident.medecin || "",
      datePrescription,
      examens,
      nbEchantillons: 1,
      croix_seulement: croixSeulement,
      datePrescriptionOrdonnance: datePrescription,
      aJeun: aJeunOverride !== undefined ? aJeunOverride : (aJeunMap[cell.id] || isAJeunRequired(cell, referentiels)),
      poids: isCreatininePresent(cell, referentiels) ? getLatestWeight(resident.id, `${resident.last_name} ${resident.first_name || ''}`.trim(), weightRecords) : undefined,
    });

    const base64 = res.data?.pdf_base64;
    if (base64) {
      const byteChars = atob(base64);
      const byteNums = new Uint8Array(byteChars.length).map((_, i) => byteChars.charCodeAt(i));
      const blob = new Blob([byteNums], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
    setPrintingId(null);
  };

  const handlePrintAll = async () => {
    for (const { cell, resident } of recapCells) {
      await handlePrintBilan(cell, resident, aJeunMap[cell.id] || false);
    }
  };

  // ---- RECAP data ----
  const recapCells = cellsForMonth.map(cell => {
    const resident = residents.find(r => r.id === cell.resident_id);
    const days = cell.jours && cell.jours.length > 0 ? cell.jours.filter(j => j > 0) : (cell.jour ? [cell.jour] : []);
    return { cell, resident, days };
  }).filter(r => r.resident && (r.resident.last_name || r.resident.first_name))
    .sort((a, b) => String(a.resident.room).localeCompare(String(b.resident.room), undefined, { numeric: true }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{MOIS_LABELS[mois - 1]} {annee}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{recapCells.length} bilan(s) planifié(s)</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setView("recap")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              view === "recap" ? "border-b-2 border-slate-800 text-slate-800" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Récapitulatif
          </button>
          <button
            onClick={() => setView("generate")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              view === "generate" ? "border-b-2 border-slate-800 text-slate-800" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Générer les dates
          </button>
        </div>

        {view === "recap" ? (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1.5">
              {recapCells.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-8">Aucun bilan planifié ce mois.</p>
              ) : recapCells.map(({ cell, resident, days }) => (
                <div key={cell.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-500 w-8 shrink-0">Ch.{resident.room}</span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{resident.last_name} {resident.first_name || ""}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">{cell.bilan_label}</span>
                    {days.length > 0 ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-medium">{days.join(", ")}</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">pas de date</span>
                    )}
                    <button
                      onClick={() => toggleAJeun(cell.id)}
                      title="À jeun"
                      className={`px-1.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                        aJeunMap[cell.id]
                          ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      À jeun
                    </button>
                    <button
                      onClick={() => handlePrintBilan(cell, resident)}
                      disabled={printingId === cell.id}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      title="Imprimer la feuille de bilan"
                    >
                      {printingId === cell.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintAll}
                  disabled={printingId !== null || recapCells.length === 0}
                  className="gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Tout imprimer ({recapCells.length})
                </Button>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={croixSeulement}
                    onChange={e => setCroixSeulement(e.target.checked)}
                    className="accent-slate-700"
                  />
                  Croix seulement (sans fond)
                </label>
              </div>
              <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
            </div>
          </>
        ) : (
          <>
            {/* Warnings */}
            {noConfigCount > 0 && (
              <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">{noConfigCount} résident(s) sans config médecin — saisie manuelle requise.</p>
              </div>
            )}
            {lockedCount > 0 && (
              <div className="mx-5 mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                <Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500">{lockedCount} bilan(s) avec dates déjà saisies — non modifiés par la génération.</p>
              </div>
            )}
            {overloadedDays.length > 0 && (
              <div className="mx-5 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">≥ 3 bilans le : {overloadedDays.map(d => `le ${d}`).join(", ")}. Pensez à redistribuer.</p>
              </div>
            )}

            {/* Liste */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {assignments.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-6">Aucun bilan planifié ce mois.</p>
              )}
              {assignments.map(a => {
                const periodicite = a.cell.periodicite || 1;
                return (
                  <div key={a.cellId} className={`border rounded-xl p-3 ${
                    a.locked ? "border-slate-200 bg-slate-50 opacity-70"
                      : a.noConfig ? "border-amber-200 bg-amber-50/40"
                      : "border-slate-100 bg-white"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {a.locked && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                          <span className="font-semibold text-sm text-slate-800 truncate">
                            {a.resident ? `${a.resident.last_name} ${a.resident.first_name || ""}`.trim() : a.cell.resident_name}
                          </span>
                          {a.resident?.room && <span className="text-xs text-slate-400">ch. {a.resident.room}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{a.cell.bilan_label}</span>
                          {periodicite > 1 && <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">{periodicite}×/mois</span>}
                          {!a.locked && a.noConfig && <span className="text-xs text-amber-600 font-medium">⚠ Pas de config médecin</span>}
                          {a.locked && <span className="text-xs text-slate-400 italic">déjà renseigné</span>}
                        </div>
                        {a.resident?.medecin && <span className="text-xs text-slate-400">Dr {a.resident.medecin}</span>}
                      </div>
                      <div className="flex gap-2 items-center shrink-0">
                        {a.days.map((d, idx) => {
                          const dayNum = parseInt(d, 10);
                          const isOverloaded = !isNaN(dayNum) && dayNum > 0 && (loadPerDay[dayNum] || 0) >= 3;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-0.5">
                              {periodicite > 1 && <span className="text-xs text-slate-400">{idx + 1}</span>}
                              <input
                                type="number" min="1" max="31"
                                value={d}
                                onChange={e => updateDay(a.cellId, idx, e.target.value)}
                                disabled={a.locked}
                                placeholder="Jour"
                                className={`w-16 text-sm text-center border rounded-lg px-2 py-1 outline-none focus:border-slate-400 ${
                                  a.locked ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : isOverloaded ? "border-red-300 bg-red-50"
                                    : "border-slate-200 bg-white"
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100 gap-2 flex-wrap">
              <p className="text-xs text-slate-400">
                {Object.entries(loadPerDay).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([d,v])=>`${d}→${v}`).join("  ") || "Aucune date"}
              </p>
              <div className="flex gap-2 flex-wrap">
                {generatedCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClear} disabled={clearing}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    title="Vider uniquement les dates générées">
                    {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                    Annuler dates générées
                  </Button>
                )}
                {totalWithDates > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearAll} disabled={clearing}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    title="Effacer toutes les dates du mois">
                    {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                    Effacer toutes les dates
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
                {generatedCount > 0 && (
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Enregistrer
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
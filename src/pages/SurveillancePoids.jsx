import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ComposedChart, LineChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  AlertCircle, TrendingDown, TrendingUp, Plus, Pencil, Trash2, Check, X,
  Users, Settings, LayoutList, TableProperties, ClipboardList, Clock, CheckCircle2, Pill, Printer,
  ImagePlus, AlertTriangle, FileUp
} from "lucide-react";
import TrendArrow from '../components/TrendArrow';

function SupplementDatePicker({ value, onSave }) {
  const parts = value ? value.split('-') : ['', '', ''];
  const [yr, setYr] = useState(parts[0] || '');
  const [mo, setMo] = useState(parts[1] || '');
  const [dy, setDy] = useState(parts[2] || '');
  const moRef = useRef(null);
  const yrRef = useRef(null);

  const saveIfValid = (newYr, newMo, newDy) => {
    if (newYr.length === 4 && newMo.length === 2 && newDy.length === 2) {
      const iso = `${newYr}-${newMo}-${newDy}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1900) onSave(iso);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <input type="text" maxLength={2} placeholder="JJ" value={dy}
        onChange={e => {
          const v = e.target.value;
          setDy(v);
          if (v.length === 2) moRef.current?.focus();
        }}
        onBlur={e => saveIfValid(yr, mo, e.target.value)}
        className="border border-emerald-200 rounded px-1 py-0.5 text-xs outline-none focus:border-emerald-400 bg-emerald-50 text-emerald-700 w-8 text-center" />
      <span className="text-emerald-400 text-xs">/</span>
      <input ref={moRef} type="text" maxLength={2} placeholder="MM" value={mo}
        onChange={e => {
          const v = e.target.value;
          setMo(v);
          if (v.length === 2) yrRef.current?.focus();
        }}
        onBlur={e => saveIfValid(yr, e.target.value, dy)}
        className="border border-emerald-200 rounded px-1 py-0.5 text-xs outline-none focus:border-emerald-400 bg-emerald-50 text-emerald-700 w-8 text-center" />
      <span className="text-emerald-400 text-xs">/</span>
      <input ref={yrRef} type="text" maxLength={4} placeholder="AAAA" value={yr}
        onChange={e => setYr(e.target.value)}
        onBlur={e => saveIfValid(e.target.value, mo, dy)}
        className="border border-emerald-200 rounded px-1 py-0.5 text-xs outline-none focus:border-emerald-400 bg-emerald-50 text-emerald-700 w-12 text-center" />
    </div>
  );
}
import TrendSettingsModal, { DEFAULT_ALERT_SETTINGS } from '../components/TrendSettingsModal';
import ImportWeightFromImage from '../components/surveillance/ImportWeightFromImage';
import NutritionalStatusModal from '@/components/NutritionalStatusModal';
import PrintNutritionSummary from '@/components/PrintNutritionSummary';
import ImportSupplementsFromPDF from '@/components/surveillance/ImportSupplementsFromPDF';
import SupplementForm from '@/components/surveillance/SupplementForm';


// ─── Tableau annuel ──────────────────────────────────────────────────────────
function AnnualWeightTable({ residents, weights, selectedFloor, alertsByResident, onSelectResident }) {
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        month: d.getMonth() + 1, year: d.getFullYear(),
        label: d.toLocaleString('fr-FR', { month: 'short' }), isCurrent: i === 0,
      });
    }
    return result;
  }, []);

  const filteredResidents = useMemo(() =>
    [...residents].filter(r => r.floor === selectedFloor)
      .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "", "fr")),
    [residents, selectedFloor]
  );

  const weightMap = useMemo(() => {
    const map = {};
    weights.forEach(w => {
      const m = w.month || new Date(w.weighing_date).getMonth() + 1;
      const y = w.year  || new Date(w.weighing_date).getFullYear();
      const key = `${y}-${m}`;
      if (!map[w.resident_id]) map[w.resident_id] = {};
      if (!map[w.resident_id][key] || new Date(w.weighing_date) > new Date(map[w.resident_id][key].weighing_date))
        map[w.resident_id][key] = w;
    });
    return map;
  }, [weights]);

  const getEntry     = (rid, month, year) => weightMap[rid]?.[`${year}-${month}`] || null;
  const getPrevEntry = (rid, mi)          => mi === 0 ? null : getEntry(rid, months[mi-1].month, months[mi-1].year);
  const getPct       = (cur, prev)        => (!cur || !prev) ? null : ((cur.weight - prev.weight) / prev.weight) * 100;

  const cellBg = (pct, isCurrent) => {
    const ring = isCurrent ? "ring-2 ring-inset ring-blue-400" : "";
    if (pct === null) return `${ring} bg-slate-50`;
    if (pct <= -5)   return `${ring} bg-red-100`;
    if (pct <= -2)   return `${ring} bg-orange-50`;
    if (pct >= 5)    return `${ring} bg-purple-100`;
    return `${ring} bg-emerald-50`;
  };
  const cellText = (pct) => {
    if (pct === null) return "text-slate-700";
    if (pct <= -5)   return "text-red-700";
    if (pct <= -2)   return "text-orange-600";
    if (pct >= 5)    return "text-purple-700";
    return "text-emerald-700";
  };

  const now = new Date();
  const peseesCeMois = filteredResidents.filter(r => weightMap[r.id]?.[`${now.getFullYear()}-${now.getMonth() + 1}`]).length;

  return (
    <>
    <style>{`
      @media print {
        @page { size: A4 landscape; margin: 0.7cm; }
        body * { visibility: hidden !important; }
        #annual-weight-print, #annual-weight-print * { visibility: visible !important; }
        #annual-weight-print {
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          overflow: visible !important;
        }
        #annual-weight-print .overflow-x-auto { overflow: visible !important; }
        #annual-weight-print table {
          width: 100% !important;
          font-size: 7.5px !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
        }
        #annual-weight-print th, #annual-weight-print td {
          padding: 2px 3px !important;
          border: 1px solid #cbd5e1 !important;
          position: static !important;
        }
        #annual-print-btn { display: none !important; }
      }
    `}</style>
    <div id="annual-weight-print" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-bold text-base">Tableau annuel — {selectedFloor}</h2>
          <p className="text-slate-400 text-xs mt-0.5">12 derniers mois · cliquer sur un résident pour voir son détail</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm bg-red-200 border border-red-400 inline-block" />Perte &gt;5%</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-300 inline-block" />Perte 2–5%</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-300 inline-block" />Prise &gt;5%</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" />Stable</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-1 text-left min-w-[160px]" />
              <th className="px-2 py-1 text-center text-slate-400 font-normal">Ch.</th>
              {months.map((m, i) => (
                <th key={`yr-${i}`} className="px-1 py-1 text-center font-semibold text-slate-400 min-w-[64px]">
                  {(i === 0 || months[i].year !== months[i-1].year) ? m.year : ''}
                </th>
              ))}
            </tr>
            <tr className="border-b-2 border-slate-300">
              <th className="sticky left-0 z-20 bg-white px-4 py-2 text-left text-slate-600 font-semibold uppercase tracking-wide text-[10px] min-w-[160px]">Résident</th>
              <th className="px-2 py-2 text-center text-slate-500 font-semibold uppercase tracking-wide text-[10px]">Ch.</th>
              {months.map((m, i) => (
                <th key={`m-${i}`} className={`px-1 py-2 text-center font-bold capitalize min-w-[64px] ${m.isCurrent ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResidents.length === 0 && (
              <tr><td colSpan={months.length + 2} className="text-center py-10 text-slate-400 italic">Aucun résident sur cet étage.</td></tr>
            )}
            {filteredResidents.map((resident, idx) => {
              const hasAlerts = alertsByResident[resident.id];
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/60";
              return (
                <tr key={resident.id} onClick={() => onSelectResident?.(resident)}
                  className={`border-b border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors group ${rowBg}`}>
                  <td className={`sticky left-0 z-10 px-4 py-2 font-medium ${rowBg} group-hover:bg-blue-50`}>
                    <div className="flex items-center gap-2">
                      {hasAlerts?.hasMalnutritionAlert ? <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        : hasAlerts?.hasGainAlert ? <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        : <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />}
                      <span className={hasAlerts?.hasMalnutritionAlert ? "text-red-700 font-semibold" : "text-slate-800"}>
                        {resident.last_name}{resident.first_name ? ` ${resident.first_name[0]}.` : ''}
                      </span>
                      {resident.complement_alimentaire && (
                        <Pill className="h-3 w-3 text-emerald-500 shrink-0" title="Compléments alimentaires prescrits" />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-slate-400 font-medium">{resident.room}</td>
                  {months.map((m, mi) => {
                    const entry = getEntry(resident.id, m.month, m.year);
                    const prev  = getPrevEntry(resident.id, mi);
                    const pct   = entry ? getPct(entry, prev) : null;
                    return (
                      <td key={`${m.year}-${m.month}`} className={`px-1 py-1.5 text-center ${cellBg(pct, m.isCurrent)}`}>
                        {entry ? (
                          <div className="flex flex-col items-center leading-tight">
                            <span className={`font-bold text-[12px] ${cellText(pct)}`}>{entry.weight.toFixed(1)}</span>
                            {pct !== null && (
                              <span className={`text-[9px] font-medium ${pct <= -5 ? 'text-red-600' : pct <= -2 ? 'text-orange-500' : pct >= 5 ? 'text-purple-600' : 'text-slate-400'}`}>
                                {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ) : <span className="text-slate-300">·</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Les % indiqués sont la variation par rapport au mois précédent pesé.</span>
        <span className="font-medium">{peseesCeMois} / {filteredResidents.length} résidents pesés ce mois</span>
      </div>
    </div>
    </>
  );
}
// ─── Helpers : suppléments encodés dans annotations ──────────────────────────
const SUPPL_MARKER = '\n---SUPPL:';

function parseSupplFromAnnotations(annotations) {
  if (!annotations) return [];
  const idx = annotations.indexOf(SUPPL_MARKER);
  if (idx === -1) return [];
  try {
    const json = annotations.slice(idx + SUPPL_MARKER.length);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function buildAnnotationsWithSuppl(annotations, supps) {
  // Retirer tout marqueur existant
  const base = (annotations || '').split(SUPPL_MARKER)[0].trim();
  if (!supps || supps.length === 0) return base;
  return (base ? base + '\n' : '') + SUPPL_MARKER + JSON.stringify(supps);
}
// ────────────────────────────────────────────────────────────────────────────

export default function SurveillancePoids() {
  const [residents, setResidents] = useState([]);
  const [allResidents, setAllResidents] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("RDC");
  const [selectedResident, setSelectedResident] = useState(null);
  const [weights, setWeights] = useState([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWeight, setNewWeight] = useState({ weight: "", weighing_date: new Date().toISOString().split('T')[0], notes: "" });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [showTrendSettings, setShowTrendSettings] = useState(false);
  const [trendSettings, setTrendSettings] = useState({ downThreshold: -2, upThreshold: 2, ...DEFAULT_ALERT_SETTINGS });
  const [settingsId, setSettingsId] = useState(null);
  const [showNutritionalModal, setShowNutritionalModal] = useState(false);
  const [selectedResidentForNutrition, setSelectedResidentForNutrition] = useState(null);
  const [viewMode, setViewMode] = useState("resident");
  const [batchData, setBatchData] = useState({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchSaved, setBatchSaved] = useState(new Set());
  const [showAlertModal, setShowAlertModal] = useState(null); // 'loss' | 'gain'
  const [nutritionRefreshKey, setNutritionRefreshKey] = useState(0);
  const [supplementRefreshKey, setSupplementRefreshKey] = useState(0);
  const [residentSort, setResidentSort] = useState("default"); // default | alpha | room | trend
  const [batchSort, setBatchSort] = useState("alpha"); // alpha | room | missing_first
  // ── Import image OCR ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportSupplements, setShowImportSupplements] = useState(false);
  const [weightListCollapsed, setWeightListCollapsed] = useState(true);
  const [residentSupplements, setResidentSupplements] = useState([]);
  const [allSupplements, setAllSupplements] = useState([]);
  const [showSupplementForm, setShowSupplementForm] = useState(false);
  const [showDeleteAllWeightsModal, setShowDeleteAllWeightsModal] = useState(false);
  const [weightsToDelete, setWeightsToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [maxWeightsDisplay, setMaxWeightsDisplay] = useState(50);
  const [editingResidentSupp, setEditingResidentSupp] = useState(null);
  const importFileRef                               = useRef(null);

  // Chargement des paramètres depuis la base
  useEffect(() => {
    base44.entities.SurveillanceSettings.list().then(list => {
      if (list.length > 0) {
        const s = list[0];
        setSettingsId(s.id);
        if (s.max_weights_display) setMaxWeightsDisplay(s.max_weights_display);
        setTrendSettings({
          downThreshold: s.trend_down_threshold ?? -2,
          upThreshold: s.trend_up_threshold ?? 2,
          loss_1m_pct: s.loss_1m_pct ?? DEFAULT_ALERT_SETTINGS.loss_1m_pct,
          loss_1m_days: s.loss_1m_days ?? DEFAULT_ALERT_SETTINGS.loss_1m_days,
          loss_6m_pct: s.loss_6m_pct ?? DEFAULT_ALERT_SETTINGS.loss_6m_pct,
          loss_6m_days: s.loss_6m_days ?? DEFAULT_ALERT_SETTINGS.loss_6m_days,
          gain_short_pct: s.gain_short_pct ?? DEFAULT_ALERT_SETTINGS.gain_short_pct,
          gain_short_days: s.gain_short_days ?? DEFAULT_ALERT_SETTINGS.gain_short_days,
          gain_long_pct: s.gain_long_pct ?? DEFAULT_ALERT_SETTINGS.gain_long_pct,
          gain_long_days: s.gain_long_days ?? DEFAULT_ALERT_SETTINGS.gain_long_days,
        });
      }
    });
  }, []);

  const saveSettings = async (newMax, newTrend) => {
    const data = {
      max_weights_display: newMax,
      trend_down_threshold: newTrend.downThreshold,
      trend_up_threshold: newTrend.upThreshold,
      loss_1m_pct: newTrend.loss_1m_pct,
      loss_1m_days: newTrend.loss_1m_days,
      loss_6m_pct: newTrend.loss_6m_pct,
      loss_6m_days: newTrend.loss_6m_days,
      gain_short_pct: newTrend.gain_short_pct,
      gain_short_days: newTrend.gain_short_days,
      gain_long_pct: newTrend.gain_long_pct,
      gain_long_days: newTrend.gain_long_days,
    };
    if (settingsId) {
      await base44.entities.SurveillanceSettings.update(settingsId, data);
    } else {
      const created = await base44.entities.SurveillanceSettings.create(data);
      setSettingsId(created.id);
    }
  };

  useEffect(() => {
    base44.entities.Resident.filter({ floor: selectedFloor }).then(setResidents);
  }, [selectedFloor]);

  useEffect(() => {
    base44.entities.Resident.list().then(all => {
      if (all.length > 0) {
        setAllResidents(all);
        setResidents(all);
      }
    });
  }, []);

  useEffect(() => {
    base44.entities.WeightMonitoring.list().then(setWeights);
  }, []);

  // Suppléments lus depuis le champ annotations (marqueur ---SUPPL:)
  useEffect(() => {
    const allSupps = [];
    for (const r of residents) {
      const supps = parseSupplFromAnnotations(r.annotations);
      for (const s of supps) allSupps.push({ resident_id: r.id, ...s });
    }
    setAllSupplements(allSupps);
  }, [residents]);

  // Suppléments du résident sélectionné
  useEffect(() => {
    if (!selectedResident) { setResidentSupplements([]); return; }
    setResidentSupplements(parseSupplFromAnnotations(selectedResident.annotations));
  }, [selectedResident?.id, selectedResident?.annotations, supplementRefreshKey]);



  useEffect(() => {
    if (allResidents.length === 0 || weights.length === 0) return;
    calculateAlerts(weights, allResidents, trendSettings);
  }, [weights, allResidents, trendSettings]);

useEffect(() => {
  if (!selectedResident) return;
  const sorted = weights
    .filter(w => w.resident_id === selectedResident.id)
    .sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));

  const currentSupps = parseSupplFromAnnotations(selectedResident.annotations);
  const suppDates = currentSupps.length > 0
    ? currentSupps.map(s => s.date_debut).filter(Boolean)
    : (selectedResident.complement_alimentaire && selectedResident.complement_alimentaire_date
        ? [selectedResident.complement_alimentaire_date]
        : []);

  const data = sorted.map(w => ({
    date: new Date(w.weighing_date).toLocaleDateString('fr-FR'),
    poids: w.weight,
    notes: w.notes,
    complement: undefined,
  }));

  for (const dateStr of suppDates) {
    const suppLabel = new Date(dateStr).toLocaleDateString('fr-FR');
    const suppDateObj = new Date(dateStr);
    if (!data.some(d => d.date === suppLabel)) {
      const insertIdx = data.findIndex(d => {
        const [day, month, year] = d.date.split('/');
        return new Date(`${year}-${month}-${day}`) > suppDateObj;
      });
      const phantom = { date: suppLabel, poids: null };
      if (insertIdx === -1) data.push(phantom);
      else data.splice(insertIdx, 0, phantom);
    }
    // Marquer le point s'il existe
    const point = data.find(d => d.date === new Date(dateStr).toLocaleDateString('fr-FR'));
    if (point) point.complement = 1;
  }

  // Injecter un point fantôme à la date d'entrée si elle n'est pas déjà dans les données
  if (selectedResident.date_entree) {
    const entreeLabel = new Date(selectedResident.date_entree).toLocaleDateString('fr-FR');
    const entreeDateObj = new Date(selectedResident.date_entree);
    const alreadyExists = data.some(d => d.date === entreeLabel);
    if (!alreadyExists) {
      const insertIdx = data.findIndex(d => {
        const [day, month, year] = d.date.split('/');
        return new Date(`${year}-${month}-${day}`) > entreeDateObj;
      });
      const phantom = { date: entreeLabel, poids: null };
      if (insertIdx === -1) data.push(phantom);
      else data.splice(insertIdx, 0, phantom);
    }
  }

  // Limiter les données affichées selon maxWeightsDisplay
  const displayData = maxWeightsDisplay > 0 && data.length > maxWeightsDisplay
    ? data.slice(-maxWeightsDisplay)
    : data;
  setChartData(displayData);
}, [selectedResident, weights, supplementRefreshKey, maxWeightsDisplay]);


  useEffect(() => {
    if (viewMode !== 'batch') return;
    setBatchSaved(new Set());
    const today = new Date().toISOString().split('T')[0];
    const initial = {};
    residents.filter(r => r.floor === selectedFloor).forEach(r => {
      initial[r.id] = [{ weight: '', date: today, notes: '' }];
    });
    setBatchData(initial);
  }, [viewMode, selectedFloor, residents]);

  const calculateAlerts = (weightsData, residentsList = residents, settings = trendSettings) => {
    const s = { ...DEFAULT_ALERT_SETTINGS, ...settings };
    const newAlerts = [];
    if (!residentsList || residentsList.length === 0) { setAlerts([]); return; }
    residentsList.forEach(resident => {
      const rw = weightsData
        .filter(w => w.resident_id === resident.id)
        .sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
      if (rw.length < 2) return;
      const latest = rw[0];
      const latestDate = new Date(latest.weighing_date);

      // Période courte (perte)
      const shortLossAgo = new Date(latestDate); shortLossAgo.setDate(shortLossAgo.getDate() - s.loss_1m_days);
      const refShortLoss = rw.find(w => new Date(w.weighing_date) <= shortLossAgo);
      if (refShortLoss) {
        const pct = ((latest.weight - refShortLoss.weight) / refShortLoss.weight) * 100;
        if (pct <= -s.loss_1m_pct) {
          newAlerts.push({ resident: resident.last_name, residentId: resident.id, critere: `${s.loss_1m_pct}% en ${s.loss_1m_days} j`, pct: Math.abs(pct).toFixed(1), value: Math.abs(latest.weight - refShortLoss.weight).toFixed(1), date: latest.weighing_date, type: 'loss', refWeight: refShortLoss.weight, refDate: refShortLoss.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
          return;
        }
      }

      // Période longue (perte)
      const longLossAgo = new Date(latestDate); longLossAgo.setDate(longLossAgo.getDate() - s.loss_6m_days);
      const refLongLoss = rw.find(w => new Date(w.weighing_date) <= longLossAgo);
      if (refLongLoss) {
        const pct = ((latest.weight - refLongLoss.weight) / refLongLoss.weight) * 100;
        if (pct <= -s.loss_6m_pct) {
          newAlerts.push({ resident: resident.last_name, residentId: resident.id, critere: `${s.loss_6m_pct}% en ${s.loss_6m_days} j`, pct: Math.abs(pct).toFixed(1), value: Math.abs(latest.weight - refLongLoss.weight).toFixed(1), date: latest.weighing_date, type: 'loss', refWeight: refLongLoss.weight, refDate: refLongLoss.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
          return;
        }
      }

      // Période courte (gain)
      const shortGainAgo = new Date(latestDate); shortGainAgo.setDate(shortGainAgo.getDate() - s.gain_short_days);
      const refShortGain = rw.find(w => new Date(w.weighing_date) <= shortGainAgo);
      if (refShortGain) {
        const pct = ((latest.weight - refShortGain.weight) / refShortGain.weight) * 100;
        if (pct >= s.gain_short_pct) {
          newAlerts.push({ resident: resident.last_name, residentId: resident.id, critere: `${s.gain_short_pct}% en ${s.gain_short_days} j`, pct: pct.toFixed(1), value: Math.abs(latest.weight - refShortGain.weight).toFixed(1), date: latest.weighing_date, type: 'gain', refWeight: refShortGain.weight, refDate: refShortGain.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
          return;
        }
      }

      // Période longue (gain)
      const longGainAgo = new Date(latestDate); longGainAgo.setDate(longGainAgo.getDate() - s.gain_long_days);
      const refLongGain = rw.find(w => new Date(w.weighing_date) <= longGainAgo);
      if (refLongGain) {
        const pct = ((latest.weight - refLongGain.weight) / refLongGain.weight) * 100;
        if (pct >= s.gain_long_pct) {
          newAlerts.push({ resident: resident.last_name, residentId: resident.id, critere: `${s.gain_long_pct}% en ${s.gain_long_days} j`, pct: pct.toFixed(1), value: Math.abs(latest.weight - refLongGain.weight).toFixed(1), date: latest.weighing_date, type: 'gain', refWeight: refLongGain.weight, refDate: refLongGain.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
        }
      }
    });
    setAlerts(newAlerts);
  };

  // ✅ Toggle complément alimentaire + date
  const handleToggleSupplement = async (resident) => {
    const newVal = !resident.complement_alimentaire;
    const updateData = {
      complement_alimentaire: newVal,
      complement_alimentaire_date: newVal
        ? (resident.complement_alimentaire_date || null)
        : null
    };
    await base44.entities.Resident.update(resident.id, updateData);
    setResidents(prev => prev.map(r => r.id === resident.id ? { ...r, ...updateData } : r));
    if (selectedResident?.id === resident.id) {
      setSelectedResident(prev => ({ ...prev, ...updateData }));
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight.weight || !newWeight.weighing_date) return;
    const date = new Date(newWeight.weighing_date);
    await base44.entities.WeightMonitoring.create({
      resident_id: selectedResident.id,
      resident_name: selectedResident.last_name,
      weight: parseFloat(newWeight.weight),
      weighing_date: newWeight.weighing_date,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      notes: newWeight.notes || "",
    });
    const updated = await base44.entities.WeightMonitoring.list();
    setWeights(updated); calculateAlerts(updated);
    setNewWeight({ weight: "", weighing_date: new Date().toISOString().split('T')[0], notes: "" });
    setShowAddForm(false);
  };

  const handleEditWeight = async (id) => {
    const date = new Date(editingData.weighing_date);
    await base44.entities.WeightMonitoring.update(id, {
      weight: parseFloat(editingData.weight),
      weighing_date: editingData.weighing_date,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      notes: editingData.notes || "",
    });
    const updated = await base44.entities.WeightMonitoring.list();
    setWeights(updated); calculateAlerts(updated); setEditingId(null);
  };

  const handleDeleteWeight = async (id) => {
    if (!confirm("Supprimer cette pesée ?")) return;
    await base44.entities.WeightMonitoring.delete(id);
    const updated = await base44.entities.WeightMonitoring.list();
    setWeights(updated); calculateAlerts(updated);
  };

  const handleDeleteAllWeights = async () => {
    if (!selectedResident) return;
    const rw = weights.filter(w => w.resident_id === selectedResident.id);
    if (rw.length === 0) return;
    setWeightsToDelete(rw);
    setShowDeleteAllWeightsModal(true);
  };

  const confirmDeleteAllWeights = async () => {
    const today = new Date();
    const expectedPassword = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0');
    if (deletePassword !== expectedPassword) {
      setDeletePasswordError('Mot de passe incorrect');
      return;
    }
    if (!weightsToDelete) return;
    for (const w of weightsToDelete) await base44.entities.WeightMonitoring.delete(w.id);
    const updated = await base44.entities.WeightMonitoring.list();
    setWeights(updated); calculateAlerts(updated);
    setShowDeleteAllWeightsModal(false);
    setWeightsToDelete(null);
    setDeletePassword('');
    setDeletePasswordError('');
  };

  const handleBatchSave = async () => {
    const scrollY = window.scrollY;
    setBatchSaving(true);
    const newlySaved = new Set();
    const today = new Date().toISOString().split('T')[0];
    const allEntries = Object.entries(batchData).flatMap(([residentId, rows]) =>
      (Array.isArray(rows) ? rows : [rows])
        .filter(d => d.weight !== '' && parseFloat(d.weight) > 0)
        .map(d => ({ residentId, ...d }))
    );
    for (const { residentId, weight, date, notes } of allEntries) {
      const resident = residents.find(r => r.id === residentId);
      if (!resident) continue;
      const dateObj = new Date(date);
      try {
        await base44.entities.WeightMonitoring.create({
          resident_id: residentId,
          resident_name: resident.last_name,
          weight: parseFloat(weight),
          weighing_date: date,
          month: dateObj.getMonth() + 1,
          year: dateObj.getFullYear(),
          notes: notes || '',
        });
        newlySaved.add(residentId);
      } catch(e) {
        console.error('Erreur enregistrement', residentId, e);
      }
    }
    const updated = await base44.entities.WeightMonitoring.list();
    setWeights(updated); calculateAlerts(updated);
    setBatchSaved(newlySaved);
    setBatchData(prev => {
      const next = { ...prev };
      newlySaved.forEach(id => { next[id] = [{ weight: '', date: today, notes: '' }]; });
      return next;
    });
    setBatchSaving(false);
    setTimeout(() => window.scrollTo({ top: scrollY, behavior: 'instant' }), 30);
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const residentsWithWeightThisMonth = new Set(
    weights.filter(w => w.month === currentMonth && w.year === currentYear).map(w => w.resident_id)
  );
  const residentsWithoutWeight = residents.filter(r =>
    !residentsWithWeightThisMonth.has(r.id) &&
    r.last_name && r.last_name.trim() !== ''
  );

  const alertsByResident = {};
  alerts.forEach(alert => {
    const resident = allResidents.find(r => r.id === alert.residentId) || allResidents.find(r => r.last_name === alert.resident) || residents.find(r => r.last_name === alert.resident);
    if (resident) {
      if (!alertsByResident[resident.id]) alertsByResident[resident.id] = { hasMalnutritionAlert: false, hasGainAlert: false };
      if (alert.type === 'loss') alertsByResident[resident.id].hasMalnutritionAlert = true;
      if (alert.type === 'gain') alertsByResident[resident.id].hasGainAlert = true;
    }
  });

  const residentAllWeights = selectedResident
    ? [...weights.filter(w => w.resident_id === selectedResident.id)]
        .sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date))
    : [];
  const refWeight       = residentAllWeights.length >= 2 ? residentAllWeights[0] : null;
  const latestResWeight = residentAllWeights.length >= 2 ? residentAllWeights[residentAllWeights.length - 1] : null;
  const totalDiffKg     = refWeight && latestResWeight ? latestResWeight.weight - refWeight.weight : null;
  const totalPct        = refWeight && totalDiffKg !== null ? (totalDiffKg / refWeight.weight) * 100 : null;
  const refCardColor    = totalPct === null ? '' : totalPct <= -10 ? 'bg-red-50 border-red-200' : totalPct <= -5 ? 'bg-orange-50 border-orange-200' : totalPct >= 5 ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200';
  const refValueColor   = totalPct === null ? '' : totalPct <= -10 ? 'bg-red-100 text-red-800' : totalPct <= -5 ? 'bg-orange-100 text-orange-800' : totalPct >= 5 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800';

  const supplementDateLabel = selectedResident ? (() => { const s = parseSupplFromAnnotations(selectedResident.annotations || ''); return (s[0]?.date_debut ? new Date(s[0].date_debut).toLocaleDateString('fr-FR') : (selectedResident.complement_alimentaire && selectedResident.complement_alimentaire_date ? new Date(selectedResident.complement_alimentaire_date).toLocaleDateString('fr-FR') : null)); })() : null;

  // Date d'entrée du résident
  const entreeLabel = selectedResident?.date_entree
    ? new Date(selectedResident.date_entree).toLocaleDateString('fr-FR')
    : null;

  const handleConfirmImportFromImage = (residentId, toImport) => {
    setBatchData(prev => {
      const newRows = toImport.map(r => ({
        weight: String(r.weight),
        date:   r.date,
        notes:  'Import logiciel',
      }));
      const existing = (Array.isArray(prev[residentId]) ? prev[residentId] : []).filter(r => r.weight !== '');
      return { ...prev, [residentId]: [...existing, ...newRows] };
    });
    setShowImportModal(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Surveillance du Poids</h1>
            <p className="text-slate-500 mt-1">Suivi annuel des poids par résident</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
              <button onClick={() => setViewMode("resident")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "resident" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <LayoutList className="h-4 w-4" /> Vue résident
              </button>
              <button onClick={() => setViewMode("annual")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "annual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <TableProperties className="h-4 w-4" /> Vue annuelle
              </button>
              <button onClick={() => setViewMode("batch")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "batch" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <ClipboardList className="h-4 w-4" /> Pesée du jour
              </button>
              <button onClick={() => setViewMode("supplements")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "supplements" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <Pill className="h-4 w-4" /> Compléments
              </button>
            </div>
            <button
              onClick={() => setShowImportSupplements(true)}
              className="flex items-center gap-2 border border-emerald-400 text-emerald-700 hover:bg-emerald-50 bg-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <FileUp className="h-4 w-4" /> Compéments (PDF) — {selectedFloor}
            </button>
            <button onClick={() => setShowTrendSettings(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Settings className="h-4 w-4" /> Paramètres Alertes / Tendances
            </button>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Max points :</label>
              <input
                type="number"
                min="5"
                max="500"
                value={maxWeightsDisplay}
                onChange={e => {
                  const val = parseInt(e.target.value) || 50;
                  setMaxWeightsDisplay(val);
                }}
                onBlur={e => {
                  const val = Math.max(5, parseInt(e.target.value) || 50);
                  setMaxWeightsDisplay(val);
                  saveSettings(val, trendSettings);
                }}
                className="w-20 border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500 bg-white text-center"
              />
            </div>
          </div>
        </div>

        <TrendSettingsModal isOpen={showTrendSettings} onClose={() => setShowTrendSettings(false)} settings={trendSettings} onSave={(newTrend) => { setTrendSettings(newTrend); saveSettings(maxWeightsDisplay, newTrend); }} />

        {/* Boutons d'alerte */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button onClick={() => setShowMissingModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Users className="h-5 w-5" />
            <div className="text-left">
              <p className="text-sm font-semibold">{residentsWithoutWeight.length} résident{residentsWithoutWeight.length !== 1 ? "s" : ""} sans poids</p>
              <p className="text-xs opacity-90">{now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</p>
            </div>
          </button>

        </div>

        {/* Modal résidents sans poids ce mois */}
        {showMissingModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowMissingModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Sans poids — {now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setShowMissingModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              {residentsWithoutWeight.length === 0 ? (
                <p className="text-sm text-green-600">✅ Tous les résidents ont un poids ce mois-ci.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {[...residentsWithoutWeight].sort((a,b) => (a.last_name||"").localeCompare(b.last_name||"","fr")).map(r => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-800 font-medium">{r.last_name} {r.first_name || ""}</span>
                      <span className="text-xs text-slate-400">{r.floor} — Ch. {r.room}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal configuration seuil jours */}


        {/* Alertes HAS */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => alerts.filter(a => a.type === 'loss').length > 0 && setShowAlertModal('loss')}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Alertes dénutrition — Critères HAS</h3>
            </div>
            <p className="text-xs text-red-500 mb-3">Perte de poids &gt; {trendSettings.loss_1m_pct}% en {trendSettings.loss_1m_days} j ou &gt; {trendSettings.loss_6m_pct}% en {trendSettings.loss_6m_days} j</p>
            {alerts.filter(a => a.type === 'loss').length === 0 ? (
              <p className="text-sm text-green-700">✅ Aucune alerte détectée</p>
            ) : (
              <div className="space-y-1 text-sm">
                {alerts.filter(a => a.type === 'loss').map((alert, i) => {
                  const res = allResidents.find(r => r.id === alert.residentId) || allResidents.find(r => r.last_name === alert.resident);
                  let entreeInfo = null;
                  if (res?.date_entree) {
                    const allRw = weights.filter(w => w.resident_id === res.id).sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
                    if (allRw.length >= 1) {
                      const entreeDate = new Date(res.date_entree);
                      const first = allRw.find(w => new Date(w.weighing_date) >= entreeDate) || allRw[0];
                      const last = allRw[allRw.length - 1];
                      const diff = last.weight - first.weight;
                      entreeInfo = diff;
                    }
                  }
                  return (
                    <div key={i} className="flex items-center gap-2 text-red-700">
                      <TrendingDown className="h-4 w-4 shrink-0" />
                      <span><strong>{alert.resident}</strong> : perte de {alert.value} kg ({alert.pct}%) — critère {alert.critere}{entreeInfo !== null ? <span className="text-red-500 ml-1">· depuis entrée : <strong>{entreeInfo > 0 ? '+' : ''}{entreeInfo.toFixed(1)} kg</strong></span> : ''}</span>
                    </div>
                  );
                })}
                <p className="text-xs text-red-400 mt-2 italic">Cliquer pour voir les dossiers →</p>
              </div>
            )}
          </div>
          <div
            className="bg-orange-50 border border-orange-200 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => alerts.filter(a => a.type === 'gain').length > 0 && setShowAlertModal('gain')}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Alertes surcharge — Prise de poids</h3>
            </div>
            <p className="text-xs text-orange-500 mb-3">Prise de poids &gt; {trendSettings.gain_short_pct}% en {trendSettings.gain_short_days} j (rétention/surcharge) ou &gt; {trendSettings.gain_long_pct}% en {trendSettings.gain_long_days} j</p>
            {alerts.filter(a => a.type === 'gain').length === 0 ? (
              <p className="text-sm text-green-700">✅ Aucune alerte détectée</p>
            ) : (
              <div className="space-y-1 text-sm">
                {alerts.filter(a => a.type === 'gain').map((alert, i) => {
                  const res = allResidents.find(r => r.id === alert.residentId) || allResidents.find(r => r.last_name === alert.resident);
                  let entreeInfo = null;
                  if (res?.date_entree) {
                    const allRw = weights.filter(w => w.resident_id === res.id).sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
                    if (allRw.length >= 1) {
                      const entreeDate = new Date(res.date_entree);
                      const first = allRw.find(w => new Date(w.weighing_date) >= entreeDate) || allRw[0];
                      const last = allRw[allRw.length - 1];
                      const diff = last.weight - first.weight;
                      entreeInfo = diff;
                    }
                  }
                  return (
                    <div key={i} className="flex items-center gap-2 text-orange-700">
                      <TrendingUp className="h-4 w-4 shrink-0" />
                      <span><strong>{alert.resident}</strong> : prise de {alert.value} kg (+{alert.pct}%) — critère {alert.critere}{entreeInfo !== null ? <span className="text-orange-500 ml-1">· depuis entrée : <strong>{entreeInfo > 0 ? '+' : ''}{entreeInfo.toFixed(1)} kg</strong></span> : ''}</span>
                    </div>
                  );
                })}
                <p className="text-xs text-orange-400 mt-2 italic">Cliquer pour voir les dossiers →</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal dossiers alertes */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAlertModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className={`flex items-center justify-between px-6 py-4 rounded-t-2xl ${showAlertModal === 'loss' ? 'bg-red-600' : 'bg-orange-500'}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-white" />
                  <h2 className="text-white font-bold text-base">
                    {showAlertModal === 'loss' ? 'Alertes dénutrition — Critères HAS' : 'Alertes surcharge — Prise de poids'}
                  </h2>
                </div>
                <button onClick={() => setShowAlertModal(null)} className="text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-4 space-y-4">
                {alerts.filter(a => a.type === showAlertModal).map((alert, i) => {
                  const residentPool = allResidents.length > 0 ? allResidents : residents;
                  const resident = residentPool.find(r => r.last_name === alert.resident) || residentPool.find(r => r.id === alert.residentId);
                  if (!resident) return null;
                  const rw = weights
                    .filter(w => w.resident_id === resident.id)
                    .sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date))
                    .slice(0, 8);
                  return (
                    <div key={i} className={`border rounded-xl p-4 ${showAlertModal === 'loss' ? 'border-red-200 bg-red-50/40' : 'border-orange-200 bg-orange-50/40'}`}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div>
                          <span className="font-bold text-slate-800 text-base">{resident.last_name} {resident.first_name || ''}</span>
                          <span className="text-slate-500 text-sm ml-2">Ch. {resident.room} — {resident.floor}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${showAlertModal === 'loss' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {showAlertModal === 'loss' ? `Perte ${alert.value} kg (${alert.pct}%)` : `Prise ${alert.value} kg (+${alert.pct}%)`} — {alert.critere}
                        </span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-1.5 text-slate-500 font-semibold">Date</th>
                            <th className="text-right py-1.5 text-slate-500 font-semibold">Poids</th>
                            <th className="text-right py-1.5 text-slate-500 font-semibold">Variation</th>
                            <th className="text-left py-1.5 pl-3 text-slate-500 font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rw.map((w, wi) => {
                            const prev = rw[wi + 1];
                            const diff = prev ? w.weight - prev.weight : null;
                            return (
                              <tr key={w.id} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 text-slate-700">{new Date(w.weighing_date).toLocaleDateString('fr-FR')}</td>
                                <td className="py-1.5 text-right font-bold text-slate-800">{w.weight.toFixed(1)} kg</td>
                                <td className={`py-1.5 text-right font-medium ${diff === null ? 'text-slate-300' : diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                  {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg` : '—'}
                                </td>
                                <td className="py-1.5 pl-3 text-slate-400 italic">{w.notes || ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {/* Évolution depuis l'entrée pour les alertes dénutrition et surcharge */}
                      {resident.date_entree && (() => {
                        const allRw = weights
                          .filter(w => w.resident_id === resident.id)
                          .sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
                        if (allRw.length < 1) return null;
                        const entreeDate = new Date(resident.date_entree);
                        const firstAfterEntree = allRw.find(w => new Date(w.weighing_date) >= entreeDate) || allRw[0];
                        const lastW = allRw[allRw.length - 1];
                        const diffKg = lastW.weight - firstAfterEntree.weight;
                        const diffPct = (diffKg / firstAfterEntree.weight) * 100;
                        return (
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${showAlertModal === 'gain' ? 'text-orange-600' : 'text-red-600'}`}>📅 Évolution depuis l'entrée ({new Date(resident.date_entree).toLocaleDateString('fr-FR')})</p>
                            <div className={`flex items-center gap-3 flex-wrap rounded-lg px-3 py-2 ${showAlertModal === 'gain' ? 'bg-orange-50/60' : 'bg-red-50/60'}`}>
                              <div className="text-center">
                                <p className="text-xs text-slate-400">1ère pesée ({new Date(firstAfterEntree.weighing_date).toLocaleDateString('fr-FR')})</p>
                                <p className="text-lg font-bold text-slate-700">{firstAfterEntree.weight.toFixed(1)} kg</p>
                              </div>
                              <div className={`text-xl font-light ${showAlertModal === 'gain' ? 'text-orange-400' : 'text-red-400'}`}>→</div>
                              <div className="text-center">
                                <p className="text-xs text-slate-400">Actuel ({new Date(lastW.weighing_date).toLocaleDateString('fr-FR')})</p>
                                <p className="text-lg font-bold text-slate-700">{lastW.weight.toFixed(1)} kg</p>
                              </div>
                              <div className={`ml-auto rounded-lg px-3 py-1.5 text-center ${showAlertModal === 'gain' ? (diffKg >= 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700') : (diffKg <= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}`}>
                                <p className="text-xs font-medium opacity-70">Variation totale</p>
                                <p className="text-xl font-bold">{diffKg > 0 ? '+' : ''}{diffKg.toFixed(1)} kg</p>
                                <p className="text-sm font-semibold">{diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => { setSelectedResident(resident); setViewMode('resident'); setShowAlertModal(null); }}
                        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        → Ouvrir le profil complet
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ LÉGENDE ══════════════ */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-500">
          <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wide">Légende</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-blue-50 border border-blue-200 inline-block shrink-0" />
            Pesé ce mois
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-gray-50 border border-gray-200 inline-block shrink-0" />
            Non pesé ce mois
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-800 border border-slate-800 inline-block shrink-0" />
            Sélectionné
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-red-500 font-bold text-sm leading-none">↓</span>
            Perte &gt; {trendSettings.downThreshold}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-green-500 font-bold text-sm leading-none">↑</span>
            Gain &gt; +{trendSettings.upThreshold}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold text-sm leading-none">→</span>
            Stable
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            Compléments alimentaires prescrits
          </span>
        </div>
        {/* ══════════════════════════════════════ */}

        {/* ══════════════ VUE ANNUELLE ══════════════ */}
        {viewMode === "annual" && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Étage</label>
                <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} className="border border-slate-200 rounded px-3 py-1.5 text-sm">
                  <option value="RDC">RDC</option>
                  <option value="1ER">1ER</option>
                </select>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Printer className="h-4 w-4" /> Imprimer le tableau
              </button>
            </div>
            <AnnualWeightTable residents={residents} weights={weights} selectedFloor={selectedFloor}
              alertsByResident={alertsByResident}
              onSelectResident={(resident) => { setSelectedResident(resident); setViewMode("resident"); }}
            />
          </div>
        )}

        {/* VUE RÉSIDENT */}
        {viewMode === "resident" && (
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Étage</label>
                <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2 text-sm">
                  <option value="RDC">RDC</option>
                  <option value="1ER">1ER</option>
                </select>
              </div>
              <div>
               <label className="text-sm font-semibold text-slate-700 block mb-2">Résident</label>
               <div className="mb-2 space-y-2">
                 <select value={residentSort} onChange={e => setResidentSort(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-xs">
                    <option value="default">Tri : Par défaut (alertes)</option>
                    <option value="alpha">Tri : Alphabétique</option>
                    <option value="room">Tri : Par chambre</option>
                    <option value="trend">Tri : Tendance poids</option>
                  </select>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                   {[...residents]
                      .filter(r => r.floor === selectedFloor)
                    .sort((a, b) => {
                      if (residentSort === "alpha") return (a.last_name || "").localeCompare(b.last_name || "", "fr");
                      if (residentSort === "room") return (a.room || "").localeCompare(b.room || "", "fr", { numeric: true });
                      if (residentSort === "trend") {
                        const getPct = (r) => {
                          const rw = weights.filter(w => w.resident_id === r.id).sort((x, y) => new Date(y.weighing_date) - new Date(x.weighing_date));
                          if (rw.length < 2) return null;
                          return ((rw[0].weight - rw[1].weight) / rw[1].weight) * 100;
                        };
                        const getGroup = (pct) => {
                          if (pct === null) return 3;
                          if (pct <= trendSettings.downThreshold) return 0; // Perte
                          if (pct >= trendSettings.upThreshold) return 1;  // Gain
                          return 2; // Stable
                        };
                        const aPct = getPct(a), bPct = getPct(b);
                        const gA = getGroup(aPct), gB = getGroup(bPct);
                        if (gA !== gB) return gA - gB;
                        if (aPct !== null && bPct !== null) return aPct - bPct;
                        return (a.last_name || "").localeCompare(b.last_name || "", "fr");
                      }
                      // default: alertes d'abord
                      const aA = alertsByResident[a.id], bA = alertsByResident[b.id];
                      const aS = (aA?.hasMalnutritionAlert ? 2 : 0) + (aA?.hasGainAlert ? 1 : 0);
                      const bS = (bA?.hasMalnutritionAlert ? 2 : 0) + (bA?.hasGainAlert ? 1 : 0);
                      if (aS !== bS) return bS - aS;
                      return (a.last_name || "").localeCompare(b.last_name || "", "fr");
                    })
                    .map(resident => {
                       const isSelected = selectedResident?.id === resident.id;
                       const hasWeight  = residentsWithWeightThisMonth.has(resident.id);
                       const rw = weights.filter(w => w.resident_id === resident.id).sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
                       const trend = rw.length >= 2 ? (() => {
                         const pct = ((rw[0].weight - rw[1].weight) / rw[1].weight) * 100;
                         if (pct <= trendSettings.downThreshold) return '↓';
                         if (pct >= trendSettings.upThreshold)   return '↑';
                         return '→';
                       })() : '→';
                       return (
                         <button key={resident.id} onClick={async () => {
                           const fresh = await base44.entities.Resident.filter({ id: resident.id });
                           if (fresh.length > 0) setSelectedResident(fresh[0]);
                           else setSelectedResident(resident);
                         }}
                           className={`w-full text-left px-3 py-2 rounded text-sm transition-colors border ${
                             isSelected ? "bg-slate-800 text-white border-slate-800"
                             : hasWeight ? "bg-blue-50 border-blue-200 hover:bg-blue-100 text-slate-800"
                             : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-800"
                           }`}>
                           <span className="flex items-center justify-between w-full gap-1">
                             <span>{resident.last_name} ({resident.room})</span>
                             <span className="flex items-center gap-1 shrink-0">
                               {(resident.complement_alimentaire || parseSupplFromAnnotations(resident.annotations).length > 0) && (
                                 <Pill className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} title="Compléments alimentaires prescrits" />
                               )}
                               {trend && <TrendArrow trend={trend} />}
                             </span>
                           </span>
                         </button>
                       );
                     })}
                </div>
              </div>
            </div>

            <div className="col-span-3 space-y-6">
              {selectedResident ? (
                <>
                  {alertsByResident[selectedResident.id]?.hasMalnutritionAlert && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-900 mb-3">Suivi clinique — Alerte malnutrition</h3>
                      <Button onClick={() => { setSelectedResidentForNutrition(selectedResident.id); setShowNutritionalModal(true); }}
                        className="bg-red-600 hover:bg-red-700 text-white">
                        Évaluer le statut nutritionnel
                      </Button>
                    </div>
                  )}

                  {totalPct !== null && (() => {
                    const gainAlerts = alerts.filter(a => a.type === 'gain' && a.resident === selectedResident.last_name);
                    const lossAlerts = alerts.filter(a => a.type === 'loss' && a.resident === selectedResident.last_name);
                    return (
                      <div className={`border rounded-lg p-4 ${refCardColor}`}>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          Depuis la première pesée
                          <span className="text-xs font-normal text-slate-400">({new Date(refWeight.weighing_date).toLocaleDateString('fr-FR')})</span>
                        </h4>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Référence</p>
                            <p className="text-2xl font-bold text-slate-800">{refWeight.weight.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
                            <p className="text-xs text-slate-400">{new Date(refWeight.weighing_date).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="text-slate-300 text-3xl font-light">→</div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-1">Actuel</p>
                            <p className="text-2xl font-bold text-slate-800">{latestResWeight.weight.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
                            <p className="text-xs text-slate-400">{new Date(latestResWeight.weighing_date).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className={`ml-auto text-center px-5 py-3 rounded-xl ${refValueColor}`}>
                            <p className="text-xs font-medium opacity-70 mb-1">Variation totale</p>
                            <p className="text-3xl font-bold">{totalDiffKg > 0 ? '+' : ''}{totalDiffKg.toFixed(1)} kg</p>
                            <p className="text-sm font-semibold">{totalPct > 0 ? '+' : ''}{totalPct.toFixed(1)}%</p>
                          </div>
                        </div>
                        {lossAlerts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                            {lossAlerts.map((a, i) => (
                              <div key={i} className="bg-white border border-red-200 rounded-lg px-3 py-2 text-sm">
                                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1.5">⚠ Critère HAS : perte &gt; {a.critere}</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="text-center">
                                    <p className="text-xs text-slate-400">Référence ({new Date(a.refDate).toLocaleDateString('fr-FR')})</p>
                                    <p className="text-lg font-bold text-slate-700">{Number(a.refWeight).toFixed(1)} kg</p>
                                  </div>
                                  <div className="text-red-400 text-xl font-light">→</div>
                                  <div className="text-center">
                                    <p className="text-xs text-slate-400">Actuel ({new Date(a.latestDate).toLocaleDateString('fr-FR')})</p>
                                    <p className="text-lg font-bold text-slate-700">{Number(a.latestWeight).toFixed(1)} kg</p>
                                  </div>
                                  <div className="ml-auto bg-red-100 text-red-700 rounded-lg px-3 py-1.5 text-center">
                                    <p className="text-xs font-medium opacity-70">Variation</p>
                                    <p className="text-xl font-bold">−{a.value} kg</p>
                                    <p className="text-sm font-semibold">−{a.pct}%</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {gainAlerts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-purple-200 space-y-2">
                            {gainAlerts.map((a, i) => (
                              <div key={i} className="bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm">
                                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">⚠ Alerte surcharge : prise &gt; {a.critere}</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="text-center">
                                    <p className="text-xs text-slate-400">Référence ({new Date(a.refDate).toLocaleDateString('fr-FR')})</p>
                                    <p className="text-lg font-bold text-slate-700">{Number(a.refWeight).toFixed(1)} kg</p>
                                  </div>
                                  <div className="text-purple-400 text-xl font-light">→</div>
                                  <div className="text-center">
                                    <p className="text-xs text-slate-400">Actuel ({new Date(a.latestDate).toLocaleDateString('fr-FR')})</p>
                                    <p className="text-lg font-bold text-slate-700">{Number(a.latestWeight).toFixed(1)} kg</p>
                                  </div>
                                  <div className="ml-auto bg-purple-100 text-purple-700 rounded-lg px-3 py-1.5 text-center">
                                    <p className="text-xs font-medium opacity-70">Variation</p>
                                    <p className="text-xl font-bold">+{a.value} kg</p>
                                    <p className="text-sm font-semibold">+{a.pct}%</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Compléments alimentaires — liste et gestion */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-emerald-900">Compléments alimentaires prescrits</h3>
                        {residentSupplements.length === 0 && <p className="text-sm text-emerald-700 mt-1">Aucun complément enregistré pour ce résident.</p>}
                      </div>
                      <button
                        onClick={() => { setEditingResidentSupp({ ...selectedResident, _supps: parseSupplFromAnnotations(selectedResident.annotations) }); setShowSupplementForm(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" /> {residentSupplements.length === 0 ? 'Ajouter' : 'Gérer'}
                      </button>
                    </div>
                    {residentSupplements.length > 0 && (
                      <div className="space-y-2">
                        {residentSupplements.map((supp, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-100">
                            <Pill className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <div className="flex-1 text-sm">
                              <span className="font-semibold text-emerald-900">{supp.type}</span>
                              {supp.date_debut && <span className="text-emerald-700 ml-2">depuis {new Date(supp.date_debut).toLocaleDateString('fr-FR')}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pesées */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                      <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                        {selectedResident.last_name} {selectedResident.first_name || ""} — Pesées
                        {/* Toggle compléments */}
                        <button
                          onClick={() => handleToggleSupplement(selectedResident)}
                          title={selectedResident.complement_alimentaire ? "Retirer la prescription" : "Marquer : compléments alimentaires prescrits"}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selectedResident.complement_alimentaire
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}>
                          <Pill className="h-3 w-3" />
                          {selectedResident.complement_alimentaire ? 'Compléments prescrits' : 'Compléments alimentaires'}
                        </button>
                        {/* Sélecteur de date si compléments actifs */}
                         {selectedResident.complement_alimentaire && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">depuis</span>
                            <SupplementDatePicker
                              key={selectedResident.id}
                              value={selectedResident.complement_alimentaire_date || ''}
                              onSave={async (val) => {
                                const updateData = { complement_alimentaire_date: val };
                                await base44.entities.Resident.update(selectedResident.id, updateData);
                                setResidents(prev => prev.map(r => r.id === selectedResident.id ? { ...r, ...updateData } : r));
                                setSelectedResident(prev => ({ ...prev, ...updateData }));
                              }}
                            />
                          </div>
                         )}

                      </h3>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => setShowAddForm(v => !v)} className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Ajouter une pesée
                        </Button>
                        {weights.filter(w => w.resident_id === selectedResident.id).length > 0 && (
                          <Button size="sm" variant="outline" onClick={handleDeleteAllWeights} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400">
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer tout
                          </Button>
                        )}
                      </div>
                    </div>

                    {showAddForm && (
                      <div className="mb-4 flex gap-3 items-end flex-wrap bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">Date</label>
                          <input type="date" value={newWeight.weighing_date}
                            onChange={e => setNewWeight(v => ({ ...v, weighing_date: e.target.value }))}
                            className="border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-slate-400" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">Poids (kg)</label>
                          <input type="number" step="0.1" value={newWeight.weight}
                            onChange={e => setNewWeight(v => ({ ...v, weight: e.target.value }))}
                            placeholder="Ex : 65.5"
                            className="border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-slate-400 w-28" />
                        </div>
                        <div className="flex-1 min-w-[180px]">
                          <label className="text-xs text-slate-500 block mb-1">Notes</label>
                          <input type="text" value={newWeight.notes || ""}
                            onChange={e => setNewWeight(v => ({ ...v, notes: e.target.value }))}
                            placeholder="Habillé, refus, post-repas..."
                            className="border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-slate-400 w-full" />
                        </div>
                        <Button size="sm" onClick={handleAddWeight} disabled={!newWeight.weight || !newWeight.weighing_date}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setWeightListCollapsed(v => !v)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        {weightListCollapsed ? '▶ Afficher les pesées' : '▼ Masquer les pesées'}
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
                          {weights.filter(w => w.resident_id === selectedResident.id).length} entrée{weights.filter(w => w.resident_id === selectedResident.id).length > 1 ? 's' : ''}
                        </span>
                      </button>
                    </div>
                    {!weightListCollapsed && (() => {
                      const rw = weights.filter(w => w.resident_id === selectedResident.id).sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
                      if (rw.length === 0) return <p className="text-sm text-slate-400 italic text-center py-6">Aucune pesée enregistrée.</p>;
                      const grouped = {};
                      rw.forEach(w => {
                        const key = `${w.year || new Date(w.weighing_date).getFullYear()}-${String(w.month || new Date(w.weighing_date).getMonth() + 1).padStart(2,'0')}`;
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(w);
                      });
                      return Object.entries(grouped).sort((a,b) => b[0].localeCompare(a[0])).map(([key, entries]) => {
                        const [yr, mo] = key.split("-");
                        const monthLabel = new Date(parseInt(yr), parseInt(mo)-1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
                        return (
                          <div key={key} className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 capitalize">{monthLabel}</p>
                            <div className="space-y-1.5">
                              {entries.map(w => (
                                <div key={w.id} className="flex items-center gap-3 border border-slate-100 rounded-lg px-3 py-2">
                                  {editingId === w.id ? (
                                    <>
                                      <input type="date" value={editingData.weighing_date}
                                        onChange={e => setEditingData(v => ({ ...v, weighing_date: e.target.value }))}
                                        className="border border-slate-200 rounded px-2 py-1 text-sm outline-none" />
                                      <input type="number" step="0.1" value={editingData.weight}
                                        onChange={e => setEditingData(v => ({ ...v, weight: e.target.value }))}
                                        className="border border-slate-200 rounded px-2 py-1 text-sm w-24 outline-none" />
                                      <input type="text" value={editingData.notes || ""}
                                        onChange={e => setEditingData(v => ({ ...v, notes: e.target.value }))}
                                        placeholder="Notes..."
                                        className="border border-slate-200 rounded px-2 py-1 text-sm flex-1 outline-none" />
                                      <button onClick={() => handleEditWeight(w.id)} className="p-1 rounded hover:bg-green-50 text-green-600"><Check className="h-3.5 w-3.5" /></button>
                                      <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-3.5 w-3.5" /></button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs text-slate-500 w-24">{new Date(w.weighing_date).toLocaleDateString('fr-FR')}</span>
                                      <span className="text-sm font-bold text-slate-800">{w.weight.toFixed(1)} kg</span>
                                      {w.notes && <span className="text-xs text-slate-400 italic flex-1 truncate">{w.notes}</span>}
                                      <div className="ml-auto flex gap-1">
                                        <button onClick={() => { setEditingId(w.id); setEditingData({ weight: w.weight, weighing_date: w.weighing_date, notes: w.notes || '' }); }}
                                          className="p-1 rounded hover:bg-slate-100 text-slate-400"><Pencil className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => handleDeleteWeight(w.id)}
                                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Graphique */}
                  {chartData.length > 0 && (
                    <>
                    <style>{`
                      @media print {
                        .recharts-reference-line { stroke-width: 2 !important; }
                        .recharts-reference-line-label { font-size: 12px !important; font-weight: bold !important; }
                      }
                    `}</style>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6 shadow-sm">
                      <h3 className="font-semibold text-slate-900 mb-4 text-lg">Évolution du poids</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="gradientPoids" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                          <YAxis yAxisId="left" stroke="#64748b" style={{ fontSize: '12px' }} domain={[dataMin => Math.floor(dataMin) - 2, dataMax => Math.ceil(dataMax) + 2]} allowDecimals={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="#10b981" style={{ fontSize: '12px' }} domain={[0, 1.5]} hide={true} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} labelStyle={{ color: '#f1f5f9' }} />
                          <Legend wrapperStyle={{ paddingTop: '16px' }} />
                          {/* ✅ Ligne date d'entrée */}
                          {entreeLabel && (
                            <ReferenceLine
                              yAxisId="left"
                              x={entreeLabel}
                              stroke="#6366f1"
                              strokeDasharray="5 3"
                              strokeWidth={2}
                              label={{ value: "🏠 Entrée", position: 'insideTopRight', fill: '#6366f1', fontSize: 11, fontWeight: 600 }}
                            />
                          )}
                          {/* ✅ Lignes compléments alimentaires — une par type + légende visible */}
                          {(() => {
                            const supps = parseSupplFromAnnotations(selectedResident.annotations);
                            if (supps.length > 0) {
                              const colors = ['#10b981','#0891b2','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];
                              return supps.map((sup, idx) => {
                                const suppLabel = sup.date_debut
                                  ? new Date(sup.date_debut).toLocaleDateString('fr-FR')
                                  : null;
                                if (!suppLabel) return null;
                                const color = colors[idx % colors.length];
                                const yOffset = 30 + (idx * 20);
                                return (
                                  <ReferenceLine
                                    yAxisId="left"
                                    key={idx}
                                    x={suppLabel}
                                    stroke={color}
                                    strokeDasharray="5 3"
                                    strokeWidth={2.5}
                                    label={{ value: `💊 ${sup.type}`, position: 'top', fill: color, fontSize: 12, fontWeight: 700, offset: yOffset }}
                                  />
                                );
                              });
                            } else if (supplementDateLabel) {
                              return (
                                <ReferenceLine
                                  yAxisId="left"
                                  x={supplementDateLabel}
                                  stroke="#10b981"
                                  strokeDasharray="5 3"
                                  strokeWidth={2.5}
                                  label={{ value: '💊 Compléments', position: 'top', fill: '#10b981', fontSize: 12, fontWeight: 700 }}
                                />
                              );
                            }
                            return null;
                          })()}
                          <Scatter yAxisId="right" dataKey="complement" fill="#10b981" name="Compléments" />
                          <Line yAxisId="left" type="monotone" dataKey="poids" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} name="Poids (kg)" fill="url(#gradientPoids)" connectNulls={true}
                            label={{ position: 'top', fontSize: 11, fill: '#1e40af', fontWeight: 600, formatter: v => v ? `${v.toFixed(1)}` : '' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    </>
                  )}

                  <PrintNutritionSummary key={nutritionRefreshKey} residentId={selectedResident.id} residentName={selectedResident.last_name} residentData={selectedResident} />
                </>
              ) : (
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-8 text-center text-slate-600">
                  Sélectionnez un résident pour voir son suivi
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ VUE PESÉE DU JOUR ══════════════ */}
        {viewMode === "batch" && (
          <div>
            <div className="sticky top-0 z-30 bg-slate-50 py-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Étage</label>
                <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} className="border border-slate-200 rounded px-3 py-1.5 text-sm">
                  <option value="RDC">RDC</option>
                  <option value="1ER">1ER</option>
                </select>
                <button onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 border border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <ImagePlus className="h-4 w-4" /> Importer depuis image
                </button>
                <button onClick={() => setShowImportSupplements(true)}
                  className="flex items-center gap-2 border border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <FileUp className="h-4 w-4" /> Importer compléments (PDF)
                </button>
              </div>
              <div className="flex items-center gap-3">
                {batchSaved.size > 0 && (
                  <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" /> {batchSaved.size} pesée{batchSaved.size > 1 ? "s" : ""} enregistrée{batchSaved.size > 1 ? "s" : ""}
                  </span>
                )}
                <Button onClick={handleBatchSave}
                  disabled={batchSaving || !Object.values(batchData).flat().some(d => d.weight !== '')}
                  className="gap-2">
                  {batchSaving ? 'Enregistrement...' : (
                    <><Check className="h-4 w-4" />
                      Enregistrer {Object.values(batchData).flat().filter(d => d.weight !== '').length > 0
                        ? `${Object.values(batchData).flat().filter(d => d.weight !== '').length} pesée(s)` : 'tout'}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="px-5 py-3 bg-slate-800 rounded-t-xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-white font-bold">Pesée du jour — {selectedFloor}</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Saisissez les poids de tous les résidents en une fois</p>
                </div>
                <select value={batchSort} onChange={e => setBatchSort(e.target.value)} className="border border-slate-600 bg-slate-700 text-white rounded px-2 py-1 text-xs">
                  <option value="alpha">Tri : Alphabétique</option>
                  <option value="room">Tri : Par chambre</option>
                  <option value="missing_first">Tri : Sans poids ce mois d'abord</option>
                </select>
              </div>
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Résident</th>
                      <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Ch.</th>
                      <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Dernier poids</th>
                      <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Date pesée</th>
                      <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Poids (kg)</th>
                      <th className="bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                      <th className="bg-slate-50 px-3 py-2.5 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.filter(r => r.floor === selectedFloor)
                     .sort((a, b) => {
                       if (batchSort === "room") return (a.room || "").localeCompare(b.room || "", "fr", { numeric: true });
                       if (batchSort === "missing_first") {
                         const aM = residentsWithWeightThisMonth.has(a.id) ? 1 : 0;
                         const bM = residentsWithWeightThisMonth.has(b.id) ? 1 : 0;
                         if (aM !== bM) return aM - bM;
                         return (a.last_name || "").localeCompare(b.last_name || "", "fr");
                       }
                       return (a.last_name || "").localeCompare(b.last_name || "", "fr");
                     })
                      .flatMap((resident, idx) => {
                        const rWeights = weights.filter(w => w.resident_id === resident.id).sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
                        const lastW = rWeights[0] || null;
                        const alreadyThisMonth = residentsWithWeightThisMonth.has(resident.id);
                        const justSaved = batchSaved.has(resident.id);
                        const rows = Array.isArray(batchData[resident.id])
                          ? batchData[resident.id]
                          : [{ weight: '', date: new Date().toISOString().split('T')[0], notes: '' }];
                        const rowBg = alreadyThisMonth ? "bg-green-50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";

                        const updateRow = (rowIdx, field, value) =>
                          setBatchData(prev => {
                            const newRows = [...(Array.isArray(prev[resident.id]) ? prev[resident.id] : [prev[resident.id]])];
                            newRows[rowIdx] = { ...newRows[rowIdx], [field]: value };
                            return { ...prev, [resident.id]: newRows };
                          });

                        const addRow = () =>
                          setBatchData(prev => {
                            const newRows = [...(Array.isArray(prev[resident.id]) ? prev[resident.id] : [prev[resident.id]])];
                            newRows.push({ weight: '', date: new Date().toISOString().split('T')[0], notes: '' });
                            return { ...prev, [resident.id]: newRows };
                          });

                        const removeRow = (rowIdx) =>
                          setBatchData(prev => {
                            const newRows = [...(Array.isArray(prev[resident.id]) ? prev[resident.id] : [prev[resident.id]])];
                            newRows.splice(rowIdx, 1);
                            return { ...prev, [resident.id]: newRows };
                          });

                        const multiRowBorder = rows.length > 1 ? 'border-l-4 border-l-blue-400' : '';

                        return rows.map((rowData, rowIdx) => {
                          const multiRowBg = rows.length > 1 ? (rowIdx === 0 ? 'bg-blue-50/70' : 'bg-blue-50/40') : rowBg;
                          return (
                          <tr key={`${resident.id}-${rowIdx}`} className={`border-b border-slate-200 ${multiRowBg} ${multiRowBorder}`}>
                            {rowIdx === 0 && (
                              <td className="px-4 py-2.5 font-medium text-slate-800" rowSpan={rows.length}>
                                <div className="flex items-center gap-2">
                                  {(alreadyThisMonth || justSaved) && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                                  {alertsByResident[resident.id]?.hasMalnutritionAlert && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                                  {resident.complement_alimentaire && <Pill className="h-3.5 w-3.5 text-emerald-500 shrink-0" title="Compléments alimentaires prescrits" />}
                                  {resident.last_name} {resident.first_name ? `${resident.first_name[0]}.` : ''}
                                </div>
                              </td>
                            )}
                            {rowIdx === 0 && (
                              <td className="px-3 py-2.5 text-slate-500" rowSpan={rows.length}>{resident.room}</td>
                            )}
                            {rowIdx === 0 && (
                              <td className="px-3 py-2.5 text-slate-500 text-xs" rowSpan={rows.length}>
                                {lastW ? <span className="font-semibold text-slate-700">{lastW.weight.toFixed(1)} kg</span> : <span className="text-slate-300 italic">—</span>}
                                {lastW && <span className="text-slate-400 ml-1">{new Date(lastW.weighing_date).toLocaleDateString('fr-FR')}</span>}
                              </td>
                            )}
                            <td className="px-3 py-2.5">
                              <input type="date" value={rowData.date}
                                onChange={e => updateRow(rowIdx, 'date', e.target.value)}
                                className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-slate-400 w-32" />
                            </td>
                            <td className="px-3 py-2.5">
                              <input type="number" step="0.1" value={rowData.weight}
                                onChange={e => updateRow(rowIdx, 'weight', e.target.value)}
                                placeholder="kg"
                                className={`border rounded px-2 py-1 text-sm font-semibold outline-none w-24 ${rowData.weight ? 'border-blue-300 bg-blue-50 focus:border-blue-500' : 'border-slate-200 focus:border-slate-400'}`} />
                            </td>
                            <td className="px-3 py-2.5">
                              <input type="text" value={rowData.notes}
                                onChange={e => updateRow(rowIdx, 'notes', e.target.value)}
                                placeholder="Habillé, refus, post-repas..."
                                className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-slate-400 w-full min-w-[180px]" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                {rowIdx === rows.length - 1 && (
                                  <button onClick={addRow}
                                    title="Ajouter une pesée à une autre date"
                                    className="p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors">
                                    <Plus className="h-4 w-4" />
                                  </button>
                                )}
                                {rows.length > 1 && (
                                  <button onClick={() => removeRow(rowIdx)}
                                    title="Supprimer cette ligne"
                                    className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors">
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        });
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ VUE COMPLÉMENTS ALIMENTAIRES ══════════════ */}
        {viewMode === "supplements" && (() => {
          const allSupplResidents = residents
            .map(r => ({ ...r, _supps: parseSupplFromAnnotations(r.annotations) }))
            .filter(r => r._supps.length > 0)
            .filter(r => selectedFloor === "tous" || r.floor === selectedFloor)
            .sort((a, b) => (a.floor || "").localeCompare(b.floor || "") || (a.last_name || "").localeCompare(b.last_name || "", "fr"));

          const rdcList = allSupplResidents.filter(r => r.floor === "RDC");
          const erList  = allSupplResidents.filter(r => r.floor === "1ER");

          const renderFloorTable = (list, floorLabel) => list.length === 0 ? null : (
            <div className="mb-8">
              <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-sm">{floorLabel}</span>
                <span className="text-slate-400 text-sm font-normal">{list.length} résident{list.length > 1 ? "s" : ""}</span>
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                   <tr className="bg-slate-100 border-b border-slate-200">
                     <th className="px-4 py-3 text-left font-semibold text-slate-600">Résident</th>
                     <th className="px-3 py-3 text-center font-semibold text-slate-600 w-16">Ch.</th>
                     <th className="px-4 py-3 text-left font-semibold text-slate-600">Type de complément</th>
                     <th className="px-4 py-3 text-left font-semibold text-slate-600">Date de prescription</th>
                     <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                   </tr>
                  </thead>
                  <tbody>
                    {list.flatMap((r, ri) =>
                      r._supps.map((s, si) => (
                        <tr key={`${r.id}-${si}`} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}>
                          {si === 0 && (
                            <td className="px-4 py-2.5 font-medium text-slate-800" rowSpan={r._supps.length}>
                              <button onClick={() => { setSelectedResident(r); setViewMode("resident"); }}
                                className="hover:text-blue-600 hover:underline text-left transition-colors">
                                {r.last_name} {r.first_name || ""}
                              </button>
                            </td>
                          )}
                          {si === 0 && (
                            <td className="px-3 py-2.5 text-center text-slate-400 font-medium" rowSpan={r._supps.length}>{r.room}</td>
                          )}
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Pill className="h-3 w-3" />
                              {s.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-sm">
                            {s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : <span className="text-slate-300 italic">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => { setEditingResidentSupp(r); setShowSupplementForm(true); }}
                              className="px-2 py-1 rounded text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">Gérer</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );

          return (
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-emerald-500" /> Compléments alimentaires
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">{allSupplResidents.length} résident{allSupplResidents.length > 1 ? "s" : ""} avec compléments prescrits</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setSelectedFloor("RDC")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedFloor === "RDC" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      RDC
                    </button>
                    <button onClick={() => setSelectedFloor("1ER")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedFloor === "1ER" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      1ER
                    </button>
                    <button onClick={() => setSelectedFloor("tous")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedFloor === "tous" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      Tous
                    </button>
                  </div>
                  <button onClick={() => setShowImportSupplements(true)}
                    className="flex items-center gap-2 border border-emerald-400 text-emerald-700 hover:bg-emerald-50 bg-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    <FileUp className="h-4 w-4" /> Importer depuis PDF — {selectedFloor === "tous" ? "tous étages" : selectedFloor}
                  </button>
                </div>
              </div>
              {allSupplResidents.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
                  <Pill className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Aucun complément alimentaire enregistré</p>
                  <p className="text-sm mt-1">Importez un fichier PDF ou ajoutez manuellement depuis la Vue résident.</p>
                </div>
              ) : (
                <>
                  {renderFloorTable(rdcList, "RDC")}
                  {renderFloorTable(erList, "1ER")}
                </>
              )}
            </div>
          );
        })()}

        {/* ══════════════ MODAL IMPORT COMPLÉMENTS PDF ══════════════ */}
        <ImportSupplementsFromPDF
          open={showImportSupplements}
          onOpenChange={setShowImportSupplements}
          residents={residents}
          floor={selectedFloor}
          onImport={(updates) => {
            if (updates && updates.length > 0) {
              setResidents(prev => prev.map(r => {
                const upd = updates.find(u => u.id === r.id);
                return upd ? { ...r, annotations: upd.annotations } : r;
              }));
              if (selectedResident) {
                const upd = updates.find(u => u.id === selectedResident.id);
                if (upd) setSelectedResident(prev => ({ ...prev, annotations: upd.annotations }));
              }
            }
          }}
        />

        {/* ══════════════ MODAL IMPORT IMAGE ══════════════ */}
        {showImportModal && (
          <ImportWeightFromImage
            residents={residents}
            selectedFloor={selectedFloor}
            weights={weights}
            onConfirm={handleConfirmImportFromImage}
            onClose={() => setShowImportModal(false)}
          />
        )}

        {showSupplementForm && editingResidentSupp && (
          <SupplementForm
            resident={editingResidentSupp}
            onClose={() => { setShowSupplementForm(false); setEditingResidentSupp(null); }}
            onSave={async (supps) => {
              const newAnnotations = buildAnnotationsWithSuppl(editingResidentSupp.annotations, supps);
              await base44.entities.Resident.update(editingResidentSupp.id, { annotations: newAnnotations });
              setResidents(prev => prev.map(r => r.id === editingResidentSupp.id ? { ...r, annotations: newAnnotations } : r));
              if (selectedResident?.id === editingResidentSupp.id)
                setSelectedResident(prev => ({ ...prev, annotations: newAnnotations }));
              setSupplementRefreshKey(k => k + 1);
              setShowSupplementForm(false);
              setEditingResidentSupp(null);
            }}
            existingTypes={allSupplements.map(s => s.type).filter(Boolean)}
          />
        )}

        {selectedResidentForNutrition && (
          <NutritionalStatusModal
            residentId={selectedResidentForNutrition}
            residentName={selectedResident?.last_name || ""}
            isOpen={showNutritionalModal}
            onClose={() => { setShowNutritionalModal(false); setSelectedResidentForNutrition(null); }}
            onSave={() => setNutritionRefreshKey(k => k + 1)}
          />
        )}

        {/* Modal suppression tous les poids */}
        {showDeleteAllWeightsModal && weightsToDelete && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowDeleteAllWeightsModal(false); setDeletePassword(''); setDeletePasswordError(''); }}>
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                <h3 className="font-semibold text-red-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Supprimer tous les poids
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <p className="text-slate-700 mb-2">
                    Êtes-vous sûr de vouloir supprimer <strong>{weightsToDelete.length} pesée{weightsToDelete.length > 1 ? "s" : ""}</strong> de <strong>{selectedResident?.last_name}</strong> ?
                  </p>
                  <p className="text-sm text-red-600 font-medium">Cette action est irréversible.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Entrez le code de sécurité</label>
                  <input
                    type="password"
                    placeholder="JJMM"
                    maxLength="4"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeletePasswordError(''); }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono text-center tracking-widest outline-none focus:border-red-400 ${deletePasswordError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {deletePasswordError && <p className="text-xs text-red-600 mt-1.5 font-medium">{deletePasswordError}</p>}
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-slate-200 justify-end">
                <button onClick={() => { setShowDeleteAllWeightsModal(false); setDeletePassword(''); setDeletePasswordError(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  Annuler
                </button>
                <button onClick={confirmDeleteAllWeights}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deletePassword.length !== 4}>
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
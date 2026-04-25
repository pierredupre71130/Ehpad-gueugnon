import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Syringe, RefreshCw, ChevronDown, ChevronUp, Archive, X, Save, Zap, Printer } from "lucide-react";
import PrintableVaccinationTable from "@/components/vaccination/PrintableVaccinationTable";

const CURRENT_YEAR = new Date().getFullYear();

const COVID_OPTIONS = [
  { value: "", label: "—" },
  { value: "Accepte C", label: "Accepte C", effect: "attente" },
  { value: "Accepte famille C", label: "Accepte famille C", effect: "attente" },
  { value: "Refus C", label: "Refus C", effect: "refus" },
  { value: "Refus famille C", label: "Refus famille C", effect: "refus" },
];

const GRIPPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "Accepte G", label: "Accepte G", effect: "attente" },
  { value: "Accepte famille G", label: "Accepte famille G", effect: "attente" },
  { value: "Refus G", label: "Refus G", effect: "refus" },
  { value: "Refus famille G", label: "Refus famille G", effect: "refus" },
];

function isRefusValue(val) {
  if (!val) return false;
  return val.toLowerCase().includes("refus");
}

function normalizeDate(val) {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return val;
}

function displayDate(val) {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}/${m}/${y}`;
  }
  return val;
}

function CellDisplay({ value, type = "vac" }) {
  if (!value) return <span className="text-slate-300 text-xs">—</span>;
  if (type === "infos") {
    const isRef = isRefusValue(value);
    return <span className={`text-xs font-medium ${isRef ? "text-red-500" : "text-blue-600"}`}>{value}</span>;
  }
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isRefus = value.toLowerCase().includes("refus");
  const isAttente = value.toLowerCase() === "en attente";
  if (isDate) return <span className="text-green-700 font-medium text-xs">{displayDate(value)}</span>;
  if (isRefus) return <span className="text-red-500 font-semibold text-xs">{value}</span>;
  if (isAttente) return <span className="text-amber-500 font-medium text-xs">{value}</span>;
  return <span className="text-slate-500 text-xs">{value}</span>;
}

// ─── Single cell inline editor ────────────────────────────────────────────────
function EditableCell({ value, field, recordId, onSaved, type = "vac" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setVal(value || ""); }, [value]);

  const save = async (newVal) => {
    setSaving(true);
    const toSave = type === "vac" ? (normalizeDate(newVal) || null) : (newVal || null);
    await base44.entities.Vaccination.update(recordId, { [field]: toSave });
    setSaving(false);
    setEditing(false);
    onSaved();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") save(val);
    if (e.key === "Escape") setEditing(false);
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[90px]">
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={type === "vac" ? "JJ/MM/AAAA" : "Infos"}
          className="w-24 border border-green-400 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
        />
        <button onClick={() => save(val)} disabled={saving} className="p-0.5 bg-green-500 text-white rounded">
          <Save className="h-3 w-3" />
        </button>
        <button onClick={() => setEditing(false)} className="p-0.5 bg-slate-200 rounded">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 min-w-[60px] min-h-[22px] flex items-center justify-center"
    >
      <CellDisplay value={value} type={type} />
    </div>
  );
}

// ─── Mini dropdown helper ─────────────────────────────────────────────────────
function StatutDropdown({ options, currentValue, onChoose, label, colorKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isRefus = currentValue && isRefusValue(currentValue);
  const hasValue = !!currentValue;

  const colors = {
    covid: { active: "text-blue-700 bg-blue-50", refus: "text-red-600 bg-red-50", empty: "text-slate-300" },
    grippe: { active: "text-purple-700 bg-purple-50", refus: "text-red-600 bg-red-50", empty: "text-slate-300" },
  };
  const c = colors[colorKey] || colors.covid;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`text-xs px-1.5 py-0.5 rounded border transition-colors cursor-pointer hover:opacity-80 ${
          hasValue
            ? (isRefus ? c.refus + " border-red-200" : c.active + " border-current border-opacity-30")
            : "text-slate-300 border-slate-100 hover:border-slate-200"
        }`}
        title={label}
      >
        {currentValue || label}
      </button>
      {open && (
        <div className="absolute z-50 left-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] py-1">
          <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 mb-1">{label}</div>
          {options.filter(opt => opt.value !== "").map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChoose(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center justify-between gap-2 ${
                opt.effect === "refus" ? "text-red-600" : "text-blue-600"
              }`}
            >
              <span>{opt.label}</span>
              {opt.effect === "refus" && <span className="text-xs text-slate-400">→ REFUS</span>}
              {opt.effect === "attente" && <span className="text-xs text-slate-400">→ En attente</span>}
            </button>
          ))}
          {currentValue && (
            <button
              onClick={() => { onChoose({ value: "", effect: null }); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-50 border-t border-slate-100 mt-1"
            >
              Effacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Infos cell — deux dropdowns Covid + Grippe ───────────────────────────────
function InfosCell({ record, onSaved }) {
  const [saving, setSaving] = useState(false);

  // Décode le champ infos : "covid:Refus C|grippe:Accepte G"
  const parseInfos = (infos) => {
    if (!infos) return { covid: "", grippe: "" };
    const parts = {};
    (infos || "").split("|").forEach(p => {
      const [k, v] = p.split(":");
      if (k && v) parts[k.trim()] = v.trim();
    });
    // Rétrocompatibilité anciens champs
    return { covid: parts.covid || "", grippe: parts.grippe || "" };
  };

  const encodeInfos = (covid, grippe) => {
    const parts = [];
    if (covid) parts.push(`covid:${covid}`);
    if (grippe) parts.push(`grippe:${grippe}`);
    return parts.join("|") || null;
  };

  const { covid: covidVal, grippe: grippeVal } = parseInfos(record.infos);

  const applyChoice = async (type, opt) => {
    setSaving(true);
    const newCovid = type === "covid" ? opt.value : covidVal;
    const newGrippe = type === "grippe" ? opt.value : grippeVal;
    const updates = { infos: encodeInfos(newCovid, newGrippe) };

    if (type === "covid") {
      if (opt.effect === "refus") {
        updates.covid_inj1 = "REFUS";
        updates.covid_inj2 = "REFUS";
        updates.covid_inj3 = "REFUS";
      } else if (opt.effect === "attente") {
        if (!record.covid_inj1 || record.covid_inj1 === "REFUS") updates.covid_inj1 = "En attente";
        if (!record.covid_inj2 || record.covid_inj2 === "REFUS") updates.covid_inj2 = "En attente";
        if (!record.covid_inj3 || record.covid_inj3 === "REFUS") updates.covid_inj3 = "En attente";
      } else {
        // reset → vide
        updates.covid_inj1 = null;
        updates.covid_inj2 = null;
        updates.covid_inj3 = null;
      }
    }

    if (type === "grippe") {
      if (opt.effect === "refus") {
        updates.grippe_inj1 = "REFUS";
      } else if (opt.effect === "attente") {
        if (!record.grippe_inj1 || record.grippe_inj1 === "REFUS") updates.grippe_inj1 = "En attente";
      } else {
        updates.grippe_inj1 = null;
      }
    }

    await base44.entities.Vaccination.update(record.id, updates);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="flex items-center gap-1.5 min-w-[160px]">
      <StatutDropdown
        options={COVID_OPTIONS}
        currentValue={covidVal}
        onChoose={(opt) => applyChoice("covid", opt)}
        label="Covid"
        colorKey="covid"
      />
      <StatutDropdown
        options={GRIPPE_OPTIONS}
        currentValue={grippeVal}
        onChoose={(opt) => applyChoice("grippe", opt)}
        label="Grippe"
        colorKey="grippe"
      />
      {saving && <span className="text-xs text-slate-300 animate-pulse">…</span>}
    </div>
  );
}

// ─── Bulk inject modal ────────────────────────────────────────────────────────
function BulkInjectModal({ column, label, records, onClose, onDone }) {
  const [date, setDate] = useState("");
  const [lot, setLot] = useState("");
  const [saving, setSaving] = useState(false);

  // Records that don't have REFUS in that column
  const eligible = records.filter(r => {
    const v = r[column];
    if (!v) return true;
    return !v.toLowerCase().includes("refus");
  });

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    const normalized = normalizeDate(date);
    const infos = lot ? `Lot: ${lot}` : undefined;
    await Promise.all(eligible.map(rec => {
      const updates = { [column]: normalized };
      if (infos && !rec.infos) updates.infos = infos;
      return base44.entities.Vaccination.update(rec.id, updates);
    }));
    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Injection en masse</h2>
            <p className="text-sm text-slate-500">Colonne : <span className="font-semibold text-blue-700">{label}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="bg-blue-50 rounded-lg px-4 py-2 mb-4 text-sm text-blue-700">
          {eligible.length} résident{eligible.length > 1 ? "s" : ""} éligible{eligible.length > 1 ? "s" : ""} (sans REFUS)
          {records.length - eligible.length > 0 && (
            <span className="ml-2 text-red-500">· {records.length - eligible.length} exclus (REFUS)</span>
          )}
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date d'injection *</label>
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="JJ/MM/AAAA"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de lot (optionnel)</label>
            <input
              type="text"
              value={lot}
              onChange={e => setLot(e.target.value)}
              placeholder="ex: AB12345"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!date || saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {saving ? "Enregistrement…" : `Appliquer à ${eligible.length} résident${eligible.length > 1 ? "s" : ""}`}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row with per-cell editing ────────────────────────────────────────────────
function VacRow({ resident, record, onSaved, showYear = false }) {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!record) return;
    setResetting(true);
    await base44.entities.Vaccination.update(record.id, {
      covid_inj1: null,
      covid_inj2: null,
      covid_inj3: null,
      grippe_inj1: null,
      infos: null,
    });
    setResetting(false);
    onSaved();
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
      {showYear && (
        <td className="px-3 py-1.5 text-xs font-semibold text-slate-600">{record?.year}</td>
      )}
      <td className="px-3 py-2 sticky left-0 bg-white font-medium text-slate-800 text-sm whitespace-nowrap">
        {resident ? (
          <>{resident.last_name} {resident.first_name || ""}<span className="ml-2 text-xs text-slate-400">Ch. {resident.room}</span></>
        ) : record?.resident_name}
      </td>
      {record ? (
        <>
          <td className="px-2 py-1.5 text-center">
            <EditableCell value={record.covid_inj1} field="covid_inj1" recordId={record.id} onSaved={onSaved} />
          </td>
          <td className="px-2 py-1.5 text-center">
            <EditableCell value={record.covid_inj2} field="covid_inj2" recordId={record.id} onSaved={onSaved} />
          </td>
          <td className="px-2 py-1.5 text-center">
            <EditableCell value={record.covid_inj3} field="covid_inj3" recordId={record.id} onSaved={onSaved} />
          </td>
          <td className="px-2 py-1.5 text-center">
            <EditableCell value={record.grippe_inj1} field="grippe_inj1" recordId={record.id} onSaved={onSaved} />
          </td>
          <td className="px-2 py-1.5">
            <InfosCell record={record} onSaved={onSaved} />
          </td>
          <td className="px-2 py-1.5">
            <button
              onClick={handleReset}
              disabled={resetting}
              title="Réinitialiser la ligne"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 text-center"><span className="text-slate-200 text-xs">—</span></td>
          <td className="px-3 py-2 text-center"><span className="text-slate-200 text-xs">—</span></td>
          <td className="px-3 py-2 text-center"><span className="text-slate-200 text-xs">—</span></td>
          <td className="px-3 py-2 text-center"><span className="text-slate-200 text-xs">—</span></td>
          <td className="px-3 py-2">
            <button
              onClick={async () => {
                await base44.entities.Vaccination.create({
                  resident_id: resident.id,
                  resident_name: `${resident.last_name} ${resident.first_name || ""}`.trim(),
                  year: CURRENT_YEAR,
                  archived: false,
                });
                onSaved();
              }}
              className="text-xs text-green-600 hover:underline"
            >+ Ajouter</button>
          </td>
        </>
      )}
    </tr>
  );
}

// ─── Column header with bulk inject button ────────────────────────────────────
function ColHeader({ label, colorClass, onBulk }) {
  return (
    <th className={`px-3 py-2 text-center ${colorClass}`}>
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold text-xs">{label}</span>
        <button
          onClick={onBulk}
          title="Injection en masse"
          className="flex items-center gap-0.5 text-xs opacity-60 hover:opacity-100 bg-white/70 hover:bg-white px-1.5 py-0.5 rounded transition-all"
        >
          <Zap className="h-2.5 w-2.5" /> masse
        </button>
      </div>
    </th>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Vaccination() {
  const [residents, setResidents] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [archiveOpenName, setArchiveOpenName] = useState(null);
  const [bulkModal, setBulkModal] = useState(null); // { column, label, records }
  const [showPrintTable, setShowPrintTable] = useState(false);
  const pastYears = [...Array(CURRENT_YEAR - 2021)].map((_, i) => CURRENT_YEAR - 1 - i);
  const [selectedPastYear, setSelectedPastYear] = useState(pastYears[0] ?? null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [res, vac] = await Promise.all([
      base44.entities.Resident.list(),
      base44.entities.Vaccination.list(),
    ]);
    setResidents(res);
    setVaccinations(vac);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const vacByName = {};
  vaccinations.forEach(v => {
    const key = (v.resident_name || "").toLowerCase().trim();
    if (!vacByName[key]) vacByName[key] = [];
    vacByName[key].push(v);
  });

  const activeResidents = residents
    .filter(r => !r.archived)
    .filter(r => floorFilter === "ALL" || r.floor === floorFilter)
    .filter(r => {
      const q = search.toLowerCase();
      return !q || `${r.last_name} ${r.first_name || ""}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const roomA = parseInt((a.room || "").replace(/\D/g, "") || "0");
      const roomB = parseInt((b.room || "").replace(/\D/g, "") || "0");
      return roomA - roomB;
    });

  const archivedResidents = residents
    .filter(r => r.archived)
    .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));

  const allResidentIds = new Set(residents.map(r => r.id));
  const orphanVaccinations = vaccinations.filter(v => {
    if (v.archived !== true) return false;
    if (v.resident_id && allResidentIds.has(v.resident_id)) return false;
    const vName = (v.resident_name || "").toLowerCase().trim();
    return !residents.find(r => {
      const rLast = (r.last_name || "").toLowerCase().trim();
      const rFull = `${r.last_name} ${r.first_name || ""}`.toLowerCase().trim();
      return rFull === vName || vName === rLast || vName.startsWith(rLast + " ") || vName.startsWith(rLast + ".");
    });
  });
  const orphanByName = {};
  orphanVaccinations.forEach(v => {
    const key = (v.resident_name || "").trim();
    if (!orphanByName[key]) orphanByName[key] = [];
    orphanByName[key].push(v);
  });
  const orphanNames = Object.keys(orphanByName).sort();

  const getVaccinsForResident = (resident) => {
    const byId = vaccinations.filter(v => v.resident_id === resident.id);
    if (byId.length) return byId;
    const fullKey = `${resident.last_name} ${resident.first_name || ""}`.toLowerCase().trim();
    if (vacByName[fullKey]?.length) return vacByName[fullKey];
    const lastName = (resident.last_name || "").toLowerCase().trim();
    return vaccinations.filter(v => {
      const vName = (v.resident_name || "").toLowerCase().trim();
      return vName === lastName || vName.startsWith(lastName + " ") || vName.startsWith(lastName + ".");
    });
  };

  // Get current year records for active residents (for bulk inject)
  const currentYearRecords = activeResidents
    .map(r => getVaccinsForResident(r).find(v => v.year === CURRENT_YEAR))
    .filter(Boolean);

  // Stats sur TOUS les résidents actifs (tous étages) pour l'année en cours
  const allActiveCurrentYearRecords = residents
    .filter(r => !r.archived)
    .map(r => getVaccinsForResident(r).find(v => v.year === CURRENT_YEAR))
    .filter(Boolean);

  const covidEnAttente = allActiveCurrentYearRecords.filter(r =>
    [r.covid_inj1, r.covid_inj2, r.covid_inj3].some(v => v && v.toLowerCase() === "en attente")
  ).length;

  const grippeEnAttente = allActiveCurrentYearRecords.filter(r =>
    r.grippe_inj1 && r.grippe_inj1.toLowerCase() === "en attente"
  ).length;

  const COL_HEADERS = [
    { field: "covid_inj1", label: `${CURRENT_YEAR} — Covid Inj. 1`, colorClass: "bg-blue-50 text-blue-700" },
    { field: "covid_inj2", label: `${CURRENT_YEAR} — Covid Inj. 2`, colorClass: "bg-blue-50 text-blue-700" },
    { field: "covid_inj3", label: `${CURRENT_YEAR} — Covid Inj. 3`, colorClass: "bg-blue-50 text-blue-700" },
    { field: "grippe_inj1", label: `${CURRENT_YEAR} — Grippe`, colorClass: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {showPrintTable && (
        <PrintableVaccinationTable
          residents={residents.filter(r => !r.archived)}
          onClose={() => setShowPrintTable(false)}
        />
      )}
      {bulkModal && (
        <BulkInjectModal
          column={bulkModal.column}
          label={bulkModal.label}
          records={bulkModal.records}
          onClose={() => setBulkModal(null)}
          onDone={() => { setBulkModal(null); loadData(); }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-green-100">
              <Syringe className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vaccination</h1>
              <p className="text-slate-500 text-sm">Suivi Covid &amp; Grippe — Année {CURRENT_YEAR}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintTable(true)}
              className="flex items-center gap-2 text-sm text-white bg-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-lg"
            >
              <Printer className="h-3.5 w-3.5" /> Fiche recueil
            </button>
            <button onClick={loadData} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5" /> Actualiser
            </button>
          </div>
        </div>

        {/* Encadrés comptage En attente */}
        {!loading && (
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 min-w-[200px]">
              <div className="p-2 bg-blue-100 rounded-full">
                <Syringe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-blue-500 font-medium uppercase tracking-wide">Covid — En attente</div>
                <div className="text-2xl font-bold text-blue-800">{covidEnAttente}</div>
                <div className="text-xs text-blue-400">résident{covidEnAttente > 1 ? "s" : ""} à vacciner</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 min-w-[200px]">
              <div className="p-2 bg-purple-100 rounded-full">
                <Syringe className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-purple-500 font-medium uppercase tracking-wide">Grippe — En attente</div>
                <div className="text-2xl font-bold text-purple-800">{grippeEnAttente}</div>
                <div className="text-xs text-purple-400">résident{grippeEnAttente > 1 ? "s" : ""} à vacciner</div>
              </div>
            </div>
          </div>
        )}

        {/* Search + Floor filter */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un résident..."
            className="w-64 pl-3 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
          />
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {[["ALL", "Tous"], ["RDC", "RDC"], ["1ER", "1er"]].map(([val, label]) => (
              <button key={val} onClick={() => setFloorFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${floorFilter === val ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Date injectée</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>REFUS</span>
          <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-slate-400" />Cliquez sur un en-tête de colonne pour injection en masse</span>
          <span className="flex items-center gap-1.5">✏️ Cliquez sur une cellule pour éditer</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* ── CURRENT YEAR TABLE ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">Résidents actuels — {CURRENT_YEAR}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{activeResidents.length} résidents</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left sticky left-0 bg-slate-100 z-10">Résident</th>
                      {COL_HEADERS.map(col => (
                        <ColHeader
                          key={col.field}
                          label={col.label}
                          colorClass={col.colorClass}
                          onBulk={() => setBulkModal({ column: col.field, label: col.label, records: currentYearRecords })}
                        />
                      ))}
                      <th className="px-3 py-2 text-left">Infos / Statut</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeResidents.map(resident => {
                      const allRecords = getVaccinsForResident(resident);
                      const currentRecord = allRecords.find(r => r.year === CURRENT_YEAR);
                      return <VacRow key={resident.id} resident={resident} record={currentRecord} onSaved={loadData} />;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PAST YEARS — ONGLETS ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="font-semibold text-slate-700 text-sm">Années précédentes — résidents actuels</span>
              </div>
              <div className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto border-b border-slate-100">
                {pastYears.map(year => (
                  <button key={year} onClick={() => setSelectedPastYear(year)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      selectedPastYear === year ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}>
                    {year}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                {selectedPastYear && (() => {
                  const rows = residents
                    .filter(r => !r.archived)
                    .filter(r => floorFilter === "ALL" || r.floor === floorFilter)
                    .map(r => ({ resident: r, rec: getVaccinsForResident(r).find(v => v.year === selectedPastYear) }))
                    .filter(({ rec }) => !!rec);
                  if (rows.length === 0) return <p className="px-4 py-6 text-center text-sm text-slate-400 italic">Aucune donnée pour {selectedPastYear}</p>;
                  return (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-xs text-slate-400">
                          <th className="px-3 py-1.5 text-left sticky left-0 bg-slate-50">Résident</th>
                          <th className="px-3 py-1.5 text-center">Covid Inj. 1</th>
                          <th className="px-3 py-1.5 text-center">Covid Inj. 2</th>
                          <th className="px-3 py-1.5 text-center">Covid Inj. 3</th>
                          <th className="px-3 py-1.5 text-center">Grippe</th>
                          <th className="px-3 py-1.5 text-left">Infos / Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ resident, rec }) => <VacRow key={resident.id} resident={resident} record={rec} onSaved={loadData} />)}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* ── BOUTON RÉSIDENTS SORTIS ── */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowArchivedSection(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showArchivedSection ? "bg-amber-700 text-white border-amber-700" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                }`}
              >
                <Archive className="h-4 w-4" />
                Résidents sortis — historique
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${showArchivedSection ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-700"}`}>
                  {archivedResidents.length + orphanNames.length}
                </span>
              </button>
            </div>

            {/* ── PANEL RÉSIDENTS SORTIS ── */}
            {showArchivedSection && (
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-800 text-sm">Résidents sortis — données historiques</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {archivedResidents.length === 0 && orphanNames.length === 0 && (
                    <p className="px-4 py-4 text-sm text-slate-400 italic">Aucun résident archivé.</p>
                  )}
                  {[
                    ...archivedResidents.map(r => ({ key: r.id, name: `${r.last_name} ${r.first_name || ""}`.trim(), resident: r, orphan: false })),
                    ...orphanNames.map(n => ({ key: `orphan-${n}`, name: n, resident: null, orphan: true })),
                  ].sort((a, b) => a.name.localeCompare(b.name)).map(({ key, name, resident, orphan }) => {
                    const lastName = resident ? (resident.last_name || "").toLowerCase().trim() : "";
                    const recs = orphan
                      ? orphanByName[name].sort((a, b) => b.year - a.year)
                      : vaccinations.filter(v => {
                          if (v.resident_id === resident.id) return true;
                          const vName = (v.resident_name || "").toLowerCase().trim();
                          const fullName = name.toLowerCase().trim();
                          return vName === fullName || vName === lastName || vName.startsWith(lastName + " ") || vName.startsWith(lastName + ".");
                        }).sort((a, b) => b.year - a.year);
                    const isOpen = archiveOpenName === key;
                    return (
                      <div key={key}>
                        <button onClick={() => setArchiveOpenName(isOpen ? null : key)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{name}</span>
                            {resident?.room && <span className="text-xs text-slate-400">Ch. {resident.room}</span>}
                            {resident?.date_sortie && <span className="text-xs text-slate-400">Sorti le {resident.date_sortie}</span>}
                            {orphan && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">historique</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{recs.length} entrée{recs.length > 1 ? "s" : ""}</span>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-xs text-slate-400">
                                  <th className="px-3 py-1.5 text-left">Année</th>
                                  <th className="px-3 py-1.5 text-left">Résident</th>
                                  <th className="px-3 py-1.5 text-center">Covid Inj. 1</th>
                                  <th className="px-3 py-1.5 text-center">Covid Inj. 2</th>
                                  <th className="px-3 py-1.5 text-center">Covid Inj. 3</th>
                                  <th className="px-3 py-1.5 text-center">Grippe</th>
                                  <th className="px-3 py-1.5 text-left">Infos / Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recs.length === 0 && <tr><td colSpan={7} className="px-3 py-3 text-center text-xs text-slate-400 italic">Aucune vaccination enregistrée</td></tr>}
                                {recs.map(rec => <VacRow key={rec.id} resident={resident} record={rec} onSaved={loadData} showYear />)}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
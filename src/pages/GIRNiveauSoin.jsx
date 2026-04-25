import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X, Printer } from "lucide-react";

const GIR_OPTIONS = ["1", "2", "3", "4", "N/A"];
const NIVEAU_OPTIONS = ["A", "B", "C", "D", "En cours"];

function Cell({ children, className = "" }) {
  return <td className={`border border-slate-300 px-2 py-1.5 text-sm ${className}`}>{children}</td>;
}

function ToggleGroup({ options, value, onChange, colorFn }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${
            value === opt
              ? colorFn(opt)
              : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          {opt === "N/A" ? <span title="Moins de 60 ans — GIR non applicable">⊘ <span className="font-normal">(&lt;60 ans)</span></span> : opt}
        </button>
      ))}
    </div>
  );
}

function girColor(v) {
  const map = { "N/A": "bg-slate-500 text-white border-slate-500", "1": "bg-red-500 text-white border-red-500", "2": "bg-orange-400 text-white border-orange-400", "3": "bg-yellow-400 text-slate-800 border-yellow-400", "4": "bg-green-400 text-white border-green-400", 1: "bg-red-500 text-white border-red-500", 2: "bg-orange-400 text-white border-orange-400", 3: "bg-yellow-400 text-slate-800 border-yellow-400", 4: "bg-green-400 text-white border-green-400" };
  return map[v] || "bg-slate-200 text-slate-700 border-slate-300";
}

function niveauColor(v) {
  const map = { A: "bg-blue-600 text-white border-blue-600", B: "bg-blue-400 text-white border-blue-400", C: "bg-indigo-400 text-white border-indigo-400", D: "bg-indigo-200 text-slate-800 border-indigo-200", "En cours": "bg-amber-400 text-slate-800 border-amber-400" };
  return map[v] || "bg-slate-200 text-slate-700 border-slate-300";
}

function SummaryModal({ title, residents, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-slate-800 text-base">{title} <span className="text-slate-400 font-normal text-sm">({residents.length} résidents)</span></h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">{children}</div>
      </div>
    </div>
  );
}

function getDailyPassword() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return day + month;
}

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
        <h2 className="font-bold text-slate-800 text-base mb-2">Modifier cette valeur ?</h2>
        <p className="text-sm text-slate-500 mb-5">Êtes-vous sûr de vouloir modifier cette valeur déjà paramétrée ?</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg py-2 text-sm font-semibold transition-colors">Confirmer</button>
          <button onClick={onCancel} className="flex-1 border border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function GIRNiveauSoin() {
  const [modal, setModal] = useState(null);
  const [localUpdates, setLocalUpdates] = useState({});
  const [saving, setSaving] = useState({});
  const [pendingChange, setPendingChange] = useState(null);
  const [pageUnlocked, setPageUnlocked] = useState(false);
  const [pagePassword, setPagePassword] = useState("");
  const [pagePasswordError, setPagePasswordError] = useState(false);

  const { data: residents = [], isLoading: isLoadingResidents } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  const { data: niveauSoins = [], isLoading: isLoadingNiveaux } = useQuery({
    queryKey: ["niveau_soin"],
    queryFn: () => base44.entities.NiveauSoin.list("-created_date", 500),
  });

  const records = useMemo(() => {
    const map = {};
    niveauSoins.forEach((n) => { map[n.resident_id] = n; });
    Object.entries(localUpdates).forEach(([id, data]) => {
      map[id] = { ...(map[id] || {}), ...data };
    });
    return map;
  }, [niveauSoins, localUpdates]);

  const getRecord = (residentId) => records[residentId] || {};

  const updateField = async (resident, field, value) => {
    const existing = records[resident.id];
    const fieldsToProtect = ["gir", "niveau_soin", "appel_nuit"];
    const hasValue = existing && existing[field] !== undefined && existing[field] !== null && existing[field] !== "";
    if (fieldsToProtect.includes(field) && hasValue) {
      setPendingChange({ resident, field, value });
      return;
    }
    await doUpdateField(resident, field, value);
  };

  const doUpdateField = async (resident, field, value) => {
    const existing = records[resident.id];
    const updated = {
      resident_id: resident.id,
      resident_name: `${resident.last_name} ${resident.first_name || ""}`.trim(),
      ...existing,
      [field]: value,
    };
    setLocalUpdates((prev) => ({ ...prev, [resident.id]: { ...(prev[resident.id] || {}), [field]: value } }));
    setSaving((s) => ({ ...s, [resident.id]: true }));
    if (existing?.id) {
      await base44.entities.NiveauSoin.update(existing.id, { [field]: value });
    } else {
      const created = await base44.entities.NiveauSoin.create(updated);
      setLocalUpdates((prev) => ({ ...prev, [resident.id]: { ...(prev[resident.id] || {}), ...created } }));
    }
    if (field === "appel_nuit") {
      await base44.entities.Resident.update(resident.id, { appel_nuit: value });
    }
    setSaving((s) => ({ ...s, [resident.id]: false }));
  };

  const handleConfirm = async () => {
    const { resident, field, value } = pendingChange;
    setPendingChange(null);
    await doUpdateField(resident, field, value);
  };

  const isLoading = isLoadingResidents || isLoadingNiveaux;
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  if (!pageUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-80">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Entrer mot de passe</h2>
          <input
            autoFocus
            type="password"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-purple-500 text-center tracking-widest"
            value={pagePassword}
            onChange={(e) => { setPagePassword(e.target.value); setPagePasswordError(false); }}
            onKeyDown={(e) => e.key === "Enter" && (pagePassword === getDailyPassword() ? (setPageUnlocked(true), setPagePasswordError(false)) : setPagePasswordError(true))}
            placeholder="••••"
          />
          {pagePasswordError && <p className="text-xs text-red-500 mb-2 text-center">Mot de passe incorrect</p>}
          <button
            onClick={() => { if (pagePassword === getDailyPassword()) { setPageUnlocked(true); setPagePasswordError(false); } else { setPagePasswordError(true); } }}
            className="w-full bg-purple-800 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Accéder
          </button>
        </div>
      </div>
    );
  }

  const sorted = [...residents].sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));

  const sansGir = sorted.filter((r) => !getRecord(r.id).gir && getRecord(r.id).gir !== "N/A");
  const sansNiveau = sorted.filter((r) => !getRecord(r.id).niveau_soin);
  const sansAppel = sorted.filter((r) => getRecord(r.id).appel_nuit === undefined || getRecord(r.id).appel_nuit === null || getRecord(r.id).appel_nuit === "");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden bg-purple-800 text-white py-4 px-6 shadow-md flex items-center justify-between">
        <h1 className="text-xl font-bold flex-1 text-center">GIR / Niveau de soin / Appel Nuit</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <Printer className="h-4 w-4" /> Imprimer
        </button>
      </div>

      {/* Print-only recap table */}
      <div className="hidden print:block gir-print-area" style={{ padding: "4mm", fontFamily: "Arial, sans-serif" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", textAlign: "center", marginBottom: "8px" }}>GIR / Niveau de soin / Appel Nuit</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#581c87", color: "white" }}>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "left" }}>Résident</th>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "center" }}>Chambre</th>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "center" }}>GIR</th>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "center" }}>Niveau de soin</th>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "center" }}>Appel nuit</th>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "left" }}>Info appel nuit</th>
              <th style={{ border: "1px solid #ccc", padding: "6px 9px", textAlign: "left" }}>Pompes funèbres</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((resident, idx) => {
              const rec = getRecord(resident.id);
              return (
                <tr key={resident.id} style={{ background: idx % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px", fontWeight: "600" }}>{resident.title} {resident.last_name} {resident.first_name || ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px", textAlign: "center" }}>{resident.room}</td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px", textAlign: "center", fontWeight: "700" }}>{rec.gir || "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px", textAlign: "center", fontWeight: "700" }}>{rec.niveau_soin || "—"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px", textAlign: "center" }}>
                    {rec.appel_nuit === true ? "Oui" : rec.appel_nuit === false ? "Non" : "—"}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px" }}>{rec.appel_nuit_info || ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 9px" }}>{rec.pompes_funebres || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="gir-print-legend" style={{ marginTop: "12px", border: "1px solid #94a3b8", borderRadius: "8px", padding: "8px 12px", fontSize: "9px", lineHeight: "1.6", color: "#1e293b", pageBreakInside: "avoid", breakInside: "avoid" }}>
          <p style={{ fontWeight: "700", marginBottom: "4px" }}>Légende — Niveau de soin</p>
          <p><strong>A</strong> : Prolonger la vie par tous les soins nécessaires</p>
          <p><strong>B</strong> : Prolonger la vie par des soins limités</p>
          <p><strong>C</strong> : Assurer le confort prioritairement à prolonger la vie</p>
          <p><strong>D</strong> : Assurer le confort sans viser à prolonger la vie</p>
          <p style={{ marginTop: "6px", fontStyle: "italic", color: "#475569" }}>En dehors de niveau de soins indiqué, le médecin contacté définira la conduite à tenir.</p>
        </div>
      </div>

      {pendingChange && (
        <ConfirmModal
          onConfirm={handleConfirm}
          onCancel={() => setPendingChange(null)}
        />
      )}

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3 p-4 print:hidden">
        <button onClick={() => setModal("gir")} className="flex flex-col items-center justify-center bg-red-50 border-2 border-red-300 hover:bg-red-100 rounded-xl px-5 py-3 transition-colors">
          <span className="text-3xl font-bold text-red-600">{sansGir.length}</span>
          <span className="text-xs text-red-500 font-semibold mt-1">Sans GIR</span>
        </button>
        <button onClick={() => setModal("niveau")} className="flex flex-col items-center justify-center bg-blue-50 border-2 border-blue-300 hover:bg-blue-100 rounded-xl px-5 py-3 transition-colors">
          <span className="text-3xl font-bold text-blue-600">{sansNiveau.length}</span>
          <span className="text-xs text-blue-500 font-semibold mt-1">Sans niveau de soin</span>
        </button>
        <button onClick={() => setModal("appel")} className="flex flex-col items-center justify-center bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 rounded-xl px-5 py-3 transition-colors">
          <span className="text-3xl font-bold text-amber-600">{sansAppel.length}</span>
          <span className="text-xs text-amber-500 font-semibold mt-1">Sans appel nuit défini</span>
        </button>
        <div className="border border-slate-300 rounded-xl px-4 py-3 bg-white text-xs text-slate-700 leading-5 max-w-sm">
          <p className="font-bold text-slate-800 mb-1">Légende — Niveau de soin</p>
          <p><span className="font-bold text-blue-700">A</span> : Prolonger la vie par tous les soins nécessaires</p>
          <p><span className="font-bold text-blue-500">B</span> : Prolonger la vie par des soins limités</p>
          <p><span className="font-bold text-indigo-500">C</span> : Assurer le confort prioritairement à prolonger la vie</p>
          <p><span className="font-bold text-indigo-400">D</span> : Assurer le confort sans viser à prolonger la vie</p>
          <p className="mt-1.5 italic text-slate-500">En dehors de niveau de soins indiqué, le médecin contacté définira la conduite à tenir.</p>
        </div>
      </div>

      {/* Modal GIR */}
      {modal === "gir" && (
        <SummaryModal title="Résidents sans GIR" residents={sansGir} onClose={() => setModal(null)}>
          {sansGir.map((resident) => (
            <div key={resident.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <span className="text-sm font-medium text-slate-700">{resident.title} {resident.last_name} {resident.first_name || ""} <span className="text-xs text-slate-400">Ch.{resident.room}</span></span>
              <ToggleGroup options={GIR_OPTIONS} value={getRecord(resident.id).gir} onChange={(v) => updateField(resident, "gir", v)} colorFn={girColor} />
            </div>
          ))}
        </SummaryModal>
      )}

      {/* Modal Niveau */}
      {modal === "niveau" && (
        <SummaryModal title="Résidents sans niveau de soin" residents={sansNiveau} onClose={() => setModal(null)}>
          {sansNiveau.map((resident) => (
            <div key={resident.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <span className="text-sm font-medium text-slate-700">{resident.title} {resident.last_name} {resident.first_name || ""} <span className="text-xs text-slate-400">Ch.{resident.room}</span></span>
              <ToggleGroup options={NIVEAU_OPTIONS} value={getRecord(resident.id).niveau_soin} onChange={(v) => updateField(resident, "niveau_soin", v)} colorFn={niveauColor} />
            </div>
          ))}
        </SummaryModal>
      )}

      {/* Modal Appel nuit */}
      {modal === "appel" && (
        <SummaryModal title="Résidents sans appel nuit défini" residents={sansAppel} onClose={() => setModal(null)}>
          {sansAppel.map((resident) => (
            <div key={resident.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <span className="text-sm font-medium text-slate-700">{resident.title} {resident.last_name} {resident.first_name || ""} <span className="text-xs text-slate-400">Ch.{resident.room}</span></span>
              <div className="flex gap-1">
                <button onClick={() => updateField(resident, "appel_nuit", true)} className="px-2 py-0.5 rounded text-xs font-bold border border-red-500 bg-white text-red-500 hover:bg-red-50">Oui</button>
                <button onClick={() => updateField(resident, "appel_nuit", false)} className="px-2 py-0.5 rounded text-xs font-bold border border-green-500 bg-white text-green-500 hover:bg-green-50">Non</button>
              </div>
            </div>
          ))}
        </SummaryModal>
      )}

      <div className="p-4 overflow-x-auto" style={{ display: 'block' }} id="interactive-table">
        <table className="w-full border-collapse min-w-[900px] bg-white shadow rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-purple-800 text-white text-sm">
              <th className="border border-purple-700 px-3 py-2 text-left font-semibold">Résident</th>
              <th className="border border-purple-700 px-3 py-2 text-center font-semibold w-32">GIR</th>
              <th className="border border-purple-700 px-3 py-2 text-center font-semibold w-48">Niveau de soin</th>
              <th className="border border-purple-700 px-3 py-2 text-center font-semibold w-64">Appel de nuit</th>
              <th className="border border-purple-700 px-3 py-2 text-left font-semibold">Pompes funèbres</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((resident, idx) => {
              const rec = getRecord(resident.id);
              return (
                <tr key={resident.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <Cell className="font-medium text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {saving[resident.id] && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                      <span>{resident.title} {resident.last_name} {resident.first_name || ""}</span>
                      <span className="text-xs text-slate-400 ml-1">Ch.{resident.room}</span>
                    </div>
                  </Cell>

                  {/* GIR */}
                  <Cell className="text-center">
                    <ToggleGroup
                      options={GIR_OPTIONS}
                      value={rec.gir}
                      onChange={(v) => updateField(resident, "gir", v)}
                      colorFn={girColor}
                    />
                  </Cell>

                  {/* Niveau de soin */}
                  <Cell>
                    <ToggleGroup
                      options={NIVEAU_OPTIONS}
                      value={rec.niveau_soin}
                      onChange={(v) => updateField(resident, "niveau_soin", v)}
                      colorFn={niveauColor}
                    />
                  </Cell>

                  {/* Appel de nuit */}
                  <Cell>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateField(resident, "appel_nuit", true)}
                          className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${rec.appel_nuit === true ? "bg-red-500 text-white border-red-500" : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"}`}
                        >Oui</button>
                        <button
                          onClick={() => updateField(resident, "appel_nuit", false)}
                          className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${rec.appel_nuit === false && rec.appel_nuit !== undefined ? "bg-green-500 text-white border-green-500" : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"}`}
                        >Non</button>
                      </div>
                      {rec.appel_nuit === true && (
                        <textarea
                          value={rec.appel_nuit_info || ""}
                          onChange={(e) => updateField(resident, "appel_nuit_info", e.target.value)}
                          placeholder="Informations..."
                          rows={2}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:border-purple-400"
                        />
                      )}
                    </div>
                  </Cell>

                  {/* Pompes funèbres */}
                  <Cell>
                    <textarea
                      value={rec.pompes_funebres || ""}
                      onChange={(e) => updateField(resident, "pompes_funebres", e.target.value)}
                      placeholder="Nom, coordonnées..."
                      rows={2}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs resize-none focus:outline-none focus:border-purple-400"
                    />
                  </Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
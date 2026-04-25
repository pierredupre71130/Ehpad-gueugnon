import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Printer, X } from "lucide-react";

function getKey(floor, repas) {
  return `${floor}_${repas}`;
}

function Etiquette({ resident }) {
  const name = [resident.title, resident.last_name?.toUpperCase()].filter(Boolean).join(" ");
  const hasDiet = resident.regime_mixe || resident.regime_diabetique || resident.epargne_intestinale || resident.allergie_poisson;
  return (
    <div
      className="etiquette-item"
      style={{
        border: "2.5px solid #1e293b",
        borderRadius: "8px",
        padding: "10px 16px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        background: "#fff",
        marginBottom: "8px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        gap: "16px",
      }}
    >
      {/* Infos principale (gauche) */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "34px", fontWeight: "900", color: "#0f172a", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </div>
        {resident.first_name && (
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#1e293b", lineHeight: 1.1 }}>
            {resident.first_name}
          </div>
        )}
      </div>

      {/* Chambre (centre) */}
      <div style={{ fontSize: "34px", fontWeight: "900", color: "#1e293b", letterSpacing: "0.03em", whiteSpace: "nowrap", borderLeft: "2px solid #e2e8f0", borderRight: hasDiet ? "2px solid #e2e8f0" : "none", paddingLeft: "16px", paddingRight: hasDiet ? "16px" : "0" }}>
        Ch. {resident.room}
      </div>

      {/* Régimes / allergies (droite) */}
      {hasDiet && (
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
          {resident.regime_mixe && (
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#c2410c", whiteSpace: "nowrap" }}>Mixé</span>
          )}
          {resident.regime_diabetique && (
            <span style={{ fontSize: "22px", fontWeight: "800", color: "#7e22ce", whiteSpace: "nowrap" }}>Diabétique</span>
          )}
          {resident.epargne_intestinale && (
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#15803d", whiteSpace: "nowrap" }}>Épargne intestinale</span>
          )}
          {resident.allergie_poisson && (
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#dc2626", whiteSpace: "nowrap" }}>⚠ Allergie poisson</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function EtiquettesRepas() {
  const [activeFloor, setActiveFloor] = useState("RDC");
  const [activeRepas, setActiveRepas] = useState("midi");
  const [allSelections, setAllSelections] = useState({});
  const [dbLoaded, setDbLoaded] = useState(false);
  const saveTimerRef = useRef({});
  // Garde en mémoire les IDs de la DB par clé (pour les updates)
  const dbRecordIds = useRef({});

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: selectionsData = [], isSuccess } = useQuery({
    queryKey: ["etiquette_selections"],
    queryFn: () => base44.entities.EtiquetteSelection.list(),
    staleTime: Infinity, // Ne pas recharger automatiquement
  });

  // Charger depuis la DB une seule fois au démarrage
  useEffect(() => {
    if (isSuccess && !dbLoaded) {
      const map = {};
      selectionsData.forEach((s) => {
        map[s.cle] = s.resident_ids || [];
        dbRecordIds.current[s.cle] = s.id;
      });
      setAllSelections(map);
      setDbLoaded(true);
    }
  }, [isSuccess, selectionsData, dbLoaded]);

  const currentKey = getKey(activeFloor, activeRepas);
  const selected = allSelections[currentKey] || [];

  const saveToDb = (key, ids) => {
    if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key]);
    saveTimerRef.current[key] = setTimeout(async () => {
      const existingId = dbRecordIds.current[key];
      if (existingId) {
        await base44.entities.EtiquetteSelection.update(existingId, { resident_ids: ids });
      } else {
        const created = await base44.entities.EtiquetteSelection.create({ cle: key, resident_ids: ids });
        dbRecordIds.current[key] = created.id;
      }
    }, 800);
  };

  const setSelected = (updater) => {
    setAllSelections((prev) => {
      const prevSelected = prev[currentKey] || [];
      const next = typeof updater === "function" ? updater(prevSelected) : updater;
      const updated = { ...prev, [currentKey]: next };
      saveToDb(currentKey, next);
      return updated;
    });
  };

  const floorResidents = residents.filter((r) => r.floor === activeFloor && r.last_name);
  const sortedResidents = [...floorResidents].sort((a, b) => {
    const numA = parseInt(a.room) || 0;
    const numB = parseInt(b.room) || 0;
    if (numA !== numB) return numA - numB;
    return (a.room || "").localeCompare(b.room || "");
  });

  const selectedResidents = residents.filter((r) => selected.includes(r.id) && r.last_name && r.floor === activeFloor);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };



  const handlePrint = () => {
    window.print();
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barre d'outils - masquée à l'impression */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-800">Étiquettes Repas</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2 bg-slate-800 hover:bg-slate-700" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
          </div>
        </div>
      </div>

      <div className="print:hidden max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Colonne gauche : sélection */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h2 className="font-semibold text-slate-700">Sélectionner les résidents</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Tabs value={activeFloor} onValueChange={setActiveFloor}>
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="RDC">RDC</TabsTrigger>
                    <TabsTrigger value="1ER">1er</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={activeRepas} onValueChange={setActiveRepas}>
                  <TabsList className="bg-amber-50">
                    <TabsTrigger value="midi" className="data-[state=active]:bg-amber-400 data-[state=active]:text-white">Midi</TabsTrigger>
                    <TabsTrigger value="soir" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Soir</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="text-xs text-slate-400 mb-3">Cliquez sur un résident pour l'ajouter à la liste d'impression</div>
            <div className="flex flex-col gap-1">
              {sortedResidents.map((r) => {
                const isSelected = selected.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleSelect(r.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm border ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="w-12 text-xs text-slate-400 font-mono shrink-0">Ch. {r.room}</span>
                    <span className="font-semibold">{r.title} {r.last_name?.toUpperCase()}</span>
                    <span className="text-slate-500">{r.first_name}</span>
                    {isSelected && <span className="ml-auto text-blue-500 text-xs font-bold">✓</span>}
                  </button>
                );
              })}
              {sortedResidents.length === 0 && (
                <div className="text-slate-400 text-sm text-center py-6">Aucun résident sur cet étage</div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite : liste sélectionnée */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-24">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-slate-700">À imprimer</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{selectedResidents.length} étiquette{selectedResidents.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex gap-1 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeFloor === "RDC" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"}`}>RDC</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeFloor === "1ER" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"}`}>1er</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeRepas === "midi" ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400"}`}>Midi</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeRepas === "soir" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400"}`}>Soir</span>
            </div>
            {selectedResidents.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-6">Aucun résident sélectionné</div>
            ) : (
              <div className="flex flex-col gap-1">
                {selectedResidents.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-xs text-slate-400 font-mono w-10 shrink-0">Ch. {r.room}</span>
                    <span className="font-semibold text-blue-800 text-sm flex-1">{r.title} {r.last_name?.toUpperCase()} {r.first_name}</span>
                    <button
                      onClick={() => toggleSelect(r.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                      title="Retirer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedResidents.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="mt-3 w-full text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Tout retirer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zone d'impression */}
      <div className="hidden print:block">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { background: white; }
            .print-list {
              display: flex;
              flex-direction: column;
              gap: 0;
              width: 100%;
            }
            .etiquette-item {
              width: 100% !important;
              box-sizing: border-box;
            }
          }
        `}</style>
        <div className="print-list">
          {selectedResidents.map((r) => (
            <Etiquette key={r.id} resident={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
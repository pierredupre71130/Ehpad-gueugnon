import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Printer, Loader2, Heart, Pill, Syringe, Sun, Moon, AlertTriangle } from "lucide-react";
import FloorHeader from "../components/consignes/FloorHeader";
import SectionTable from "../components/consignes/SectionTable";
import AddResidentDialog from "../components/consignes/AddResidentDialog";

const getTodayPassword = () => {
  const now = new Date();
  return String(now.getDate()).padStart(2, "0") + String(now.getMonth() + 1).padStart(2, "0");
};

export default function Consignes() {
  const [activeFloor, setActiveFloor] = useState("RDC");
  const [addDialog, setAddDialog] = useState({ open: false, section: "" });
  const [printScale, setPrintScale] = useState(() => Number(localStorage.getItem("consignes_printScale_v2") || 110));
  const [rowHeight, setRowHeight] = useState(() => Number(localStorage.getItem("consignes_rowHeight") ?? 20));
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("consignes_fontSize") ?? 11));
  const [spacingRDC, setSpacingRDC] = useState(() => Number(localStorage.getItem("consignes_spacingRDC") ?? 16));
  const [spacing1ER, setSpacing1ER] = useState(() => Number(localStorage.getItem("consignes_spacing1ER") ?? 16));
  const currentSpacing = activeFloor === "RDC" ? spacingRDC : spacing1ER;
  const setCurrentSpacing = activeFloor === "RDC" ? setSpacingRDC : setSpacing1ER;
  const [settingsLocked, setSettingsLocked] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const queryClient = useQueryClient();
  const printRef = useRef();

  useEffect(() => { localStorage.setItem("consignes_printScale_v2", printScale); }, [printScale]);
  useEffect(() => { localStorage.setItem("consignes_rowHeight", rowHeight); }, [rowHeight]);
  useEffect(() => { localStorage.setItem("consignes_fontSize", fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem("consignes_spacingRDC", spacingRDC); }, [spacingRDC]);
  useEffect(() => { localStorage.setItem("consignes_spacing1ER", spacing1ER); }, [spacing1ER]);

  const handleUnlockSettings = () => {
    if (pwdInput === getTodayPassword()) {
      setSettingsLocked(false);
      setShowPwd(false);
      setPwdInput("");
      setPwdError(false);
    } else {
      setPwdError(true);
    }
  };

  useEffect(() => {
    let style = document.getElementById('print-scale-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'print-scale-style';
      document.head.appendChild(style);
    }
    style.textContent = `@media print { .print-scale-wrapper tr { min-height: ${rowHeight}px !important; height: ${rowHeight}px !important; page-break-inside: avoid !important; break-inside: avoid !important; } .print-scale-wrapper td { padding-top: ${Math.max(1, Math.round((rowHeight - 16) / 2))}px !important; padding-bottom: ${Math.max(1, Math.round((rowHeight - 16) / 2))}px !important; } }`;
    return () => {};
  }, [rowHeight, fontSize]);

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  const { data: niveauSoins = [] } = useQuery({
    queryKey: ["niveau_soin"],
    queryFn: () => base44.entities.NiveauSoin.list("-created_date", 500),
  });

  const niveauSoinMap = React.useMemo(() => {
    const map = {};
    niveauSoins.forEach((n) => { map[n.resident_id] = n; });
    return map;
  }, [niveauSoins]);

  const { data: floorInfos = [] } = useQuery({
    queryKey: ["floorInfos"],
    queryFn: () => base44.entities.FloorInfo.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resident.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["residents"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residents"] });
    },
  });

  const handleUpdate = async (id, data) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleAdd = async (data) => {
    await createMutation.mutateAsync(data);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentFloorInfo = floorInfos.find((f) => f.floor === activeFloor);
  const floorResidents = residents.filter((r) => r.floor === activeFloor);
  const mapadResidents = floorResidents.filter((r) => r.section === "Mapad").sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const longSejourResidents = floorResidents.filter((r) => r.section === "Long Séjour").sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  // Long Séjour TA indices continue after Mapad
  const longSejourOffset = mapadResidents.length;

  const sectionTitle = (section) =>
    `${activeFloor} ${section}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Screen controls - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Feuilles de Consignes</h1>
            <div className="flex items-center gap-3">
              <Tabs value={activeFloor} onValueChange={setActiveFloor}>
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="RDC" className="text-sm font-medium">RDC</TabsTrigger>
                  <TabsTrigger value="1ER" className="text-sm font-medium">1er Étage</TabsTrigger>
                </TabsList>
              </Tabs>
              {settingsLocked ? (
                <div className="relative">
                  <button
                    onClick={() => { setShowPwd(!showPwd); setPwdError(false); setPwdInput(""); }}
                    className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium hover:bg-amber-100 transition-colors"
                  >
                    🔒 Paramètres impression
                  </button>
                  {showPwd && (
                    <div className="absolute top-10 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-64">
                      <p className="text-xs text-slate-700 font-medium mb-2">Entrer mot de passe</p>
                      <input
                        autoFocus
                        type="password"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-slate-500 text-center tracking-widest"
                        value={pwdInput}
                        onChange={(e) => { setPwdInput(e.target.value); setPwdError(false); }}
                        onKeyDown={(e) => e.key === "Enter" && handleUnlockSettings()}
                        placeholder="••••"
                      />
                      {pwdError && <p className="text-xs text-red-500 mb-2 text-center">Code incorrect</p>}
                      <button
                        onClick={handleUnlockSettings}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-1.5 text-sm font-medium transition-colors"
                      >Déverrouiller</button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSettingsLocked(true)}
                  className="flex items-center gap-1.5 bg-green-50 border border-green-300 rounded-lg px-3 py-1.5 text-xs text-green-700 font-medium hover:bg-green-100 transition-colors"
                >🔓 Paramètres ouverts</button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
          {!settingsLocked && (
            <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Espace sections</span>
                <input type="range" min={0} max={120} step={4} value={currentSpacing} onChange={(e) => setCurrentSpacing(Number(e.target.value))} className="w-28 accent-slate-700" />
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{currentSpacing}px</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Hauteur lignes</span>
                <input type="range" min={16} max={60} step={2} value={rowHeight} onChange={(e) => setRowHeight(Number(e.target.value))} className="w-28 accent-slate-700" />
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{rowHeight}px</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Police consignes</span>
                <input type="range" min={7} max={18} step={1} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-28 accent-slate-700" />
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Zoom impression</span>
                <input type="range" min={50} max={200} step={2} value={printScale} onChange={(e) => setPrintScale(Number(e.target.value))} className="w-28 accent-slate-700" />
                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{printScale}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print content */}
      <div ref={printRef} className="print-scale-wrapper max-w-6xl mx-auto px-4 py-6 print:px-2 print:py-2 print:max-w-none" style={{ zoom: `${printScale}%` }}>
        <FloorHeader floorInfo={currentFloorInfo} />

        <div className="flex flex-col gap-4">
          {/* Mapad Section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2 print:hidden">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Mapad</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 gap-1.5"
                onClick={() => setAddDialog({ open: true, section: "Mapad" })}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
            <SectionTable
              title={sectionTitle("Mapad")}
              residents={mapadResidents}
              onUpdate={handleUpdate}
              fontSize={fontSize}
              niveauSoinMap={niveauSoinMap}
            />
          </div>

          {/* Long Séjour Section */}
          <div className="flex-1" style={{ marginTop: `${currentSpacing}px` }}>
            <div className="flex items-center justify-between mb-2 print:hidden">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Long Séjour</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 gap-1.5"
                onClick={() => setAddDialog({ open: true, section: "Long Séjour" })}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
            <SectionTable
              title={sectionTitle("Long Séjour")}
              residents={longSejourResidents}
              onUpdate={handleUpdate}
              taOffset={longSejourOffset}
              fontSize={fontSize}
              niveauSoinMap={niveauSoinMap}
            />

            {/* Footer info for print - sous Long Séjour */}
            {currentFloorInfo && (
              <div className="hidden print:block mt-3 text-[9px] text-slate-600 border border-slate-400 p-2 rounded">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold text-slate-700 uppercase tracking-wide">Codes d'accès :</span>
                  <span>Digicode porte : <strong>{currentFloorInfo.digicode_porte}</strong></span>
                  <span>Digicode entrée RDC : <strong>{currentFloorInfo.digicode_entree}</strong></span>
                  <span>MDP ordi {activeFloor} : <strong>{currentFloorInfo.mot_de_passe_ordi}</strong></span>
                </div>
              </div>
            )}

            {/* Légende */}
            <div className="mt-4 border border-slate-300 rounded p-3 text-[11px] text-slate-600 print:mt-3 print:text-[9px] print:border-slate-400">
              <div className="font-semibold mb-2 text-slate-700 uppercase tracking-wide text-[10px] print:text-[8px]">Légende</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold print:px-0.5 print:py-0.5 print:text-[8px]"><Heart className="h-2.5 w-2.5 print:h-2 print:w-2" />1</span>
                  Jour TA du mois
                </span>
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-yellow-100 text-yellow-700 text-[9px] font-bold print:px-0.5 print:py-0.5 print:text-[8px]"><Pill className="h-2.5 w-2.5 print:h-2 print:w-2" /></span>
                  Traitement à écraser
                </span>
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold print:px-0.5 print:py-0.5 print:text-[8px]"><Syringe className="h-2.5 w-2.5 print:h-2 print:w-2" /><Sun className="h-2.5 w-2.5 print:h-2 print:w-2" /></span>
                  Insuline matin
                </span>
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold print:px-0.5 print:py-0.5 print:text-[8px]"><Syringe className="h-2.5 w-2.5 print:h-2 print:w-2" /><Moon className="h-2.5 w-2.5 print:h-2 print:w-2" /></span>
                  Insuline soir
                </span>
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold print:px-0.5 print:py-0.5 print:text-[8px]"><AlertTriangle className="h-2.5 w-2.5 print:h-2 print:w-2" /></span>
                  Anticoagulants
                </span>
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span style={{ fontWeight: "900", color: "#1e293b", fontSize: "11px" }}>I</span>
                  GIR
                </span>
                <span className="flex items-center gap-1 print:gap-0.5">
                  <span style={{
                    fontWeight: "900",
                    color: "#1e293b",
                    border: "2px solid #1e293b",
                    borderRadius: "50%",
                    padding: "0px 3px",
                    display: "inline-block",
                    lineHeight: "1.3",
                    fontSize: "11px",
                    minWidth: "16px",
                    textAlign: "center"
                  }}>A</span>
                  Niveau de soins (A à D)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddResidentDialog
        open={addDialog.open}
        onOpenChange={(open) => setAddDialog({ ...addDialog, open })}
        onAdd={handleAdd}
        floor={activeFloor}
        section={addDialog.section}
      />
    </div>
  );
}
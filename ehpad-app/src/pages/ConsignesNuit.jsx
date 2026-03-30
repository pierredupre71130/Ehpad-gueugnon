import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Lock, FolderOpen, Printer, Loader2, ChevronRight, X, Pill, Syringe, AlertTriangle, Sun, Moon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function NuitRow({ resident, note, onChangeNote, locked, fontSize = 9 }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note);

  useEffect(() => {
    setEditValue(note);
  }, [note]);

  const handleSave = () => {
    onChangeNote(resident.id, editValue);
    setIsEditing(false);
  };

  const icons = [];
  if (resident.traitement_ecrase) icons.push({ comp: <Pill className="h-3 w-3" /> });
  if (resident.anticoagulants) icons.push({ comp: <AlertTriangle className="h-3 w-3 text-red-500" /> });

  return (
    <tr style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <td style={{ border: "1px solid #475569" }} className="px-2 print:px-1 text-[10px] print:text-[8px] font-medium text-slate-700">
        <div className="flex gap-1">
          <div className="whitespace-nowrap">{resident.room}</div>
          <div className="flex flex-col gap-0.5">
            {icons.map((item, idx) => (
              <div key={idx} className="flex-shrink-0">
                {item.comp}
              </div>
            ))}
          </div>
        </div>
      </td>
      <td style={{ border: "1px solid #475569" }} className="px-2 print:px-1 text-[10px] print:text-[8px] font-medium text-slate-700 w-max">
        <div className="flex flex-col gap-0.5">
          <div className="font-semibold whitespace-nowrap">{resident.last_name}</div>
          <div className="whitespace-nowrap">{resident.first_name}</div>
        </div>
      </td>
      <td style={{ border: "1px solid #475569", width: "100px", maxWidth: "100px" }} className="px-2 print:px-1 text-[8px] print:text-[7px] text-slate-600">
        {resident.annotations && <div className="text-[7px] text-slate-700 whitespace-normal break-words">{resident.annotations}</div>}
      </td>
      <td style={{ border: "1px solid #475569", padding: "2px 4px" }} className="text-[9px] print:text-[7px]">
        {isEditing ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 border border-slate-300 rounded px-1 py-0.5 text-xs"
              rows="2"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="px-1 py-0.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setEditValue(note);
                setIsEditing(false);
              }}
              className="px-1 py-0.5 bg-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-400"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => !locked && setIsEditing(true)}
            className={`min-h-[16px] whitespace-pre-wrap break-words ${locked ? "cursor-default" : "cursor-text hover:bg-slate-100"}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {editValue || (locked ? "" : "—")}
          </div>
        )}
      </td>
    </tr>
  );
}

function SectionNuitTable({ residents, notes, onChangeNote, locked, fontSize = 9, showHeader = true }) {
  const sorted = [...residents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="mb-2">
      <table className="table-auto" style={{ borderCollapse: "collapse", border: "1px solid #475569" }}>
        <colgroup>
          <col style={{ width: "56px" }} />
          <col />
          <col style={{ width: "100px" }} />
          <col style={{ width: "100%" }} />
        </colgroup>
        {showHeader && <thead>
          <tr className="bg-slate-100/80">
            <th style={{ border: "1px solid #475569" }} className="px-2 py-1 print:px-1 print:py-0.5 text-left text-[10px] print:text-[8px] font-semibold text-slate-500 uppercase tracking-wider w-16 print:w-10">
              Chbre
            </th>
            <th style={{ border: "1px solid #475569" }} className="px-2 py-1 print:px-1 print:py-0.5 text-left text-[10px] print:text-[8px] font-semibold text-slate-500 uppercase tracking-wider w-auto">
              Nom
            </th>
            <th style={{ border: "1px solid #475569", width: "100px", maxWidth: "100px" }} className="px-2 py-1 print:px-1 print:py-0.5 text-left text-[10px] print:text-[8px] font-semibold text-red-600 uppercase tracking-wider">
              Infos
            </th>
            <th style={{ border: "1px solid #475569", width: "100%" }} className="px-2 py-1 print:px-1 print:py-0.5 text-left text-[10px] print:text-[8px] font-semibold text-slate-500 uppercase tracking-wider">
              Consignes
            </th>
          </tr>
        </thead>}
        <tbody>
          {sorted.map((r) => (
            <NuitRow
              key={r.id}
              resident={r}
              note={notes[r.id] || ""}
              onChangeNote={onChangeNote}
              locked={locked}
              fontSize={fontSize}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FLOORS = ["RDC", "1ER"];

export default function ConsignesNuit() {
  const [activeFloor, setActiveFloor] = useState("RDC");
  const [notesByFloor, setNotesByFloor] = useState({ RDC: {}, "1ER": {} });
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [ideAstreinte, setIdeAstreinte] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(false);
  const [printScale, setPrintScale] = useState(() => Number(localStorage.getItem("nuit_printScale") || 160));
  const [rowHeight, setRowHeight] = useState(() => Number(localStorage.getItem("nuit_rowHeight") ?? 20));
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("nuit_fontSize") ?? 9));
  const [spacingRDC, setSpacingRDC] = useState(() => Number(localStorage.getItem("nuit_spacingRDC") ?? 16));
  const [spacing1ER, setSpacing1ER] = useState(() => Number(localStorage.getItem("nuit_spacing1ER") ?? 16));
  const currentSpacing = activeFloor === "RDC" ? spacingRDC : spacing1ER;
  const setCurrentSpacing = activeFloor === "RDC" ? setSpacingRDC : setSpacing1ER;
  const [settingsLocked, setSettingsLocked] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { localStorage.setItem("nuit_printScale", printScale); }, [printScale]);
  useEffect(() => { localStorage.setItem("nuit_rowHeight", rowHeight); }, [rowHeight]);
  useEffect(() => { localStorage.setItem("nuit_fontSize", fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem("nuit_spacingRDC", spacingRDC); }, [spacingRDC]);
  useEffect(() => { localStorage.setItem("nuit_spacing1ER", spacing1ER); }, [spacing1ER]);

  const getTodayPassword = () => {
    const now = new Date();
    return String(now.getDate()).padStart(2, "0") + String(now.getMonth() + 1).padStart(2, "0");
  };

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
    let style = document.getElementById('print-scale-style-nuit');
    if (!style) {
      style = document.createElement('style');
      style.id = 'print-scale-style-nuit';
      document.head.appendChild(style);
    }
    style.textContent = `@page { margin: 4mm 8mm !important; } @media print { .print-scale-wrapper-nuit tr { min-height: ${rowHeight}px !important; page-break-inside: avoid !important; break-inside: avoid !important; } .print-scale-wrapper-nuit td { padding-top: ${Math.max(1, Math.round((rowHeight - 16) / 2))}px !important; padding-bottom: ${Math.max(1, Math.round((rowHeight - 16) / 2))}px !important; } }`;
    return () => {};
  }, [rowHeight, fontSize]);

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Resident.subscribe((event) => {
      if (event.type === "update" || event.type === "create") {
        queryClient.invalidateQueries({ queryKey: ["residents"] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: savedNotesRDC = [], isLoading: loadingRDC } = useQuery({
    queryKey: ["consignesNuit", date, "RDC"],
    queryFn: () => base44.entities.ConsigneNuit.filter({ date, floor: "RDC" }, "-created_date", 200),
    enabled: !!date,
  });

  const { data: savedNotes1ER = [], isLoading: loading1ER } = useQuery({
    queryKey: ["consignesNuit", date, "1ER"],
    queryFn: () => base44.entities.ConsigneNuit.filter({ date, floor: "1ER" }, "-created_date", 200),
    enabled: !!date,
  });

  const notesLoading = loadingRDC || loading1ER;

  const { data: archivedDates = [] } = useQuery({
    queryKey: ["consignesNuitDates"],
    queryFn: async () => {
      const all = await base44.entities.ConsigneNuit.list("-date", 500);
      const unique = [...new Set(all.map(n => n.date))].sort((a, b) => b.localeCompare(a));
      return unique;
    },
  });

  const isAfterLockTime = (selectedDate) => {
    const today = new Date().toISOString().split("T")[0];
    if (selectedDate < today) return true;
    return false;
  };

  const isLockedRDC = isAfterLockTime(date);
  const isLocked1ER = isAfterLockTime(date);
  const isCurrentLocked = activeFloor === "RDC" ? isLockedRDC : isLocked1ER;
  const areBothLocked = isLockedRDC && isLocked1ER;

  useEffect(() => {
    const notesMap = {};
    savedNotesRDC.forEach(n => { notesMap[n.resident_id] = n.contenu; });
    setNotesByFloor(prev => ({ ...prev, RDC: notesMap }));
    if (savedNotesRDC[0]?.ide_astreinte) setIdeAstreinte(savedNotesRDC[0].ide_astreinte);
  }, [savedNotesRDC]);

  useEffect(() => {
    const notesMap = {};
    savedNotes1ER.forEach(n => { notesMap[n.resident_id] = n.contenu; });
    setNotesByFloor(prev => ({ ...prev, "1ER": notesMap }));
    if (savedNotes1ER[0]?.ide_astreinte) setIdeAstreinte(savedNotes1ER[0].ide_astreinte);
  }, [savedNotes1ER]);

  const saveTimerRef = useRef(null);
  const notesByFloorRef = useRef(notesByFloor);
  useEffect(() => { notesByFloorRef.current = notesByFloor; }, [notesByFloor]);

  const handleChangeNote = (id, value) => {
    if (isCurrentLocked) return;
    setNotesByFloor(prev => ({
      ...prev,
      [activeFloor]: { ...prev[activeFloor], [id]: value }
    }));

    // Auto-save avec debounce 2s — utilise la ref pour avoir toutes les notes à jour
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const floorAtSave = activeFloor;
    const savedNotesAtSave = activeFloor === "RDC" ? savedNotesRDC : savedNotes1ER;
    saveTimerRef.current = setTimeout(async () => {
      const latestNotes = { ...notesByFloorRef.current[floorAtSave], [id]: value };
      await saveFloor(floorAtSave, savedNotesAtSave, latestNotes);
      queryClient.invalidateQueries({ queryKey: ["consignesNuit", date, floorAtSave] });
    }, 2000);
  };

  const saveFloor = async (floor, savedNotes, notes) => {
    if (isAfterLockTime(date)) return;

    const existingByResident = {};
    savedNotes.forEach(n => { existingByResident[n.resident_id] = n; });

    const ops = [];
    for (const [residentId, contenu] of Object.entries(notes)) {
      if (!contenu || !contenu.trim()) continue;
      if (existingByResident[residentId]) {
        ops.push(base44.entities.ConsigneNuit.update(existingByResident[residentId].id, {
          contenu, ide_astreinte: ideAstreinte, verrouille: false
        }));
      } else {
        ops.push(base44.entities.ConsigneNuit.create({
          date, resident_id: residentId, floor,
          contenu, ide_astreinte: ideAstreinte, verrouille: false
        }));
      }
    }
    await Promise.all(ops);
  };

  const handleSaveAndLock = async () => {
    if (!date) return;
    setIsSaving(true);
    await Promise.all([
      saveFloor("RDC", savedNotesRDC, notesByFloor["RDC"]),
      saveFloor("1ER", savedNotes1ER, notesByFloor["1ER"]),
    ]);
    queryClient.invalidateQueries({ queryKey: ["consignesNuit", date, "RDC"] });
    queryClient.invalidateQueries({ queryKey: ["consignesNuit", date, "1ER"] });
    queryClient.invalidateQueries({ queryKey: ["consignesNuitDates"] });
    setIsSaving(false);
  };

  const handleDeleteArchive = async () => {
    const today = new Date();
    const expected = `${String(today.getDate()).padStart(2, "0")}${String(today.getMonth() + 1).padStart(2, "0")}`;
    if (deletePassword !== expected) {
      setDeleteError(true);
      return;
    }
    const all = await base44.entities.ConsigneNuit.filter({ date: deleteConfirm.date }, "-created_date", 200);
    await Promise.all(all.map(n => base44.entities.ConsigneNuit.delete(n.id)));
    queryClient.invalidateQueries({ queryKey: ["consignesNuit", deleteConfirm.date, "RDC"] });
    queryClient.invalidateQueries({ queryKey: ["consignesNuit", deleteConfirm.date, "1ER"] });
    queryClient.invalidateQueries({ queryKey: ["consignesNuitDates"] });
    if (date === deleteConfirm.date) setDate(new Date().toISOString().split("T")[0]);
    setDeleteConfirm(null);
    setDeletePassword("");
    setDeleteError(false);
  };

  const handlePrint = async () => {
    if (!areBothLocked) {
      await handleSaveAndLock();
      toast.success("Consignes sauvegardées", { duration: 3000 });
    }

    const wrapper = document.querySelector('.print-scale-wrapper-nuit');
    const mapadSection = document.querySelector('.print-mapad-section');
    const longSejourSection = document.querySelector('.print-longsejour-section');

    if (!wrapper || !mapadSection || !longSejourSection) {
      window.print();
      return;
    }

    const currentZoom = printScale / 100;

    // Header impression (hidden à l'écran → montrer brièvement pour mesure)
    const printHeader = document.getElementById('print-mapad-header');
    if (printHeader) printHeader.style.display = 'block';
    void wrapper.offsetHeight; // force reflow

    const printHeaderH = printHeader
      ? printHeader.getBoundingClientRect().height / currentZoom : 0;

    // En-tête de colonnes tableau MAPAD
    const mapadThead = mapadSection.querySelector('thead');
    const mapadTheadH = mapadThead
      ? mapadThead.getBoundingClientRect().height / currentZoom : 0;

    // En-tête de colonnes tableau Long Séjour
    const lsThead = longSejourSection.querySelector('thead');
    const lsTheadH = lsThead
      ? lsThead.getBoundingClientRect().height / currentZoom : 0;

    // Légende au bas du verso
    const legend = document.getElementById('print-longsejour-legend');
    const legendH = legend
      ? legend.getBoundingClientRect().height / currentZoom : 0;

    // Restaurer le header
    if (printHeader) printHeader.style.display = '';

    // A4 paysage, marges 4mm/8mm → hauteur utilisable ≈ 764px à zoom 100%
    // On divise par currentZoom pour avoir les px dans le référentiel du wrapper actuel
    const PAGE_H = 764 / currentZoom;

    const mapadCount = mapadResidents.length || 1;
    const lsCount = longSejourResidents.length || 1;

    // Page 1 : espace dispo = PAGE_H - header - en-tête colonnes - padding
    const mapadRowH = Math.max(12, Math.floor(
      (PAGE_H - printHeaderH - mapadTheadH - 8) / mapadCount
    ));
    // Page 2 : espace dispo = PAGE_H - en-tête colonnes - légende - padding
    const lsRowH = Math.max(12, Math.floor(
      (PAGE_H - lsTheadH - legendH - 8) / lsCount
    ));

    // Injection CSS : hauteurs par section + saut de page après MAPAD
    const styleEl = document.getElementById('print-scale-style-nuit');
    if (styleEl) {
      styleEl.textContent = `
        @page { margin: 4mm 8mm !important; }
        @media print {
          .print-mapad-section {
            break-after: page !important;
            page-break-after: always !important;
          }
          .print-mapad-section tbody tr {
            height: ${mapadRowH}px !important;
          }
          .print-longsejour-section tbody tr {
            height: ${lsRowH}px !important;
          }
          .print-longsejour-section {
            margin-top: 0 !important;
          }
          .print-mapad-section tr, .print-longsejour-section tr {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
        }
      `;
    }

    setTimeout(() => window.print(), 200);
  };

  const floorResidents = residents.filter((r) => r.floor === activeFloor);
  const mapadResidents = floorResidents.filter((r) => r.section === "Mapad");
  const longSejourResidents = floorResidents.filter((r) => r.section === "Long Séjour");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Controls */}
      <div className="print:hidden sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Consignes de Nuit</h1>
            <div className="flex items-center gap-2">
              <Tabs value={activeFloor} onValueChange={setActiveFloor}>
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="RDC">
                    RDC {isLockedRDC && <Lock className="h-3 w-3 ml-1 text-amber-500" />}
                  </TabsTrigger>
                  <TabsTrigger value="1ER">
                    1er Étage {isLocked1ER && <Lock className="h-3 w-3 ml-1 text-amber-500" />}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchives(!showArchives)}
                className="gap-1.5"
              >
                <FolderOpen className="h-4 w-4" />
                Archives
              </Button>
              {!areBothLocked && (
                <Button
                  size="sm"
                  onClick={handleSaveAndLock}
                  disabled={isSaving}
                  className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Sauvegarder
                </Button>
              )}
              {areBothLocked && (
                <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md font-medium">
                  <Lock className="h-3.5 w-3.5" /> Verrouillé (jour passé)
                </span>
              )}
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
                      <p className="text-xs text-slate-500 mb-2">Code du jour (jjmm)</p>
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
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isSaving} className="gap-1.5">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
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
          <div className="flex gap-6 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setShowArchives(false); }}
                className="px-2 py-1 border border-slate-300 rounded text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase">IDE d'astreinte</label>
              <input
                type="text"
                placeholder="Nom"
                value={ideAstreinte}
                onChange={(e) => setIdeAstreinte(e.target.value)}
                disabled={areBothLocked}
                className="px-2 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Archives panel */}
      {showArchives && (
        <div className="print:hidden max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">
                Archives — {archivedDates.length} date{archivedDates.length > 1 ? "s" : ""}
              </h3>
              <button onClick={() => setShowArchives(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            {archivedDates.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune consigne verrouillée.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {archivedDates.map(d => (
                  <div key={d} className="flex items-center gap-1">
                    <button
                      onClick={() => { setDate(d); setShowArchives(false); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        d === date
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Lock className="h-3 w-3 text-amber-500" />
                      {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => { setDeleteConfirm({ date: d }); setDeletePassword(""); setDeleteError(false); }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal suppression sécurisée */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-slate-900 mb-1">Supprimer les consignes</h3>
            <p className="text-sm text-slate-500 mb-4">
              {new Date(deleteConfirm.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-slate-600 mb-3">
              Entrez le code du jour pour confirmer la suppression :<br />
              <span className="font-semibold">jour + mois (ex : 2503 pour le 25 mars)</span>
            </p>
            <input
              type="password"
              inputMode="numeric"
              placeholder="Code du jour"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(false); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm mb-1 ${
                deleteError ? "border-red-400 bg-red-50" : "border-slate-300"
              }`}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleDeleteArchive()}
            />
            {deleteError && <p className="text-xs text-red-600 mb-2">Code incorrect.</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => { setDeleteConfirm(null); setDeletePassword(""); setDeleteError(false); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteArchive}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print content */}
      <div className="print-scale-wrapper-nuit max-w-6xl mx-auto px-4 py-4 print:px-1 print:py-1 print:max-w-none" style={{ zoom: `${printScale}%` }}>

        {/* === PAGE 1 RECTO : MAPAD === */}
        <div className="print-mapad-section">
          {/* Header impression uniquement */}
          <div id="print-mapad-header" className="hidden print:block mb-2 pb-1 border-b border-black">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-bold">Consignes de Nuit — {activeFloor} — Mapad</div>
              <div className="text-xs text-slate-600">
                <span className="font-semibold">Date :</span> {date ? new Date(date + "T12:00:00").toLocaleDateString("fr-FR") : ""}
                <span className="mx-2">|</span>
                <span className="font-semibold">IDE d'astreinte :</span> {ideAstreinte}
              </div>
            </div>
          </div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2 print:hidden">Mapad</h2>
          {notesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <SectionNuitTable
              residents={mapadResidents}
              notes={notesByFloor[activeFloor]}
              onChangeNote={handleChangeNote}
              locked={isCurrentLocked}
              fontSize={fontSize}
            />
          )}
        </div>

        {/* === PAGE 2 VERSO : LONG SÉJOUR === */}
        <div className="print-longsejour-section" style={{ marginTop: `${currentSpacing}px` }}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2 print:hidden">Long Séjour</h2>
          {notesLoading ? null : (
            <SectionNuitTable
              residents={longSejourResidents}
              notes={notesByFloor[activeFloor]}
              onChangeNote={handleChangeNote}
              locked={isCurrentLocked}
              fontSize={fontSize}
              showHeader={true}
            />
          )}
          {/* Légende au bas du verso */}
          <div id="print-longsejour-legend" className="mt-6 print:mt-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Légende</h3>
            <div className="flex gap-6 text-sm text-slate-600 flex-wrap">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                <span>Traitements écrasés</span>
              </div>
              <div className="flex items-center gap-2 print:flex">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Anticoagulants</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
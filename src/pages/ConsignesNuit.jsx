import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Lock, FolderOpen, Printer, Loader2, ChevronRight, X, Pill, AlertTriangle, PhoneCall, Bed, Armchair, Fence } from "lucide-react";
import { toast } from "sonner";
import ArchivesPanel from "../components/consignes/ArchivesPanel";

const ContentionIconSmall = ({ label, bg, border }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "10px", height: "10px", borderRadius: "50%",
    background: bg, border: `1px solid ${border}`,
    fontWeight: "bold", fontSize: "6px", color: "#000",
    flexShrink: 0,
  }}>{label}</span>
);

const CONTENTION_ICONS_SMALL = {
  lit: <ContentionIconSmall label="L" bg="#dbeafe" border="#93c5fd" />,
  fauteuil: <ContentionIconSmall label="F" bg="#f3e8ff" border="#c4b5fd" />,
  "barrière gauche": <ContentionIconSmall label="BG" bg="#fef3c7" border="#d97706" />,
  "barrière droite": <ContentionIconSmall label="BD" bg="#fef3c7" border="#d97706" />,
  "barrière x2": <ContentionIconSmall label="B2" bg="#fef3c7" border="#d97706" />,
};
const CONTENTION_COLORS = {
  lit: "bg-blue-100 border-blue-300",
  fauteuil: "bg-purple-100 border-purple-300",
  "barrière gauche": "bg-amber-100 border-amber-300",
  "barrière droite": "bg-amber-100 border-amber-300",
  "barrière x2": "bg-amber-100 border-amber-300",
};
const CONTENTION_BORDER_DASHED = {
  lit: "border-blue-400",
  fauteuil: "border-purple-400",
  "barrière gauche": "border-amber-400",
  "barrière droite": "border-amber-400",
  "barrière x2": "border-amber-400",
};

function NuitRow({ resident, note, onChangeNote, locked, girData, contentionItems = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note);

  useEffect(() => { if (!isEditing) setEditValue(note); }, [note, isEditing]);

  const toRoman = (num) => {
    if (!num) return "";
    const str = String(num).trim();
    const romanMap = { "1": "I", "2": "II", "3": "III", "4": "IV" };
    return romanMap[str] || "";
  };

  const girInfo = girData?.find(g => g.resident_id === resident.id);
  const girLevel = girInfo?.gir ? toRoman(girInfo.gir) : "";
  const soinLevel = girInfo?.niveau_soin ? String(girInfo.niveau_soin).toUpperCase() : "";

  const handleSave = () => {
    onChangeNote(resident.id, editValue);
    setIsEditing(false);
  };

  const icons = [];
  if (resident.traitement_ecrase) icons.push(<span key="pill" style={{ fontSize: "14px", marginRight: "2px", verticalAlign: "middle" }}>💊</span>);
  if (resident.anticoagulants) icons.push(<AlertTriangle key="alert" className="h-3 w-3 text-red-500" />);
  if (resident.appel_nuit) icons.push(<PhoneCall key="phone" className="h-3 w-3 text-indigo-500" />);

  return (
    <tr>
      <td style={{ border: "1px solid #475569", padding: "2px 4px" }} className="text-[9px] font-medium text-slate-700">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div>{resident.room}</div>
            <div className="flex gap-0.5 mt-0.5">{icons}</div>
          </div>
          {(girLevel || soinLevel) && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", alignSelf: "flex-start" }}>
              {girLevel && <div style={{ fontWeight: "bold", fontSize: "9px", whiteSpace: "nowrap" }}>{girLevel}</div>}
              {soinLevel && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "1.5px solid #1e293b",
                  fontWeight: "bold",
                  fontSize: "7px",
                  flexShrink: 0
                }}>
                  {soinLevel}
                </div>
              )}
            </div>
          )}
        </div>
      </td>
      <td style={{ border: "1px solid #475569", padding: "2px 4px" }} className="text-[10px] font-medium text-slate-700">
        <div className="font-semibold whitespace-nowrap">{resident.last_name}</div>
        <div className="whitespace-nowrap text-slate-500">
          {resident.first_name}
          {resident.date_naissance && (
            <span className="ml-1 text-slate-400 text-[9px]">
              ({Math.floor((new Date() - new Date(resident.date_naissance)) / (365.25 * 24 * 3600 * 1000))})
            </span>
          )}
        </div>
      </td>
      <td style={{ border: "1px solid #475569", padding: "2px 4px", width: "90px", maxWidth: "90px" }} className="text-[8px] text-slate-600">
        {resident.annotations && (
          <div className="whitespace-normal break-words">
            {resident.annotations.split('\n').filter(l => !l.startsWith('---SUPPL:')).join('\n')}
          </div>
        )}
      </td>
      <td style={{ border: "1px solid #475569", padding: "2px 4px" }} className="text-[9px]">
        {isEditing ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 border border-slate-300 rounded px-1 py-0.5 text-xs"
              rows="2"
              autoFocus
            />
            <button onClick={handleSave} className="px-1 py-0.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">✓</button>
            <button onClick={() => { setEditValue(note); setIsEditing(false); }} className="px-1 py-0.5 bg-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-400">✕</button>
          </div>
        ) : (
          <div
            onClick={() => !locked && setIsEditing(true)}
            className={`min-h-[14px] whitespace-pre-wrap break-words ${locked ? "cursor-default" : "cursor-text hover:bg-slate-100"}`}
          >
            {editValue || (locked ? "" : <span className="text-slate-300">—</span>)}
          </div>
        )}
      </td>
      <td style={{ border: "1px solid #475569", padding: "2px 4px", width: "44px", minWidth: "44px" }}>
        <div className="flex flex-wrap gap-0.5 justify-center">
          {contentionItems.map(({ type, siBesoin }, idx) => (
            <span
              key={idx}
              title={`${type}${siBesoin ? " (si besoin)" : " (continu)"}`}
              className={`inline-flex items-center justify-center w-4 h-4 rounded-full border ${
                siBesoin
                  ? `bg-white border-dashed ${CONTENTION_BORDER_DASHED[type] || "border-gray-400"}`
                  : `${CONTENTION_COLORS[type] || "bg-gray-100"} border`
              }`}
            >
              {CONTENTION_ICONS_SMALL[type]}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

function NuitTable({ residents, notes, onChangeNote, locked, girData, contentionMap = {} }) {
  const sorted = [...residents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return (
    <table style={{ borderCollapse: "collapse", border: "1px solid #475569", width: "100%" }}>
      <colgroup>
        <col style={{ width: "52px" }} />
        <col style={{ width: "110px" }} />
        <col style={{ width: "90px" }} />
        <col />
        <col style={{ width: "44px" }} />
      </colgroup>
      <thead>
        <tr style={{ backgroundColor: "#f1f5f9" }}>
          <th style={{ border: "1px solid #475569", padding: "3px 4px", fontSize: "8px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Chbre</th>
          <th style={{ border: "1px solid #475569", padding: "3px 4px", fontSize: "8px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nom</th>
          <th style={{ border: "1px solid #475569", padding: "3px 4px", fontSize: "8px", textAlign: "left", fontWeight: 600, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>Infos</th>
          <th style={{ border: "1px solid #475569", padding: "3px 4px", fontSize: "8px", textAlign: "left", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Consignes de nuit</th>
          <th style={{ border: "1px solid #475569", padding: "3px 4px", fontSize: "8px", textAlign: "center", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", width: "44px" }}>Cont.</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <NuitRow key={r.id} resident={r} note={notes[r.id] || ""} onChangeNote={onChangeNote} locked={locked} girData={girData} contentionItems={contentionMap[r.id] || []} />
        ))}
      </tbody>
    </table>
  );
}

export default function ConsignesNuit() {
  const [showInfoModal, setShowInfoModal] = useState(true);
  const [activeFloor, setActiveFloor] = useState("RDC");
  const [notesByFloor, setNotesByFloor] = useState({ RDC: {}, "1ER": {} });
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [ideAstreinte, setIdeAstreinte] = useState("");
  const [infosByFloor, setInfosByFloor] = useState({ RDC: "", "1ER": "" });
  const [isSaving, setIsSaving] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(false);
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  const { data: girData = [] } = useQuery({
    queryKey: ["niveauSoin"],
    queryFn: () => base44.entities.NiveauSoin.list("-updated_date", 500),
  });

  const { data: contentionFiches = [] } = useQuery({
    queryKey: ["contentions_nuit"],
    queryFn: () => base44.entities.SuiviAntalgique.filter({ type_suivi: "contention" }, "-created_date", 200),
  });

  const contentionMap = {};
  residents.forEach(r => {
    const nom = `${r.first_name || ""} ${r.last_name || ""}`.trim();
    const contentions = contentionFiches.filter(f => f.nom === nom);
    const seen = new Set();
    const items = [];
    contentions.forEach(f => {
      const key = `${f.traitement}-${!!f.dotation_nominative}`;
      if (!seen.has(key)) { seen.add(key); items.push({ type: f.traitement, siBesoin: !!f.dotation_nominative }); }
    });
    contentionMap[r.id] = items;
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
    return selectedDate < today;
  };

  const isLockedRDC = isAfterLockTime(date);
  const isLocked1ER = isAfterLockTime(date);
  const isCurrentLocked = activeFloor === "RDC" ? isLockedRDC : isLocked1ER;
  const areBothLocked = isLockedRDC && isLocked1ER;

  useEffect(() => {
    const notesMap = {};
    let infos = "";
    savedNotesRDC.forEach(n => {
      if (n.resident_id === "__infos__") infos = n.contenu;
      else notesMap[n.resident_id] = n.contenu;
    });
    setNotesByFloor(prev => ({ ...prev, RDC: notesMap }));
    setInfosByFloor(prev => ({ ...prev, RDC: infos }));
    if (savedNotesRDC[0]?.ide_astreinte) setIdeAstreinte(savedNotesRDC[0].ide_astreinte);
  }, [savedNotesRDC, date]);

  useEffect(() => {
    const notesMap = {};
    let infos = "";
    savedNotes1ER.forEach(n => {
      if (n.resident_id === "__infos__") infos = n.contenu;
      else notesMap[n.resident_id] = n.contenu;
    });
    setNotesByFloor(prev => ({ ...prev, "1ER": notesMap }));
    setInfosByFloor(prev => ({ ...prev, "1ER": infos }));
    if (savedNotes1ER[0]?.ide_astreinte) setIdeAstreinte(savedNotes1ER[0].ide_astreinte);
  }, [savedNotes1ER, date]);

  const saveTimerRef = useRef(null);
  const notesByFloorRef = useRef(notesByFloor);
  useEffect(() => { notesByFloorRef.current = notesByFloor; }, [notesByFloor]);

  const handleChangeNote = (id, value) => {
    if (isCurrentLocked) return;
    setNotesByFloor(prev => ({
      ...prev,
      [activeFloor]: { ...prev[activeFloor], [id]: value }
    }));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const floorAtSave = activeFloor;
    const savedNotesAtSave = activeFloor === "RDC" ? savedNotesRDC : savedNotes1ER;
    saveTimerRef.current = setTimeout(async () => {
      const latestNotes = { ...notesByFloorRef.current[floorAtSave], [id]: value };
      await saveFloor(floorAtSave, savedNotesAtSave, latestNotes);
      queryClient.invalidateQueries({ queryKey: ["consignesNuit", date, floorAtSave] });
    }, 2000);
  };

  const saveFloor = async (floor, savedNotes, notes, infos) => {
    if (isAfterLockTime(date)) return;
    const existingByResident = {};
    savedNotes.forEach(n => { existingByResident[n.resident_id] = n; });
    const ops = [];
    for (const [residentId, contenu] of Object.entries(notes)) {
      const existing = existingByResident[residentId];
      const isEmpty = !contenu || !String(contenu).trim();
      if (isEmpty) {
        if (existing) ops.push(base44.entities.ConsigneNuit.delete(existing.id));
        continue;
      }
      if (existing) {
        ops.push(base44.entities.ConsigneNuit.update(existing.id, {
          contenu, ide_astreinte: ideAstreinte, verrouille: false
        }));
      } else {
        ops.push(base44.entities.ConsigneNuit.create({
          date, resident_id: residentId, floor,
          contenu, ide_astreinte: ideAstreinte, verrouille: false
        }));
      }
    }
    if (infos !== undefined) {
      const infosStr = infos || "";
      const infosEmpty = !infosStr.trim();
      const existingInfos = existingByResident["__infos__"];
      if (existingInfos) {
        if (infosEmpty) {
          ops.push(base44.entities.ConsigneNuit.delete(existingInfos.id));
        } else {
          ops.push(base44.entities.ConsigneNuit.update(existingInfos.id, { contenu: infosStr, ide_astreinte: ideAstreinte }));
        }
      } else if (!infosEmpty) {
        ops.push(base44.entities.ConsigneNuit.create({ date, resident_id: "__infos__", floor, contenu: infosStr, ide_astreinte: ideAstreinte }));
      }
    }
    await Promise.all(ops);
  };

  const handleSaveAndLock = async () => {
    if (!date) return;
    setIsSaving(true);
    await Promise.all([
      saveFloor("RDC", savedNotesRDC, notesByFloor["RDC"], infosByFloor["RDC"]),
      saveFloor("1ER", savedNotes1ER, notesByFloor["1ER"], infosByFloor["1ER"]),
    ]);
    queryClient.invalidateQueries({ queryKey: ["consignesNuit", date, "RDC"] });
    queryClient.invalidateQueries({ queryKey: ["consignesNuit", date, "1ER"] });
    queryClient.invalidateQueries({ queryKey: ["consignesNuitDates"] });
    setIsSaving(false);
  };

  const isArchiveEmpty = async (dateToCheck) => {
    const all = await base44.entities.ConsigneNuit.filter({ date: dateToCheck }, "-created_date", 200);
    // Vérifier que tous les enregistrements (sauf "__infos__") ont un contenu vide
    return all.every(n => n.resident_id === "__infos__" || !n.contenu || !String(n.contenu).trim());
  };

  const handleDeleteArchive = async () => {
    const today = new Date();
    const expected = `${String(today.getDate()).padStart(2, "0")}${String(today.getMonth() + 1).padStart(2, "0")}`;
    if (deletePassword !== expected) { setDeleteError(true); return; }
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

  const cleanEmptyArchives = async () => {
    try {
      const allDates = await base44.entities.ConsigneNuit.list("-date", 500);
      const uniqueDates = [...new Set(allDates.map(n => n.date))];
      let deletedCount = 0;
      for (const d of uniqueDates) {
        const recordsToDelete = await base44.entities.ConsigneNuit.filter({ date: d }, "-created_date", 500);
        const residentRecords = recordsToDelete.filter(r => r.resident_id !== "__infos__");
        if (residentRecords.length > 0) {
          const hasAnyContent = residentRecords.some(r => r.contenu && String(r.contenu).trim());
          if (!hasAnyContent) {
            console.log(`Suppression archive ${d}:`, recordsToDelete.length, "enregistrements");
            await Promise.all(recordsToDelete.map(n => base44.entities.ConsigneNuit.delete(n.id)));
            deletedCount += recordsToDelete.length;
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["consignesNuitDates"] });
      queryClient.invalidateQueries({ queryKey: ["consignesNuit"] });
      toast.success(deletedCount > 0 ? `${deletedCount} enregistrement(s) supprimé(s)` : "Aucune archive vide");
    } catch (err) {
      console.error("Erreur nettoyage archives:", err);
      toast.error("Erreur : " + err.message);
    }
  };

  const buildTableHTML = (residents, notes) => {
    const sorted = [...residents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const rows = sorted.map(r => {
      const note = notes[r.id] || "";
      const icons = [
        r.traitement_ecrase ? "💊" : "",
        r.anticoagulants ? "<svg style='display:inline-block;width:11px;height:11px;vertical-align:middle;margin-right:2px;color:#ef4444' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>" : "",
        r.appel_nuit ? "<svg style='display:inline-block;width:11px;height:11px;vertical-align:middle;margin-right:2px;color:#6366f1' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'/></svg>" : "",
      ].filter(Boolean).join(" ");
      const girInfo = girData?.find(g => g.resident_id === r.id);
      const toRoman = (num) => { const m = { "1": "I", "2": "II", "3": "III", "4": "IV" }; return m[String(num).trim()] || ""; };
      const girLevel = girInfo?.gir ? toRoman(girInfo.gir) : "";
      const soinLevel = girInfo?.niveau_soin ? String(girInfo.niveau_soin).toUpperCase() : "";
      const girSoinHtml = (girLevel || soinLevel) ? `<div style='display:flex;align-items:center;gap:4px'>${girLevel ? `<div style='font-weight:bold;font-size:9px'>${girLevel}</div>` : ""}${soinLevel ? `<div style='display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1.5px solid #1e293b;font-weight:bold;font-size:7px'>${soinLevel}</div>` : ""}</div>` : "";
      
      return `<tr>
        <td style="border:1px solid #475569;padding:2px 4px;font-size:9px"><div style='display:flex;justify-content:space-between;gap:2px'><div>${r.room} ${icons}</div>${girSoinHtml}</div></td>
        <td style="border:1px solid #475569;padding:2px 4px;font-size:10px"><strong>${r.last_name}</strong><br/><span style='color:#64748b'>${r.first_name || ""}</span></td>
        <td style="border:1px solid #475569;padding:2px 4px;font-size:9px;width:90px;max-width:90px;word-break:break-word">${(r.annotations || "").split('\n').filter(l => !l.startsWith('---SUPPL:')).join('<br/>')}</td>
        <td style="border:1px solid #475569;padding:2px 4px;font-size:11px;white-space:pre-wrap;word-break:break-word">${note}</td>
        <td style="border:1px solid #475569;padding:2px 4px;font-size:8px;text-align:center">${
          (() => {
            const nom = `${r.first_name || ''} ${r.last_name || ''}`.trim();
            const items = contentionFiches.filter(f => f.nom === nom);
            const seen = new Set();
            return items.filter(f => { const k = `${f.traitement}-${!!f.dotation_nominative}`; if(seen.has(k)) return false; seen.add(k); return true; })
              .map(f => {
                const colorMap = { lit: '#dbeafe', fauteuil: '#f3e8ff', 'barrière gauche': '#fef3c7', 'barrière droite': '#fef3c7', 'barrière x2': '#fef3c7' };
                const borderMap = { lit: '#93c5fd', fauteuil: '#c4b5fd', 'barrière gauche': '#d97706', 'barrière droite': '#d97706', 'barrière x2': '#d97706' };
                const labelMap = { lit: 'L', fauteuil: 'F', 'barrière gauche': 'BG', 'barrière droite': 'BD', 'barrière x2': 'B2' };
                const textColor = '#000';
                const bg = f.dotation_nominative ? 'white' : (colorMap[f.traitement] || '#f1f5f9');
                const border = borderMap[f.traitement] || '#94a3b8';
                const style = f.dotation_nominative
                  ? `display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;border:1.5px dashed #000;background:white;font-size:6px;font-weight:bold;color:${textColor}`
                  : `display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;border:1.5px solid ${border};background:${bg};font-size:6px;font-weight:bold;color:${textColor}`;
                return `<span style="${style}" title="${f.traitement}">${labelMap[f.traitement] || '?'}</span>`;
              }).join(' ');
          })()
        }</td>
      </tr>`;
    }).join("");
    return `<table style="border-collapse:collapse;border:1px solid #475569;width:100%;flex:1;height:1px">
      <colgroup><col style='width:52px'/><col style='width:110px'/><col style='width:90px'/><col/><col style='width:44px'/></colgroup>
      <thead><tr style='background:#f1f5f9'>
        <th style='border:1px solid #475569;padding:3px 4px;font-size:8px;text-align:left;color:#64748b;text-transform:uppercase'>Chbre</th>
        <th style='border:1px solid #475569;padding:3px 4px;font-size:8px;text-align:left;color:#64748b;text-transform:uppercase'>Nom</th>
        <th style='border:1px solid #475569;padding:3px 4px;font-size:8px;text-align:left;color:#dc2626;text-transform:uppercase'>Infos</th>
        <th style='border:1px solid #475569;padding:3px 4px;font-size:8px;text-align:left;color:#64748b;text-transform:uppercase'>Consignes de nuit</th>
        <th style='border:1px solid #475569;padding:3px 4px;font-size:8px;text-align:center;color:#64748b;text-transform:uppercase;width:44px'>Cont.</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const buildPageHTML = (section, residents, notes, zoom = 1, infosGenerales = "") => {
    const dateStr = date ? new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
    const header = `<div style='border-bottom:2px solid #1e293b;margin-bottom:8px;padding-bottom:4px;display:flex;justify-content:space-between;align-items:baseline'>
      <div style='font-size:14px;font-weight:bold;color:#1e293b'>Consignes de Nuit — ${activeFloor} · ${section}</div>
      <div style='font-size:9px;color:#475569'><strong>Date :</strong> ${dateStr} &nbsp;|&nbsp; <strong>IDE d'astreinte :</strong> ${ideAstreinte || "—"}</div>
    </div>`;
    const infosBox = infosGenerales ? `<div style='border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;background:#fffbeb;margin-top:8px'>
      <div style='font-size:8px;font-weight:600;color:#92400e;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em'>INFOS</div>
      <div style='font-size:9px;color:#78350f;white-space:pre-wrap'>${infosGenerales}</div>
    </div>` : "";
    const legende = section === "Long Séjour" ? `<div style='border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;background:#f8fafc'>
      <div style='font-size:8px;font-weight:600;color:#475569;margin-bottom:4px;text-transform:uppercase'>Légende</div>
      <div style='display:flex;gap:6px;font-size:9px;color:#475569;flex-wrap:wrap;align-items:center'>
        <div>💊 <span>TTT écrasés</span></div>
        <div><svg style='display:inline-block;width:11px;height:11px;vertical-align:middle;margin-right:4px;color:#ef4444' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg> <span>Anticoag</span></div>
        <div><svg style='display:inline-block;width:11px;height:11px;vertical-align:middle;margin-right:4px;color:#6366f1' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'/></svg> <span>Famille nuit</span></div>
        <div><span style='font-weight:bold;font-size:8px'>I</span> <span>GIR</span></div>
        <div><span style='border:1.5px solid #1e293b;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:7px'>A</span> <span>Niveau soins (A à D)</span></div>
        <div><span style='display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#dbeafe;border:1.5px solid #93c5fd;font-weight:bold;font-size:10px;color:#000'>L</span> <span>Lit</span></div>
        <div><span style='display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#f3e8ff;border:1.5px solid #c4b5fd;font-weight:bold;font-size:10px;color:#000'>F</span> <span>Fauteuil</span></div>
        <div><span style='display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#fef3c7;border:1.5px solid #d97706;font-weight:bold;font-size:9px;color:#000'>BG</span> <span>Barrière G</span></div>
        <div><span style='display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#fef3c7;border:1.5px solid #d97706;font-weight:bold;font-size:9px;color:#000'>BD</span> <span>Barrière D</span></div>
        <div><span style='display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#fef3c7;border:1.5px solid #d97706;font-weight:bold;font-size:9px;color:#000'>B2</span> <span>BarX2</span></div>
        <div><span style='display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:white;border:1.5px dashed #000;font-weight:bold;font-size:10px;color:#000'>L</span> <span>Si besoin</span></div>
      </div></div>${infosBox}` : "";
    const pageContentH = 1083;
    const divH = Math.round(pageContentH / zoom);
    return `<div style='font-family:Arial,sans-serif;background:white;display:flex;flex-direction:column;height:${divH}px;gap:8px;zoom:${zoom}'>${header}${buildTableHTML(residents, notes)}${legende}</div>`;
  };

  const measureNaturalHeight = (section, residents, notes) => {
    const dateStr = date ? new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
    const header = `<div style='border-bottom:2px solid #1e293b;margin-bottom:8px;padding-bottom:4px;display:flex;justify-content:space-between'><div style='font-size:14px;font-weight:bold'>Consignes de Nuit</div><div style='font-size:9px'>${dateStr}</div></div>`;
    const legende = section === "Long Séjour" ? `<div style='border:1px solid #e2e8f0;padding:8px 12px'><div style='font-size:8px'>Légende</div></div>` : "";
    const tableHTML = buildTableHTML(residents, notes).replace('flex:1;height:1px', '');
    const innerHtml = `<div style='font-family:Arial,sans-serif;background:white;gap:8px'>${header}${tableHTML}${legende}</div>`;
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:-9999px;left:0;width:746px;visibility:hidden';
    div.innerHTML = innerHtml;
    document.body.appendChild(div);
    const h = div.scrollHeight;
    document.body.removeChild(div);
    return h;
  };

  const handlePrint = async () => {
    try {
      if (!areBothLocked) {
        await handleSaveAndLock();
        toast.success("Consignes sauvegardées", { duration: 3000 });
      }

      const notes = notesByFloor[activeFloor] || {};
      const currentInfos = infosByFloor[activeFloor] || "";

      const pageContentH = 1083;
      const rectoH = measureNaturalHeight("Mapad", mapadResidents, notes);
      const versoH = measureNaturalHeight("Long Séjour", longSejourResidents, notes);
      const rectoZoom = rectoH > pageContentH ? pageContentH / rectoH : 1;
      const versoZoom = versoH > pageContentH ? pageContentH / versoH : 1;

      const rectoHTML = buildPageHTML("Mapad", mapadResidents, notes, rectoZoom, currentInfos);
      const versoHTML = buildPageHTML("Long Séjour", longSejourResidents, notes, versoZoom, currentInfos);

      const html = `<!DOCTYPE html><html><head>
        <meta charset='utf-8'/>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page {
            width: 794px;
            height: 1123px;
            overflow: hidden;
            box-sizing: border-box;
            padding: 20px 24px;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child { page-break-after: avoid; break-after: avoid; }
        </style>
      </head><body>
        <div class="page">${rectoHTML}</div>
        <div class="page">${versoHTML}</div>
      </body></html>`;

      const existing = document.getElementById("nuit-print-iframe");
      if (existing) existing.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "nuit-print-iframe";
      iframe.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;opacity:0;border:none;z-index:-1;";
      iframe.srcdoc = html;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 300);
      };
    } catch (err) {
      console.error("Erreur impression:", err);
      toast.error("Erreur : " + err.message);
      setIsSaving(false);
    }
  };

  const floorResidents = residents.filter((r) => r.floor === activeFloor);
  const mapadResidents = floorResidents.filter((r) => r.section === "Mapad");
  const longSejourResidents = floorResidents.filter((r) => r.section === "Long Séjour");
  const currentNotes = notesByFloor[activeFloor];

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
              <Button variant="outline" size="sm" onClick={() => setShowArchives(!showArchives)} className="gap-1.5">
                <FolderOpen className="h-4 w-4" />
                Archives
              </Button>

              {areBothLocked && (
                <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md font-medium">
                  <Lock className="h-3.5 w-3.5" /> Verrouillé (jour passé)
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isSaving} className="gap-1.5">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Imprimer & Sauvegarder
              </Button>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase">Date</label>
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setShowArchives(false); }} className="px-2 py-1 border border-slate-300 rounded text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase">IDE d'astreinte</label>
              <input type="text" placeholder="Nom" value={ideAstreinte} onChange={(e) => setIdeAstreinte(e.target.value)} disabled={areBothLocked} className="px-2 py-1 border border-slate-300 rounded text-sm disabled:opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Archives panel */}
      {showArchives && (
        <div className="print:hidden max-w-6xl mx-auto px-4 pt-4">
          <ArchivesPanel
            archivedDates={archivedDates}
            currentDate={date}
            onSelectDate={(d) => { setDate(d); setShowArchives(false); }}
            onDeleteDate={(d) => { setDeleteConfirm({ date: d }); setDeletePassword(""); setDeleteError(false); }}
            onClean={cleanEmptyArchives}
          />
          <button
            onClick={() => setShowArchives(false)}
            className="mt-3 text-slate-400 hover:text-slate-700 text-xs underline"
          >
            Fermer les archives
          </button>
        </div>
      )}

      {/* Modal info */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-slate-900 mb-3 text-lg">📋 Consignes de Nuit</h3>
            <div className="text-sm text-slate-600 space-y-3">
              <p>Pour saisir une consigne, <strong>cliquez sur la cellule</strong> de la colonne « Consignes de nuit » en face du résident, et n'oubliez pas de valider après avoir entré une transmission pour un résident <strong>(validation nécessaire pour chaque transmission)</strong>.</p>
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <button className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-medium">✓</button>
                <span>Ce bouton valide et sauvegarde la consigne du résident.</span>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-blue-700 text-xs">ℹ️ <strong>Info :</strong> les consignes sont accessibles par le cadre de santé.</span>
              </div>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium text-sm"
            >
              OK, j'ai compris
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-slate-900 mb-1">Supprimer les consignes</h3>
            <p className="text-sm text-slate-500 mb-4">{new Date(deleteConfirm.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="text-xs text-slate-600 mb-3">Code du jour (jjmm) :</p>
            <input
              type="password" inputMode="numeric" placeholder="Code du jour" value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(false); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm mb-1 ${deleteError ? "border-red-400 bg-red-50" : "border-slate-300"}`}
              autoFocus onKeyDown={(e) => e.key === "Enter" && handleDeleteArchive()}
            />
            {deleteError && <p className="text-xs text-red-600 mb-2">Code incorrect.</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setDeleteConfirm(null); setDeletePassword(""); setDeleteError(false); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={handleDeleteArchive} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Screen view */}
      <div className="print:hidden max-w-6xl mx-auto px-4 py-4">
        {notesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Légende</h3>
              <div className="flex gap-2 text-sm text-slate-600 flex-wrap">
                <div className="flex items-center gap-1"><Pill className="h-4 w-4" /><span>TTT écrasés</span></div>
                <div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /><span>Anticoag</span></div>
                <div className="flex items-center gap-1"><PhoneCall className="h-4 w-4 text-indigo-500" /><span>Famille nuit</span></div>
                <div className="flex items-center gap-1"><span style={{ fontWeight: "bold", fontSize: "13px" }}>I</span><span>GIR</span></div>
                <div className="flex items-center gap-1">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid #1e293b", fontWeight: "bold", fontSize: "11px" }}>A</div>
                  <span>Niveau soins (A à D)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "#dbeafe", border: "1.5px solid #93c5fd", fontWeight: "bold", fontSize: "10px", color: "#000" }}>L</span><span>Lit</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "#f3e8ff", border: "1.5px solid #c4b5fd", fontWeight: "bold", fontSize: "10px", color: "#000" }}>F</span><span>Fauteuil</span>
                </div>
                <div className="flex items-center gap-1">
                   <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "#fef3c7", border: "1.5px solid #d97706", fontWeight: "bold", fontSize: "9px", color: "#000" }}>BG</span><span>Barrière G</span>
                </div>
                <div className="flex items-center gap-1">
                   <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "#fef3c7", border: "1.5px solid #d97706", fontWeight: "bold", fontSize: "9px", color: "#000" }}>BD</span><span>Barrière D</span>
                </div>
                <div className="flex items-center gap-1">
                   <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "#fef3c7", border: "1.5px solid #d97706", fontWeight: "bold", fontSize: "9px", color: "#000" }}>B2</span><span>BarX2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "white", border: "2px dashed #000", fontWeight: "bold", fontSize: "10px", color: "#000" }}>L</span><span>Si besoin</span>
                </div>
              </div>
            </div>
            {mapadResidents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Mapad (Recto)</h2>
                <NuitTable residents={mapadResidents} notes={currentNotes} onChangeNote={handleChangeNote} locked={isCurrentLocked} girData={girData} contentionMap={contentionMap} />
              </div>
            )}
            {longSejourResidents.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Long Séjour (Verso)</h2>
                <NuitTable residents={longSejourResidents} notes={currentNotes} onChangeNote={handleChangeNote} locked={isCurrentLocked} girData={girData} contentionMap={contentionMap} />
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Légende</h3>
                  <div className="flex gap-2 text-sm text-slate-600 flex-wrap">
                    <div className="flex items-center gap-1"><Pill className="h-4 w-4" /><span>TTT écrasés</span></div>
                    <div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /><span>Anticoag</span></div>
                    <div className="flex items-center gap-1"><PhoneCall className="h-4 w-4 text-indigo-500" /><span>Famille nuit</span></div>
                    <div className="flex items-center gap-1"><span style={{ fontWeight: "bold", fontSize: "13px" }}>I</span><span>GIR</span></div>
                    <div className="flex items-center gap-1">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid #1e293b", fontWeight: "bold", fontSize: "11px" }}>A</div>
                      <span>Niveau soins (A à D)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "#dbeafe", border: "1.5px solid #93c5fd", fontWeight: "bold", fontSize: "9px", color: "#000" }}>L</span><span>Lit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "#f3e8ff", border: "1.5px solid #c4b5fd", fontWeight: "bold", fontSize: "9px", color: "#000" }}>F</span><span>Fauteuil</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "#fef3c7", border: "1.5px solid #d97706", fontWeight: "bold", fontSize: "8px", color: "#000" }}>BG</span><span>Barrière G</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "#fef3c7", border: "1.5px solid #d97706", fontWeight: "bold", fontSize: "8px", color: "#000" }}>BD</span><span>Barrière D</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "#fef3c7", border: "1.5px solid #d97706", fontWeight: "bold", fontSize: "8px", color: "#000" }}>B2</span><span>BarX2</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", background: "white", border: "2px dashed #000", fontWeight: "bold", fontSize: "9px", color: "#000" }}>L</span><span>Si besoin</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">INFOS</h3>
                  <textarea
                    value={infosByFloor[activeFloor] || ""}
                    onChange={(e) => setInfosByFloor(prev => ({ ...prev, [activeFloor]: e.target.value }))}
                    disabled={isCurrentLocked}
                    className="w-full text-sm border border-amber-200 rounded px-2 py-1.5 bg-white resize-none disabled:opacity-50"
                    rows={3}
                    placeholder="Informations importantes pour la nuit…"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
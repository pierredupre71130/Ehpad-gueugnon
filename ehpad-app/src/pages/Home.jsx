import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ClipboardList, FileText, Pill, Moon, Users, Tag, Clipboard, Settings, X, GripVertical } from "lucide-react";

const DEFAULT_LAYOUT = [
  ["Consignes", "ConsignesNuit", "FichesDePosteAccueil"],
  ["EtiquettesRepas", "PAP", "SuiviAntalgiques"],
];

const MODULE_CONFIG = {
  Consignes: { title: "Feuilles de Consignes", icon: ClipboardList, color: "bg-blue-50 border-blue-200 hover:bg-blue-100", iconColor: "text-blue-600" },
  ConsignesNuit: { title: "Consignes de Nuit", icon: Moon, color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100", iconColor: "text-indigo-600" },
  FichesDePosteAccueil: { title: "Fiches de Poste", icon: FileText, color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", iconColor: "text-emerald-600" },
  EtiquettesRepas: { title: "Étiquettes Repas", icon: Tag, color: "bg-pink-50 border-pink-200 hover:bg-pink-100", iconColor: "text-pink-600" },
  PAP: { title: "PAP", icon: Clipboard, color: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100", iconColor: "text-cyan-600" },
  SuiviAntalgiques: { title: "Suivi Morphinique", icon: Pill, color: "bg-orange-50 border-orange-200 hover:bg-orange-100", iconColor: "text-orange-600" },
};

const STORAGE_KEY = "home_layout_v2";

function getTodayPassword() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return day + month;
}

export default function Home() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch { return DEFAULT_LAYOUT; }
  });

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handlePasswordSubmit = () => {
    if (passwordInput === getTodayPassword()) {
      setEditMode(true);
      setShowPasswordPrompt(false);
      setPasswordInput("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleDragStart = (row, col) => setDragging({ row, col });
  const handleDragOver = (e, row, col) => { e.preventDefault(); setDragOver({ row, col }); };

  const handleDrop = (targetRow, targetCol) => {
    if (!dragging) return;
    const { row: sRow, col: sCol } = dragging;
    if (sRow === targetRow && sCol === targetCol) { setDragging(null); setDragOver(null); return; }
    const newLayout = layout.map((r) => [...r]);
    const srcPage = newLayout[sRow][sCol];
    newLayout[sRow][sCol] = newLayout[targetRow][targetCol];
    newLayout[targetRow][targetCol] = srcPage;
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="w-full flex flex-col items-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">EHPAD Gueugnon</h1>
        <p className="text-slate-500 mt-1 text-sm">Tableau de bord — Choisissez un module</p>
        <div className="mt-3 h-0.5 w-16 bg-blue-400 mx-auto rounded-full" />
      </div>

      {/* Gestion résidents */}
      <div className="w-full max-w-lg mb-5">
        <Link
          to={createPageUrl("GestionResidents")}
          className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-5 py-4 transition-all shadow-sm group"
        >
          <div className="p-2.5 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">Gérer les Résidents</div>
            <div className="text-slate-500 text-xs">Noms, infos importantes, codes d'accès</div>
          </div>
        </Link>
      </div>

      {/* Module grid */}
      <div className="w-full max-w-lg space-y-3 mb-2">
        {layout.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-3 gap-3">
            {row.map((page, colIdx) => {
              const mod = MODULE_CONFIG[page];
              if (!mod) return null;
              const Icon = mod.icon;
              const isDragTarget = dragOver && dragOver.row === rowIdx && dragOver.col === colIdx;
              return (
                <div
                  key={page}
                  draggable={editMode}
                  onDragStart={() => handleDragStart(rowIdx, colIdx)}
                  onDragOver={(e) => handleDragOver(e, rowIdx, colIdx)}
                  onDrop={() => handleDrop(rowIdx, colIdx)}
                  className={`relative rounded-xl border-2 transition-all ${mod.color} ${isDragTarget ? "opacity-50 scale-95" : ""}`}
                >
                  {editMode && (
                    <div className="absolute top-1 left-1 text-slate-400">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}
                  <Link
                    to={editMode ? "#" : createPageUrl(page)}
                    onClick={(e) => editMode && e.preventDefault()}
                    className="flex flex-col items-center gap-2 px-2 py-4 text-center"
                  >
                    <div className="p-2 rounded-full bg-white shadow-sm">
                      <Icon className={`h-5 w-5 ${mod.iconColor}`} />
                    </div>
                    <div className="font-semibold text-slate-800 text-xs leading-tight">{mod.title}</div>
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      </div>

      {/* Edit mode toggle */}
      <div className="relative z-10 mt-5">
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <X className="h-3.5 w-3.5" /> Terminer la réorganisation
          </button>
        ) : (
          <button
            onClick={() => setShowPasswordPrompt(true)}
            className="flex items-center gap-1.5 text-xs text-slate-800 hover:text-black font-medium"
          >
            <Settings className="h-3.5 w-3.5" /> Réorganiser
          </button>
        )}
      </div>

      {/* Password modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72">
            <h2 className="text-base font-semibold text-slate-700 mb-1">Accès réorganisation</h2>
            <p className="text-xs text-slate-400 mb-4">Entrez le code du jour (jjmm)</p>
            <input
              autoFocus
              type="password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-slate-500"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              placeholder="••••"
            />
            {passwordError && <p className="text-xs text-red-500 mb-2">Code incorrect</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowPasswordPrompt(false); setPasswordInput(""); setPasswordError(false); }} className="text-sm text-slate-400 hover:text-slate-600 px-3 py-1.5">Annuler</button>
              <button onClick={handlePasswordSubmit} className="text-sm bg-slate-800 text-white rounded-lg px-4 py-1.5 hover:bg-slate-700">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
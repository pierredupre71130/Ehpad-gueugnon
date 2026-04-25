import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ClipboardList, FileText, ShieldAlert, Moon, Users, Tag, Clipboard, Settings, X, GripVertical, HeartPulse, Droplets, Scale, Lock, Syringe, BriefcaseMedical, Pill } from "lucide-react";

const DEFAULT_LAYOUT = [
  ["Consignes", "ConsignesNuit", "FichesDePosteAccueil"],
  ["EtiquettesRepas", "PAP", "SuiviAntalgiques"],
  ["SurveillancePoids", "PriseEnCharge", "FicheDispensationMorphiniques"],
];

const MODULE_CONFIG = {
  Consignes: { title: "Feuilles de Consignes", icon: ClipboardList, color: "bg-blue-50 border-blue-200 hover:bg-blue-100", iconColor: "text-blue-600" },
  ConsignesNuit: { title: "Consignes de Nuit", icon: Moon, color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100", iconColor: "text-indigo-600" },
  FichesDePosteAccueil: { title: "Fiches de Poste", icon: FileText, color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", iconColor: "text-emerald-600" },
  EtiquettesRepas: { title: "Étiquettes Repas", icon: Tag, color: "bg-pink-50 border-pink-200 hover:bg-pink-100", iconColor: "text-pink-600" },
  PAP: { title: "PAP", icon: Clipboard, color: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100", iconColor: "text-cyan-600" },
  SuiviAntalgiques: { title: "Gestion des Contentions", icon: ShieldAlert, color: "bg-orange-50 border-orange-200 hover:bg-orange-100", iconColor: "text-orange-600" },
  SurveillancePoids: { title: "Surveillance Poids", icon: Scale, color: "bg-teal-50 border-teal-200 hover:bg-teal-100", iconColor: "text-teal-600" },
  Vaccination: { title: "Vaccination", icon: Syringe, color: "bg-green-50 border-green-200 hover:bg-green-100", iconColor: "text-green-600" },
  PriseEnCharge: { title: "Prise en charge", icon: BriefcaseMedical, color: "bg-amber-50 border-amber-200 hover:bg-amber-100", iconColor: "text-amber-600" },
  FicheDispensationMorphiniques: { title: "Fiche dispensation morphiniques", icon: Pill, color: "bg-purple-50 border-purple-200 hover:bg-purple-100", iconColor: "text-purple-600" },
};

const VUE_MODULES = {
  psychologue: ["PAP"],
  dieteticienne: ["SurveillancePoids"],
  cadre: ["Consignes", "ConsignesNuit", "FichesDePosteAccueil", "EtiquettesRepas", "PAP"],
  "aide soignante": ["Consignes", "ConsignesNuit", "FichesDePosteAccueil", "EtiquettesRepas", "PAP"],
  as: ["Consignes", "ConsignesNuit", "FichesDePosteAccueil", "EtiquettesRepas", "PAP"],
};

const ADMIN_PASSWORD = "mapad2022";
const STORAGE_KEY = "home_layout_v3";

function getTodayPassword() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return day + month;
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const vue = urlParams.get("vue");
  const userRole = user?.role;
  const allowedModules = (vue && VUE_MODULES[vue]) || (userRole && VUE_MODULES[userRole]) || null;

  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch { return DEFAULT_LAYOUT; }
  });

  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem("admin_unlocked") === "1");
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [adminError, setAdminError] = useState(false);

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleAdminSubmit = () => {
    if (adminInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      sessionStorage.setItem("admin_unlocked", "1");
      setShowAdminPrompt(false);
      setAdminInput("");
      setAdminError(false);
    } else {
      setAdminError(true);
    }
  };

  const isFiltered = allowedModules && !adminUnlocked;

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

      {/* Gestion résidents + GIR côte à côte */}
      {!isFiltered && <div className="w-full max-w-lg mb-2 grid grid-cols-2 gap-3">
        <Link
          to={createPageUrl("GestionResidents")}
          className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-4 py-4 transition-all shadow-sm group"
        >
          <div className="p-2 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-xs leading-tight">Gérer les Résidents</div>
            <div className="text-slate-500 text-xs leading-tight mt-0.5">Noms, infos importantes, codes d'accès</div>
          </div>
        </Link>
        <Link
          to="/GIRNiveauSoin"
          className="flex items-center gap-3 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 px-4 py-4 transition-all shadow-sm group"
        >
          <div className="p-2 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors shrink-0">
            <HeartPulse className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-xs leading-tight">GIR / Niveau de soin / Appel Nuit</div>
            <div className="text-slate-500 text-xs leading-tight mt-0.5">GIR, niveaux de soins, appel de nuit, pompes funèbres</div>
          </div>
        </Link>
      </div>}

      {/* Bilans sanguins + Vaccination côte à côte */}
      {!isFiltered && <div className="w-full max-w-lg mb-2 grid grid-cols-2 gap-3">
        <Link
          to="/BilansSanguins"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 px-4 py-4 transition-all shadow-sm group"
        >
          <div className="p-2 rounded-full bg-red-100 group-hover:bg-red-200 transition-colors shrink-0">
            <Droplets className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-xs leading-tight">Bilans sanguins</div>
            <div className="text-slate-500 text-xs leading-tight mt-0.5">Suivi des bilans biologiques des résidents</div>
          </div>
        </Link>
        <Link
          to="/Vaccination"
          className="flex items-center gap-3 rounded-xl border border-green-200 bg-white hover:bg-green-50 px-4 py-4 transition-all shadow-sm group"
        >
          <div className="p-2 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors shrink-0">
            <Syringe className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-xs leading-tight">Vaccination</div>
            <div className="text-slate-500 text-xs leading-tight mt-0.5">Suivi des vaccinations des résidents</div>
          </div>
        </Link>
      </div>}

      {/* Module grid */}
      {isFiltered ? (
        <div className="w-full max-w-lg grid grid-cols-3 gap-3 mb-2">
          {allowedModules.map((page) => {
            const mod = MODULE_CONFIG[page];
            if (!mod) return null;
            const Icon = mod.icon;
            return (
              <div key={page} className={`rounded-xl border-2 transition-all ${mod.color}`}>
                <Link to={`${createPageUrl(page)}?vue=${vue}`} className="flex flex-col items-center gap-2 px-2 py-4 text-center">
                  <div className="p-2 rounded-full bg-white shadow-sm">
                    <Icon className={`h-5 w-5 ${mod.iconColor}`} />
                  </div>
                  <div className="font-semibold text-slate-800 text-xs leading-tight">{mod.title}</div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full max-w-lg space-y-3 mb-2">
          {layout.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-3">
              {row.map((page, colIdx) => {
                if (!page) return <div key={colIdx} />;
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
      )}

      </div>

      {/* Edit mode toggle */}
      <div className="relative z-10 mt-5 flex flex-col items-center gap-2">
        {isFiltered ? (
          <button
            onClick={() => setShowAdminPrompt(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
          >
            <Lock className="h-3 w-3" /> Accès administrateur
          </button>
        ) : (
          editMode ? (
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
          )
        )}
      </div>

      {/* Admin password modal */}
      {showAdminPrompt && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Accès administrateur</h2>
            <input
              autoFocus
              type="password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-slate-500"
              value={adminInput}
              onChange={(e) => { setAdminInput(e.target.value); setAdminError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()}
              placeholder="Mot de passe"
            />
            {adminError && <p className="text-xs text-red-500 mb-2">Mot de passe incorrect</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAdminPrompt(false); setAdminInput(""); setAdminError(false); }} className="text-sm text-slate-400 hover:text-slate-600 px-3 py-1.5">Annuler</button>
              <button onClick={handleAdminSubmit} className="text-sm bg-slate-800 text-white rounded-lg px-4 py-1.5 hover:bg-slate-700">OK</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Entrer mot de passe</h2>
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
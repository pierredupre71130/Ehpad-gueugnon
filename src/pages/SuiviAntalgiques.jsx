import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Edit2, Trash2, Bed, Armchair, Fence, AlertCircle, Clock, Printer, TableProperties, Upload, ImagePlus } from "lucide-react";
import ImportContentionModal from "@/components/suivi/ImportContentionModal";
import ImportContentionFromImage from "@/components/suivi/ImportContentionFromImage";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY_FORM = {
  nom_prenom: "",
  chambre: "",
  type_contention: "lit",
  date_prescription: "",
  date_fin_prevue: "",
  si_besoin: false,
  cause: "",
  famille_prevenue: false,
};

const TYPES_CONTENTION = ["lit", "fauteuil", "barrière gauche", "barrière droite", "barrière x2"];

const CAUSES_CONTENTION = [
  "agitation",
  "confusion / désorientation",
  "déambulation",
  "fugue",
  "hétéro-agressivité",
  "risque de chute",
  "risque d'arrachage de dispositif médical",
  "position thérapeutique",
  "post-opératoire",
  "troubles du comportement",
];

const ContentionBadge = ({ label, bg, border, size = "large" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: size === "large" ? "22px" : "14px",
    height: size === "large" ? "22px" : "14px",
    borderRadius: "50%",
    background: bg,
    border: `1.5px solid ${border}`,
    fontWeight: "bold",
    fontSize: size === "large" ? "10px" : "7px",
    color: "#000",
    flexShrink: 0,
  }}>{label}</span>
);

const TYPE_ICONS = {
  lit: <ContentionBadge label="L" bg="#dbeafe" border="#93c5fd" />,
  fauteuil: <ContentionBadge label="F" bg="#f3e8ff" border="#c4b5fd" />,
  "barrière gauche": <ContentionBadge label="BG" bg="#fef3c7" border="#d97706" />,
  "barrière droite": <ContentionBadge label="BD" bg="#fef3c7" border="#d97706" />,
  "barrière x2": <ContentionBadge label="B2" bg="#fef3c7" border="#d97706" />,
};

const TYPE_ICONS_SMALL = {
  lit: <ContentionBadge label="L" bg="#dbeafe" border="#93c5fd" size="small" />,
  fauteuil: <ContentionBadge label="F" bg="#f3e8ff" border="#c4b5fd" size="small" />,
  "barrière gauche": <ContentionBadge label="BG" bg="#fef3c7" border="#d97706" size="small" />,
  "barrière droite": <ContentionBadge label="BD" bg="#fef3c7" border="#d97706" size="small" />,
  "barrière x2": <ContentionBadge label="B2" bg="#fef3c7" border="#d97706" size="small" />,
};

const TYPE_COLORS = {
  lit: "bg-blue-100 text-blue-800 border-blue-300",
  fauteuil: "bg-purple-100 text-purple-800 border-purple-300",
  "barrière gauche": "bg-amber-100 text-amber-800 border-amber-300",
  "barrière droite": "bg-amber-100 text-amber-800 border-amber-300",
  "barrière x2": "bg-amber-100 text-amber-800 border-amber-300",
};

const TYPE_BORDER_COLORS = {
  lit: "border-blue-400",
  fauteuil: "border-purple-400",
  "barrière gauche": "border-amber-400",
  "barrière droite": "border-amber-400",
  "barrière x2": "border-amber-400",
};

export default function SuiviAntalgiques() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeId, setActiveId] = useState(null);
  const [residentLocked, setResidentLocked] = useState(false);
  const [activeFloor, setActiveFloor] = useState("RDC");
  const [showModal, setShowModal] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportImageModal, setShowImportImageModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: fiches = [], isLoading: isLoadingFiches } = useQuery({
    queryKey: ["gestion_contentions"],
    queryFn: () => base44.entities.SuiviAntalgique.list("-created_date", 200),
  });

  const { data: residents = [], isLoading: isLoadingResidents } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SuiviAntalgique.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestion_contentions"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setActiveId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SuiviAntalgique.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestion_contentions"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setActiveId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SuiviAntalgique.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestion_contentions"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setActiveId(null);
    },
  });

  const handleSave = async () => {
    if (!form.nom_prenom.trim()) {
      alert("Le nom et prénom sont obligatoires");
      return;
    }

    const dataToSave = {
      nom: form.nom_prenom,
      chambre: form.chambre,
      traitement: form.type_contention,
      type_suivi: "contention",
      date_debut: form.date_prescription,
      date_fin: form.date_fin_prevue,
      pas_de_fin: !form.date_fin_prevue,
      poso_matin: form.famille_prevenue,
      poso_midi: false,
      poso_soir: false,
      prescripteur: form.cause,
      dotation_nominative: form.si_besoin,
    };

    if (activeId) {
      try {
        // Vérifie que l'enregistrement existe avant de le mettre à jour
        await base44.entities.SuiviAntalgique.get(activeId);
        await updateMutation.mutateAsync({ id: activeId, data: dataToSave });
      } catch (error) {
        // Si l'enregistrement n'existe plus, créer un nouveau
        await createMutation.mutateAsync(dataToSave);
      }
    } else {
      await createMutation.mutateAsync(dataToSave);
    }
  };

  const handleDelete = async () => {
    if (!activeId) return;
    if (confirm(`Supprimer la contention de ${form.nom_prenom} ?`)) {
      await deleteMutation.mutateAsync(activeId);
    }
  };

  const handleSelectResident = (resident) => {
    const nom_prenom = `${resident.first_name || ""} ${resident.last_name || ""}`.trim();
    setForm({
      nom_prenom,
      chambre: resident.room || "",
      type_contention: "lit",
      date_prescription: "",
      date_fin_prevue: "",
      si_besoin: false,
      cause: "",
      famille_prevenue: false,
    });
    setActiveId(null);
    setResidentLocked(true);
    setShowModal(true);
  };

  const handleSelectContention = (fiche) => {
    setActiveId(fiche.id);
    setResidentLocked(true);
    setForm({
      nom_prenom: fiche.nom || "",
      chambre: fiche.chambre || "",
      type_contention: fiche.traitement || "lit",
      date_prescription: fiche.date_debut || "",
      date_fin_prevue: fiche.date_fin || "",
      si_besoin: !!fiche.dotation_nominative,
      cause: fiche.prescripteur || "",
      famille_prevenue: !!fiche.poso_matin,
    });
    setShowModal(true);
  };

  const getFloorByChambres = (chambre) => {
    const resident = residents.find(r => r.room === chambre);
    return resident ? resident.floor : null;
  };

  // Extrait le nom de famille (dernière partie du nom)
  const extractLastName = (fullName) => {
    const parts = (fullName || "").trim().split(/\s+/);
    return parts.length > 0 ? parts[parts.length - 1] : fullName;
  };

  // Formate le nom en "NOM Prénom"
  const formatNameLastFirst = (fullName) => {
    const parts = (fullName || "").trim().split(/\s+/);
    if (parts.length <= 1) return fullName;
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(" ");
    return `${lastName} ${firstName}`.trim();
  };

  const residentsByFloor = residents.filter((r) => r.floor === activeFloor);
  const sortedResidents = [...residentsByFloor].sort((a, b) => {
    const numA = parseInt(a.room) || 0;
    const numB = parseInt(b.room) || 0;
    if (numA !== numB) return numA - numB;
    return (a.room || "").localeCompare(b.room || "");
  });

  const fichersByFloor = fiches.filter(f => f.type_suivi === "contention" && getFloorByChambres(f.chambre) === activeFloor);

  const groupedByResident = {};
  fichersByFloor.forEach(f => {
    if (!groupedByResident[f.nom]) groupedByResident[f.nom] = [];
    groupedByResident[f.nom].push(f);
  });

  // Trie par nom de famille
  const sortedResidentNames = Object.keys(groupedByResident).sort((a, b) => {
    const lastNameA = extractLastName(a);
    const lastNameB = extractLastName(b);
    return lastNameA.localeCompare(lastNameB, "fr");
  });

  const residentContentionTypes = {};
  sortedResidents.forEach(r => {
    const nom = `${r.first_name || ""} ${r.last_name || ""}`.trim();
    const contentions = fichersByFloor.filter(f => f.nom === nom);
    const seen = new Set();
    const items = [];
    contentions.forEach(f => {
      const key = `${f.traitement}-${!!f.dotation_nominative}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ type: f.traitement, siBesoin: !!f.dotation_nominative });
      }
    });
    residentContentionTypes[r.id] = items;
  });

  const today = new Date();
  const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const toEvaluate = fichersByFloor.filter(f => {
    if (!f.date_fin) return false;
    const endDate = new Date(f.date_fin);
    return endDate <= twoWeeksFromNow && endDate > today;
  }).sort((a, b) => new Date(a.date_fin) - new Date(b.date_fin));

  const expiredWithoutRenewal = [];
  fichersByFloor.forEach(f => {
    if (!f.date_fin) return;
    const endDate = new Date(f.date_fin);
    if (endDate <= today) {
      const hasRenewal = fichersByFloor.some(f2 =>
        f2.nom === f.nom &&
        f2.id !== f.id &&
        f2.traitement === f.traitement &&
        f2.date_debut &&
        new Date(f2.date_debut) >= endDate
      );
      if (!hasRenewal) expiredWithoutRenewal.push(f);
    }
  });

  const lastExpired = expiredWithoutRenewal.sort((a, b) => new Date(b.date_fin) - new Date(a.date_fin)).slice(0, 5);

  const isLoading = isLoadingFiches || isLoadingResidents;
  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-6 px-8 shadow-lg border-b border-slate-700">
        <h1 className="text-3xl font-bold">Gestion des Contentions</h1>
        <p className="text-slate-300 mt-1">Suivi et prescription des contentions par étage</p>
      </div>

      {/* Alerts Section */}
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <h3 className="font-bold text-orange-900">À réévaluer (moins de 2 semaines)</h3>
              <span className="ml-auto bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {toEvaluate.length}
              </span>
            </div>
            {toEvaluate.length === 0 ? (
              <p className="text-sm text-orange-800">Aucune contention à réévaluer</p>
            ) : (
              <div className="space-y-2">
                {toEvaluate.map((f) => {
                  const endDate = new Date(f.date_fin);
                  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={f.id} className="text-sm bg-white rounded p-2 border border-orange-200">
                      <div className="font-semibold text-orange-900">{f.nom}</div>
                      <div className="text-xs text-orange-700">
                        Fin le {endDate.toLocaleDateString("fr-FR")} ({daysLeft} j)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-bold text-red-900">Expirées non renouvelées</h3>
              <span className="ml-auto bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {lastExpired.length}
              </span>
            </div>
            {lastExpired.length === 0 ? (
              <p className="text-sm text-red-800">Aucune contention expirée</p>
            ) : (
              <div className="space-y-2">
                {lastExpired.map((f) => {
                  const endDate = new Date(f.date_fin);
                  return (
                    <div key={f.id} className="text-sm bg-white rounded p-2 border border-red-200">
                      <div className="font-semibold text-red-900">{f.nom}</div>
                      <div className="text-xs text-red-700">
                        Fin le {endDate.toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-80 border-r border-slate-300 bg-white flex flex-col">
          <div className="px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <h2 className="text-sm font-bold text-slate-900 mb-3">👥 Résidents</h2>
            <Tabs value={activeFloor} onValueChange={setActiveFloor} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="RDC" className="text-xs">RDC</TabsTrigger>
                <TabsTrigger value="1ER" className="text-xs">1ER</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-y-auto flex-1">
            {sortedResidents.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">Aucun résident</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {sortedResidents.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectResident(r)}
                    className="p-3 hover:bg-blue-50 cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-blue-500"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-blue-900 text-sm">Ch. {r.room}</span>
                      <div className="flex items-center gap-1">
                        {(residentContentionTypes[r.id] || []).map(({ type, siBesoin }) => (
                          <span
                            key={`${type}-${siBesoin}`}
                            title={`${type}${siBesoin ? " (si besoin)" : " (continu)"}`}
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                              siBesoin
                                ? `bg-white border-2 border-dashed ${TYPE_BORDER_COLORS[type] || "border-gray-400"}`
                                : TYPE_COLORS[type] || "bg-gray-100"
                            }`}
                          >
                            {TYPE_ICONS_SMALL[type]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mb-1">
                      {r.last_name.toUpperCase()} {r.first_name}
                    </div>
                    {r.medecin && (
                      <div className="text-xs text-slate-500">Dr. {r.medecin}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            💡 Cliquez sur un résident
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">📋 Contentions - {activeFloor} ({fichersByFloor.length})</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowImportImageModal(true)}
                size="sm"
                variant="outline"
                className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-100"
              >
                <ImagePlus className="h-4 w-4" /> Prescription (image)
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                size="sm"
                variant="outline"
                className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                <Upload className="h-4 w-4" /> Importer fichier
              </Button>
              <Button
                onClick={() => setShowRecap(true)}
                size="sm"
                variant="outline"
                className="gap-2 border-emerald-400 text-emerald-700 hover:bg-emerald-100"
              >
                <TableProperties className="h-4 w-4" /> Récapitulatif
              </Button>
            </div>
          </div>

          {fichersByFloor.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <p>Aucune contention enregistrée à cet étage. Sélectionnez un résident à gauche pour en créer une.</p>
            </div>
          ) : (
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border border-slate-300 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Résident</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Chambre</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Type</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Cause</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Prescription</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Fin prévue</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Statut</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Famille</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedResidentNames.map((residentName) => {
                    const contentionsForResident = groupedByResident[residentName];
                    return contentionsForResident.map((f, fIdx) => {
                      const datePresc = f.date_debut
                        ? new Date(f.date_debut + "T00:00:00").toLocaleDateString("fr-FR")
                        : "—";
                      const dateFin = f.date_fin
                        ? new Date(f.date_fin + "T00:00:00").toLocaleDateString("fr-FR")
                        : "—";
                      const isFirstRow = fIdx === 0;
                      const rowsCount = contentionsForResident.length;
                      return (
                        <tr key={f.id} className={`${isFirstRow ? "bg-blue-50" : "bg-white"} hover:bg-slate-50 transition`}>
                          <td className={`px-4 py-3 font-semibold text-slate-900 flex items-center gap-2 ${isFirstRow ? "border-l-4 border-l-blue-500" : ""}`}>
                            {isFirstRow && (
                              <div className="flex flex-col">
                                <span>{formatNameLastFirst(f.nom)}</span>
                                {rowsCount > 1 && (
                                  <span className="text-xs text-slate-500 font-normal">({rowsCount} contentions)</span>
                                )}
                              </div>
                            )}
                            {!isFirstRow && <span className="text-slate-400">↳</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-700">{f.chambre}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${TYPE_COLORS[f.traitement] || "bg-gray-100 text-gray-800 border-gray-300"}`}>
                              {TYPE_ICONS[f.traitement]}
                              {f.traitement.charAt(0).toUpperCase() + f.traitement.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-600">
                            {f.prescripteur ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {f.prescripteur.charAt(0).toUpperCase() + f.prescripteur.slice(1)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-700">{datePresc}</td>
                          <td className="px-4 py-3 text-center text-slate-700">{dateFin}</td>
                          <td className="px-4 py-3 text-center">
                            {f.dotation_nominative ? (
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">Si besoin</span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">Continu</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {f.poso_matin ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">✓ Oui</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">Non</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              onClick={() => handleSelectContention(f)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1"
                            >
                              <Edit2 className="h-4 w-4" /> Modifier
                            </Button>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Récapitulatif */}
      <Dialog open={showRecap} onOpenChange={setShowRecap}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between">
              <span>Récapitulatif — Contentions {activeFloor}</span>
              <Button
                onClick={() => window.print()}
                size="sm"
                className="gap-2 bg-slate-700 hover:bg-slate-800 text-white mr-6"
              >
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div id="recap-print" className="overflow-y-auto flex-1">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #recap-print, #recap-print * { visibility: visible !important; }
                #recap-print { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
              }
            `}</style>

            <div className="text-xs text-slate-500 mb-3">
              Édité le {new Date().toLocaleDateString("fr-FR")} — Étage {activeFloor}
            </div>

            {sortedResidents.filter(r => {
              const nom = `${r.first_name || ""} ${r.last_name || ""}`.trim();
              return fichersByFloor.some(f => f.nom === nom);
            }).length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">Aucune contention à afficher.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Résident</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Médecin</th>
                    <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">Type</th>
                    <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">Cause</th>
                    <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">Statut</th>
                    <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">Prescription</th>
                    <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">Fin prévue</th>
                    <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">Famille prévenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResidents.flatMap(r => {
                    const nom = `${r.first_name || ""} ${r.last_name || ""}`.trim();
                    const contentions = fichersByFloor.filter(f => f.nom === nom);
                    if (contentions.length === 0) return [];
                    return contentions.map((f, idx) => {
                      const datePresc = f.date_debut
                        ? new Date(f.date_debut + "T00:00:00").toLocaleDateString("fr-FR")
                        : "—";
                      const dateFin = f.date_fin
                        ? new Date(f.date_fin + "T00:00:00").toLocaleDateString("fr-FR")
                        : "Sans limite";
                      const isExpired = f.date_fin && new Date(f.date_fin) <= today;
                      return (
                        <tr key={f.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                            {idx === 0 ? nom : ""}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-600 text-xs">
                            {idx === 0 && r.medecin ? `Dr. ${r.medecin}` : ""}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${TYPE_COLORS[f.traitement] || "bg-gray-100 text-gray-800 border-gray-300"}`}>
                              {TYPE_ICONS[f.traitement]}
                              {f.traitement.charAt(0).toUpperCase() + f.traitement.slice(1)}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center text-xs text-slate-700">
                            {f.prescripteur ? f.prescripteur.charAt(0).toUpperCase() + f.prescripteur.slice(1) : "—"}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center">
                            {f.dotation_nominative ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">Si besoin</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">Continu</span>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center text-slate-700">{datePresc}</td>
                          <td className={`border border-slate-300 px-3 py-2 text-center font-semibold ${isExpired ? "text-red-600" : "text-slate-700"}`}>
                            {dateFin}{isExpired && " ⚠️"}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center">
                            {f.poso_matin ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">✓ Oui</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">Non</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Import Fichier */}
      <ImportContentionModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        residents={residents}
        onImport={() => queryClient.invalidateQueries({ queryKey: ["gestion_contentions"] })}
      />

      {/* Modal Import Image OCR */}
      <ImportContentionFromImage
        open={showImportImageModal}
        onOpenChange={setShowImportImageModal}
        residents={residents}
        onImport={() => queryClient.invalidateQueries({ queryKey: ["gestion_contentions"] })}
      />

      {/* Modal - Formulaire */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setResidentLocked(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {activeId ? "✏️ Modifier la contention" : "➕ Nouvelle contention"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-semibold">Nom Prénom</Label>
                <Input
                  placeholder="Jean Dupont"
                  value={form.nom_prenom}
                  onChange={(e) => setForm({ ...form, nom_prenom: e.target.value })}
                  className="mt-1"
                  disabled={residentLocked}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Chambre</Label>
                <Input
                  placeholder="102"
                  value={form.chambre}
                  onChange={(e) => setForm({ ...form, chambre: e.target.value })}
                  className="mt-1"
                  disabled={residentLocked}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Type de contention</Label>
                <Select value={form.type_contention} onValueChange={(v) => setForm({ ...form, type_contention: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_CONTENTION.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Cause</Label>
              <Select value={form.cause} onValueChange={(v) => setForm({ ...form, cause: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une cause..." />
                </SelectTrigger>
                <SelectContent>
                  {CAUSES_CONTENTION.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Date de prescription</Label>
                <Input
                  type="date"
                  value={form.date_prescription || ""}
                  onChange={(e) => setForm({ ...form, date_prescription: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Date de fin prévue</Label>
                <Input
                  type="date"
                  value={form.date_fin_prevue || ""}
                  onChange={(e) => setForm({ ...form, date_fin_prevue: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded bg-slate-50 hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={!!form.si_besoin}
                  onChange={(e) => setForm({ ...form, si_besoin: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-slate-700">Si besoin (à la demande)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded bg-teal-50 hover:bg-teal-100 transition border border-teal-200">
                <input
                  type="checkbox"
                  checked={!!form.famille_prevenue}
                  onChange={(e) => setForm({ ...form, famille_prevenue: e.target.checked })}
                  className="w-4 h-4 accent-teal-600"
                />
                <span className="text-sm font-semibold text-teal-800">Famille prévenue</span>
              </label>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSaving ? "Enregistrement..." : activeId ? "Mettre à jour" : "Enregistrer"}
              </Button>

              {activeId && (
                <Button
                  onClick={handleDelete}
                  disabled={isSaving}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
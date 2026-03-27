import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import ResidentForm from "../components/suivi/ResidentForm";
import FicheSheet from "../components/suivi/FicheSheet";

const EMPTY_FORM = {
  nom: "",
  chambre: "",
  traitement: "Durogesic 12 µg/h",
  type_suivi: "calendrier",
  date_debut: "",
  date_fin: "",
  pas_de_fin: false,
  poso_matin: false,
  poso_midi: false,
  poso_soir: false,
  prescripteur: "",
  dotation_nominative: false,
};

export default function SuiviAntalgiques() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeId, setActiveId] = useState(null);
  const queryClient = useQueryClient();

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ["suivi_antalgiques"],
    queryFn: () => base44.entities.SuiviAntalgique.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SuiviAntalgique.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suivi_antalgiques"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SuiviAntalgique.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suivi_antalgiques"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SuiviAntalgique.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suivi_antalgiques"] }),
  });

  const handleSave = async () => {
    if (activeId) {
      await updateMutation.mutateAsync({ id: activeId, data: form });
    } else if (form.nom.trim()) {
      const created = await createMutation.mutateAsync(form);
      setActiveId(created.id);
    }
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setActiveId(null);
  };

  const handleDelete = async () => {
    if (!activeId) { alert("Aucune fiche sélectionnée."); return; }
    if (confirm(`Supprimer la fiche de ${form.nom} ?`)) {
      await deleteMutation.mutateAsync(activeId);
      handleNew();
    }
  };

  const handleSelect = (fiche) => {
    setActiveId(fiche.id);
    setForm({
      nom: fiche.nom || "",
      chambre: fiche.chambre || "",
      traitement: fiche.traitement || "Durogesic 12 µg/h",
      type_suivi: fiche.type_suivi || "calendrier",
      date_debut: fiche.date_debut || "",
      date_fin: fiche.date_fin || "",
      pas_de_fin: !!fiche.pas_de_fin,
      poso_matin: !!fiche.poso_matin,
      poso_midi: !!fiche.poso_midi,
      poso_soir: !!fiche.poso_soir,
      prescripteur: fiche.prescripteur || "",
      dotation_nominative: !!fiche.dotation_nominative,
    });
  };

  // Auto-save when form changes and we have an activeId
  React.useEffect(() => {
    if (!activeId || !form.nom.trim()) return;
    const timeout = setTimeout(() => {
      updateMutation.mutate({ id: activeId, data: form });
    }, 800);
    return () => clearTimeout(timeout);
  }, [form]);

  const handlePrint = () => window.print();

  const sorted = [...fiches].sort((a, b) => a.nom.localeCompare(b.nom));

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="print:hidden bg-blue-800 text-white py-4 px-6 shadow-md">
        <h1 className="text-xl font-bold text-center">Suivi Morphinique</h1>
      </div>

      <div className="flex h-[calc(100vh-64px)] print:block">
        {/* Left panel */}
        <div className="print:hidden w-full max-w-sm border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          {/* Saved list */}
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-blue-800 mb-2">📝 Résidents Sauvegardés</h2>
            {sorted.length === 0 && <p className="text-xs text-slate-400">Aucun résident enregistré.</p>}
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {sorted.map((f) => (
                <li
                  key={f.id}
                  onClick={() => handleSelect(f)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${activeId === f.id ? "bg-blue-700 text-white" : "hover:bg-blue-50"}`}
                >
                  <span>
                    {f.nom} <span className="text-xs opacity-70">({f.traitement})</span>
                    {f.dotation_nominative && <span className="ml-1 text-red-400 text-xs font-bold">(DN)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div className="p-4 overflow-y-auto flex-1">
            <ResidentForm form={form} setForm={setForm} onSave={handleSave} onNew={handleNew} onDelete={handleDelete} />
          </div>
        </div>

        {/* Right panel - Live preview */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center print:p-0">
          {form.nom.trim() ? (
            <div className="w-full max-w-2xl">
              <FicheSheet fiche={form} onPrint={handlePrint} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm print:hidden">
              Remplissez le formulaire pour voir la fiche en temps réel
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { CATALOGUE } from "./BilanDatabase";

const TUBE_COLORS = {
  vert: { bg: "bg-green-500", label: "Tube vert" },
  violet: { bg: "bg-purple-500", label: "Tube violet" },
  gris: { bg: "bg-gray-400", label: "Tube gris" },
  bleu: { bg: "bg-blue-500", label: "Tube bleu" },
  jaune: { bg: "bg-yellow-400", label: "Tube jaune" },
  rouge: { bg: "bg-red-500", label: "Tube rouge" },
  capillaire: { bg: "bg-orange-400", label: "Capillaire" },
  urine: { bg: "bg-amber-300", label: "Urine" },
};

export default function GestionnaireCatalogue() {
  const queryClient = useQueryClient();
  const [nom, setNom] = useState("");
  const [tube, setTube] = useState("rouge");
  const [categorie, setCategorie] = useState("");
  const [search, setSearch] = useState("");

  const { data: custom = [] } = useQuery({
    queryKey: ["catalogueExamen"],
    queryFn: () => base44.entities.CatalogueExamen.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CatalogueExamen.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogueExamen"] });
      setNom("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CatalogueExamen.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalogueExamen"] }),
  });

  const handleAdd = () => {
    if (!nom.trim()) return;
    createMutation.mutate({ nom: nom.trim(), tube, categorie });
  };

  // Full catalogue = static + custom
  const fullCatalogue = [
    ...CATALOGUE,
    ...(custom.length > 0
      ? [{
          categorie: "Examens personnalisés",
          tube: "rouge",
          examens: custom.map(e => e.nom),
          customTubeMap: Object.fromEntries(custom.map(e => [e.nom, e.tube])),
          customIdMap: Object.fromEntries(custom.map(e => [e.nom, e.id])),
        }]
      : []),
  ];

  const filtered = search.trim()
    ? fullCatalogue.map(cat => ({
        ...cat,
        examens: cat.examens.filter(e => e.toLowerCase().includes(search.toLowerCase())),
      })).filter(cat => cat.examens.length > 0)
    : fullCatalogue;

  return (
    <div className="space-y-6">
      {/* Add custom exam */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Ajouter un examen personnalisé</p>
        <p className="text-xs text-slate-400 mb-3">Ces examens s'ajoutent au catalogue standard et sont disponibles dans tous les sélecteurs.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Nom de l'examen</label>
            <input
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400 w-56 bg-white"
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Ex : Phénobarbitalémie"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tube</label>
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400 bg-white"
              value={tube}
              onChange={e => setTube(e.target.value)}
            >
              {Object.entries(TUBE_COLORS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Catégorie (optionnel)</label>
            <input
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400 w-44 bg-white"
              value={categorie}
              onChange={e => setCategorie(e.target.value)}
              placeholder="Ex : Médicaments"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!nom.trim() || createMutation.isPending}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>

        {custom.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {custom.map(ex => (
              <div key={ex.id} className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${TUBE_COLORS[ex.tube]?.bg || "bg-slate-400"}`}></span>
                <span className="text-slate-700 font-medium">{ex.nom}</span>
                {ex.categorie && <span className="text-slate-400 italic">· {ex.categorie}</span>}
                <button onClick={() => deleteMutation.mutate(ex.id)} className="ml-1 text-red-400 hover:text-red-600">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full catalogue visualization */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Catalogue complet ({fullCatalogue.reduce((acc, c) => acc + c.examens.length, 0)} examens)
          </p>
          <input
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400 w-56"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filtered.map(cat => {
            const tubeInfo = TUBE_COLORS[cat.tube];
            return (
              <div key={cat.categorie} className="border border-slate-100 rounded-xl p-3 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${tubeInfo?.bg}`}></span>
                  <p className="text-xs font-bold text-slate-600">{cat.categorie}</p>
                  <span className="text-xs text-slate-300 italic">{tubeInfo?.label}</span>
                  <span className="ml-auto text-xs text-slate-400">{cat.examens.length} examens</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.examens.map(e => {
                    const tubeKey = cat.customTubeMap?.[e] || cat.tube;
                    const dot = TUBE_COLORS[tubeKey];
                    const customId = cat.customIdMap?.[e];
                    return (
                      <span
                        key={e}
                        className={`flex items-center gap-1 text-xs rounded-lg px-2 py-1 border ${
                          customId
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot?.bg}`}></span>
                        {e}
                        {customId && (
                          <>
                            <span className="text-amber-400 font-bold" title="Examen ajouté manuellement">✦</span>
                            <button
                              onClick={() => deleteMutation.mutate(customId)}
                              className="ml-0.5 text-red-300 hover:text-red-500"
                              title="Supprimer cet examen personnalisé"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
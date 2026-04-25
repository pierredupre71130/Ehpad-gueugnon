import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import BilanDatabase from "@/components/bilans/BilanDatabase";
import BilanSpeciaux from "@/components/bilans/BilanSpeciaux";
import PlanningAnnuel from "@/components/bilans/PlanningAnnuel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Droplets, Settings, Check, Loader2, ChevronDown, ChevronUp, BookOpen, Sliders, Grid3X3 } from "lucide-react";
import GestionnaireCatalogue from "@/components/bilans/GestionnaireCatalogue";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

function MedecinJoursRow({ medecinName, config, onSave }) {
  const [jours, setJours] = useState(config?.jours || []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setJours(config?.jours || []);
    setDirty(false);
  }, [config?.id, medecinName]);

  const toggle = (jour) => {
    const next = jours.includes(jour) ? jours.filter(j => j !== jour) : [...jours, jour];
    setJours(next);
    setDirty(true);
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 flex-wrap">
      <div className="w-40 text-sm font-semibold text-slate-700 shrink-0">{medecinName}</div>
      <div className="flex gap-2 flex-wrap">
        {JOURS.map((jour) => (
          <button
            key={jour}
            onClick={() => toggle(jour)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
              jours.includes(jour)
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            }`}
          >
            {jour}
          </button>
        ))}
      </div>
      {dirty && (
        <Button size="sm" className="gap-1 ml-auto" onClick={() => { onSave(medecinName, jours, config); setDirty(false); }}>
          <Check className="h-3.5 w-3.5" /> Enregistrer
        </Button>
      )}
    </div>
  );
}

export default function BilansSanguins() {
  const queryClient = useQueryClient();

  const { data: medecinConfigs = [] } = useQuery({
    queryKey: ["medecinConfig"],
    queryFn: () => base44.entities.MedecinConfig.list(),
  });

  const { data: bilanConfigs = [], isLoading } = useQuery({
    queryKey: ["medecinBilanConfig"],
    queryFn: () => base44.entities.MedecinBilanConfig.list(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ name, jours, existing }) =>
      existing
        ? base44.entities.MedecinBilanConfig.update(existing.id, { jours })
        : base44.entities.MedecinBilanConfig.create({ medecin_name: name, jours }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medecinBilanConfig"] }),
  });

  const medecinConfig = medecinConfigs[0];
  const doctors = medecinConfig
    ? [medecinConfig.dr1, medecinConfig.dr2, medecinConfig.dr3, medecinConfig.dr4, medecinConfig.dr5].filter(Boolean)
    : [];

  const [joursOpen, setJoursOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [bilanDbOpen, setBilanDbOpen] = useState(false);
  const [bilanSpOpen, setBilanSpOpen] = useState(false);

  const handleSave = (name, jours, existing) => {
    saveMutation.mutate({ name, jours, existing });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-red-100">
              <Droplets className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Bilans sanguins</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/PDFCalibration">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Sliders className="h-4 w-4" />
                PDF
              </Button>
            </Link>
            <Link to="/ExamCalibrationGrid">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Grid3X3 className="h-4 w-4" />
                Examens
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <button className="w-full flex items-center justify-between" onClick={() => setJoursOpen(o => !o)}>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Jours de prélèvement par médecin</h2>
            </div>
            {joursOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {joursOpen && (
            isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-slate-400 italic mt-4">Aucun médecin paramétré. Rendez-vous dans <strong>Gérer les résidents</strong> pour ajouter les médecins.</p>
            ) : (
              <div className="mt-4">
                {doctors.map((dr) => {
                  const config = bilanConfigs.find(c => c.medecin_name === dr);
                  return (
                    <MedecinJoursRow key={dr} medecinName={dr} config={config} onSave={handleSave} />
                  );
                })}
              </div>
            )
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
          <button className="w-full flex items-center justify-between" onClick={() => setCatalogueOpen(o => !o)}>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Catalogue des examens</h2>
            </div>
            {catalogueOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {catalogueOpen && <div className="mt-4"><GestionnaireCatalogue /></div>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
          <button className="w-full flex items-center justify-between" onClick={() => setBilanDbOpen(o => !o)}>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Référentiel des bilans biologiques</h2>
            </div>
            {bilanDbOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {bilanDbOpen && <div className="mt-4"><BilanDatabase /></div>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
          <button className="w-full flex items-center justify-between" onClick={() => setBilanSpOpen(o => !o)}>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Bilans spéciaux</h2>
            </div>
            {bilanSpOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {bilanSpOpen && <div className="mt-4"><BilanSpeciaux /></div>}
        </div>

        <PlanningAnnuel />

        <p className="text-xs text-slate-400 mt-4 text-center">
          Sélectionnez les jours où le prélèvement doit être fait pour que le résultat soit disponible lors de la visite du médecin.
        </p>
      </div>
    </div>
  );
}
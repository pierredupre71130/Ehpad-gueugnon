import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

const lignes = [
  [
    { label: "AS Matin", color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-800" },
    { label: "AS Soir", color: "bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800" },
    { label: "AS Nuit", color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-800" },
  ],
  [
    { label: "ASH Matin", color: "bg-green-50 border-green-200 hover:bg-green-100 text-green-800" },
    { label: "ASH Soir", color: "bg-green-50 border-green-200 hover:bg-green-100 text-green-800" },
  ],
  [
    { label: "IDE Matin", color: "bg-red-50 border-red-200 hover:bg-red-100 text-red-800" },
    { label: "IDE Soir", color: "bg-red-50 border-red-200 hover:bg-red-100 text-red-800" },
  ],
];

export default function FichesDePosteAccueil() {
  const navigate = useNavigate();

  const handleSelectPoste = (poste) => {
    navigate(createPageUrl("FichesDePoste") + `?poste=${encodeURIComponent(poste)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Fiches de Poste</h1>
        </div>

        <p className="text-slate-600 mb-8">Sélectionnez votre poste pour consulter votre fiche</p>

        <div className="space-y-4">
          {lignes.map((ligne, i) => (
            <div key={i} className={`grid gap-4 grid-cols-${ligne.length}`}>
              {ligne.map((poste) => (
                <button
                  key={poste.label}
                  onClick={() => handleSelectPoste(poste.label)}
                  className={`rounded-lg border-2 p-6 transition-all shadow-sm cursor-pointer font-bold text-lg ${poste.color}`}
                >
                  {poste.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
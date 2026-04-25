import React from "react";
import { Pill } from "lucide-react";

export default function FicheDispensationMorphiniques() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-full bg-purple-100">
            <Pill className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Fiche Dispensation Morphiniques</h1>
            <p className="text-slate-500 text-sm mt-0.5">Suivi des dispensations de morphiniques</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <Pill className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Module en cours de développement</p>
          <p className="text-sm mt-1">Cette fonctionnalité sera disponible prochainement.</p>
        </div>
      </div>
    </div>
  );
}
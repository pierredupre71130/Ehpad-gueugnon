import React from "react";
import { BriefcaseMedical } from "lucide-react";

export default function PriseEnCharge() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-full bg-amber-100">
            <BriefcaseMedical className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prise en charge des Résidents</h1>
            <p className="text-slate-500 text-sm">Suivi de la prise en charge des résidents</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
          <BriefcaseMedical className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Module en cours de développement</p>
        </div>
      </div>
    </div>
  );
}
import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function FicheSheet({ fiche, onPrint }) {
  if (!fiche || !fiche.nom_prenom || !fiche.type_contention) return null;

  const datePresc = fiche.date_prescription
    ? new Date(fiche.date_prescription + "T00:00:00").toLocaleDateString("fr-FR")
    : "Non spécifiée";

  const dateFin = fiche.date_fin_prevue
    ? new Date(fiche.date_fin_prevue + "T00:00:00").toLocaleDateString("fr-FR")
    : "Non spécifiée";

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={onPrint} className="w-full bg-green-600 hover:bg-green-700 print:hidden">
        <Printer className="h-4 w-4 mr-2" /> Imprimer la feuille
      </Button>

      <div id="fiche-print-area" className="bg-white border border-slate-300 shadow p-8 max-w-[210mm]">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold">FICHE DE CONTENTION</h3>
          <h4 className="text-xl font-bold text-blue-800 bg-blue-100 inline-block px-3 py-1 rounded mt-3">
            {fiche.nom_prenom.toUpperCase()} - Chambre {fiche.chambre || "N/A"}
          </h4>
        </div>

        {/* Info block */}
        <div className="border-t-2 border-b-2 border-black py-4 mb-6 text-base leading-8">
          <div className="mb-2">
            <strong>Type de contention :</strong>{" "}
            <span className="text-blue-600 font-bold text-lg">
              {fiche.type_contention.charAt(0).toUpperCase() + fiche.type_contention.slice(1)}
            </span>
          </div>
          <div className="mb-2">
            <strong>Date de prescription :</strong> {datePresc}
          </div>
          <div className="mb-2">
            <strong>Date de fin prévue :</strong> {dateFin}
          </div>
          {fiche.si_besoin && (
            <div className="mt-3 text-center font-bold text-orange-600 border border-orange-600 rounded p-2">
              SI BESOIN
            </div>
          )}
        </div>

        {/* Details table */}
        <table className="w-full border-collapse mb-8">
          <thead>
            <tr>
              <th className="border border-slate-500 p-3 bg-slate-100 text-center font-bold">Résidents</th>
              <th className="border border-slate-500 p-3 bg-slate-100 text-center font-bold">Chambre</th>
              <th className="border border-slate-500 p-3 bg-slate-100 text-center font-bold">Type</th>
              <th className="border border-slate-500 p-3 bg-slate-100 text-center font-bold">Prescription</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-500 p-3">{fiche.nom_prenom}</td>
              <td className="border border-slate-500 p-3 text-center">{fiche.chambre}</td>
              <td className="border border-slate-500 p-3 text-center">
                {fiche.type_contention.charAt(0).toUpperCase() + fiche.type_contention.slice(1)}
              </td>
              <td className="border border-slate-500 p-3 text-center">{datePresc}</td>
            </tr>
          </tbody>
        </table>

        {/* Signature */}
        <div className="mt-10 pt-5 border-t-2 border-black">
          <div className="mt-6">
            <div className="font-bold text-sm">Date :</div>
            <div className="h-8 border-b border-slate-400 mt-1" />
          </div>
          <div className="mt-6">
            <div className="font-bold text-sm">Signature du responsable :</div>
            <div className="h-8 border-b border-slate-400 mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

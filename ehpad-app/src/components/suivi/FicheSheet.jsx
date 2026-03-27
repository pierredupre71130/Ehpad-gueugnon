import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

function generateCalendarRows(dateDebut, dateFin, pasDeFin) {
  const rows = [];
  let current = new Date(dateDebut + "T00:00:00");
  const fin = dateFin && !pasDeFin ? new Date(dateFin + "T23:59:59") : null;
  const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };

  for (let i = 0; i < 15; i++) {
    if (fin && current > fin) {
      rows.push({ end: true });
      break;
    }
    const label = current.toLocaleDateString("fr-FR", options);
    rows.push({ date: label.charAt(0).toUpperCase() + label.slice(1) });
    current.setDate(current.getDate() + 3);
  }
  return rows;
}

export default function FicheSheet({ fiche, onPrint }) {
  if (!fiche || !fiche.nom || !fiche.traitement) return null;

  const isCalendrier = fiche.type_suivi === "calendrier";

  let finText = "";
  if (isCalendrier) {
    if (fiche.pas_de_fin) finText = "Pas de date de fin";
    else if (fiche.date_fin) finText = `Jusqu'au ${new Date(fiche.date_fin + "T23:59:59").toLocaleDateString("fr-FR")}`;
    else finText = "Non spécifiée";
  }

  const calRows = isCalendrier && fiche.date_debut ? generateCalendarRows(fiche.date_debut, fiche.date_fin, fiche.pas_de_fin) : [];
  const posoItems = [fiche.poso_matin && "Matin", fiche.poso_midi && "Midi", fiche.poso_soir && "Soir"].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={onPrint} className="w-full bg-green-600 hover:bg-green-700 print:hidden">
        <Printer className="h-4 w-4 mr-2" /> Imprimer la feuille
      </Button>

      <div id="fiche-print-area" className="bg-white border border-slate-300 shadow p-8 max-w-[210mm]">
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-2xl font-bold">{isCalendrier ? "SUIVI DE POSE" : "SUIVI D'ADMINISTRATION"}</h3>
          <h4 className="text-xl font-bold text-blue-800 bg-orange-100 inline-block px-3 py-1 rounded mt-2">
            {fiche.nom.toUpperCase()} - Chambre {fiche.chambre || "N/A"}
          </h4>
        </div>

        {/* Info block */}
        <div className="border-t-2 border-b-2 border-black py-4 mb-6 text-base leading-7">
          {fiche.dotation_nominative && (
            <div className="text-center text-red-600 font-bold text-lg border-2 border-red-600 rounded p-1 mb-3">
              DOTATION NOMINATIVE
            </div>
          )}
          <div><strong>Traitement :</strong> <span className="text-red-600 font-bold">{fiche.traitement}</span></div>
          {isCalendrier && <div><strong>Fin de prescription :</strong> {finText}</div>}
          {!isCalendrier && <div><strong>Posologie :</strong> {posoItems.join(", ")}</div>}
          <div><strong>Prescripteur :</strong> {fiche.prescripteur ? `Dr. ${fiche.prescripteur}` : "Non spécifié"}</div>
        </div>

        {/* Calendar table */}
        {isCalendrier && (
          <table className="w-full border-collapse mb-6">
            <tbody>
              {calRows.map((row, i) =>
                row.end ? (
                  <tr key={i}><td className="border border-slate-500 p-3 text-center text-red-600 italic font-bold">--- FIN DE LA PRESCRIPTION ---</td></tr>
                ) : (
                  <tr key={i}><td className="border border-slate-500 p-3 text-center text-lg font-bold">{row.date}</td></tr>
                )
              )}
            </tbody>
          </table>
        )}

        {/* Posology table */}
        {!isCalendrier && (
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr>
                {["Matin (8h)", "Midi (12h)", "Soir (18h)"].map((h) => (
                  <th key={h} className="border border-slate-500 p-3 bg-slate-100 text-center font-bold text-lg">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[fiche.poso_matin, fiche.poso_midi, fiche.poso_soir].map((active, i) => (
                  <td key={i} className={`border border-slate-500 p-4 text-center text-4xl font-bold h-20 ${!active ? "bg-slate-200 diagonal-stripes" : ""}`}>
                    {active ? "X" : ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}

        {/* Signature */}
        <div className="mt-10 pt-5 border-t-2 border-black">
          <div className="mt-6">
            <div className="font-bold text-sm">Date :</div>
            <div className="h-8 border-b border-slate-400 mt-1" />
          </div>
          <div className="mt-6">
            <div className="font-bold text-sm">Validation et Signature du Prescripteur :</div>
            <div className="h-8 border-b border-slate-400 mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
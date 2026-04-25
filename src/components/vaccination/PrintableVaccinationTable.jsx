import React, { useState, useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function PrintableVaccinationTable({ residents, onClose }) {
  const [selectedFloor, setSelectedFloor] = useState("RDC");
  const [isPrinting, setIsPrinting] = useState(false);

  const residentsByFloor = {
    RDC: residents.filter(r => r.floor === "RDC").sort((a, b) => {
      const roomA = parseInt((a.room || "").replace(/\D/g, "") || "0");
      const roomB = parseInt((b.room || "").replace(/\D/g, "") || "0");
      return roomA - roomB;
    }),
    "1ER": residents.filter(r => r.floor === "1ER").sort((a, b) => {
      const roomA = parseInt((a.room || "").replace(/\D/g, "") || "0");
      const roomB = parseInt((b.room || "").replace(/\D/g, "") || "0");
      return roomA - roomB;
    }),
  };

  const floorResidents = residentsByFloor[selectedFloor] || [];

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto p-0 print:max-w-full print:max-h-none print:overflow-visible print:p-0 print:m-0 print:bg-white print:border-0">
        {/* Header du modal */}
        <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Fiche de recueil vaccination</h2>
            </div>
            <div className="flex gap-2 bg-white border border-slate-200 rounded-lg p-1">
              {["RDC", "1ER"].map(floor => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedFloor === floor
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              <Printer className="h-4 w-4" /> Imprimer
            </button>
          </div>
        </div>

        {/* Tableau imprimable */}
        <div className="p-6 print:p-0 print:m-0">
          <div className="bg-white print:bg-white border border-slate-200 print:border-0">
          {/* Titre du tableau */}
          <div className="px-6 py-4 print:px-2 print:py-1 border-b-2 border-slate-200 print:border-b-2 print:border-black bg-slate-50 print:bg-white">
            <h3 className="text-sm print:text-[10px] font-bold text-slate-900">
              RECUEIL DE VACCINATIONS — ÉTAGE {selectedFloor}
            </h3>
            <p className="text-xs print:text-[8px] text-slate-500 mt-1">{floorResidents.length} résident(s)</p>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-xs print:text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 print:bg-white border-b-2 border-slate-300 print:border-b-2 print:border-black">
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-3 print:px-1 py-2 print:py-1 text-left font-bold text-slate-900 w-32 print:w-20">RÉSIDENT</th>
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-2 print:px-1 py-2 print:py-1 text-center font-bold text-slate-900 print:text-[8px]" colSpan="4">COVID INJ. 1</th>
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-2 print:px-1 py-2 print:py-1 text-center font-bold text-slate-900 print:text-[8px]" colSpan="4">COVID INJ. 2</th>
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-2 print:px-1 py-2 print:py-1 text-center font-bold text-slate-900 print:text-[8px]" colSpan="4">COVID INJ. 3</th>
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-2 print:px-1 py-2 print:py-1 text-center font-bold text-slate-900 print:text-[8px]" colSpan="4">GRIPPE</th>
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-3 print:px-1 py-2 print:py-1 text-center font-bold text-slate-900 w-24 print:w-12">OBSERVATIONS</th>
                </tr>
                <tr className="bg-slate-50 print:bg-white border-b-2 border-slate-300 print:border-b-2 print:border-black">
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-3 py-1"></th>
                  {[...Array(4)].map((_, i) => (
                    <th key={`covid1-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 text-center text-xs font-medium">
                      {["O", "N", "FO", "FN"][i]}
                    </th>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <th key={`covid2-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 text-center text-xs font-medium">
                      {["O", "N", "FO", "FN"][i]}
                    </th>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <th key={`covid3-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 text-center text-xs font-medium">
                      {["O", "N", "FO", "FN"][i]}
                    </th>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <th key={`grippe-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 text-center text-xs font-medium">
                      {["O", "N", "FO", "FN"][i]}
                    </th>
                  ))}
                  <th className="border-2 border-slate-300 print:border-2 print:border-black px-3 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {floorResidents.length === 0 ? (
                  <tr>
                    <td colSpan="18" className="border-2 border-slate-300 print:border-2 print:border-black px-3 py-4 text-center text-slate-400 italic">
                      Aucun résident à cet étage
                    </td>
                  </tr>
                ) : (
                  floorResidents.map((resident, idx) => (
                    <tr key={resident.id} className={`border-b-2 border-slate-300 print:border-b-2 print:border-black ${idx % 2 === 0 ? "bg-white" : "bg-slate-50 print:bg-white"}`}>
                      <td className="border-2 border-slate-300 print:border-2 print:border-black px-3 print:px-1 py-2 print:py-0.5 font-medium text-slate-900 text-xs print:text-[8px] whitespace-nowrap">
                         <div>{resident.last_name}</div>
                         <div className="text-xs print:text-[7px] text-slate-500">{resident.first_name}</div>
                         <div className="text-xs print:text-[7px] text-slate-400">Ch. {resident.room}</div>
                       </td>
                      {/* COVID 1 */}
                      {[...Array(4)].map((_, i) => (
                        <td key={`covid1-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 print:py-0.5 text-center h-12 print:h-auto">
                          <div className="w-5 h-5 print:w-3 print:h-3 border-2 border-slate-400 print:border-2 print:border-black"></div>
                        </td>
                      ))}
                      {/* COVID 2 */}
                      {[...Array(4)].map((_, i) => (
                        <td key={`covid2-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 print:py-0.5 text-center h-12 print:h-auto">
                          <div className="w-5 h-5 print:w-3 print:h-3 border-2 border-slate-400 print:border-2 print:border-black"></div>
                        </td>
                      ))}
                      {/* COVID 3 */}
                      {[...Array(4)].map((_, i) => (
                        <td key={`covid3-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 print:py-0.5 text-center h-12 print:h-auto">
                          <div className="w-5 h-5 print:w-3 print:h-3 border-2 border-slate-400 print:border-2 print:border-black"></div>
                        </td>
                      ))}
                      {/* GRIPPE */}
                      {[...Array(4)].map((_, i) => (
                        <td key={`grippe-${i}`} className="border-2 border-slate-300 print:border-2 print:border-black px-1 py-1 print:py-0.5 text-center h-12 print:h-auto">
                          <div className="w-5 h-5 print:w-3 print:h-3 border-2 border-slate-400 print:border-2 print:border-black"></div>
                        </td>
                      ))}
                      <td className="border-2 border-slate-300 print:border-2 print:border-black px-3 print:px-1 py-2 print:py-0.5 text-slate-400 print:text-[8px]">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="px-6 py-3 border-t-2 border-slate-200 print:border-t-2 print:border-black bg-slate-50 print:bg-white text-xs text-slate-600 print:hidden">
            <p className="font-medium text-slate-900 mb-1">Légende :</p>
            <div className="grid grid-cols-4 gap-3">
              <span>O = Oui</span>
              <span>N = Non</span>
              <span>FO = Famille Oui</span>
              <span>FN = Famille Non</span>
            </div>
          </div>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
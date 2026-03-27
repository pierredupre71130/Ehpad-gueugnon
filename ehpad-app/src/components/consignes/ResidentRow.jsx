import React, { useState } from "react";
import { Pencil, Check, X, Heart, Pill, Syringe, Sun, Moon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ResidentRow({ resident, taDay, onUpdate, isEditing, onStartEdit, onCancelEdit, maxNameWidth, maxInfosWidth, fontSize = 11 }) {
  const [consignes, setConsignes] = useState(resident.consignes || "");

  const handleSave = () => {
    onUpdate(resident.id, { consignes });
  };

  const badgeStyle = "bg-blue-100 text-blue-700";
  const hasAnnotations = resident.annotations && resident.annotations.trim().length > 0;
  const hasConsignes = resident.consignes && resident.consignes.trim().length > 0;

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group" style={{ borderBottom: "1px solid #cbd5e1", breakInside: "avoid", pageBreakInside: "avoid" }}>
      {/* Chambre */}
      <td className="px-1 py-1 font-semibold text-slate-700 text-[11px]" style={{ border: "1px solid #475569" }}>
        <div className="flex flex-col gap-0.5">
          <span>{resident.room}</span>
          <div className="flex items-center gap-0.5">
            {taDay && (
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none ${badgeStyle}`}
                title={`TA jour ${taDay} du mois`}
              >
                <Heart className="h-2 w-2" />
                {taDay}
              </span>
            )}
            {resident.traitement_ecrase && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none bg-yellow-100 text-yellow-700"
                title="Traitement à écraser"
              >
                <Pill className="h-2 w-2" />
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Nom */}
      <td className="px-1 py-1" style={{ border: "1px solid #475569", width: `${maxNameWidth}px` }}>
        <div className="font-semibold text-slate-800 uppercase text-[12px] leading-tight">
          {resident.last_name}
        </div>
        {resident.first_name && (
          <div className="text-slate-500 text-[11px]">{resident.first_name}</div>
        )}
      </td>

      {/* Infos (annotations) — rouge, lecture seule ici */}
      <td className="pl-1 pr-0.5 py-1 text-sm align-top" style={{ border: "1px solid #475569", width: `${maxInfosWidth}px` }}>
        {hasAnnotations && (
          <div className="flex flex-col gap-0.5">
            {resident.annotations.split('\n').map((line, idx) => (
              line.trim() && (
                <span key={idx} className="text-red-600 font-semibold text-[11px] leading-tight">
                  {line}
                </span>
              )
            ))}
          </div>
        )}
      </td>

      {/* Consignes — éditable */}
       <td className="px-2 py-1 text-sm" style={{ border: "1px solid #475569" }}>
        {isEditing ? (
          <Textarea
            autoFocus
            value={consignes}
            onChange={(e) => setConsignes(e.target.value)}
            className="text-sm min-h-[40px] resize-none"
            rows={2}
          />
        ) : (
           <span className="whitespace-pre-line text-black" style={{ fontSize: `${fontSize}px` }}>{hasConsignes ? resident.consignes : ""}</span>
        )}
        </td>

        {/* Icônes Insuline/Anticoagulant */}
        <td className="px-1 py-1 text-sm" style={{ border: "1px solid #475569", width: "50px" }}>
         {!isEditing && (
           <div className="flex flex-col gap-0.5">
             {resident.insuline_matin && (
               <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                 <Syringe className="h-2.5 w-2.5" /><Sun className="h-2.5 w-2.5" />
               </span>
             )}
             {resident.insuline_soir && (
               <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                 <Syringe className="h-2.5 w-2.5" /><Moon className="h-2.5 w-2.5" />
               </span>
             )}
             {resident.anticoagulants && (
               <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-700">
                 <AlertTriangle className="h-2.5 w-2.5" />
               </span>
             )}
           </div>
         )}
        </td>

        {/* Actions */}
      <td className="px-1 py-1 print:hidden" style={{ border: "1px solid #475569" }}>
        {isEditing ? (
          <div className="flex gap-1 justify-center">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={onCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onStartEdit(resident.id)}
          >
            <Pencil className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        )}
      </td>
    </tr>
  );
}
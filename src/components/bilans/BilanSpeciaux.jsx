import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { ExamSelector } from "./BilanDatabase";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  { nom: "Hémoglobine glyquée", code: "HbA1c", indication: "Diabète" },
  { nom: "Glycémie (tube gris)", code: "Glyc", indication: "Diabète" },
  { nom: "TSH", code: "TSH", indication: "Dysthyroïdie" },
  { nom: "PSA", code: "PSA", indication: "Surveillance prostate" },
  { nom: "Vitamine D", code: "VitD", indication: "Carence vitaminique" },
  { nom: "Parathormone", code: "PTH", indication: "Hyperparathyroïdie" },
  { nom: "INR", code: "INR", indication: "Anticoagulants AVK" },
  { nom: "Anti-Xa", code: "AntiXa", indication: "HBPM" },
  { nom: "Digoxine", code: "Dig", indication: "Surveillance digoxine" },
  { nom: "Lithiémie", code: "Li", indication: "Traitement lithium" },
  { nom: "Ferritine", code: "Ferr", indication: "Carence en fer" },
  { nom: "CRP", code: "CRP", indication: "Inflammation" },
];

function SpecialRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(item.nom);
  const [code, setCode] = useState(item.code);
  const [indication, setIndication] = useState(item.indication || "");
  const [examens, setExamens] = useState(item.examens || []);

  const handleSave = () => {
    onSave(item.id, { nom, code, indication, examens });
    setEditing(false);
  };

  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      {editing ? (
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input value={code} onChange={e => setCode(e.target.value)}
              className="w-20 text-xs px-2 py-1 border border-slate-200 rounded-lg outline-none focus:border-slate-400" placeholder="Code" />
            <input value={nom} onChange={e => setNom(e.target.value)}
              className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded-lg outline-none focus:border-slate-400" placeholder="Nom" />
            <input value={indication} onChange={e => setIndication(e.target.value)}
              className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded-lg outline-none focus:border-slate-400" placeholder="Indication" />
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="h-3.5 w-3.5" /></button>
          </div>
          {examens.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {examens.map(e => (
                <span key={e} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                  {e}
                  <button onClick={() => setExamens(examens.filter(x => x !== e))} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
            </div>
          )}
          <ExamSelector selected={examens} onChange={setExamens} />
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs w-20 shrink-0 text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{item.code}</span>
            <span className="flex-1 text-sm text-slate-700">{item.nom}</span>
            <span className="text-xs text-slate-400 italic">{item.indication || "—"}</span>
            <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          {(item.examens || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 ml-[88px]">
              {item.examens.map(e => (
                <span key={e} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded">{e}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BilanSpeciaux() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newIndication, setNewIndication] = useState("");
  const [newExamens, setNewExamens] = useState([]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["bilanSpecial"],
    queryFn: () => base44.entities.BilanSpecial.list(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BilanSpecial.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bilanSpecial"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BilanSpecial.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bilanSpecial"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BilanSpecial.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bilanSpecial"] }),
  });

  const handleCreate = () => {
    if (!newNom.trim() || !newCode.trim()) return;
    createMutation.mutate({ nom: newNom, code: newCode, indication: newIndication, examens: newExamens });
    setNewNom(""); setNewCode(""); setNewIndication(""); setNewExamens([]); setShowForm(false);
  };

  const addSuggestion = (s) => {
    if (items.find(i => i.code === s.code)) return;
    createMutation.mutate(s);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-4 w-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Bilans spéciaux</h2>
        <span className="text-xs text-slate-400 ml-1">— ajoutables en extra dans le tableau</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-slate-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Nouveau
        </button>
      </div>

      {/* Suggestions rapides */}
      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-1.5">Suggestions rapides :</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => {
            const exists = items.find(i => i.code === s.code);
            return (
              <button
                key={s.code}
                onClick={() => !exists && addSuggestion(s)}
                disabled={!!exists}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  exists
                    ? "bg-purple-50 text-purple-400 border-purple-200 cursor-default"
                    : "bg-white text-slate-500 border-slate-200 hover:border-purple-400 hover:text-purple-600"
                }`}
              >
                {exists ? "✓ " : "+ "}{s.code} <span className="text-slate-400">({s.indication})</span>
              </button>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="mb-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Code</label>
            <input value={newCode} onChange={e => setNewCode(e.target.value)}
              className="w-20 text-sm px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white" placeholder="HBG" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-slate-500 block mb-1">Nom</label>
            <input value={newNom} onChange={e => setNewNom(e.target.value)}
              className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white" placeholder="Hémoglobine glyquée" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-slate-500 block mb-1">Indication</label>
            <input value={newIndication} onChange={e => setNewIndication(e.target.value)}
              className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white" placeholder="Diabète" />
          </div>
          <div className="flex gap-1 items-end">
            <Button size="sm" onClick={handleCreate} disabled={!newNom.trim() || !newCode.trim()}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="w-full">
            <label className="text-xs text-slate-500 block mb-1">Examens associés (optionnel)</label>
            {newExamens.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {newExamens.map(e => (
                  <span key={e} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                    {e}
                    <button onClick={() => setNewExamens(newExamens.filter(x => x !== e))} className="opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
            <ExamSelector selected={newExamens} onChange={setNewExamens} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-3">Aucun bilan spécial. Ajoutez-en via les suggestions ou le bouton Nouveau.</p>
      ) : (
        <div>
          {items.map(item => (
            <SpecialRow
              key={item.id}
              item={item}
              onSave={(id, data) => saveMutation.mutate({ id, data })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
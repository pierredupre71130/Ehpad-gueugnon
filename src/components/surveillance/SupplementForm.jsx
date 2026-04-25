import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Pencil, Trash2, Check } from "lucide-react";

export default function SupplementForm({ resident, onSave, onClose, existingTypes = [] }) {
  const [supplements, setSupplement] = useState(resident._supps || []);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editData, setEditData] = useState({});

  // Déduplication et tri des types existants
  const supplementTypes = [...new Set(existingTypes)].sort() || [];

  const handleAdd = () => {
    const newEntry = { type: "", date_debut: new Date().toISOString().split('T')[0] };
    const newList = [...supplements, newEntry];
    setSupplement(newList);
    setEditingIdx(newList.length - 1);
    setEditData({ ...newEntry });
  };

  const handleEdit = (idx) => {
    setEditingIdx(idx);
    setEditData({ ...supplements[idx] });
  };

  const handleSaveEdit = (idx) => {
    const updated = [...supplements];
    updated[idx] = editData;
    setSupplement(updated);
    setEditingIdx(null);
  };

  const handleDelete = (idx) => {
    if (confirm("Supprimer ce complément ?")) {
      setSupplement(supplements.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = async () => {
    await onSave(supplements);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-lg">Gérer les compléments — {resident.last_name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-6 pb-2">
          {supplements.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">Aucun complément. Cliquez sur "Ajouter un complément" pour en créer.</p>
          ) : (
            supplements.map((s, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3">
                {editingIdx === idx ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Type de complément</label>
                      <select
                        value={editData.type || ""}
                        onChange={e => setEditData({ ...editData, type: e.target.value })}
                        className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
                      >
                        <option value="">— Sélectionner —</option>
                        {supplementTypes.length > 0 ? (
                          supplementTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))
                        ) : (
                          <option disabled>Aucun type existant, entrez manuellement</option>
                        )}
                      </select>
                      {supplementTypes.length === 0 && (
                        <input
                          type="text"
                          placeholder="Ex: Protéines, Énergétique..."
                          value={editData.type || ""}
                          onChange={e => setEditData({ ...editData, type: e.target.value })}
                          className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-blue-400 mt-1"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Date de début</label>
                      <input
                        type="date"
                        value={editData.date_debut || ""}
                        onChange={e => setEditData({ ...editData, date_debut: e.target.value })}
                        className="w-full border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(idx)} className="px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Valider
                      </button>
                      <button onClick={() => setEditingIdx(null)} className="px-3 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{s.type || "—"}</p>
                      <p className="text-xs text-slate-500">Depuis le {s.date_debut ? new Date(s.date_debut).toLocaleDateString('fr-FR') : "—"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(idx)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(idx)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 pt-4 flex items-center justify-between gap-3">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter un complément
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors">
              Annuler
            </button>
            <Button onClick={handleSubmit} className="gap-1.5">
              <Check className="h-4 w-4" /> Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
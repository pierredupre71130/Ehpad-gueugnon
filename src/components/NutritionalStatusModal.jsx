import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Zap, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STATUS_COLORS = {
  normal:  "bg-green-100 text-green-800 border-green-300",
  léger:   "bg-yellow-100 text-yellow-800 border-yellow-300",
  modéré:  "bg-orange-100 text-orange-800 border-orange-300",
  sévère:  "bg-red-100 text-red-800 border-red-300",
};

const STATUS_BADGE = {
  normal:  "bg-green-100 text-green-700",
  léger:   "bg-yellow-100 text-yellow-700",
  modéré:  "bg-orange-100 text-orange-700",
  sévère:  "bg-red-100 text-red-700",
};

const ETAT_GENERAL_OPTIONS = [
  { value: "",               label: "— Non renseigné" },
  { value: "Normal",         label: "Normal (état bon)" },
  { value: "Fatigue légère", label: "Fatigue légère" },
  { value: "Asthénie",       label: "Asthénie" },
  { value: "État altéré",    label: "État altéré" },
];

function computeStatus(imcVal, albumineVal, etatVal) {
  let level = 0;
  if (imcVal && !isNaN(parseFloat(imcVal))) {
    const v = parseFloat(imcVal);
    if (v < 16)        level = Math.max(level, 3);
    else if (v < 17)   level = Math.max(level, 2);
    else if (v < 18.5) level = Math.max(level, 1);
  }
  if (albumineVal && !isNaN(parseFloat(albumineVal))) {
    const v = parseFloat(albumineVal);
    if (v < 28)        level = Math.max(level, 3);
    else if (v < 32)   level = Math.max(level, 2);
    else if (v < 35)   level = Math.max(level, 1);
  }
  if (etatVal === "État altéré")       level = Math.max(level, 3);
  else if (etatVal === "Asthénie")     level = Math.max(level, 2);
  else if (etatVal === "Fatigue légère") level = Math.max(level, 1);
  return ["normal", "léger", "modéré", "sévère"][level];
}

const parseCause = (raw) => {
  try {
    const p = JSON.parse(raw || '{}');
    if (p && typeof p === 'object') return { cause: p.cause || '', albumine: p.albumine || '', etat: p.etat || '', albumine_date: p.albumine_date || '' };
  } catch {}
  return { cause: raw || '', albumine: '', etat: '', albumine_date: '' };
};

const EMPTY_FORM = { status: 'normal', imc: '', albumine: '', albumineDate: '', etatGeneral: '', suspectedCause: '', notes: '' };

export default function NutritionalStatusModal({ residentId, residentName, isOpen, onClose, onSave }) {
  const [allRecords, setAllRecords]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [editingId, setEditingId]       = useState(null); // null = nouveau
  const [showForm, setShowForm]         = useState(false);

  // Champs du formulaire
  const [form, setForm]       = useState(EMPTY_FORM);
  const [autoStatus, setAutoStatus] = useState(null);

  useEffect(() => {
    if (isOpen && residentId) loadRecords();
  }, [isOpen, residentId]);

  // Calcul automatique du statut
  useEffect(() => {
    if (!form.imc && !form.albumine && !form.etatGeneral) { setAutoStatus(null); return; }
    const computed = computeStatus(form.imc, form.albumine, form.etatGeneral);
    setAutoStatus(computed);
    setForm(f => ({ ...f, status: computed }));
  }, [form.imc, form.albumine, form.etatGeneral]);

  const loadRecords = async () => {
    setLoading(true);
    const records = await base44.entities.NutritionalStatus.filter(
      { resident_id: residentId }, "-date_assessment", 50
    );
    setAllRecords(records);
    setLoading(false);
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, status: 'normal' });
    setAutoStatus(null);
    setShowForm(true);
  };

  const openEditForm = (record) => {
    const cp = parseCause(record.suspected_cause);
    setEditingId(record.id);
    setForm({
      status:        record.status || 'normal',
      imc:           record.imc ? String(record.imc) : '',
      albumine:      cp.albumine,
      albumineDate:  cp.albumine_date || '',
      etatGeneral:   cp.etat,
      suspectedCause: cp.cause,
      notes:         record.clinical_notes || '',
    });
    setAutoStatus(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAutoStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        resident_id:    residentId,
        resident_name:  residentName,
        status:         form.status,
        imc:            form.imc ? parseFloat(form.imc) : null,
        clinical_notes: form.notes,
        suspected_cause: JSON.stringify({
          cause:         form.suspectedCause,
          albumine:      form.albumine,
          albumine_date: form.albumineDate,
          etat:          form.etatGeneral,
        }),
        date_assessment: new Date().toISOString().split('T')[0],
      };
      if (editingId) {
        await base44.entities.NutritionalStatus.update(editingId, data);
      } else {
        await base44.entities.NutritionalStatus.create(data);
      }
      await loadRecords();
      cancelForm();
      onSave?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce suivi clinique ?")) return;
    await base44.entities.NutritionalStatus.delete(id);
    await loadRecords();
    onSave?.();
  };

  const setF = (field) => (e) => setForm(f => ({ ...f, [field]: e.target?.value ?? e }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col w-[90vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suivi nutritionnel — {residentName}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4">

          {/* ── Guide clinique ── */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1.5">Critères HAS — Dénutrition</p>
                <div className="space-y-0.5">
                  <p><span className="font-semibold text-green-700">Normal :</span> IMC ≥ 18.5 • Albumine &gt; 35 g/L • État bon</p>
                  <p><span className="font-semibold text-yellow-700">Léger :</span> IMC 17–18.5 • Albumine 32–35 g/L • Fatigue légère</p>
                  <p><span className="font-semibold text-orange-700">Modéré :</span> IMC 16–17 • Albumine 28–32 g/L • Asthénie</p>
                  <p><span className="font-semibold text-red-700">Sévère :</span> IMC &lt; 16 • Albumine &lt; 28 g/L • État altéré</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Liste des suivis existants ── */}
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-4">Chargement...</p>
          ) : allRecords.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {allRecords.length} suivi{allRecords.length > 1 ? 's' : ''} enregistré{allRecords.length > 1 ? 's' : ''}
                </span>
                {!showForm && (
                  <button onClick={openNewForm}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Nouveau suivi
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {allRecords.map((rec) => {
                  const cp = parseCause(rec.suspected_cause);
                  return (
                    <div key={rec.id} className={`px-4 py-3 flex items-start justify-between gap-3 ${editingId === rec.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-700">
                            {new Date(rec.date_assessment).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[rec.status] || 'bg-slate-100 text-slate-600'}`}>
                            {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                          </span>
                          {rec.imc && <span className="text-xs text-slate-500">IMC {parseFloat(rec.imc).toFixed(1)}</span>}
                          {cp.albumine && <span className="text-xs text-slate-500">Albumine {cp.albumine} g/L{cp.albumine_date ? ` (${new Date(cp.albumine_date).toLocaleDateString('fr-FR')})` : ''}</span>}
                          {cp.etat && <span className="text-xs text-slate-400 italic">{cp.etat}</span>}
                        </div>
                        {cp.cause && <p className="text-xs text-slate-400 mt-0.5 truncate">Cause : {cp.cause}</p>}
                        {rec.clinical_notes && <p className="text-xs text-slate-400 mt-0.5 truncate italic">{rec.clinical_notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditForm(rec)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(rec.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                          title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !showForm ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400 italic mb-3">Aucun suivi clinique enregistré</p>
              <button onClick={openNewForm}
                className="flex items-center gap-2 mx-auto text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg transition-colors">
                <Plus className="h-4 w-4" /> Nouveau suivi clinique
              </button>
            </div>
          ) : null}

          {/* ── Formulaire (nouveau ou édition) ── */}
          {showForm && (
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  {editingId ? '✏️ Modifier le suivi' : '➕ Nouveau suivi clinique'}
                </h3>
                <button onClick={cancelForm} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* IMC + Albumine */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">IMC (kg/m²)</label>
                  <input type="number" step="0.1" value={form.imc} onChange={setF('imc')}
                    placeholder="Ex : 18.5"
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm mt-1 outline-none focus:border-blue-400 bg-white" />
                  <p className="text-xs text-slate-400 mt-1">Normal ≥ 18.5</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Albumine (g/L)</label>
                  <input type="number" step="0.1" value={form.albumine} onChange={setF('albumine')}
                    placeholder="Ex : 32"
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm mt-1 outline-none focus:border-blue-400 bg-white" />
                  <p className="text-xs text-slate-400 mt-1">Normal &gt; 35 g/L</p>
                  <label className="text-xs font-medium text-slate-500 mt-2 block">Date du dosage</label>
                  <input type="date" value={form.albumineDate} onChange={setF('albumineDate')}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs mt-1 outline-none focus:border-blue-400 bg-white" />
                </div>
              </div>

              {/* État général */}
              <div>
                <label className="text-sm font-medium text-slate-700">État général</label>
                <select value={form.etatGeneral} onChange={setF('etatGeneral')}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm mt-1 outline-none focus:border-blue-400 bg-white">
                  {ETAT_GENERAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Cause suspectée */}
              <div>
                <label className="text-sm font-medium text-slate-700">Cause suspectée</label>
                <input type="text" value={form.suspectedCause} onChange={setF('suspectedCause')}
                  placeholder="Ex : refus alimentaire, diarrhées, pathologie..."
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm mt-1 outline-none focus:border-blue-400 bg-white" />
              </div>

              {/* Statut nutritionnel */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-slate-700">Statut nutritionnel</label>
                  {autoStatus && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <Zap className="h-3 w-3" /> Calculé automatiquement
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_COLORS).map(([key, color]) => (
                    <button key={key}
                      onClick={() => setForm(f => ({ ...f, status: key }))}
                      className={`py-2.5 px-3 rounded-lg font-semibold text-sm border-2 transition-all ${color} ${
                        form.status === key ? "ring-2 ring-offset-2 ring-slate-400 opacity-100" : "opacity-50 hover:opacity-75"
                      }`}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Calculé automatiquement selon l'IMC, l'albumine et l'état général. Modifiable manuellement.</p>
              </div>

              {/* Notes cliniques */}
              <div>
                <label className="text-sm font-medium text-slate-700">Notes cliniques</label>
                <Textarea value={form.notes} onChange={setF('notes')}
                  placeholder="Actions prises, observations, suivi..."
                  className="mt-1 bg-white" rows={3} />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={cancelForm}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" />
                  {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}

          {/* Bouton nouveau suivi si liste visible et formulaire fermé */}
          {!showForm && allRecords.length > 0 && (
            <div className="pb-2" />
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
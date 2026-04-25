import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, ChevronDown, ChevronUp, Pencil, Check, X, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Catalogue complet issu de la feuille UBILAB ──────────────────────────────
const TUBE_COLORS = {
  vert: { bg: "bg-green-500", label: "Tube vert" },
  violet: { bg: "bg-purple-500", label: "Tube violet" },
  gris: { bg: "bg-gray-400", label: "Tube gris" },
  bleu: { bg: "bg-blue-500", label: "Tube bleu" },
  jaune: { bg: "bg-yellow-400", label: "Tube jaune" },
  rouge: { bg: "bg-red-500", label: "Tube rouge" },
  capillaire: { bg: "bg-orange-400", label: "Capillaire" },
  urine: { bg: "bg-amber-300", label: "Urine" },
};

export const CATALOGUE = [
  {
    categorie: "Biochimie courante",
    tube: "vert",
    examens: [
      "NFS", "Ionogramme", "Urée", "Créatinine", "Glycémie",
      "Potassium (K)", "Sodium (Na)", "Réserve alcaline", "Protéines totales",
      "Acide urique", "Calcium", "Calcium corrigé", "Phosphore", "Magnésium",
    ],
  },
  {
    categorie: "Enzymes hépatiques & biliaires",
    tube: "vert",
    examens: [
      "Bilirubine T", "Bilirubine C", "Bilirubine L",
      "SGOT", "SGPT", "Gamma GT", "Phosphatases alcalines (PAL)",
      "LDH", "CPK",
    ],
  },
  {
    categorie: "Lipides & nutrition",
    tube: "vert",
    examens: [
      "EAL (Cholestérol / Triglycérides)", "Cholestérol total", "HDL", "LDL",
      "Triglycérides", "Apolipoprotéine A1", "Apolipoprotéine B",
      "Albuminémie", "Préalbumine", "Ferritine",
      "Coef. saturation transferrine (CST)", "Transferrine",
    ],
  },
  {
    categorie: "Thyroïde",
    tube: "vert",
    examens: ["TSH", "T4L", "T3L", "Ac antithyroïdiens"],
  },
  {
    categorie: "Vitamines & minéraux",
    tube: "jaune",
    examens: [
      "Vit B12", "Folates (Vit B9)", "Vit D", "Calcémie",
      "Calcium ionisé", "Zinc",
    ],
  },
  {
    categorie: "Inflammation & infection",
    tube: "vert",
    examens: [
      "CRP", "Micro CRP", "Procalcitonine", "VS (Vitesse de sédimentation)",
      "Haptoglobine", "Fibrinogène",
    ],
  },
  {
    categorie: "Hématologie",
    tube: "violet",
    examens: [
      "NFS (Numération formule sanguine)", "Réticulocytes", "Plaquettes",
      "Hémoglobine glyquée (HbA1c)", "Ammoniémie",
    ],
  },
  {
    categorie: "Hémostase / Anticoagulants",
    tube: "bleu",
    examens: [
      "TP/INR", "TCK", "D-dimères", "Fibrinogène",
      "Anti Xa (surveillance HBPM)", "Héparinémie (Calciparine)",
      "Facteur V", "PDF", "TCA",
    ],
  },
  {
    categorie: "Médicaments (dosages)",
    tube: "rouge",
    examens: [
      "Lithiémie (Lithium)", "Acide valproïque (Dépakine)",
      "Digoxine", "Paracétamol", "Vancomycine",
      "Gentamicine", "Amikacine",
    ],
  },
  {
    categorie: "Hormonologie",
    tube: "jaune",
    examens: [
      "FSH", "LH", "Prolactine", "Cortisol", "Œstradiol",
      "Progestérone", "Testostérone", "AMH", "Parathormone (PTH)",
    ],
  },
  {
    categorie: "Marqueurs tumoraux",
    tube: "jaune",
    examens: [
      "PSA", "PSA libre", "ACE", "CA 15-3", "CA 125", "CA 19-9",
      "α fœto-protéine (AFP)",
    ],
  },
  {
    categorie: "Biochimie spécialisée",
    tube: "jaune",
    examens: [
      "Électrophorèse des protéines", "Immunoélectrophorèse des protéines",
      "Béta2-microglobuline", "CDT", "IgG", "IgA", "IgM",
    ],
  },
  {
    categorie: "Sérologie",
    tube: "jaune",
    examens: [
      "Hépatite A IgG", "Hépatite A IgM", "Hépatite B Ag HBs",
      "Hépatite B Ac anti-HBs", "Hépatite B Ac anti-HBc",
      "Hépatite C", "Hépatite E IgM", "HIV",
      "Toxoplasmose", "CMV", "Rubéole",
      "EBV (mononucléose)", "BW / Syphilis", "Borréliose (Lyme)",
      "Facteurs rhumatoïdes (FR)", "Ac anti-CCP",
    ],
  },
  {
    categorie: "Urines",
    tube: "urine",
    examens: [
      "Iono urinaire (Na+K)", "Acide urique urinaire", "Glycosurie",
      "Protéinurie", "Urée urinaire", "Créatinine urinaire",
      "Calcium urinaire", "Phosphore urinaire", "Microalbuminurie",
      "Clairance créatinine", "Compte d'Addis",
      "Antigène Pneumocoque", "Antigène Légionelle",
    ],
  },
  {
    categorie: "Glycémie (tube gris)",
    tube: "gris",
    examens: [
      "Glycémie (gris)", "Acide lactique (gris)",
      "Hyperglycémie provoquée", "Cycle glycémique",
    ],
  },
  {
    categorie: "Divers",
    tube: "gris",
    examens: [
      "Gaz du sang", "Acide lactique", "Carboxyhémoglobine (CO)",
      "Méthémoglobine", "Lipase", "Amylase", "Alcoolémie",
      "Recherche Paludisme", "Groupe sanguin / phénotype", "RAI",
    ],
  },
];

const CARD_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", badge: "bg-teal-100 text-teal-700" },
];

function getColor(idx) {
  return CARD_COLORS[idx % CARD_COLORS.length];
}

export function ExamSelector({ selected, onChange }) {
  const [search, setSearch] = useState("");

  const { data: customExamens = [] } = useQuery({
    queryKey: ["catalogueExamen"],
    queryFn: () => base44.entities.CatalogueExamen.list(),
  });

  const fullCatalogue = [
    ...CATALOGUE,
    ...(customExamens.length > 0 ? [{
      categorie: "Examens personnalisés",
      tube: "rouge",
      examens: customExamens.map(e => e.nom),
      customTubeMap: Object.fromEntries(customExamens.map(e => [e.nom, e.tube])),
    }] : []),
  ];

  const filtered = fullCatalogue.map(cat => ({
    ...cat,
    examens: cat.examens.filter(e => e.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.examens.length > 0);

  return (
    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-3 bg-slate-50 border-b border-slate-200">
        <input
          className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400"
          placeholder="Rechercher un examen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-72 overflow-y-auto p-3 space-y-4">
        {filtered.map(cat => {
          const tube = TUBE_COLORS[cat.tube];
              return (
                <div key={cat.categorie}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${tube.bg}`} title={tube.label}></span>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{cat.categorie}</p>
                    <span className="text-xs text-slate-300 italic">{tube.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.examens.map(e => {
                      const active = selected.includes(e);
                      const tubeKey = cat.customTubeMap?.[e] || cat.tube;
                      const tubeDot = TUBE_COLORS[tubeKey];
                      return (
                        <button
                          key={e}
                          onClick={() => onChange(active ? selected.filter(x => x !== e) : [...selected, e])}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                            active ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full shrink-0 ${tubeDot?.bg}`}></span>
                          {e}
                        </button>
                      );
                    })}
                  </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BilanCard({ record, colorIdx, onSave, onDelete }) {
  const c = getColor(colorIdx);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState(record.label || "");
  const [draftFrequence, setDraftFrequence] = useState(record.frequence || "");
  const [draftExamens, setDraftExamens] = useState(record.examens || []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraftLabel(record.label || "");
    setDraftFrequence(record.frequence || "");
    setDraftExamens(record.examens || []);
  }, [record.id]);

  const handleSave = () => {
    onSave(record, { label: draftLabel, frequence: draftFrequence, examens: draftExamens });
    setEditing(false);
  };

  const handleCancel = () => {
    setDraftLabel(record.label || "");
    setDraftFrequence(record.frequence || "");
    setDraftExamens(record.examens || []);
    setEditing(false);
  };

  return (
    <div className={`border rounded-xl p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between gap-2">
        <button className="flex items-center gap-3 flex-1 min-w-0" onClick={() => !editing && setOpen(!open)}>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${c.badge}`}>{record.code}</span>
          <div className="text-left min-w-0">
            <div className={`text-sm font-semibold truncate ${c.text}`}>{record.label || record.code}</div>
            <div className="text-xs text-slate-500">{record.frequence || "—"} · {(record.examens || []).length} examens</div>
          </div>
          {!editing && (open ? <ChevronUp className="h-4 w-4 opacity-40 ml-2 shrink-0" /> : <ChevronDown className="h-4 w-4 opacity-40 ml-2 shrink-0" />)}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!editing ? (
            <>
              <button onClick={() => { setEditing(true); setOpen(true); }}
                className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
                <Pencil className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {confirmDelete ? (
                <>
                  <button onClick={() => onDelete(record)} className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors">
                    <Check className="h-3.5 w-3.5 text-red-600" />
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={handleSave} className="p-1.5 rounded-lg bg-white hover:bg-green-50 transition-colors">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </button>
              <button onClick={handleCancel} className="p-1.5 rounded-lg bg-white hover:bg-red-50 transition-colors">
                <X className="h-3.5 w-3.5 text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode édition */}
      {editing && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-10 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Nom du référentiel</label>
              <input
                className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white"
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                placeholder="Ex : Bilan trimestriel"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Périodicité</label>
              <input
                className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white"
                value={draftFrequence}
                onChange={e => setDraftFrequence(e.target.value)}
                placeholder="Ex : Tous les 3 mois"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Examens sélectionnés</label>
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {draftExamens.length === 0
                ? <span className="text-xs text-slate-400 italic">Aucun examen sélectionné</span>
                : draftExamens.map(e => (
                  <span key={e} className={`text-xs px-2 py-0.5 rounded-md ${c.badge} flex items-center gap-1`}>
                    {e}
                    <button onClick={() => setDraftExamens(draftExamens.filter(x => x !== e))} className="opacity-60 hover:opacity-100">×</button>
                  </span>
                ))
              }
            </div>
            <ExamSelector selected={draftExamens} onChange={setDraftExamens} />
          </div>
        </div>
      )}

      {/* Vue normale ouverte */}
      {open && !editing && (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-current border-opacity-10">
          {(record.examens || []).map(e => <span key={e} className={`text-xs px-2 py-0.5 rounded-md ${c.badge}`}>{e}</span>)}
          {(record.examens || []).length === 0 && <span className="text-xs text-slate-400 italic">Aucun examen</span>}
        </div>
      )}
    </div>
  );
}

function NewBilanForm({ onSave, onCancel, existingRecords = [] }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [frequence, setFrequence] = useState("");
  const [examens, setExamens] = useState([]);

  const loadFromExisting = (id) => {
    const rec = existingRecords.find(r => r.id === id);
    if (!rec) return;
    setLabel(rec.label || "");
    setFrequence(rec.frequence || "");
    setExamens(rec.examens || []);
  };

  return (
    <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">Nouveau référentiel</p>
        {existingRecords.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Partir de :</span>
            <select
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-slate-400"
              defaultValue=""
              onChange={e => loadFromExisting(e.target.value)}
            >
              <option value="" disabled>Choisir un modèle…</option>
              {existingRecords.map(r => (
                <option key={r.id} value={r.id}>{r.label || r.code}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <div className="w-28">
          <label className="text-xs text-slate-500 mb-1 block">Code</label>
          <input
            className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Ex : B12"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Nom</label>
          <input
            className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ex : Bilan annuel"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Périodicité</label>
          <input
            className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white"
            value={frequence}
            onChange={e => setFrequence(e.target.value)}
            placeholder="Ex : 1 fois / an"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Examens</label>
        <div className="flex flex-wrap gap-1.5 min-h-6">
          {examens.map(e => (
            <span key={e} className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 flex items-center gap-1">
              {e}
              <button onClick={() => setExamens(examens.filter(x => x !== e))} className="opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
        </div>
        <ExamSelector selected={examens} onChange={setExamens} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button size="sm" onClick={() => onSave({ code, label, frequence, examens })} disabled={!code.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" /> Créer
        </Button>
      </div>
    </div>
  );
}

const DEFAULTS = [
  {
    code: "B3",
    label: "Bilan trimestriel",
    frequence: "Tous les 3 mois",
    examens: ["NFS", "Ionogramme", "Urée", "Créatinine"],
  },
  {
    code: "B6",
    label: "Bilan semestriel",
    frequence: "Tous les 6 mois",
    examens: [
      "NFS", "Ionogramme", "Urée", "Créatinine",
      "Albuminémie", "Bilirubine T", "SGOT", "SGPT",
      "Gamma GT", "Phosphatases alcalines (PAL)", "Ferritine", "Glycémie",
    ],
  },
  {
    code: "BC",
    label: "Bilan complet annuel",
    frequence: "1 fois / an",
    examens: [
      "NFS", "Ionogramme", "Urée", "Créatinine",
      "Albuminémie", "Bilirubine T", "SGOT", "SGPT",
      "Gamma GT", "Phosphatases alcalines (PAL)", "Ferritine", "Glycémie",
      "TSH", "Folates (Vit B9)", "Vit B12", "Vit D",
      "Calcémie", "EAL (Cholestérol / Triglycérides)",
    ],
  },
];

export default function BilanDatabase() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["bilanReferentiel"],
    queryFn: async () => {
      const list = await base44.entities.BilanReferentiel.list();
      if (list.length === 0) {
        // Créer les référentiels par défaut
        await Promise.all(DEFAULTS.map(d => base44.entities.BilanReferentiel.create(d)));
        return base44.entities.BilanReferentiel.list();
      }
      return list;
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ record, data }) =>
      base44.entities.BilanReferentiel.update(record.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bilanReferentiel"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BilanReferentiel.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bilanReferentiel"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (record) => base44.entities.BilanReferentiel.delete(record.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bilanReferentiel"] }),
  });

  const handleSave = (record, data) => saveMutation.mutate({ record, data });
  const handleCreate = (data) => { createMutation.mutate(data); setShowNew(false); };
  const handleDelete = (record) => deleteMutation.mutate(record);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-5">
        <FlaskConical className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Référentiel des bilans biologiques
        </h2>
        <button
          onClick={() => setShowNew(true)}
          className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-slate-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Nouveau référentiel
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-3">
          {records.map((record, idx) => (
            <BilanCard
              key={record.id}
              record={record}
              colorIdx={idx}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
          {records.length === 0 && !showNew && (
            <p className="text-sm text-slate-400 italic text-center py-4">
              Aucun référentiel. Créez-en un avec le bouton ci-dessus.
            </p>
          )}
          {showNew && (
            <NewBilanForm onSave={handleCreate} onCancel={() => setShowNew(false)} existingRecords={records} />
          )}
        </div>
      )}

    </div>
  );
}
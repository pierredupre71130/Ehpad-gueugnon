import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X, Check, Upload, AlertCircle, Trash2, Eye, UserPen, Users, CalendarClock, History, SpellCheck, Printer } from "lucide-react";
import PAPView from "@/components/pap/PAPView";
import PrintReferentsTable from "@/components/pap/PrintReferentsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

const emptyForm = {
  date_naissance: "",
  service_chambre: "",
  date_reunion: "",
  date_reevaluation: "",
  presents: "",
  capacite: "",
  souhait_projet: "",
  souhait_participation: "",
  souhait_entourage: "",
  donnees_identite: "",
  souhait_denomination: "",
  contexte_entree: "",
  souhaits_fin_vie: "",
  entourage: "",
  droit_image: "",
  situation_familiale: "",
  vie_professionnelle: "",
  episodes_importants: "",
  besoin_boire_manger: "",
  eliminer: "",
  mouvoir_posture: "",
  dormir_reposer: "",
  vetir_devtir: "",
  propre_teguments: "",
  eviter_dangers: "",
  communication: "",
  croyances_valeurs: "",
  occupation_recreation: "",
  apprendre: "",
  ressenti_adaptation: "",
  risque_fugue: false,
  risque_addictions: false,
  risque_chutes: false,
  risque_denutrition: false,
  risque_sexualite: false,
  risque_harcelement: false,
  risque_radicalisation: false,
  risque_suicidaire: false,
  risques_autres: "",
  accueil_premiers_jours: "",
  soins: "",
  repas: "",
  ambiance_generale: "",
  remarques_particulieres: "",
  objectifs: "",
  capacite_information: "",
  date_signature: "",
};

const TEXT_FIELDS = [
  "date_naissance","service_chambre","date_reunion","date_reevaluation","presents","capacite",
  "souhait_projet","souhait_participation","souhait_entourage","donnees_identite",
  "souhait_denomination","contexte_entree","souhaits_fin_vie","entourage","droit_image",
  "situation_familiale","vie_professionnelle","episodes_importants","besoin_boire_manger",
  "eliminer","mouvoir_posture","dormir_reposer","vetir_devtir","propre_teguments",
  "eviter_dangers","communication","croyances_valeurs","occupation_recreation","apprendre",
  "ressenti_adaptation","risques_autres","accueil_premiers_jours","soins","repas",
  "ambiance_generale","remarques_particulieres","objectifs","capacite_information","date_signature"
];

function computeProgress(form) {
  const filled = TEXT_FIELDS.filter(f => form[f] && String(form[f]).trim().length > 0).length;
  return Math.round((filled / TEXT_FIELDS.length) * 100);
}

function PAPForm({ resident, initialData, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(initialData || { ...emptyForm });
  const [isCorrectingSpelling, setIsCorrectingSpelling] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckbox = (field) => {
    setForm(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleCorrectSpelling = async () => {
    setIsCorrectingSpelling(true);
    const textFields = [
      "presents","capacite","souhait_projet","souhait_participation","souhait_entourage",
      "donnees_identite","souhait_denomination","contexte_entree","souhaits_fin_vie","entourage",
      "droit_image","situation_familiale","vie_professionnelle","episodes_importants",
      "besoin_boire_manger","eliminer","mouvoir_posture","dormir_reposer","vetir_devtir",
      "propre_teguments","eviter_dangers","communication","croyances_valeurs",
      "occupation_recreation","apprendre","ressenti_adaptation","risques_autres",
      "accueil_premiers_jours","soins","repas","ambiance_generale","remarques_particulieres","objectifs"
    ];
    const fieldsToCorrect = Object.fromEntries(
      textFields.filter(f => form[f] && String(form[f]).trim().length > 0).map(f => [f, form[f]])
    );
    if (Object.keys(fieldsToCorrect).length === 0) {
      setIsCorrectingSpelling(false);
      return;
    }
    const schemaProps = Object.fromEntries(Object.keys(fieldsToCorrect).map(k => [k, { type: "string" }]));
    const corrected = await base44.integrations.Core.InvokeLLM({
      prompt: `Corrige uniquement les fautes d'orthographe et de grammaire dans les textes suivants. 
Ne modifie pas le sens, le contenu, le style ni les noms propres. 
Retourne exactement les mêmes champs avec le texte corrigé.

Textes à corriger :
${JSON.stringify(fieldsToCorrect, null, 2)}`,
      response_json_schema: { type: "object", properties: schemaProps }
    });
    setForm(prev => ({ ...prev, ...corrected }));
    setIsCorrectingSpelling(false);
  };

  const handleSubmit = () => {
    onSave({
      resident_id: resident.id,
      resident_name: `${resident.title} ${resident.last_name}`,
      ...form
    }, false);
  };

  const progress = computeProgress(form);
  const progressColor = progress < 30 ? 'bg-red-400' : progress < 70 ? 'bg-amber-400' : 'bg-green-500';

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">Progression du formulaire</span>
          <div className="flex items-center gap-2">

            <span className="text-xs font-bold text-slate-700">{progress}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className={`${progressColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="space-y-6 p-6">
        {/* Infos générales */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Informations générales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Date de naissance</label>
              <Input type="date" value={form.date_naissance} onChange={(e) => handleChange("date_naissance", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Service - Chambre</label>
              <Input value={form.service_chambre} onChange={(e) => handleChange("service_chambre", e.target.value)} placeholder="Ex: Mapad - 101" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Date de la réunion</label>
              <Input type="date" value={form.date_reunion} onChange={(e) => handleChange("date_reunion", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Date de réévaluation</label>
              <div className="flex gap-2 items-center mt-1">
                <select
                  className="px-2 py-1.5 border border-slate-300 rounded-md text-sm"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const months = parseInt(e.target.value);
                    const base = form.date_reunion ? new Date(form.date_reunion) : new Date();
                    base.setMonth(base.getMonth() + months);
                    handleChange("date_reevaluation", base.toISOString().split("T")[0]);
                    e.target.value = "";
                  }}
                >
                  <option value="">Dans x mois…</option>
                  {[1,2,3,4,5,6,9,12,18,24].map(m => (
                    <option key={m} value={m}>{m} mois</option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={form.date_reevaluation}
                  onChange={(e) => handleChange("date_reevaluation", e.target.value)}
                  className="flex-1"
                />
                {form.date_reevaluation && (
                  <button type="button" onClick={() => handleChange("date_reevaluation", "")} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Personnes présentes</label>
              <Input value={form.presents} onChange={(e) => handleChange("presents", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Souhaits et capacités */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Souhait de la personne concernant son PAP et capacité</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Capacité de la personne</label>
              <Textarea value={form.capacite} onChange={(e) => handleChange("capacite", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Souhait de réaliser le projet personnalisé</label>
              <Textarea value={form.souhait_projet} onChange={(e) => handleChange("souhait_projet", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Souhait de participer à la réalisation du projet personnalisé</label>
              <Textarea value={form.souhait_participation} onChange={(e) => handleChange("souhait_participation", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Souhait de faire participer son entourage et de l'informer</label>
              <Textarea value={form.souhait_entourage} onChange={(e) => handleChange("souhait_entourage", e.target.value)} rows={2} />
            </div>
          </div>
        </section>

        {/* Renseignements généraux */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Renseignements généraux</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Données d'identité / identification du résident</label>
              <Textarea value={form.donnees_identite} onChange={(e) => handleChange("donnees_identite", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Souhait de la personne en lien avec sa dénomination</label>
              <Textarea value={form.souhait_denomination} onChange={(e) => handleChange("souhait_denomination", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Contexte d'entrée</label>
              <Textarea value={form.contexte_entree} onChange={(e) => handleChange("contexte_entree", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Souhaits de fin de vie</label>
              <Textarea value={form.souhaits_fin_vie} onChange={(e) => handleChange("souhaits_fin_vie", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Entourage</label>
              <Textarea value={form.entourage} onChange={(e) => handleChange("entourage", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Droit à l'image</label>
              <Textarea value={form.droit_image} onChange={(e) => handleChange("droit_image", e.target.value)} rows={2} />
            </div>
          </div>
        </section>

        {/* Histoire de vie */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Histoire de vie</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Situation familiale</label>
              <Textarea value={form.situation_familiale} onChange={(e) => handleChange("situation_familiale", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Vie professionnelle</label>
              <Textarea value={form.vie_professionnelle} onChange={(e) => handleChange("vie_professionnelle", e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Épisodes importants de sa vie</label>
              <Textarea value={form.episodes_importants} onChange={(e) => handleChange("episodes_importants", e.target.value)} rows={2} />
            </div>
          </div>
        </section>

        {/* Habitudes de vie */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Habitudes de vie / souhaits exprimés ou collectés / recueillis par les professionnels</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Besoin de boire et manger</label>
              <Textarea value={form.besoin_boire_manger} onChange={(e) => handleChange("besoin_boire_manger", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Éliminer</label>
              <Textarea value={form.eliminer} onChange={(e) => handleChange("eliminer", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Se mouvoir et maintenir une bonne posture</label>
              <Textarea value={form.mouvoir_posture} onChange={(e) => handleChange("mouvoir_posture", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Dormir et se reposer</label>
              <Textarea value={form.dormir_reposer} onChange={(e) => handleChange("dormir_reposer", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Se vêtir et se dévêtir</label>
              <Textarea value={form.vetir_devtir} onChange={(e) => handleChange("vetir_devtir", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Être propre, protéger ses téguments</label>
              <Textarea value={form.propre_teguments} onChange={(e) => handleChange("propre_teguments", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Éviter les dangers</label>
              <Textarea value={form.eviter_dangers} onChange={(e) => handleChange("eviter_dangers", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Communication</label>
              <Textarea value={form.communication} onChange={(e) => handleChange("communication", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Agir selon ses croyances et ses valeurs</label>
              <Textarea value={form.croyances_valeurs} onChange={(e) => handleChange("croyances_valeurs", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">S'occuper en vue de se réaliser et/ou de se récréer</label>
              <Textarea value={form.occupation_recreation} onChange={(e) => handleChange("occupation_recreation", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Besoin d'apprendre</label>
              <Textarea value={form.apprendre} onChange={(e) => handleChange("apprendre", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Ressenti suite à l'entrée / Adaptation</label>
              <Textarea value={form.ressenti_adaptation} onChange={(e) => handleChange("ressenti_adaptation", e.target.value)} rows={1} />
            </div>
          </div>
        </section>

        {/* Identification de risques */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Identifications de risques auxquels la personne accompagnée peut être confrontée</h3>
          <div className="space-y-2">
            {[
              { key: "risque_fugue", label: "Risques de fugue ou de disparition" },
              { key: "risque_addictions", label: "Risques liés aux addictions et / ou aux conduites dangereuses" },
              { key: "risque_chutes", label: "Risques liés aux chutes" },
              { key: "risque_denutrition", label: "Risques liés à la dénutrition / malnutrition et / ou troubles de la déglutition" },
              { key: "risque_sexualite", label: "Risques liés à la sexualité" },
              { key: "risque_harcelement", label: "Risques de harcèlement et / ou d'abus de faiblesse" },
              { key: "risque_radicalisation", label: "Risque de radicalisation et / ou de prosélytisme" },
              { key: "risque_suicidaire", label: "Risque suicidaire" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={() => handleCheckbox(key)} />
                <span className="text-xs text-slate-700">{label}</span>
              </label>
            ))}
            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600">Autres risques</label>
              <Textarea value={form.risques_autres} onChange={(e) => handleChange("risques_autres", e.target.value)} rows={2} />
            </div>
          </div>
        </section>

        {/* Remarques particulières */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Remarques particulières</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">L'accueil des premiers jours</label>
              <Textarea value={form.accueil_premiers_jours} onChange={(e) => handleChange("accueil_premiers_jours", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Les soins</label>
              <Textarea value={form.soins} onChange={(e) => handleChange("soins", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Les repas</label>
              <Textarea value={form.repas} onChange={(e) => handleChange("repas", e.target.value)} rows={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">L'ambiance générale</label>
              <Textarea value={form.ambiance_generale} onChange={(e) => handleChange("ambiance_generale", e.target.value)} rows={1} />
            </div>
          </div>
        </section>

        {/* Objectifs et signature */}
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Objectifs et signature</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">L'équipe pluridisciplinaire retient la proposition des objectifs présentés ci-dessous, veillant à la continuité de ceux-ci et/ou à leur formalisation</label>
              <Textarea value={form.objectifs} onChange={(e) => handleChange("objectifs", e.target.value)} rows={3} placeholder="Liste les objectifs séparés par des retours à la ligne" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Capacité concernant l'information</label>
              <select value={form.capacite_information} onChange={(e) => handleChange("capacite_information", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                <option value="">-- Sélectionner --</option>
                <option value="informee">La personne a la capacité d'être informée sur son PAP</option>
                <option value="capable_signer">La personne a la capacité de signer son PAP</option>
                <option value="refuse_signer">La personne refuse de signer son PAP</option>
                <option value="information_pas_capable">La personne a eu l'information mais n'a pas la capacité de signer son PAP</option>
                <option value="pas_capable">La personne n'a pas la capacité de recevoir l'information et de signer son PAP</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Date de signature</label>
              <Input type="date" value={form.date_signature} onChange={(e) => handleChange("date_signature", e.target.value)} />
            </div>
          </div>
        </section>

        <div className="flex gap-3 justify-end pt-4 border-t flex-wrap">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button
            variant="outline"
            onClick={handleCorrectSpelling}
            disabled={isCorrectingSpelling}
            className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            {isCorrectingSpelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <SpellCheck className="h-4 w-4" />}
            {isCorrectingSpelling ? "Correction en cours…" : "Corriger l'orthographe"}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PAP() {
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [historyResidentId, setHistoryResidentId] = useState(null);
  const [viewingVersion, setViewingVersion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("tous");
  const [filterReferent, setFilterReferent] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [showSansReferents, setShowSansReferents] = useState(false);
  const [showPrintReferents, setShowPrintReferents] = useState(false);
  const [showGestionReferents, setShowGestionReferents] = useState(false);
  const [editingReferentName, setEditingReferentName] = useState(null);
  const [assigningReferentFor, setAssigningReferentFor] = useState(null);
  const [newReferentName, setNewReferentName] = useState("");
  const [extraReferentsList, setExtraReferentsList] = useState(() => JSON.parse(localStorage.getItem("extra_referents") || "[]")); // residentId // { old, new }
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading: residentsLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  const { data: paps = [], isLoading: papsLoading } = useQuery({
    queryKey: ["paps"],
    queryFn: () => base44.entities.PAP.list("-created_date", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (papId) => base44.entities.PAP.delete(papId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paps"] }),
  });

  const [editingReferent, setEditingReferent] = useState(null); // { residentId, value }

  const updateResidentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resident.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      setEditingReferent(null);
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["pap_versions", historyResidentId],
    queryFn: () => base44.entities.PAPVersion.filter({ resident_id: historyResidentId }, "-saved_at", 20),
    enabled: !!historyResidentId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ data, silent }) => {
      const existing = paps.find(p => p.resident_id === data.resident_id);
      if (existing) {
        if (!silent) {
          await base44.entities.PAPVersion.create({
            resident_id: existing.resident_id,
            resident_name: existing.resident_name,
            saved_at: new Date().toISOString(),
            data: JSON.stringify(existing)
          });
        }
        return base44.entities.PAP.update(existing.id, data);
      } else {
        return base44.entities.PAP.create(data);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["paps"] });
      if (!variables.silent) setEditingId(null);
    },
  });

  const handleUploadPAP = async (e, residentId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(residentId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const { status, output } = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            texte: { type: "string", description: "Tout le texte extrait du document PAP" }
          }
        }
      });

      if (status === "success" && output?.texte) {
        const residentData = residents.find(r => r.id === residentId);
        setExtractedText({ 
          residentId, 
          text: output.texte,
          resident: residentData 
        });
      } else {
        setExtractedText({ residentId, text: "Erreur: impossible d'extraire le texte du fichier", isError: true });
      }
      e.target.value = "";
    } catch (error) {
      console.error("Erreur upload:", error);
      setExtractedText({ residentId, text: "Erreur lors de l'upload du fichier", isError: true });
    } finally {
      setUploadingId(null);
    }
  };

  const handleSaveExtractedText = async () => {
    if (!extractedText || extractedText.isError) return;

    // Utiliser l'IA pour extraire les données structurées
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse le texte suivant d'un questionnaire PAP (Projet d'Accompagnement Personnalisé) et extrait les informations correspondant à chaque champ. Sois très attentif à bien identifier les sections et ne modifie pas le texte original - extrais-le tel qu'il est écrit.

Texte du PAP:
${extractedText.text}

Fournis un objet JSON avec les champs suivants (garder le texte original, ne rien modifier):
- date_naissance
- service_chambre
- date_reunion
- presents
- capacite
- souhait_projet
- souhait_participation
- souhait_entourage
- donnees_identite
- souhait_denomination
- contexte_entree
- souhaits_fin_vie
- entourage
- droit_image
- situation_familiale
- vie_professionnelle
- episodes_importants
- besoin_boire_manger
- eliminer
- mouvoir_posture
- dormir_reposer
- vetir_devtir
- propre_teguments
- eviter_dangers
- communication
- croyances_valeurs
- occupation_recreation
- apprendre
- ressenti_adaptation
- risques_autres
- accueil_premiers_jours
- soins
- repas
- ambiance_generale
- remarques_particulieres
- objectifs

Pour les risques booléens (risque_fugue, risque_addictions, risque_chutes, risque_denutrition, risque_sexualite, risque_harcelement, risque_radicalisation, risque_suicidaire), indique true/false selon ce qui est écrit.

Laisse vide les champs non trouvés dans le texte.`,
        response_json_schema: {
          type: "object",
          properties: {
            date_naissance: { type: "string" },
            service_chambre: { type: "string" },
            date_reunion: { type: "string" },
            presents: { type: "string" },
            capacite: { type: "string" },
            souhait_projet: { type: "string" },
            souhait_participation: { type: "string" },
            souhait_entourage: { type: "string" },
            donnees_identite: { type: "string" },
            souhait_denomination: { type: "string" },
            contexte_entree: { type: "string" },
            souhaits_fin_vie: { type: "string" },
            entourage: { type: "string" },
            droit_image: { type: "string" },
            situation_familiale: { type: "string" },
            vie_professionnelle: { type: "string" },
            episodes_importants: { type: "string" },
            besoin_boire_manger: { type: "string" },
            eliminer: { type: "string" },
            mouvoir_posture: { type: "string" },
            dormir_reposer: { type: "string" },
            vetir_devtir: { type: "string" },
            propre_teguments: { type: "string" },
            eviter_dangers: { type: "string" },
            communication: { type: "string" },
            croyances_valeurs: { type: "string" },
            occupation_recreation: { type: "string" },
            apprendre: { type: "string" },
            ressenti_adaptation: { type: "string" },
            risque_fugue: { type: "boolean" },
            risque_addictions: { type: "boolean" },
            risque_chutes: { type: "boolean" },
            risque_denutrition: { type: "boolean" },
            risque_sexualite: { type: "boolean" },
            risque_harcelement: { type: "boolean" },
            risque_radicalisation: { type: "boolean" },
            risque_suicidaire: { type: "boolean" },
            risques_autres: { type: "string" },
            accueil_premiers_jours: { type: "string" },
            soins: { type: "string" },
            repas: { type: "string" },
            ambiance_generale: { type: "string" },
            remarques_particulieres: { type: "string" },
            objectifs: { type: "string" }
          }
        }
      });

      setExtractedText({
        ...extractedText,
        parsed: response,
        showParsed: true
      });
    } catch (error) {
      console.error("Erreur analyse IA:", error);
      setExtractedText({ ...extractedText, isError: true, text: "Erreur lors de l'analyse IA du texte" });
    }
  };

  const handleSaveParsedData = async () => {
    if (!extractedText || !extractedText.parsed) return;

    const existing = paps.find(p => p.resident_id === extractedText.residentId);
    const data = {
      resident_id: extractedText.residentId,
      resident_name: `${extractedText.resident.title} ${extractedText.resident.last_name}`,
      ...extractedText.parsed
    };

    try {
      if (existing) {
        await base44.entities.PAP.update(existing.id, data);
      } else {
        await base44.entities.PAP.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ["paps"] });
      setExtractedText(null);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
    }
  };

  const getTodayPassword = () => {
    const now = new Date();
    return String(now.getDate()).padStart(2, "0") + String(now.getMonth() + 1).padStart(2, "0");
  };

  const handleDeleteConfirm = () => {
    if (deletePassword === getTodayPassword()) {
      deleteMutation.mutate(deleteTarget.papId);
      setDeleteTarget(null);
      setDeletePassword("");
      setDeletePasswordError(false);
    } else {
      setDeletePasswordError(true);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const papsDueThisMonth = paps.filter(p => {
    if (!p.date_reevaluation) return false;
    const ym = p.date_reevaluation.slice(0, 7);
    return ym === currentYearMonth;
  });

  const prochaines4Reevaluations = paps
    .filter(p => p.date_reevaluation)
    .map(p => ({ ...p, _date: new Date(p.date_reevaluation) }))
    .filter(p => p._date >= today)
    .sort((a, b) => a._date - b._date)
    .slice(0, 4);

  const residentsAvecNom = residents.filter(r => r.last_name && r.last_name.trim() && r.first_name && r.first_name.trim());
  const nbChambresVides = residents.length - residentsAvecNom.length;
  const nbFaits = residentsAvecNom.filter(r => paps.some(p => p.resident_id === r.id)).length;
  const nbTotal = residentsAvecNom.length;
  const nbAFaire = nbTotal - nbFaits;
  const sansReferentResidents = residents.filter(r => !r.referent && r.last_name && r.last_name.trim() && r.first_name && r.first_name.trim());
  const nbSansReferent = sansReferentResidents.length;

  const allReferents = [...new Set([...residents.map(r => r.referent).filter(Boolean), ...extraReferentsList])].sort();

  const referentsStats = allReferents
    .map(ref => ({
      name: ref,
      count: residents.filter(r => r.referent === ref).length,
      residents: residents.filter(r => r.referent === ref).sort((a, b) => (a.first_name || "").localeCompare(b.first_name || "")),
    }))
    .sort((a, b) => a.count !== b.count ? a.count - b.count : a.name.localeCompare(b.name));

  const handleRenameReferent = async (oldName, newName) => {
    const toUpdate = residents.filter(r => r.referent === oldName);
    await Promise.all(toUpdate.map(r => base44.entities.Resident.update(r.id, { referent: newName.trim() })));
    queryClient.invalidateQueries({ queryKey: ["residents"] });
    setEditingReferentName(null);
  };

  const handleDeleteReferent = async (name) => {
    const toUpdate = residents.filter(r => r.referent === name);
    await Promise.all(toUpdate.map(r => base44.entities.Resident.update(r.id, { referent: "" })));
    queryClient.invalidateQueries({ queryKey: ["residents"] });
  };

  const sortedResidents = [...residents].sort((a, b) =>
    (a.last_name || "").toUpperCase().localeCompare((b.last_name || "").toUpperCase())
  );

  const filteredResidents = sortedResidents.filter(r => {
    const hasPap = paps.some(p => p.resident_id === r.id);
    const matchSearch = `${r.last_name} ${r.first_name} ${r.room}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "faits") return hasPap;
    if (filter === "a_faire") return !hasPap;
    if (filterReferent && r.referent !== filterReferent) return false;
    return true;
  });

  if (residentsLoading || papsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const editingPap = editingId ? paps.find(p => p.resident_id === editingId) : null;
  const editingResident = editingId ? residents.find(r => r.id === editingId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">PAP — Projets d'Accompagnement Personnalisé</h1>
        <p className="text-slate-600 text-sm mb-4">Complétez et gérez les questionnaires PAP pour chaque résident.</p>

        {/* Prochaines réévaluations */}
        {prochaines4Reevaluations.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
            <CalendarClock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-blue-800 text-sm mb-2">Prochaines réévaluations</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {prochaines4Reevaluations.map(p => {
                  const res = residents.find(r => r.id === p.resident_id);
                  const diffDays = Math.round((p._date - today) / (1000 * 60 * 60 * 24));
                  const label = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Demain" : `Dans ${diffDays}j`;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setEditingId(p.resident_id)}
                      className="text-left bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100 transition-colors"
                    >
                      <div className="text-xs font-semibold text-blue-900">{res ? `${res.last_name} ${res.first_name}` : p.resident_name}</div>
                      <div className="text-xs text-blue-500 mt-0.5">{p._date.toLocaleDateString("fr-FR")} • <span className="font-medium">{label}</span></div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Alerte réévaluations */}
        {papsDueThisMonth.length > 0 && (
          <div className="mb-5 bg-orange-50 border border-orange-300 rounded-xl p-4 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-orange-800 text-sm mb-1">
                {papsDueThisMonth.length} PAP à réévaluer ce mois-ci
              </div>
              <div className="flex flex-wrap gap-2">
                {papsDueThisMonth.map(p => {
                  const res = residents.find(r => r.id === p.resident_id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setEditingId(p.resident_id)}
                      className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 px-2 py-1 rounded-md font-medium transition-colors"
                    >
                      {res ? `${res.last_name} ${res.first_name}` : p.resident_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <button onClick={() => setFilter(filter === "faits" ? "tous" : "faits")} className={`bg-green-50 border rounded-lg px-4 py-3 flex items-center gap-3 transition-colors ${filter === "faits" ? "border-green-500 ring-2 ring-green-300" : "border-green-200 hover:bg-green-100"}`}>
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-700">{nbFaits}</div>
              <div className="text-xs text-green-600 font-medium">PAP faits</div>
            </div>
          </button>
          <button onClick={() => setFilter(filter === "a_faire" ? "tous" : "a_faire")} className={`bg-amber-50 border rounded-lg px-4 py-3 flex items-center gap-3 transition-colors ${filter === "a_faire" ? "border-amber-500 ring-2 ring-amber-300" : "border-amber-200 hover:bg-amber-100"}`}>
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-700">{nbAFaire}</div>
              <div className="text-xs text-amber-600 font-medium">À faire</div>
            </div>
          </button>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div>
              <div className="text-2xl font-bold text-slate-700">{nbTotal}</div>
              <div className="text-xs text-slate-500 font-medium">Résidents</div>
              {nbChambresVides > 0 && (
                <div className="text-xs text-slate-400 mt-0.5">{nbChambresVides} chambre{nbChambresVides > 1 ? "s" : ""} vide{nbChambresVides > 1 ? "s" : ""}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowPrintReferents(true)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-slate-100 transition-colors ml-auto"
          >
            <Printer className="h-5 w-5 text-slate-500" />
            <div className="text-left">
              <div className="text-sm font-bold text-slate-700">Tableau référents</div>
              <div className="text-xs text-slate-400">Imprimer la liste</div>
            </div>
          </button>
          <button
            onClick={() => setShowGestionReferents(true)}
            className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-indigo-100 transition-colors"
          >
            <UserPen className="h-5 w-5 text-indigo-500" />
            <div className="text-left">
              <div className="text-sm font-bold text-indigo-700">Gestion des référents</div>
              <div className="text-xs text-indigo-500">{allReferents.length} référent{allReferents.length > 1 ? "s" : ""}</div>
            </div>
          </button>
          <button
            onClick={() => { setShowSansReferents(true); setAssigningReferentFor(null); }}
            className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-rose-100 transition-colors"
          >
            <Users className="h-5 w-5 text-rose-500" />
            <div className="text-left">
              <div className="text-sm font-bold text-rose-700">Résidents à assigner</div>
              <div className="text-xs text-rose-600">{nbSansReferent} sans référent</div>
            </div>
          </button>
        </div>

        {showPrintReferents && (
          <PrintReferentsTable residents={residents} onClose={() => setShowPrintReferents(false)} />
        )}

        {/* Modal sans référents */}
        {showSansReferents && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-slate-900">Résidents sans référent ({nbSansReferent})</h2>
                <button onClick={() => setShowSansReferents(false)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {sansReferentResidents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Tous les résidents ont un référent 🎉</p>
                ) : (
                  sansReferentResidents.sort((a,b) => (a.last_name||"").localeCompare(b.last_name||"")).map(r => (
                    <div key={r.id} className="bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-800">{r.title} {r.last_name} {r.first_name}</div>
                          <div className="text-xs text-slate-500">Chambre {r.room} • {r.section}</div>
                        </div>
                        <button
                          onClick={() => setAssigningReferentFor(assigningReferentFor === r.id ? null : r.id)}
                          className="text-xs text-indigo-600 hover:underline"
                        >{assigningReferentFor === r.id ? "Annuler" : "Assigner"}</button>
                      </div>
                      {assigningReferentFor === r.id && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {allReferents.length === 0 && <span className="text-xs text-slate-400">Aucun référent existant.</span>}
                          {allReferents.map(ref => {
                            const refCount = residents.filter(res2 => res2.referent === ref).length;
                            return (
                            <button
                              key={ref}
                              onClick={async () => {
                                await base44.entities.Resident.update(r.id, { referent: ref });
                                queryClient.invalidateQueries({ queryKey: ["residents"] });
                                setAssigningReferentFor(null);
                              }}
                              className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-md font-medium transition-colors"
                            >{ref} <span className="opacity-60">({refCount})</span></button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal gestion référents */}
        {showGestionReferents && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-slate-900">Gestion des référents</h2>
                <button onClick={() => { setShowGestionReferents(false); setEditingReferentName(null); }} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                <div className="pb-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Ajouter un nouveau référent</p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                      placeholder="Nom du référent..."
                      value={newReferentName}
                      onChange={(e) => setNewReferentName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newReferentName.trim() && !allReferents.includes(newReferentName.trim())) {
                          // Créer un résident fictif n'est pas possible, on ajoute juste comme placeholder en assignant à personne
                          // On va plutôt stocker dans un champ virtuel en créant rien — le référent n'existe que quand assigné
                          // On informe l'utilisateur
                        }
                      }}
                    />
                    <button
                      disabled={!newReferentName.trim() || allReferents.includes(newReferentName.trim())}
                      onClick={async () => {
                        const name = newReferentName.trim();
                        if (!name || allReferents.includes(name)) return;
                        // Assigner ce référent au premier résident sans référent, sinon créer une entrée vide
                        // En pratique : on ne peut créer un référent qu'en l'assignant. On utilise une "liste" externe.
                        // Simple solution : on stocke dans localStorage la liste des référents créés manuellement
                        const stored = JSON.parse(localStorage.getItem("extra_referents") || "[]");
                        const updated = stored.includes(name) ? stored : [...stored, name];
                        localStorage.setItem("extra_referents", JSON.stringify(updated));
                        setExtraReferentsList(updated);
                        setNewReferentName("");
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                  {newReferentName.trim() && allReferents.includes(newReferentName.trim()) && (
                    <p className="text-xs text-orange-500 mt-1">Ce référent existe déjà.</p>
                  )}
                </div>
                {referentsStats.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucun référent défini.</p>}
                {referentsStats.map(({ name, count, residents: residents_ }) => (
                  <div key={name} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                      {editingReferentName?.old === name ? (
                        <input
                          autoFocus
                          className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm mr-2"
                          value={editingReferentName.new}
                          onChange={(e) => setEditingReferentName({ ...editingReferentName, new: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameReferent(name, editingReferentName.new);
                            if (e.key === "Escape") setEditingReferentName(null);
                          }}
                        />
                      ) : (
                        <span className="font-medium text-slate-800 text-sm">{name}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{count} résident{count > 1 ? "s" : ""}</span>
                        {editingReferentName?.old === name ? (
                          <>
                            <button onClick={() => handleRenameReferent(name, editingReferentName.new)} className="text-xs text-green-600 hover:underline">OK</button>
                            <button onClick={() => setEditingReferentName(null)} className="text-xs text-slate-400 hover:underline">Annuler</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingReferentName({ old: name, new: name })} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Renommer"><UserPen className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteReferent(name)} className="text-slate-400 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-2 text-xs text-slate-500 flex flex-wrap gap-1">
                      {residents_.map(r => (
                        <span key={r.id} className="bg-white border border-slate-200 px-2 py-0.5 rounded">{r.last_name} {r.first_name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex gap-3 items-center flex-wrap">
            <Input
              placeholder="Rechercher un résident..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setFilterReferent(""); }}
              className="flex-1 min-w-[160px]"
            />
            <select
              value={filterReferent}
              onChange={(e) => { setFilterReferent(e.target.value); if (e.target.value) setFilter("tous"); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700"
            >
              <option value="">Tous les référents</option>
              {allReferents.map(ref => (
                <option key={ref} value={ref}>{ref}</option>
              ))}
            </select>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {[
                { key: "tous", label: "Tous" },
                { key: "faits", label: "✓ Faits" },
                { key: "a_faire", label: "À faire" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filter === key
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {extractedText && !extractedText.showParsed && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white">
                <h2 className="font-semibold text-slate-900">Texte extrait du PAP</h2>
                <Button variant="ghost" size="icon" onClick={() => setExtractedText(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                {extractedText.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{extractedText.text}</AlertDescription>
                  </Alert>
                )}
                {!extractedText.isError && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs text-blue-700 font-semibold mb-2">Verifie que le texte extrait est exact. Modifie-le si nécessaire avant de l'enregistrer.</p>
                    </div>
                    <Textarea
                      value={extractedText.text}
                      onChange={(e) => setExtractedText({ ...extractedText, text: e.target.value })}
                      className="h-96 font-mono text-xs"
                    />
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setExtractedText(null)}>Annuler</Button>
                      <Button onClick={handleSaveExtractedText} className="gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyser et remplir
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {extractedText && extractedText.showParsed && extractedText.parsed && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white">
                <div>
                  <h2 className="font-semibold text-slate-900">Vérifier les données extraites</h2>
                  <p className="text-xs text-slate-500">Corrige les champs si nécessaire avant de sauvegarder</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setExtractedText(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(extractedText.parsed).map(([key, value]) => {
                    if (!value && typeof value !== 'boolean') return null;
                    const label = key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                    
                    return (
                      <div key={key} className="col-span-2 md:col-span-1">
                        <label className="text-xs font-semibold text-slate-600">{label}</label>
                        {typeof value === 'boolean' ? (
                          <div className="text-sm text-slate-700 mt-1 p-2 bg-slate-50 rounded">
                            {value ? '✓ Oui' : '✗ Non'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={value || ""}
                            onChange={(e) => setExtractedText({
                              ...extractedText,
                              parsed: { ...extractedText.parsed, [key]: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mt-1"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setExtractedText(null)}>Annuler</Button>
                  <Button onClick={handleSaveParsedData} className="gap-2">
                    <Save className="h-4 w-4" />
                    Enregistrer le PAP
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewingId && (() => {
          const res = residents.find(r => r.id === viewingId);
          const pap = paps.find(p => p.resident_id === viewingId);
          if (!res || !pap) return null;
          return <PAPView key={viewingId} pap={pap} resident={res} onClose={() => setViewingId(null)} />;
        })()}

        {viewingVersion && (
          <PAPView
            pap={viewingVersion.pap}
            resident={viewingVersion.res}
            onClose={() => setViewingVersion(null)}
            readOnly
            archiveDate={viewingVersion.date}
          />
        )}

        {historyResidentId && (() => {
          const res = residents.find(r => r.id === historyResidentId);
          return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h2 className="font-semibold text-slate-900">Historique des versions</h2>
                    <p className="text-xs text-slate-500">{res?.title} {res?.last_name} {res?.first_name}</p>
                  </div>
                  <button onClick={() => setHistoryResidentId(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                  {versions.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Aucune version sauvegardée.<br /><span className="text-xs">Les versions sont créées à chaque sauvegarde manuelle.</span></p>
                  ) : (
                    versions.map((v, i) => {
                      const parsed = (() => { try { return JSON.parse(v.data); } catch { return null; } })();
                      const prog = parsed ? computeProgress(parsed) : 0;
                      const progColor = prog < 30 ? 'bg-red-400' : prog < 70 ? 'bg-amber-400' : 'bg-green-500';
                      return (
                        <div key={v.id} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-sm font-semibold text-slate-800">Version {versions.length - i}</span>
                              <span className="text-xs text-slate-500 ml-2">{new Date(v.saved_at || v.created_date).toLocaleString("fr-FR")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{prog}% complet</span>
                              {parsed && (
                                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={() => setViewingVersion({ pap: parsed, res, date: v.saved_at || v.created_date })}>
                                  <Eye className="h-3 w-3" /> Voir
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${progColor}`} style={{ width: `${prog}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {editingReferent && (() => {
          const res = residents.find(r => r.id === editingReferent.residentId);
          return (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
                <h2 className="text-base font-semibold text-slate-700 mb-1">Référent soignant</h2>
                <p className="text-sm text-slate-500 mb-4">{res?.title} {res?.last_name} {res?.first_name}</p>
                <div className="relative">
                  <Input
                    autoFocus
                    placeholder="Nom du référent"
                    value={editingReferent.value}
                    onChange={(e) => setEditingReferent({ ...editingReferent, value: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && updateResidentMutation.mutate({ id: editingReferent.residentId, data: { referent: editingReferent.value.trim() } })}
                  />
                  {editingReferent.value.length > 0 && (() => {
                    const suggestions = allReferents.filter(r =>
                      r.toLowerCase().includes(editingReferent.value.toLowerCase()) && r !== editingReferent.value
                    );
                    if (!suggestions.length) return null;
                    return (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 mt-1 overflow-hidden">
                        {suggestions.map(s => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); setEditingReferent({ ...editingReferent, value: s }); }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setEditingReferent(null)} className="text-sm text-slate-400 hover:text-slate-600 px-3 py-1.5">Annuler</button>
                  <button
                    onClick={() => updateResidentMutation.mutate({ id: editingReferent.residentId, data: { referent: editingReferent.value.trim() } })}
                    className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-1.5 hover:bg-indigo-700 flex items-center gap-1.5"
                    disabled={updateResidentMutation.isPending}
                  >
                    {updateResidentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
              <h2 className="text-base font-semibold text-slate-700 mb-1">Supprimer le PAP</h2>
              <p className="text-sm text-slate-500 mb-1">PAP de <strong>{deleteTarget.residentName}</strong></p>
              <p className="text-xs text-slate-400 mb-4">Entrez le code du jour (jjmm) pour confirmer la suppression</p>
              <input
                autoFocus
                type="password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-slate-500"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
                placeholder="••••"
              />
              {deletePasswordError && <p className="text-xs text-red-500 mb-2">Code incorrect</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setDeleteTarget(null); setDeletePassword(""); setDeletePasswordError(false); }} className="text-sm text-slate-400 hover:text-slate-600 px-3 py-1.5">Annuler</button>
                <button onClick={handleDeleteConfirm} className="text-sm bg-red-600 text-white rounded-lg px-4 py-1.5 hover:bg-red-700">Supprimer</button>
              </div>
            </div>
          </div>
        )}

        {editingId && editingResident ? (
          <div className="bg-white rounded-lg border border-slate-200 mb-6">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-slate-900">
                Éditer PAP — {editingResident.title} {editingResident.last_name}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <PAPForm
              resident={editingResident}
              initialData={editingPap}
              onSave={(data, silent) => saveMutation.mutate({ data, silent })}
              onCancel={() => setEditingId(null)}
              isSaving={saveMutation.isPending}
            />
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredResidents.map(resident => {
              const hasPap = paps.some(p => p.resident_id === resident.id);
              return (
                <div key={resident.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        {resident.title} {resident.last_name} {resident.first_name}
                      </div>
                      <div className="text-xs text-slate-500">Chambre {resident.room} • {resident.section}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {resident.referent ? (
                          <span className="text-xs text-indigo-600 font-medium">Référent : {resident.referent}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Aucun référent</span>
                        )}
                        <button
                          onClick={() => setEditingReferent({ residentId: resident.id, value: resident.referent || "" })}
                          className="ml-1 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Modifier le référent"
                        >
                          <UserPen className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 items-center flex-wrap justify-end">
                      {hasPap && (
                        <Button size="sm" variant="outline" onClick={() => setViewingId(resident.id)} className="gap-1.5">
                          <Eye className="h-4 w-4" /> Voir
                        </Button>
                      )}
                      {hasPap && (
                        <Button size="sm" variant="outline" onClick={() => setHistoryResidentId(resident.id)} className="gap-1.5">
                          <History className="h-4 w-4" /> Historique
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setEditingId(resident.id)}>
                        {hasPap ? "Modifier" : "Créer"}
                      </Button>
                      <label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleUploadPAP(e, resident.id)}
                          disabled={uploadingId === resident.id}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploadingId === resident.id}
                          onClick={(e) => e.currentTarget.parentElement.querySelector("input").click()}
                          className="gap-2"
                        >
                          {uploadingId === resident.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload
                        </Button>
                      </label>
                      {hasPap && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const pap = paps.find(p => p.resident_id === resident.id);
                            if (pap) setDeleteTarget({ papId: pap.id, residentName: `${resident.last_name} ${resident.first_name}` });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
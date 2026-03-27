import React from "react";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const RISQUES = [
  { key: "risque_fugue", label: "Risques de fugue ou de disparition" },
  { key: "risque_addictions", label: "Risques liés aux addictions" },
  { key: "risque_chutes", label: "Risques liés aux chutes" },
  { key: "risque_denutrition", label: "Risques liés à la dénutrition" },
  { key: "risque_sexualite", label: "Risques liés à la sexualité" },
  { key: "risque_harcelement", label: "Risques de harcèlement et/ou d'abus" },
  { key: "risque_radicalisation", label: "Risque de radicalisation" },
  { key: "risque_suicidaire", label: "Risque suicidaire" },
];

const CAPACITE_LABELS = {
  informee: "La personne a la capacité d'être informée sur son PAP",
  capable_signer: "La personne a la capacité de signer son PAP",
  refuse_signer: "La personne refuse de signer son PAP",
  information_pas_capable: "La personne a eu l'information mais n'a pas la capacité de signer",
  pas_capable: "La personne n'a pas la capacité de recevoir l'information et de signer",
};

function Field({ label, value }) {
  if (!value && value !== false) return null;
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-slate-800 bg-slate-50 rounded px-3 py-2 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-200 pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function PAPView({ pap, resident, onClose }) {
  const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "—";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">
              PAP — {resident.title} {resident.last_name} {resident.first_name}
            </h2>
            <p className="text-xs text-slate-500">Chambre {resident.room} • {resident.section}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 print:hidden">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="print:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <Section title="Informations générales">
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Date de naissance" value={fmtDate(pap.date_naissance)} />
              <Field label="Service - Chambre" value={pap.service_chambre} />
              <Field label="Date de la réunion" value={fmtDate(pap.date_reunion)} />
              <Field label="Date de réévaluation" value={fmtDate(pap.date_reevaluation)} />
            </div>
            <Field label="Personnes présentes" value={pap.presents} />
          </Section>

          <Section title="Souhait de la personne concernant son PAP">
            <Field label="Capacité de la personne" value={pap.capacite} />
            <Field label="Souhait de réaliser le projet personnalisé" value={pap.souhait_projet} />
            <Field label="Souhait de participer à la réalisation" value={pap.souhait_participation} />
            <Field label="Souhait de faire participer son entourage" value={pap.souhait_entourage} />
          </Section>

          <Section title="Renseignements généraux">
            <Field label="Données d'identité" value={pap.donnees_identite} />
            <Field label="Souhait concernant sa dénomination" value={pap.souhait_denomination} />
            <Field label="Contexte d'entrée" value={pap.contexte_entree} />
            <Field label="Souhaits de fin de vie" value={pap.souhaits_fin_vie} />
            <Field label="Entourage" value={pap.entourage} />
            <Field label="Droit à l'image" value={pap.droit_image} />
          </Section>

          <Section title="Histoire de vie">
            <Field label="Situation familiale" value={pap.situation_familiale} />
            <Field label="Vie professionnelle" value={pap.vie_professionnelle} />
            <Field label="Épisodes importants" value={pap.episodes_importants} />
          </Section>

          <Section title="Habitudes de vie">
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Boire et manger" value={pap.besoin_boire_manger} />
              <Field label="Éliminer" value={pap.eliminer} />
              <Field label="Se mouvoir" value={pap.mouvoir_posture} />
              <Field label="Dormir et se reposer" value={pap.dormir_reposer} />
              <Field label="Se vêtir" value={pap.vetir_devtir} />
              <Field label="Être propre" value={pap.propre_teguments} />
              <Field label="Éviter les dangers" value={pap.eviter_dangers} />
              <Field label="Communication" value={pap.communication} />
              <Field label="Croyances et valeurs" value={pap.croyances_valeurs} />
              <Field label="Occupation / récréation" value={pap.occupation_recreation} />
              <Field label="Besoin d'apprendre" value={pap.apprendre} />
              <Field label="Ressenti / Adaptation" value={pap.ressenti_adaptation} />
            </div>
          </Section>

          <Section title="Identification des risques">
            <div className="flex flex-wrap gap-2 mb-3">
              {RISQUES.filter(r => pap[r.key]).map(r => (
                <span key={r.key} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">{r.label}</span>
              ))}
              {RISQUES.every(r => !pap[r.key]) && <span className="text-xs text-slate-400">Aucun risque identifié</span>}
            </div>
            <Field label="Autres risques" value={pap.risques_autres} />
          </Section>

          <Section title="Remarques particulières">
            <Field label="Accueil des premiers jours" value={pap.accueil_premiers_jours} />
            <Field label="Les soins" value={pap.soins} />
            <Field label="Les repas" value={pap.repas} />
            <Field label="Ambiance générale" value={pap.ambiance_generale} />
            <Field label="Autres remarques" value={pap.remarques_particulieres} />
          </Section>

          <Section title="Objectifs et signature">
            <Field label="Objectifs retenus" value={pap.objectifs} />
            {pap.capacite_information && (
              <Field label="Capacité concernant l'information" value={CAPACITE_LABELS[pap.capacite_information] || pap.capacite_information} />
            )}
            <Field label="Date de signature" value={fmtDate(pap.date_signature)} />
          </Section>
        </div>
      </div>
    </div>
  );
}
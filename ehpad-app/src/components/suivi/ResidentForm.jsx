import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TRAITEMENTS = [
  "Durogesic 12 µg/h",
  "Durogesic 25 µg/h",
  "Durogesic 50 µg/h",
  "Durogesic 75 µg/h",
  "Oxycodone LP 10 mg",
];

export default function ResidentForm({ form, setForm, onSave, onNew, onDelete }) {
  const isCalendrier = form.type_suivi === "calendrier";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Nom Prénom</Label>
        <Input
          placeholder="Ex: Dupont Jean"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
        />
      </div>
      <div>
        <Label>Chambre</Label>
        <Input
          placeholder="Ex: 102"
          value={form.chambre}
          onChange={(e) => setForm({ ...form, chambre: e.target.value })}
        />
      </div>
      <div>
        <Label>Type de traitement</Label>
        <Select value={form.traitement} onValueChange={(v) => setForm({ ...form, traitement: v })}>
          <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
          <SelectContent>
            {TRAITEMENTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Type de suivi</Label>
        <div className="flex gap-4 mt-1">
          {["calendrier", "posologie"].map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="typeSuivi"
                value={type}
                checked={form.type_suivi === type}
                onChange={() => setForm({ ...form, type_suivi: type })}
              />
              <span className="text-sm">{type === "calendrier" ? "Calendrier (Patchs)" : "Posologie Simple"}</span>
            </label>
          ))}
        </div>
      </div>

      {isCalendrier ? (
        <>
          <div>
            <Label>Date de première pose</Label>
            <Input type="date" value={form.date_debut || ""} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          </div>
          <div>
            <Label>Date de fin de prescription</Label>
            <Input type="date" value={form.date_fin || ""} disabled={form.pas_de_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input type="checkbox" checked={!!form.pas_de_fin} onChange={(e) => setForm({ ...form, pas_de_fin: e.target.checked, date_fin: e.target.checked ? "" : form.date_fin })} />
              <span className="text-sm">Pas de date de fin</span>
            </label>
          </div>
        </>
      ) : (
        <div>
          <Label>Moments de prise</Label>
          <div className="flex gap-4 mt-1">
            {[["poso_matin", "Matin"], ["poso_midi", "Midi"], ["poso_soir", "Soir"]].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Prescripteur</Label>
        <Input placeholder="Ex: Dr. Martin" value={form.prescripteur || ""} onChange={(e) => setForm({ ...form, prescripteur: e.target.value })} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!form.dotation_nominative} onChange={(e) => setForm({ ...form, dotation_nominative: e.target.checked })} />
        <span className="text-sm font-medium">Dotation Nominative</span>
      </label>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="secondary" className="flex-1" onClick={onNew}>➕ Nouveau</Button>
        <Button variant="destructive" className="flex-1" onClick={onDelete}>🗑️ Supprimer</Button>
      </div>
    </div>
  );
}
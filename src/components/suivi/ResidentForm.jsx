import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPES_CONTENTION = ["lit", "fauteuil", "barrière"];

export default function ResidentForm({ form, setForm, onSave, onNew, onDelete }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Nom Prénom</Label>
        <Input
          placeholder="Ex: Dupont Jean"
          value={form.nom_prenom}
          onChange={(e) => setForm({ ...form, nom_prenom: e.target.value })}
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
        <Label>Type de contention</Label>
        <Select value={form.type_contention} onValueChange={(v) => setForm({ ...form, type_contention: v })}>
          <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
          <SelectContent>
            {TYPES_CONTENTION.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Date de prescription</Label>
        <Input
          type="date"
          value={form.date_prescription || ""}
          onChange={(e) => setForm({ ...form, date_prescription: e.target.value })}
        />
      </div>

      <div>
        <Label>Date de fin prévue</Label>
        <Input
          type="date"
          value={form.date_fin_prevue || ""}
          onChange={(e) => setForm({ ...form, date_fin_prevue: e.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!form.si_besoin}
          onChange={(e) => setForm({ ...form, si_besoin: e.target.checked })}
        />
        <span className="text-sm font-medium">Si besoin</span>
      </label>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="secondary" className="flex-1" onClick={onNew}>➕ Nouveau</Button>
        <Button variant="destructive" className="flex-1" onClick={onDelete}>🗑️ Supprimer</Button>
      </div>
    </div>
  );
}

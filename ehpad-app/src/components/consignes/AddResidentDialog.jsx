import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AddResidentDialog({ open, onOpenChange, onAdd, floor, section }) {
  const [form, setForm] = useState({
    room: "",
    title: "Mme",
    last_name: "",
    first_name: "",
    annotations: "",
    ta_number: "",
  });

  const handleSubmit = () => {
    onAdd({
      ...form,
      floor,
      section,
      ta_number: form.ta_number === "" ? null : Number(form.ta_number),
      sort_order: 99,
    });
    setForm({ room: "", title: "Mme", last_name: "", first_name: "", annotations: "", ta_number: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un résident — {floor} {section}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Chambre</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Ex: 101" />
            </div>
            <div>
              <Label>Civilité</Label>
              <Select value={form.title} onValueChange={(v) => setForm({ ...form, title: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mme">Mme</SelectItem>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Me">Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="NOM" />
            </div>
            <div>
              <Label>Prénom</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Prénom" />
            </div>
          </div>
          <div>
            <Label>Consignes / Annotations</Label>
            <Textarea value={form.annotations} onChange={(e) => setForm({ ...form, annotations: e.target.value })} placeholder="DID, DNID, allergies..." rows={3} />
          </div>
          <div className="w-24">
            <Label>N° TA</Label>
            <Input type="number" value={form.ta_number} onChange={(e) => setForm({ ...form, ta_number: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!form.last_name || !form.room}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
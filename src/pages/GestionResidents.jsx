import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Check, X, UserMinus, Pill, Sun, Moon, Syringe, KeyRound, AlertTriangle, PhoneCall, Stethoscope, Archive } from "lucide-react";

// Filtrer le marqueur ---SUPPL: et son contenu JSON des annotations
function getDisplayAnnotations(annotations) {
  if (!annotations) return "";
  // Chercher le marqueur avec ou sans saut de ligne initial
  let idx = annotations.indexOf('\n---SUPPL:');
  if (idx === -1) idx = annotations.indexOf('---SUPPL:');
  return idx !== -1 ? annotations.slice(0, idx) : annotations;
}

function ResidentEditRow({ resident, taNumber, onSave, onClearResident, onDeleteRoom, doctors = [] }) {
  const [editing, setEditing] = useState(false);
  const [roomLocked, setRoomLocked] = useState(true);
  const [roomPwdPrompt, setRoomPwdPrompt] = useState(false);
  const [roomPwd, setRoomPwd] = useState("");
  const [roomPwdError, setRoomPwdError] = useState(false);
  const [form, setForm] = useState({
    room: resident.room || "",
    title: resident.title || "Mme",
    last_name: resident.last_name || "",
    first_name: resident.first_name || "",
    date_naissance: resident.date_naissance || "",
    date_entree: resident.date_entree || "",
    annotations: resident.annotations || "",
    regime_mixe: resident.regime_mixe || false,
    viande_mixee: resident.viande_mixee || false,
    regime_diabetique: resident.regime_diabetique || false,
    epargne_intestinale: resident.epargne_intestinale || false,
    allergie_poisson: resident.allergie_poisson || false,
    traitement_ecrase: resident.traitement_ecrase || false,
    insuline_matin: resident.insuline_matin || false,
    insuline_soir: resident.insuline_soir || false,
    anticoagulants: resident.anticoagulants || false,
    appel_nuit: resident.appel_nuit || false,
    medecin: resident.medecin || "",
  });

  const handleSave = () => {
    onSave(resident.id, { ...form, sort_order: resident.sort_order });
    setEditing(false);
    setRoomLocked(true);
    setRoomPwdPrompt(false);
  };

  const handleRoomUnlock = () => {
    if (roomPwd === "mapad2022") {
      setRoomLocked(false);
      setRoomPwdPrompt(false);
      setRoomPwd("");
      setRoomPwdError(false);
    } else {
      setRoomPwdError(true);
    }
  };

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="border border-slate-300 px-2 py-1">
          {roomLocked ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">{form.room}</span>
              {roomPwdPrompt ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="password"
                    value={roomPwd}
                    onChange={(e) => { setRoomPwd(e.target.value); setRoomPwdError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleRoomUnlock()}
                    className={`border rounded px-1 py-0.5 text-xs w-20 outline-none ${roomPwdError ? "border-red-400" : "border-slate-300"}`}
                    placeholder="Mot de passe"
                  />
                  <button onClick={handleRoomUnlock} className="text-green-600 hover:text-green-800"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { setRoomPwdPrompt(false); setRoomPwd(""); setRoomPwdError(false); }} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                  {roomPwdError && <span className="text-xs text-red-500">❌</span>}
                </div>
              ) : (
                <button onClick={() => setRoomPwdPrompt(true)} className="text-slate-400 hover:text-slate-600" title="Modifier le numéro de chambre"><KeyRound className="h-3 w-3" /></button>
              )}
            </div>
          ) : (
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="h-7 text-xs w-16" />
          )}
        </td>
        <td className="border border-slate-300 px-2 py-1">
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <Select value={form.title} onValueChange={(v) => setForm({ ...form, title: v })}>
                <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mme">Mme</SelectItem>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Me">Me</SelectItem>
                </SelectContent>
              </Select>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="h-7 text-xs" placeholder="Nom" />
            </div>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="h-7 text-xs" placeholder="Prénom" />
            <Input type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} className="h-7 text-xs" />
            <label className="text-xs text-slate-400">Entrée</label>
            <Input type="date" value={form.date_entree} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} className="h-7 text-xs" />
            </div>
        </td>
        <td className="border border-slate-300 px-2 py-1">
          <Textarea value={form.annotations} onChange={(e) => setForm({ ...form, annotations: e.target.value })} className="text-xs min-h-[36px]" rows={2} />
        </td>
        <td className="border border-slate-300 px-2 py-1">
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.regime_mixe} onChange={(e) => setForm({ ...form, regime_mixe: e.target.checked })} />
              Mixé
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.viande_mixee} onChange={(e) => setForm({ ...form, viande_mixee: e.target.checked })} />
              Viande mixée
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.regime_diabetique} onChange={(e) => setForm({ ...form, regime_diabetique: e.target.checked })} />
              Diabétique
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.epargne_intestinale} onChange={(e) => setForm({ ...form, epargne_intestinale: e.target.checked })} />
              Épargne intestinale
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.allergie_poisson} onChange={(e) => setForm({ ...form, allergie_poisson: e.target.checked })} />
              Allergie poisson
            </label>
          </div>
        </td>
        <td className="border border-slate-300 px-2 py-1 text-center text-xs text-slate-400">{taNumber}</td>
        <td className="border border-slate-300 px-2 py-1 text-center">
          <div className="flex flex-col gap-1 items-start">
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.traitement_ecrase} onChange={(e) => setForm({ ...form, traitement_ecrase: e.target.checked })} />
              <Pill className="h-3 w-3" /> Écrasé
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.insuline_matin} onChange={(e) => setForm({ ...form, insuline_matin: e.target.checked })} />
              <Syringe className="h-3 w-3 text-yellow-500" /><Sun className="h-3 w-3 text-yellow-500" /> Ins. matin
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.insuline_soir} onChange={(e) => setForm({ ...form, insuline_soir: e.target.checked })} />
              <Syringe className="h-3 w-3 text-blue-500" /><Moon className="h-3 w-3 text-blue-500" /> Ins. soir
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={form.anticoagulants} onChange={(e) => setForm({ ...form, anticoagulants: e.target.checked })} />
              <AlertTriangle className="h-3 w-3 text-red-500" /> Anticoag.
            </label>
            <div className="flex items-center gap-1 text-xs text-slate-400 select-none cursor-default">
              <PhoneCall className="h-3 w-3 text-indigo-300" /> Appel nuit (via GIR)
            </div>
          </div>
        </td>
        <td className="border border-slate-300 px-2 py-1">
          <Select value={form.medecin} onValueChange={(v) => setForm({ ...form, medecin: v })}>
            <SelectTrigger className="h-7 text-xs w-full"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>—</SelectItem>
              {doctors.filter(Boolean).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </td>
        <td className="border border-slate-300 px-2 py-1">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50 group">
      <td className="border border-slate-300 px-2 py-1.5 text-sm font-semibold">{resident.room}</td>
      <td className="border border-slate-300 px-2 py-1.5">
        {resident.last_name ? (
          <>
            <div className="text-sm font-semibold uppercase">{resident.title} {resident.last_name}</div>
            <div className="text-xs text-slate-500">
              {resident.first_name}
              {resident.date_naissance && (
                <span className="ml-1 text-slate-400">
                  ({Math.floor((new Date() - new Date(resident.date_naissance)) / (365.25 * 24 * 3600 * 1000))} ans)
                </span>
              )}
            {resident.date_entree && (
              <div className="text-xs text-slate-400 mt-0.5">Entrée : {new Date(resident.date_entree).toLocaleDateString('fr-FR')}</div>
            )}
            </div>
            </>
            ) : (
            <span className="text-xs text-slate-400 italic">Chambre vide</span>
            )}
      </td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs text-red-600 whitespace-pre-line max-w-xs">{getDisplayAnnotations(resident.annotations)}</td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs">
        <div className="flex flex-col gap-0.5 items-start">
          {resident.regime_mixe && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-orange-100 text-orange-700">Mixé</span>
          )}
          {resident.viande_mixee && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">Viande mixée</span>
          )}
          {resident.regime_diabetique && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-purple-100 text-purple-700">Diabétique</span>
          )}
          {resident.epargne_intestinale && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-green-100 text-green-700">Épargne intest.</span>
          )}
          {resident.allergie_poisson && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700">Allergie poisson</span>
          )}
        </div>
      </td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs text-center font-medium text-slate-600">{taNumber}</td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs text-center">
        <div className="flex flex-col gap-0.5 items-center">
          {resident.traitement_ecrase && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-yellow-100 text-yellow-700 flex items-center gap-1"><Pill className="h-3 w-3" />Écrasé</span>
          )}
          {resident.insuline_matin && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700 flex items-center gap-1"><Syringe className="h-3 w-3" /><Sun className="h-3 w-3" />Ins. matin</span>
          )}
          {resident.insuline_soir && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-700 flex items-center gap-1"><Syringe className="h-3 w-3" /><Moon className="h-3 w-3" />Ins. soir</span>
          )}
          {resident.anticoagulants && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Anticoag.</span>
          )}
          {resident.appel_nuit && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-1"><PhoneCall className="h-3 w-3" />Appel nuit</span>
          )}
        </div>
      </td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs text-slate-600">{resident.medecin || <span className="text-slate-300">—</span>}</td>
      <td className="border border-slate-300 px-2 py-1.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} title="Modifier"><Pencil className="h-3.5 w-3.5 text-slate-400" /></Button>
          {resident.last_name && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onClearResident(resident.id)} title="Vider la chambre (archiver le résident)"><UserMinus className="h-3.5 w-3.5 text-orange-400" /></Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddRoomForm({ floor, section, onAdd, onCancel }) {
  const [room, setRoom] = useState("");

  const handleSubmit = () => {
    if (!room.trim()) return;
    onAdd({ room: room.trim(), floor, section, last_name: "", title: "Mme", first_name: "", annotations: "", ta_number: null });
    setRoom("");
  };

  return (
    <tr className="bg-green-50">
      <td className="border border-slate-300 px-2 py-1">
        <Input
          autoFocus
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="h-7 text-xs w-16"
          placeholder="N° Ch. *"
        />
      </td>
      <td className="border border-slate-300 px-2 py-1">
        <span className="text-xs text-slate-400 italic">Entrez le numéro de chambre pour créer une chambre vide</span>
      </td>
      <td className="border border-slate-300 px-2 py-1"></td>
      <td className="border border-slate-300 px-2 py-1"></td>
      <td className="border border-slate-300 px-2 py-1"></td>
      <td className="border border-slate-300 px-2 py-1">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSubmit} disabled={!room.trim()}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
  );
}

function SectionTable({ title, floor, section, residents, taMap = {}, onSave, onClearResident, onDeleteRoom, onAdd, doctors = [] }) {
  const [adding, setAdding] = useState(false);
  const sorted = [...residents].sort((a, b) => {
    const numA = parseInt(a.room) || 0;
    const numB = parseInt(b.room) || 0;
    if (numA !== numB) return numA - numB;
    return (a.room || "").localeCompare(b.room || "");
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{title}</h3>
        <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une chambre
        </Button>
      </div>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-500 w-16">Ch.</th>
            <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-500 w-48">Nom / Âge / Entrée</th>
            <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-500 w-36">Infos importantes</th>
            <th className="border border-slate-300 px-2 py-2 text-center text-xs font-semibold text-slate-500 w-24">Régime</th>
            <th className="border border-slate-300 px-2 py-2 text-center text-xs font-semibold text-slate-500 w-14">N° TA</th>
            <th className="border border-slate-300 px-2 py-2 text-center text-xs font-semibold text-slate-500 w-20">Autres</th>
            <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-500 w-32">Médecin</th>
            <th className="border border-slate-300 px-2 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <ResidentEditRow key={r.id} resident={r} taNumber={taMap[r.id]} onSave={onSave} onClearResident={onClearResident} onDeleteRoom={onDeleteRoom} doctors={doctors} />
          ))}
          {adding && (
            <AddRoomForm floor={floor} section={section} onAdd={(data) => { onAdd(data); setAdding(false); }} onCancel={() => setAdding(false)} />
          )}
        </tbody>
      </table>
    </div>
  );
}

function FloorInfoEditor({ floor }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: floorInfos = [] } = useQuery({
    queryKey: ["floorInfos"],
    queryFn: () => base44.entities.FloorInfo.list(),
  });

  const current = floorInfos.find((f) => f.floor === floor);
  const [form, setForm] = useState({ digicode_porte: "", digicode_entree: "", mot_de_passe_ordi: "" });

  useEffect(() => {
    if (current) setForm({ digicode_porte: current.digicode_porte || "", digicode_entree: current.digicode_entree || "", mot_de_passe_ordi: current.mot_de_passe_ordi || "" });
  }, [current?.id, floor]);

  const saveMutation = useMutation({
    mutationFn: (data) => current
      ? base44.entities.FloorInfo.update(current.id, data)
      : base44.entities.FloorInfo.create({ floor, ...data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["floorInfos"] }); setEditing(false); },
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <KeyRound className="h-4 w-4 text-slate-400" /> Codes d'accès — {floor}
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="gap-1 text-slate-500"><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Digicode porte</label>
            <Input value={form.digicode_porte} onChange={(e) => setForm({ ...form, digicode_porte: e.target.value })} className="h-8 text-sm w-36" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Digicode entrée</label>
            <Input value={form.digicode_entree} onChange={(e) => setForm({ ...form, digicode_entree: e.target.value })} className="h-8 text-sm w-36" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">MDP ordinateur</label>
            <Input value={form.mot_de_passe_ordi} onChange={(e) => setForm({ ...form, mot_de_passe_ordi: e.target.value })} className="h-8 text-sm w-36" />
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="gap-1" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Check className="h-3.5 w-3.5" /> Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>Digicode porte : <strong>{current?.digicode_porte || <span className="text-slate-400 italic">non renseigné</span>}</strong></span>
          <span>Digicode entrée : <strong>{current?.digicode_entree || <span className="text-slate-400 italic">non renseigné</span>}</strong></span>
          <span>MDP ordi : <strong>{current?.mot_de_passe_ordi || <span className="text-slate-400 italic">non renseigné</span>}</strong></span>
        </div>
      )}
    </div>
  );
}

function ArchiveDialog({ resident, onConfirm, onCancel }) {
  const [motif, setMotif] = useState("");
  if (!resident) return null;
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-500" />
            Archiver le dossier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-700">
            Le dossier de <strong>{resident.title} {resident.last_name} {resident.first_name}</strong> sera <span className="font-semibold text-orange-600">archivé</span> et la chambre sera libérée.
          </p>
          <p className="text-xs text-slate-500">L'historique (vaccinations, bilans…) sera conservé.</p>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Motif de sortie</label>
            <Select value={motif} onValueChange={setMotif}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner un motif…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Décès">Décès</SelectItem>
                <SelectItem value="Transfert">Transfert</SelectItem>
                <SelectItem value="Retour domicile">Retour domicile</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
          <Button size="sm" disabled={!motif} className="bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => onConfirm(motif)}>
            <Archive className="h-4 w-4" /> Archiver et vider la chambre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GestionResidents() {
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [doctorsEditing, setDoctorsEditing] = useState(false);
  const [doctorsForm, setDoctorsForm] = useState(["" ,"", "", "", ""]);
  const [doctorsColors, setDoctorsColors] = useState(["","","","",""]);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [activeFloor, setActiveFloor] = useState("RDC");
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
  });

  const { data: medecinConfigs = [] } = useQuery({
    queryKey: ["medecinConfig"],
    queryFn: () => base44.entities.MedecinConfig.list(),
  });
  const medecinConfig = medecinConfigs[0];
  const doctors = medecinConfig ? [medecinConfig.dr1, medecinConfig.dr2, medecinConfig.dr3, medecinConfig.dr4, medecinConfig.dr5].filter(Boolean) : [];

  const saveDoctorsMutation = useMutation({
    mutationFn: (data) => medecinConfig
      ? base44.entities.MedecinConfig.update(medecinConfig.id, data)
      : base44.entities.MedecinConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medecinConfig"] }); setDoctorsEditing(false); },
  });

  useEffect(() => {
    if (medecinConfig) {
      setDoctorsForm([medecinConfig.dr1 || "", medecinConfig.dr2 || "", medecinConfig.dr3 || "", medecinConfig.dr4 || "", medecinConfig.dr5 || ""]);
      setDoctorsColors([medecinConfig.dr1_color || "", medecinConfig.dr2_color || "", medecinConfig.dr3_color || "", medecinConfig.dr4_color || "", medecinConfig.dr5_color || ""]);
    }
  }, [medecinConfig?.id]);

  const { data: niveauSoinRecords = [] } = useQuery({
    queryKey: ["niveau_soin"],
    queryFn: () => base44.entities.NiveauSoin.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resident.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["residents"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resident.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["residents"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resident.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["residents"] }),
  });

  const handleSave = async (id, data) => {
    // Trouver l'ancien état appel_nuit
    const prev = residents.find((r) => r.id === id);
    await updateMutation.mutateAsync({ id, data });
    // Sync appel_nuit vers NiveauSoin si changé
    if (prev && prev.appel_nuit !== data.appel_nuit) {
      const nRec = niveauSoinRecords.find((n) => n.resident_id === id);
      if (nRec) {
        await base44.entities.NiveauSoin.update(nRec.id, { appel_nuit: data.appel_nuit });
        queryClient.invalidateQueries({ queryKey: ["niveau_soin"] });
      } else {
        const residentData = residents.find((r) => r.id === id);
        if (residentData) {
          await base44.entities.NiveauSoin.create({ resident_id: id, resident_name: `${residentData.last_name} ${residentData.first_name || ""}`.trim(), appel_nuit: data.appel_nuit });
          queryClient.invalidateQueries({ queryKey: ["niveau_soin"] });
        }
      }
    }
  };
  const handleAdd = (data) => createMutation.mutateAsync(data);

  const handleClearResident = (id) => {
    const resident = residents.find((r) => r.id === id);
    if (!resident || !resident.last_name) return;
    setArchiveTarget(resident);
  };

  const handleArchiveConfirm = async (motifLabel) => {
    const resident = archiveTarget;
    setArchiveTarget(null);
    const today = new Date().toISOString().slice(0, 10);
    await base44.entities.Resident.create({
      ...resident,
      id: undefined,
      archived: true,
      date_sortie: today,
      motif_sortie: motifLabel,
      room: resident.room + "_arch_" + Date.now(),
    });
    updateMutation.mutate({ id: resident.id, data: {
      last_name: "", first_name: "", title: "Mme", annotations: "", ta_number: null,
      date_naissance: "", date_entree: "", medecin: "",
      regime_mixe: false, viande_mixee: false, regime_diabetique: false,
      epargne_intestinale: false, allergie_poisson: false, traitement_ecrase: false,
      insuline_matin: false, insuline_soir: false, anticoagulants: false, appel_nuit: false,
      archived: false, date_sortie: "", motif_sortie: null,
    }});
  };

  const floorResidents = residents.filter((r) => r.floor === activeFloor);
  const mapad = floorResidents.filter((r) => r.section === "Mapad");
  const longSejour = floorResidents.filter((r) => r.section === "Long Séjour");

  const getTodayPassword = () => {
    const now = new Date();
    return String(now.getDate()).padStart(2, "0") + String(now.getMonth() + 1).padStart(2, "0");
  };

  const handleUnlock = () => {
    if (password === getTodayPassword()) {
      setUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-80">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Entrer mot de passe</h2>
          <input
            autoFocus
            type="password"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-slate-500 text-center tracking-widest"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="••••"
          />
          {passwordError && <p className="text-xs text-red-500 mb-2 text-center">Code incorrect</p>}
          <button
            onClick={handleUnlock}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Accéder
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-800">Gestion des Résidents</h1>
          <Tabs value={activeFloor} onValueChange={setActiveFloor}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="RDC">RDC</TabsTrigger>
              <TabsTrigger value="1ER">1er Étage</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-6 text-sm text-blue-700">
          ℹ️ Source commune pour toutes les feuilles : <strong>noms</strong>, <span className="text-red-600 font-semibold">infos importantes</span> (DNID, O2, allergies…) et <strong>codes d'accès</strong>. Les modifications ici sont répercutées sur toutes les feuilles.
        </div>

        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Stethoscope className="h-4 w-4 text-slate-400" /> Médecins traitants
            </div>
            {!doctorsEditing && (
              <Button size="sm" variant="ghost" onClick={() => setDoctorsEditing(true)} className="gap-1 text-slate-500"><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
            )}
          </div>
          {doctorsEditing ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-3 mb-3">
                {[0,1,2,3,4].map((i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Dr. {i+1}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={doctorsColors[i] || "#94a3b8"}
                        onChange={(e) => { const c=[...doctorsColors]; c[i]=e.target.value; setDoctorsColors(c); }}
                        className="h-8 w-8 rounded border border-slate-200 cursor-pointer p-0.5"
                        title="Couleur pastille"
                      />
                      <Input value={doctorsForm[i]} onChange={(e) => { const f=[...doctorsForm]; f[i]=e.target.value; setDoctorsForm(f); }} className="h-8 text-sm w-36" placeholder="Nom du médecin" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="gap-1" onClick={() => saveDoctorsMutation.mutate({ dr1: doctorsForm[0], dr2: doctorsForm[1], dr3: doctorsForm[2], dr4: doctorsForm[3], dr5: doctorsForm[4], dr1_color: doctorsColors[0], dr2_color: doctorsColors[1], dr3_color: doctorsColors[2], dr4_color: doctorsColors[3], dr5_color: doctorsColors[4] })} disabled={saveDoctorsMutation.isPending}>
                  <Check className="h-3.5 w-3.5" /> Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDoctorsEditing(false)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-3">
              {doctors.length === 0 ? <span className="text-sm text-slate-400 italic">Aucun médecin renseigné</span> : doctors.map((d, i) => {
                const color = medecinConfig?.[`dr${i+1}_color`];
                return (
                  <div key={d} className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded">
                    {color && <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />}
                    <span className="text-sm text-slate-700">{d}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <FloorInfoEditor floor={activeFloor} />

        {(() => {
          // Trier chaque section par numéro de chambre
          const sortByRoom = (arr) => [...arr].sort((a, b) => {
            const numA = parseInt(a.room) || 0;
            const numB = parseInt(b.room) || 0;
            if (numA !== numB) return numA - numB;
            return (a.room || "").localeCompare(b.room || "");
          });
          const sortedMapad = sortByRoom(mapad);
          const sortedLongSejour = sortByRoom(longSejour);
          // La numérotation TA est globale à l'étage (Mapad puis Long Séjour)
          // idx global = position dans la liste combinée
          const allSorted = [...sortedMapad, ...sortedLongSejour];
          const taMap = {};
          allSorted.forEach((r, idx) => { taMap[r.id] = Math.ceil((idx + 1) / 2); });

          return (
            <>
              <SectionTable title={`${activeFloor} — Mapad`} floor={activeFloor} section="Mapad" residents={mapad} taMap={taMap} onSave={handleSave} onAdd={handleAdd} onClearResident={handleClearResident} onDeleteRoom={() => {}} doctors={doctors} />
              <SectionTable title={`${activeFloor} — Long Séjour`} floor={activeFloor} section="Long Séjour" residents={longSejour} taMap={taMap} onSave={handleSave} onAdd={handleAdd} onClearResident={handleClearResident} onDeleteRoom={() => {}} doctors={doctors} />
            </>
          );
        })()}
      </div>
    </div>

    <ArchiveDialog
      resident={archiveTarget}
      onConfirm={handleArchiveConfirm}
      onCancel={() => setArchiveTarget(null)}
    />
    </>
  );
}
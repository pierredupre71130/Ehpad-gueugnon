import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Check, X, Trash2, UserMinus, Pill, Sun, Moon, Syringe, KeyRound, AlertTriangle } from "lucide-react";

function ResidentEditRow({ resident, taNumber, onSave, onClearResident, onDeleteRoom }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    room: resident.room || "",
    title: resident.title || "Mme",
    last_name: resident.last_name || "",
    first_name: resident.first_name || "",
    annotations: resident.annotations || "",
    regime_mixe: resident.regime_mixe || false,
    regime_diabetique: resident.regime_diabetique || false,
    epargne_intestinale: resident.epargne_intestinale || false,
    allergie_poisson: resident.allergie_poisson || false,
    traitement_ecrase: resident.traitement_ecrase || false,
    insuline_matin: resident.insuline_matin || false,
    insuline_soir: resident.insuline_soir || false,
    anticoagulants: resident.anticoagulants || false,
  });

  const handleSave = () => {
    onSave(resident.id, { ...form, sort_order: resident.sort_order });
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="border border-slate-300 px-2 py-1">
          <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="h-7 text-xs w-16" />
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
          </div>
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
            {resident.first_name && <div className="text-xs text-slate-500">{resident.first_name}</div>}
  
            </>
            ) : (
            <span className="text-xs text-slate-400 italic">Chambre vide</span>
            )}
      </td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs text-red-600 whitespace-pre-line max-w-xs">{resident.annotations}</td>
      <td className="border border-slate-300 px-2 py-1.5 text-xs">
        <div className="flex flex-col gap-0.5 items-start">
          {resident.regime_mixe && (
            <span className="px-1.5 py-0.5 rounded font-semibold bg-orange-100 text-orange-700">Mixé</span>
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
        </div>
      </td>
      <td className="border border-slate-300 px-2 py-1.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} title="Modifier"><Pencil className="h-3.5 w-3.5 text-slate-400" /></Button>
          {resident.last_name && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onClearResident(resident.id)} title="Vider la chambre"><UserMinus className="h-3.5 w-3.5 text-orange-400" /></Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDeleteRoom(resident.id)} title="Supprimer la chambre"><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
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

function SectionTable({ title, floor, section, residents, taMap = {}, onSave, onClearResident, onDeleteRoom, onAdd }) {
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
            <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-500 w-44">Nom</th>
            <th className="border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-500 w-36">Infos importantes</th>
            <th className="border border-slate-300 px-2 py-2 text-center text-xs font-semibold text-slate-500 w-24">Régime</th>
            <th className="border border-slate-300 px-2 py-2 text-center text-xs font-semibold text-slate-500 w-14">N° TA</th>
            <th className="border border-slate-300 px-2 py-2 text-center text-xs font-semibold text-slate-500 w-20">Traitement</th>
            <th className="border border-slate-300 px-2 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <ResidentEditRow key={r.id} resident={r} taNumber={taMap[r.id]} onSave={onSave} onClearResident={onClearResident} onDeleteRoom={onDeleteRoom} />
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

export default function GestionResidents() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [activeFloor, setActiveFloor] = useState("RDC");
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.list("-sort_order", 200),
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

  const handleSave = (id, data) => updateMutation.mutateAsync({ id, data });
  const handleAdd = (data) => createMutation.mutateAsync(data);

  // Vide le résident (nom, prénom, annotations) sans supprimer la chambre
  const handleClearResident = (id) => {
    if (confirm("Vider la chambre ? (le nom et les infos importantes seront effacés, la chambre restera dans la liste)")) {
      updateMutation.mutate({ id, data: { last_name: "", first_name: "", title: "Mme", annotations: "", ta_number: null } });
    }
  };

  // Supprime complètement la chambre (ligne)
  const handleDeleteRoom = (id) => {
    if (confirm("Supprimer complètement cette chambre ? Elle sera retirée de la liste.")) {
      deleteMutation.mutate(id);
    }
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
          <h2 className="text-lg font-bold text-slate-800 mb-1 text-center">Gestion des Résidents</h2>
          <p className="text-xs text-slate-400 text-center mb-6">Entrez le code du jour (jjmm) pour accéder</p>
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
              <SectionTable title={`${activeFloor} — Mapad`} floor={activeFloor} section="Mapad" residents={mapad} taMap={taMap} onSave={handleSave} onAdd={handleAdd} onClearResident={handleClearResident} onDeleteRoom={handleDeleteRoom} />
              <SectionTable title={`${activeFloor} — Long Séjour`} floor={activeFloor} section="Long Séjour" residents={longSejour} taMap={taMap} onSave={handleSave} onAdd={handleAdd} onClearResident={handleClearResident} onDeleteRoom={handleDeleteRoom} />
            </>
          );
        })()}
      </div>
    </div>
  );
}
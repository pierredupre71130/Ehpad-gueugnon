import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2, Eye, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function PVI() {
  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading: residentsLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const data = await base44.entities.Resident.list("-sort_order", 200);
      return [...data].sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    },
  });

  const { data: pvis = [], isLoading: pvisLoading } = useQuery({
    queryKey: ["pvis"],
    queryFn: () => base44.entities.PVI.list("-created_date", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (pviId) => base44.entities.PVI.delete(pviId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pvis"] });
    },
  });

  const handleFileUpload = async (e, residentId, residentName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setExtracting(true);
      let texte = "";
      
      const { status, output } = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            texte: { type: "string", description: "Tout le texte extrait du document" }
          }
        }
      });

      if (status === "success" && output?.texte) {
        texte = output.texte;
      }

      await base44.entities.PVI.create({
        resident_id: residentId,
        resident_name: residentName,
        file_url,
        file_name: file.name,
        texte_extrait: texte,
        date_upload: new Date().toISOString().split("T")[0],
      });

      queryClient.invalidateQueries({ queryKey: ["pvis"] });
      e.target.value = "";
    } catch (error) {
      console.error("Erreur upload:", error);
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const filteredPvis = pvis.filter(pvi => {
    const matchSearch = pvi.resident_name.toLowerCase().includes(search.toLowerCase()) ||
                        pvi.texte_extrait?.toLowerCase().includes(search.toLowerCase());
    const matchResident = !selectedResident || pvi.resident_id === selectedResident;
    return matchSearch && matchResident;
  });

  if (residentsLoading || pvisLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">PVI — Projets de Soins Individualisés</h1>
        <p className="text-slate-600 text-sm mb-6">Stockez et recherchez les documents PVI des résidents.</p>

        {/* Filtres */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase block mb-2">Rechercher</label>
              <Input
                placeholder="Nom du résident ou contenu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase block mb-2">Résident</label>
              <select
                value={selectedResident}
                onChange={(e) => setSelectedResident(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="">Tous les résidents</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.title} {r.last_name} ({r.room})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Upload section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-4">Ajouter un PVI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {residents.length === 0 ? (
              <div className="text-sm text-blue-700">Aucun résident trouvé</div>
            ) : (
              residents.map(resident => (
              <div key={resident.id} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{resident.title} {resident.last_name}</div>
                  <div className="text-xs text-slate-500">Chambre {resident.room}</div>
                </div>
                <label className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, resident.id, `${resident.title} ${resident.last_name}`)}
                    disabled={uploading || extracting}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading || extracting}
                    onClick={(e) => e.currentTarget.parentElement.querySelector("input").click()}
                    className="gap-2"
                  >
                    {uploading || extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload
                  </Button>
                </label>
              </div>
            ))
            )}
          </div>
        </div>

        {/* Liste des PVI */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-3">
            PVI Stockés ({filteredPvis.length})
          </h2>
          {filteredPvis.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
              Aucun PVI trouvé
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPvis.map(pvi => (
                <div key={pvi.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{pvi.resident_name}</div>
                      <div className="text-xs text-slate-500 mt-1">📄 {pvi.file_name}</div>
                      <div className="text-xs text-slate-400 mt-1">Uploadé le {new Date(pvi.date_upload).toLocaleDateString("fr-FR")}</div>
                      {pvi.texte_extrait && (
                        <div className="text-xs text-slate-600 mt-2 line-clamp-2">{pvi.texte_extrait}</div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{pvi.resident_name} — {pvi.file_name}</DialogTitle>
                          </DialogHeader>
                          {pvi.file_url.toLowerCase().endsWith(".pdf") ? (
                            <iframe
                              src={pvi.file_url}
                              className="w-full h-[600px] rounded"
                            />
                          ) : (
                            <img
                              src={pvi.file_url}
                              alt={pvi.file_name}
                              className="w-full h-auto rounded"
                            />
                          )}
                          {pvi.texte_extrait && (
                            <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200">
                              <div className="text-xs font-semibold text-slate-700 mb-2">Texte extrait :</div>
                              <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                {pvi.texte_extrait}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(pvi.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
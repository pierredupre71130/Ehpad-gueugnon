import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImagePlus, AlertTriangle, Check, X, Settings } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ImportKeywordConfig from "./ImportKeywordConfig";
import { normalize, levenshtein, parseNursingText, extractContentionGroups } from "@/lib/importParser";

const LS_KEY = "contention_keywords";

const DEFAULT_KEYWORDS = {
  lit: ["SANGLE VENTRALE"],
  fauteuil: ["CONTENTIONS FAUTEUIL"],
  "barrière gauche": ["barrière gauche"],
  "barrière droite": ["barrière droite"],
  "barrière x2": ["BARRIERES AU LIT", "BARRIÈRES AU LIT"],
  "chaussettes contention": ["CHAUSSETTES CONTENTION", "CHAUSSETTES DE CONTENTION", "POSE CHAUSSETTES", "ABLATION CHAUSSETTES"],
};

function loadKeywords() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_KEYWORDS;
  } catch { return DEFAULT_KEYWORDS; }
}

export default function ImportContentionFromImage({ open, onOpenChange, residents, onImport, floor }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [debugText, setDebugText] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [keywords, setKeywords] = useState(loadKeywords);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handlePaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (item) handleImageFile(item.getAsFile());
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open]);

  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setError("");
    setGroups([]);
    setDebugText("");
    setLoading(true);

    const previewBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    setImage(previewBase64);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Étape 1 : OCR texte brut
      const rawText = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: `Tu es un OCR. Retranscris TOUT le texte visible dans cette image, ligne par ligne, exactement comme tu le vois.
Ne fais aucune interprétation, ne résume pas, ne filtre pas. Copie tout le texte tel quel, y compris les noms de patients, les numéros de chambre, les soins, les dates.`,
        file_urls: [file_url],
      });

      if (!rawText || rawText.trim().length === 0) {
        setError("L'IA n'a pu extraire aucun texte de l'image.");
        setLoading(false);
        return;
      }

      // Étape 2 : Parser JS pur sur le texte brut
      const patientsFromLLM = parseNursingText(rawText);

      setDebugText(`=== TEXTE OCR BRUT ===\n${rawText}\n\n=== PATIENTS PARSÉS (${patientsFromLLM.length}) ===\n${JSON.stringify(patientsFromLLM, null, 2)}`);

      if (patientsFromLLM.length === 0) {
        setError("Aucun patient détecté dans l'image.");
        setLoading(false);
        return;
      }

      // Étape 3 : Matching mots-clés + résidents (logique partagée)
      const validGroups = extractContentionGroups(patientsFromLLM, residents, keywords, floor);

      if (validGroups.length === 0) {
        setError(`Aucune contention détectée parmi ${patientsFromLLM.length} patients lus. Vérifiez les mots-clés dans Configuration.`);
      } else {
        setGroups(validGroups);
        setError("");
      }
    } catch (err) {
      setError("Erreur lors de l'analyse : " + (err?.message || "Veuillez réessayer."));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    const toProcess = groups.filter(g => g.resident_id);
    if (toProcess.length === 0) {
      alert("Sélectionnez au moins un résident");
      return;
    }

    setLoading(true);
    try {
      const allExisting = await base44.entities.SuiviAntalgique.filter({ type_suivi: "contention" });

      for (const group of toProcess) {
        const resident = residents.find((r) => r.id === group.resident_id);
        if (!resident) continue;
        const residentName = `${resident.first_name || ""} ${resident.last_name || ""}`.trim();

        for (const c of group.contentions.filter(c => c.selected)) {
          const existing = allExisting.find(
            e => e.nom === residentName && e.traitement === c.type
          );

          if (existing) {
            // Même statut → doublon, on ignore
            if (!!existing.dotation_nominative === !!(c.si_besoin)) continue;
            // Statut différent (continu ↔ si besoin) → on met à jour
            await base44.entities.SuiviAntalgique.update(existing.id, {
              dotation_nominative: c.si_besoin || false,
              date_debut: c.date_prescription || existing.date_debut || "",
            });
          } else {
            await base44.entities.SuiviAntalgique.create({
              nom: residentName,
              chambre: resident.room || "",
              traitement: c.type,
              type_suivi: "contention",
              date_debut: c.date_prescription || "",
              date_fin: "",
              pas_de_fin: true,
              dotation_nominative: c.si_besoin || false,
              poso_matin: false,
              poso_midi: false,
              poso_soir: false,
              prescripteur: "",
            });
          }
        }
      }
      onImport();
      onOpenChange(false);
      setImage(null);
      setGroups([]);
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" /> Import depuis prescription (image)
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  localStorage.removeItem(LS_KEY);
                  const fresh = JSON.parse(JSON.stringify(DEFAULT_KEYWORDS));
                  setKeywords(fresh);
                  alert("Mots-clés réinitialisés !\nLit = SANGLE VENTRALE\nFauteuil = CONTENTIONS FAUTEUIL\nBarrière x2 = BARRIERES AU LIT");
                }}
                size="sm"
                variant="ghost"
                className="text-xs text-slate-500"
              >
                Réinitialiser
              </Button>
              <Button
                onClick={() => setShowConfig(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Settings className="h-4 w-4" /> Configuration
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ImportKeywordConfig
          open={showConfig}
          onOpenChange={setShowConfig}
          initialConfig={keywords}
          onSave={(newKw) => {
            setKeywords(newKw);
            localStorage.setItem(LS_KEY, JSON.stringify(newKw));
          }}
        />

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Charger une capture d'écran</Label>
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
              }}
            />
            {!image ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]);
                }}
                tabIndex={0}
                className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <ImagePlus className="h-10 w-10 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Glissez une image ou cliquez</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const items = await navigator.clipboard.read();
                        for (const item of items) {
                          const imgType = item.types.find(t => t.startsWith('image/'));
                          if (imgType) {
                            const blob = await item.getType(imgType);
                            handleImageFile(new File([blob], 'clipboard.png', { type: imgType }));
                            return;
                          }
                        }
                        setError("Aucune image dans le presse-papiers.");
                      } catch {
                        setError("Impossible de lire le presse-papiers. Essayez Ctrl+V.");
                      }
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    Coller depuis le presse-papiers
                  </button>
                  <span className="text-xs text-slate-400">ou <kbd className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono">Ctrl+V</kbd></span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-slate-200">
                <img src={image} alt="Prescription" className="w-full max-h-48 object-contain bg-slate-50" />
                <button
                  onClick={() => { setImage(null); setGroups([]); setError(""); setDebugText(""); }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm"
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-700">Analyse en cours...</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-3">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {debugText && (
            <details className="border border-slate-200 rounded p-2 bg-slate-50">
              <summary className="text-xs text-slate-500 cursor-pointer font-medium">🔍 Debug OCR — cliquer pour voir les lignes extraites</summary>
              <pre className="text-xs bg-white border border-slate-100 rounded p-2 mt-2 whitespace-pre-wrap max-h-60 overflow-y-auto">{debugText}</pre>
            </details>
          )}

          {groups.length > 0 && (
            <div className="space-y-4">
              {groups.map((group, gi) => (
                <div key={gi} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="mb-2">
                    <Label className="text-sm font-semibold block mb-1">
                      {group.patient_name ? `Patient : ${group.patient_name}` : `Groupe ${gi + 1}`}
                    </Label>
                    <select
                      value={group.resident_id}
                      onChange={(e) => {
                        const updated = [...groups];
                        updated[gi].resident_id = e.target.value;
                        setGroups(updated);
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="">— Sélectionner un résident —</option>
                      {residents
                        .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "", "fr"))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.last_name} {r.first_name || ""} — Ch. {r.room}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    {group.contentions.map((c, ci) => (
                      <label key={ci} className="flex items-start gap-3 p-2 border rounded bg-white hover:bg-slate-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={(e) => {
                            const updated = [...groups];
                            updated[gi].contentions[ci].selected = e.target.checked;
                            setGroups(updated);
                          }}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              {c.type}
                            </span>
                            {c.si_besoin && (
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">
                                Si besoin
              </span>
                            )}
                            {c.date_prescription && (
                              <span className="text-xs text-slate-600">depuis {c.date_prescription}</span>
                            )}
                          </div>
                          {c.matched_line && (
                            <p className="text-xs text-slate-400 mt-1 italic">« {c.matched_line} »</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {groups.length > 0 && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleConfirmImport}
              disabled={!groups.some(g => g.resident_id && g.contentions.some(c => c.selected)) || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Import...</>
              ) : (
                <><Check className="h-4 w-4" /> Valider l'import</>
              )}
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline">Annuler</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
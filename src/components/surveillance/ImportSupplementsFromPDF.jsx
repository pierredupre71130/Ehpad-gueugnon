import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileUp, AlertTriangle, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { normalize, levenshtein, extractTextFromPDF } from "@/lib/importParser";

// ─── Helpers suppléments dans annotations ─────────────────────────────────
const SUPPL_MARKER = '\n---SUPPL:';
function parseSupplFromAnnotations(annotations) {
  if (!annotations) return [];
  const idx = annotations.indexOf(SUPPL_MARKER);
  if (idx === -1) return [];
  try {
    const parsed = JSON.parse(annotations.slice(idx + SUPPL_MARKER.length));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function buildAnnotationsWithSuppl(annotations, supps) {
  const base = annotations ? annotations.split(SUPPL_MARKER)[0] : '';
  if (!supps || supps.length === 0) return base;
  return base + SUPPL_MARKER + JSON.stringify(supps);
}

const SUPPLEMENT_KEYWORDS = [
  "COMPLEMENT ALIMENTAIRE",
  "COMPLÉMENT ALIMENTAIRE",
  "FORTIMEL",
  "FORTEOCARE",
  "CLINUTREN",
  "CYRA'GENE",
  "CYRAGENE",
  "CEREAL NUT",
  "BLEDINE",
  "POUDRE DE PROTEINE",
  "POUDRE DE PROTEINES",
];

function normalizeDateFormat(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{2,4})/);
  if (!match) return null;
  let [, day, month, year] = match;
  if (year.length === 2) year = (parseInt(year, 10) > 50 ? "19" : "20") + year;
  return `${year}-${month}-${day}`;
}

function deduceFloor(roomStr) {
  const match = roomStr && roomStr.match(/[A-Za-z]*(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) >= 100 ? "1ER" : "RDC";
}

function findDateNearLine(lines, index) {
  const dateInLine = (lines[index] || "").match(/(\d{2}\/\d{2}\/\d{2,4})/);
  if (dateInLine) return normalizeDateFormat(dateInLine[1]);
  for (let j = Math.max(0, index - 5); j < index; j++) {
    const m = (lines[j] || "").match(/[Dd][ée]but\s+le\s+(\d{2}\/\d{2}\/\d{2,4})/)
           || (lines[j] || "").match(/(\d{2}\/\d{2}\/\d{2,4})/);
    if (m) return normalizeDateFormat(m[1]);
  }
  for (let j = index + 1; j < Math.min(lines.length, index + 6); j++) {
    const m = (lines[j] || "").match(/[Dd][ée]but\s+le\s+(\d{2}\/\d{2}\/\d{2,4})/)
           || (lines[j] || "").match(/(\d{2}\/\d{2}\/\d{2,4})/);
    if (m) return normalizeDateFormat(m[1]);
  }
  return null;
}

// Approche inverse : pour chaque mot-clé trouvé, on remonte pour trouver le patient
function extractSupplementGroups(rawText, residents, floor) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const patientRe = /^Patient\s*:\s*(.+)/i;
  const roomRe = /Chambre\s*:?\s*([A-Za-z]*\d+)/i;

  const found = {}; // key (nom normalisé) → { name, room, supplements: { type → {date, line} } }

  for (let i = 0; i < lines.length; i++) {
    const lineUpper = lines[i].toUpperCase();
    // Cherche aussi sur la jointure de 2 lignes consécutives (coupure possible)
    const lineJoined = i + 1 < lines.length
      ? (lines[i] + " " + lines[i + 1]).toUpperCase()
      : lineUpper;

    const matchedKw = SUPPLEMENT_KEYWORDS.find(kw => lineUpper.includes(kw) || lineJoined.includes(kw));
    if (!matchedKw) continue;

    // Remonter jusqu'à 150 lignes pour trouver le header "Patient :"
    let patientName = null;
    let patientRoom = null;

    for (let j = i - 1; j >= Math.max(0, i - 150); j--) {
      const pm = lines[j].match(patientRe);
      if (pm) {
        const raw = pm[1].trim();
        // Extraire chambre si elle est sur la même ligne
        const rm = raw.match(roomRe);
        if (rm) patientRoom = rm[1];
        // Nom = tout avant "Chambre" ou "Né(e)" ou fin de ligne
        patientName = raw
          .replace(/\s*(Chambre|Né\(e\)|N°\s*Dossier).*/i, "")
          .replace(/\s+/g, " ")
          .trim();
        break;
      }
      // Cherche le numéro de chambre en chemin (s'il est sur une ligne séparée)
      if (!patientRoom) {
        const rm = lines[j].match(roomRe);
        if (rm) patientRoom = rm[1];
      }
    }

    if (!patientName) continue;

    // Filtrer par étage dès maintenant si on connaît la chambre
    if (patientRoom && floor) {
      const roomFloor = deduceFloor(patientRoom);
      if (roomFloor && roomFloor !== floor) continue;
    }

    const key = normalize(patientName);
    if (!found[key]) found[key] = { name: patientName, room: patientRoom, supplements: {} };
    if (!found[key].room && patientRoom) found[key].room = patientRoom;

    // Enregistre ce supplément (dédupliquer par type)
    if (!found[key].supplements[matchedKw]) {
      found[key].supplements[matchedKw] = {
        type: matchedKw,
        date_start: findDateNearLine(lines, i),
        matched_line: lines[i],
        selected: true,
      };
    }
  }

  // Filtrer par étage les patients dont on a la chambre
  // (ceux sans chambre connue passent — ils sont affichés mais sans auto-match)
  const groups = [];
  for (const data of Object.values(found)) {
    if (data.room && floor) {
      const roomFloor = deduceFloor(data.room);
      if (roomFloor && roomFloor !== floor) continue;
    }

    const supplements = Object.values(data.supplements);
    if (supplements.length === 0) continue;

    // Fuzzy match résident
    const pKey = normalize(data.name);
    const pParts = pKey.split(/\s+/).filter(w => w.length > 2);
    let residentId = "";
    if (pParts.length > 0) {
      const floorResidents = floor ? residents.filter(r => r.floor === floor) : residents;
      const matched = floorResidents.find(r => {
        const ln = normalize(r.last_name || "");
        const fn = normalize(r.first_name || "");
        const lnMatch = pParts.some(part => ln === part || (ln.length > 3 && levenshtein(ln, part) <= 1));
        const fnMatch = !fn || pParts.some(part => fn === part || (fn.length > 3 && levenshtein(fn, part) <= 1));
        return lnMatch && (fnMatch || pParts.length === 1);
      });
      if (matched) residentId = matched.id;
    }

    groups.push({
      patient_name: data.name,
      resident_id: residentId,
      supplements,
    });
  }

  return groups.sort((a, b) => (a.patient_name || "").localeCompare(b.patient_name || "", "fr"));
}

export default function ImportSupplementsFromPDF({ open, onOpenChange, residents, onImport, floor }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [debugText, setDebugText] = useState("");
  const fileRef = useRef(null);

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile || !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError("Veuillez sélectionner un fichier PDF.");
      return;
    }

    setError("");
    setGroups([]);
    setDebugText("");
    setFile(selectedFile);
    setLoading(true);

    try {
      const extractedText = await extractTextFromPDF(selectedFile);

      if (!extractedText || extractedText.trim().length === 0) {
        setError("Aucun texte n'a pu être extrait du PDF.");
        setLoading(false);
        return;
      }

      const detectedGroups = extractSupplementGroups(extractedText, residents, floor);

      // Debug : compter les occurrences de mots-clés dans le texte brut
      const kwCounts = SUPPLEMENT_KEYWORDS.map(kw => {
        const count = (extractedText.toUpperCase().split(kw).length - 1);
        return count > 0 ? `${kw}: ${count}` : null;
      }).filter(Boolean);
      setDebugText("Mots-clés trouvés dans le PDF :\n" + (kwCounts.join("\n") || "aucun") +
                   "\n\nPatients détectés : " + detectedGroups.length);

      if (detectedGroups.length === 0) {
        setError("Aucun complément alimentaire détecté pour l'étage " + floor + ".");
      } else {
        setGroups(detectedGroups);
        setError("");
      }
    } catch (err) {
      setError("Erreur lors de l'analyse du PDF : " + (err?.message || "Veuillez réessayer."));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    const toProcess = groups.filter(g => g.resident_id && g.supplements.some(s => s.selected));
    if (toProcess.length === 0) {
      alert("Sélectionnez au moins un résident");
      return;
    }

    setLoading(true);
    try {
      const updates = [];

      for (const group of toProcess) {
        const resident = residents.find(r => r.id === group.resident_id);
        if (!resident) continue;

        const selectedSupps = group.supplements.filter(s => s.selected);
        const today = new Date().toISOString().split('T')[0];

        // Lire les suppléments existants depuis annotations
        const existingSupps = parseSupplFromAnnotations(resident.annotations);
        const existingTypes = new Set(existingSupps.map(s => s.type));

        // Fusionner sans doublons
        for (const sup of selectedSupps) {
          if (!existingTypes.has(sup.type)) {
            existingSupps.push({ type: sup.type, date_debut: sup.date_start || today });
            existingTypes.add(sup.type);
          }
        }

        // Construire la nouvelle valeur d'annotations
        const newAnnotations = buildAnnotationsWithSuppl(resident.annotations, existingSupps);

        // Sauvegarder dans le champ annotations (champ original — persiste en base)
        await base44.entities.Resident.update(resident.id, { annotations: newAnnotations });

        updates.push({ id: resident.id, annotations: newAnnotations });
      }

      onImport(updates);
      onOpenChange(false);
      setFile(null);
      setGroups([]);
      setDebugText("");
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> Importer des compléments alimentaires depuis un PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Charger un fichier PDF</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            {!file ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                tabIndex={0}
                className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <FileUp className="h-10 w-10 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Glissez un PDF ou cliquez</p>
                <p className="text-xs text-slate-400 mt-1">Fichier PDF des prescriptions EHPAD (toutes tailles acceptées)</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <button onClick={() => { setFile(null); setGroups([]); setError(""); setDebugText(""); }} className="p-1 rounded hover:bg-slate-200">
                  <X className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <p className="text-sm text-blue-700">Analyse du PDF en cours… (peut prendre quelques secondes)</p>
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
              <summary className="text-xs text-slate-500 cursor-pointer font-medium">🔍 Debug</summary>
              <pre className="text-xs bg-white border border-slate-100 rounded p-2 mt-2 whitespace-pre-wrap max-h-60 overflow-y-auto">{debugText}</pre>
            </details>
          )}

          {groups.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                {groups.length} patient{groups.length > 1 ? "s" : ""} avec complément{groups.length > 1 ? "s" : ""} — étage {floor}
              </p>
              {groups.map((group, gi) => (
                <div key={gi} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="mb-3">
                    <Label className="text-sm font-semibold block mb-1">
                      Patient : {group.patient_name}
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
                        .filter(r => r.floor === floor)
                        .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "", "fr"))
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.last_name} {r.first_name || ""} — Ch. {r.room}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    {group.supplements.map((sup, si) => (
                      <label key={si} className="flex items-start gap-3 p-2 border rounded bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sup.selected}
                          onChange={(e) => {
                            const updated = [...groups];
                            updated[gi].supplements[si].selected = e.target.checked;
                            setGroups(updated);
                          }}
                          className="w-4 h-4 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {sup.type}
                            </span>
                            {sup.date_start && (
                              <span className="text-xs text-slate-500">depuis {sup.date_start}</span>
                            )}
                          </div>
                          {sup.matched_line && (
                            <p className="text-xs text-slate-400 mt-0.5 italic truncate">« {sup.matched_line} »</p>
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
              disabled={!groups.some(g => g.resident_id && g.supplements.some(s => s.selected)) || loading}
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

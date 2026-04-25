import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ImagePlus, ScanLine, X, Check, AlertTriangle } from "lucide-react";

// Valide et corrige une date YYYY-MM-DD extraite par le LLM
function validateAndFixDate(dateStr, dateBrute) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  let [yyyy, mm, dd] = parts.map(Number);

  // Si le modèle a inversé JJ et MM (MM > 12 mais DD ≤ 12)
  if (mm > 12 && dd <= 12) {
    [mm, dd] = [dd, mm];
  }

  // Si on a la date brute JJ/MM/AAAA, on peut vérifier avec elle
  if (dateBrute) {
    const bruteParts = dateBrute.split('/');
    if (bruteParts.length === 3) {
      const bruteJJ = parseInt(bruteParts[0]);
      const bruteMM = parseInt(bruteParts[1]);
      const bruteAAAA = parseInt(bruteParts[2]);
      if (!isNaN(bruteJJ) && !isNaN(bruteMM) && !isNaN(bruteAAAA) && bruteMM <= 12) {
        // Utiliser directement la date brute comme référence fiable
        yyyy = bruteAAAA;
        mm = bruteMM;
        dd = bruteJJ;
      }
    }
  }

  // Validation finale
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  if (yyyy < 2000 || yyyy > 2030) return null;

  const fixed = `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  const d = new Date(fixed);
  if (isNaN(d.getTime())) return null;
  return fixed;
}

const OCR_PROMPT = [
  'Cette image est un tableau du logiciel NetSoins/BIOMETRIE.',
  '',
  'RÈGLE ABSOLUE : traite chaque colonne INDÉPENDAMMENT. La date et le poids d\'une même colonne sont dans la même colonne verticale. Ne jamais associer la date d\'une colonne avec le poids d\'une autre colonne.',
  '',
  'STRUCTURE DU TABLEAU :',
  '- Ligne 1 : "Matin" ou "Après-midi" (ignorer)',
  '- Ligne 2 : EN-TÊTES avec les dates au format "JJ/MM/AAAA HH:MM" (ignorer l\'heure)',
  '- Colonne de gauche "Libellé" : noms des mesures',
  '- La ligne qui nous intéresse : libellé "Poids - Poids (kg)"',
  '',
  'PROCÉDURE colonne par colonne (de gauche à droite) :',
  '  1. Lis la date en haut de cette colonne (format JJ/MM/AAAA).',
  '  2. Dans CETTE MÊME colonne, lis la cellule de la ligne "Poids - Poids (kg)".',
  '  3. Si cette cellule est VIDE, contient "-", "N/A" ou du texte non numérique → IGNORER cette colonne ENTIÈREMENT. Ne pas produire d\'entrée.',
  '  4. Si elle contient un nombre → c\'est le poids. Le paire (date, poids) est valide.',
  '',
  'RÈGLE DATES — format JJ/MM/AAAA français :',
  '  - 1er nombre = JOUR (01-31)',
  '  - 2ème nombre = MOIS (01-12)',
  '  - 3ème nombre = ANNÉE',
  '  - Ne JAMAIS inverser jour et mois.',
  'Conversion JJ/MM/AAAA → YYYY-MM-DD :',
  '  02/03/2026 → 2026-03-02 | 13/08/2025 → 2025-08-13 | 07/07/2025 → 2025-07-07',
  '',
  'Réponds UNIQUEMENT avec ce JSON, sans markdown :',
  '{"weights": [{"date_brute": "JJ/MM/AAAA", "date": "YYYY-MM-DD", "weight": 77.8}]}',
  '',
  'Si aucune colonne n\'a de poids valide : {"weights": []}'
].join('\n');

export default function ImportWeightFromImage({ residents, selectedFloor, weights, onConfirm, onClose }) {
  const [importImage, setImportImage] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState([]);
  const [importResidentId, setImportResidentId] = useState('');
  const [importError, setImportError] = useState('');
  const importFileRef = useRef(null);

  const applyDuplicateCheck = (residentId, results) => {
    if (!residentId || results.length === 0) return results;
    const existingDates = new Set(
      weights.filter(w => w.resident_id === residentId).map(w => w.weighing_date)
    );
    return results.map(r => ({
      ...r,
      isDuplicate: existingDates.has(r.date),
      selected: !existingDates.has(r.date),
    }));
  };

  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImportError('');
    setImportResults([]);
    setImportLoading(true);
    const previewBase64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    setImportImage(previewBase64);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const rawResponse = await base44.integrations.Core.InvokeLLM({
        prompt: OCR_PROMPT,
        file_urls: [file_url],
        model: "claude_sonnet_4_6",
      });
      let extracted = [];
      try {
        const jsonMatch = String(rawResponse).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          extracted = parsed.weights || [];
        }
      } catch {
        setImportError('Réponse brute du modèle : ' + String(rawResponse).substring(0, 500));
        setImportLoading(false);
        return;
      }

      if (extracted.length === 0) {
        setImportError("Aucun poids trouvé dans l'image. Vérifiez que la capture montre bien un tableau de biométrie avec une ligne de poids.");
      } else {
        // Validation et correction des dates + dédoublonnage
        const seen = new Set();
        const validated = extracted.map(e => {
          const fixedDate = validateAndFixDate(e.date, e.date_brute);
          if (!fixedDate) return null;
          if (seen.has(fixedDate)) return null;
          seen.add(fixedDate);
          return { date: fixedDate, date_brute: e.date_brute, weight: e.weight, selected: true, isDuplicate: false };
        }).filter(Boolean);

        if (validated.length === 0) {
          setImportError("Aucune date valide trouvée. Veuillez réessayer avec une image plus nette.");
        } else {
          setImportResults(validated);
        }
      }
    } catch (err) {
      setImportError("Erreur lors de l'analyse de l'image : " + (err?.message || "Veuillez réessayer."));
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportResidentChange = (residentId) => {
    setImportResidentId(residentId);
    setImportResults(prev => applyDuplicateCheck(residentId, prev));
  };

  const handleConfirmImport = () => {
    const toImport = importResults.filter(r => r.selected && !r.isDuplicate);
    if (!importResidentId || toImport.length === 0) return;
    onConfirm(importResidentId, toImport);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl"
          onPaste={e => { const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/')); if (item) handleImageFile(item.getAsFile()); }}
        >
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-white" />
            <h2 className="text-white font-bold text-base">Import depuis image</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <input ref={importFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }} />
            {!importImage ? (
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                onClick={() => importFileRef.current?.click()}
                onPaste={e => { const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/')); if (item) handleImageFile(item.getAsFile()); }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f); }}
                tabIndex={0}
              >
                <ImagePlus className="h-10 w-10 text-blue-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Glissez une capture d'écran ici ou cliquez pour sélectionner</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP acceptés</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button onClick={async (e) => {
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
                      setImportError("Aucune image dans le presse-papiers. Faites d'abord Impr écran.");
                    } catch {
                      setImportError("Impossible de lire le presse-papiers. Essayez de coller (Ctrl+V) dans la zone ci-dessus, ou sélectionnez un fichier.");
                    }
                  }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                    <ScanLine className="h-4 w-4" /> Coller depuis le presse-papiers
                  </button>
                  <span className="text-xs text-slate-400">ou <kbd className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono">Ctrl+V</kbd> dans la zone</span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={importImage} alt="Capture importée" className="w-full max-h-48 object-contain bg-slate-50" />
                <button onClick={() => { setImportImage(null); setImportResults([]); setImportError(''); }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm text-slate-500 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {importLoading && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-blue-700 font-medium">Analyse de l'image en cours…</p>
            </div>
          )}
          {importError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}
          {importResults.length > 0 && (
            <div>
              <div className="mb-4">
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Résident concerné</label>
                <select value={importResidentId} onChange={e => handleImportResidentChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                  <option value="">— Sélectionner un résident —</option>
                  {[...residents].filter(r => r.floor === selectedFloor).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'fr'))
                    .map(r => <option key={r.id} value={r.id}>{r.last_name} {r.first_name || ''} — Ch. {r.room}</option>)}
                </select>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {importResults.length} pesée{importResults.length > 1 ? 's' : ''} détectée{importResults.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {importResults.map((row, idx) => (
                  <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                    row.isDuplicate ? 'bg-orange-50 border-orange-200 opacity-60' : row.selected ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {!row.isDuplicate ? (
                        <input type="checkbox" checked={row.selected}
                          onChange={e => setImportResults(prev => prev.map((r, i) => i === idx ? { ...r, selected: e.target.checked } : r))}
                          className="w-4 h-4 accent-blue-600 cursor-pointer" />
                      ) : <span className="w-4 h-4 flex items-center justify-center"><X className="h-3.5 w-3.5 text-orange-400" /></span>}
                      <span className="font-medium text-slate-700">{new Date(row.date + 'T12:00:00').toLocaleDateString('fr-FR')}</span>
                      <span className="font-bold text-slate-800">{row.weight} kg</span>
                      {row.date_brute && <span className="text-xs text-slate-400 italic">({row.date_brute})</span>}
                    </div>
                    {row.isDuplicate && <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">DOUBLON</span>}
                    {!row.isDuplicate && row.selected && <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">À importer</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Annuler</button>
          {importResults.length > 0 && (
            <button onClick={handleConfirmImport}
              disabled={!importResidentId || importResults.filter(r => r.selected && !r.isDuplicate).length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Check className="h-4 w-4" />
              Importer {importResults.filter(r => r.selected && !r.isDuplicate).length} pesée{importResults.filter(r => r.selected && !r.isDuplicate).length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
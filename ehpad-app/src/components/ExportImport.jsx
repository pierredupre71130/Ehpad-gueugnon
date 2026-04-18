import { useState, useRef } from "react";
import { Download, Upload, X } from "lucide-react";

const EHPAD_KEYS = [
  'ehpad_residents',
  'ehpad_floor_info',
  'ehpad_consignes_nuit',
  'ehpad_etiquette_sel',
  'ehpad_fiches_poste',
  'ehpad_pap',
  'ehpad_pap_versions',
  'ehpad_pvi',
  'ehpad_suivi_antalgiques',
  'home_layout_v2',
  'consignes_printScale_v2',
  'consignes_rowHeight',
  'consignes_fontSize',
  'consignes_spacingRDC',
  'consignes_spacing1ER',
  'nuit_printScale',
  'nuit_rowHeight',
  'nuit_fontSize',
  'nuit_spacingRDC',
  'nuit_spacing1ER',
];

export default function ExportImport() {
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const fileRef = useRef(null);

  const handleExport = () => {
    const data = {};
    EHPAD_KEYS.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = v;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `ehpad-sauvegarde-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Format invalide');
        Object.entries(data).forEach(([k, v]) => {
          if (typeof v === 'string') localStorage.setItem(k, v);
        });
        setImportSuccess(true);
        setImportError("");
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportError("Fichier invalide : " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-colors"
        title="Exporter toutes les données en JSON"
      >
        <Download className="h-3.5 w-3.5" />
        Exporter
      </button>

      <div className="relative">
        <button
          onClick={() => { setShowImport(!showImport); setImportError(""); setImportSuccess(false); }}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-colors"
          title="Importer une sauvegarde JSON"
        >
          <Upload className="h-3.5 w-3.5" />
          Importer
        </button>

        {showImport && (
          <div className="absolute bottom-10 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-72">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">Importer une sauvegarde</p>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Sélectionnez un fichier <code>.json</code> exporté depuis cette application. <strong>Les données actuelles seront remplacées.</strong>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
            >
              Choisir un fichier…
            </button>
            {importError && <p className="text-xs text-red-600 mt-2">{importError}</p>}
            {importSuccess && <p className="text-xs text-green-600 mt-2">Import réussi — rechargement…</p>}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AdminPasswordGate from "@/components/AdminPasswordGate";
import { Save, RotateCcw, Loader2, Crosshair, XCircle } from "lucide-react";

const DEFAULTS = {
  nom_x: 116, nom_y_from_top: 34,
  prenom_x: 116, prenom_y_from_top: 47,
  prescripteur_x: 305, prescripteur_y_from_top: 34,
  jour_x: 528, jour_y_from_top: 50,
  mois_x: 553, mois_y_from_top: 50,
  annee_x: 575, annee_y_from_top: 50,
  check_x_offset: 37, check_y_offset: 57,
  nfs_y_extra: -11,
  nb_echantillons_x: 583, nb_echantillons_y_from_top: 64,
  presc_jour_x: 528, presc_jour_y_from_top: 50,
  presc_mois_x: 553, presc_mois_y_from_top: 50,
  presc_annee_x: 575, presc_annee_y_from_top: 50,
  ajeun_x: 100, ajeun_y_from_top: 100,
  poids_x: 100, poids_y_from_top: 120,
};

const SECTIONS = [
  { label: "Nom du patient",                  xKey: "nom_x",             yKey: "nom_y_from_top" },
  { label: "Prénom du patient",               xKey: "prenom_x",          yKey: "prenom_y_from_top" },
  { label: "Prescripteur",                    xKey: "prescripteur_x",    yKey: "prescripteur_y_from_top" },
  { label: "Date prélèvement — Jour",         xKey: "jour_x",            yKey: "jour_y_from_top" },
  { label: "Date prélèvement — Mois",         xKey: "mois_x",            yKey: "mois_y_from_top" },
  { label: "Date prélèvement — Année",        xKey: "annee_x",           yKey: "annee_y_from_top" },
  { label: "Date prescription — Jour",        xKey: "presc_jour_x",      yKey: "presc_jour_y_from_top" },
  { label: "Date prescription — Mois",        xKey: "presc_mois_x",      yKey: "presc_mois_y_from_top" },
  { label: "Date prescription — Année",       xKey: "presc_annee_x",     yKey: "presc_annee_y_from_top" },
  { label: "Patient à jeun (croix)",           xKey: "ajeun_x",           yKey: "ajeun_y_from_top" },
  { label: "Poids du patient",                 xKey: "poids_x",           yKey: "poids_y_from_top" },
  { label: "Cases à cocher (offset)",         xKey: "check_x_offset",    yKey: "check_y_offset" },
  { label: "Nombre d'échantillons",           xKey: "nb_echantillons_x", yKey: "nb_echantillons_y_from_top" },
];

function NumericInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(value - 1)} className="w-7 h-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm flex items-center justify-center">−</button>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-20 text-center border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-slate-400" />
      <button onClick={() => onChange(value + 1)} className="w-7 h-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm flex items-center justify-center">+</button>
    </div>
  );
}

export default function PDFCalibration() {
  const [values, setValues] = useState(DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [clickTarget, setClickTarget] = useState(null);
  const canvasRef = useRef(null);
  const naturalSizeRef = useRef(null);

  useEffect(() => {
    base44.entities.PDFCalibration.list().then(records => {
      if (records.length > 0) {
        const rec = records[0];
        setRecordId(rec.id);
        const merged = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS)) {
          if (rec[key] !== undefined && rec[key] !== null) merged[key] = rec[key];
        }
        setValues(merged);
      }
    });
  }, []);

  useEffect(() => {
    if (!pdfUrl || !canvasRef.current) return;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const bytes = Uint8Array.from(atob(pdfUrl.split(',')[1]), c => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        const vp0 = page.getViewport({ scale: 1 });
        naturalSizeRef.current = { width: vp0.width, height: vp0.height };
        const canvas = canvasRef.current;
        const containerWidth = canvas.parentElement?.clientWidth || 400;
        const dpr = window.devicePixelRatio || 1;
        const displayScale = Math.min(containerWidth / vp0.width, 600 / vp0.height);
        const vp = page.getViewport({ scale: displayScale * dpr });
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.width = (vp0.width * displayScale) + 'px';
        canvas.style.height = (vp0.height * displayScale) + 'px';
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      } catch (err) {
        console.error('Erreur PDF.js:', err);
      }
    })();
  }, [pdfUrl]);

  const handleChange = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const handleCanvasClick = (e) => {
    if (!clickTarget || !canvasRef.current || !naturalSizeRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (cssX < 0 || cssX > rect.width || cssY < 0 || cssY > rect.height) return;
    const { width: W, height: H } = naturalSizeRef.current;
    const pdfX = Math.round(cssX / rect.width * W);
    const pdfY = Math.round(cssY / rect.height * H);
    handleChange(clickTarget.xKey, pdfX);
    handleChange(clickTarget.yKey, pdfY);
    setClickTarget(null);
  };

  const handleSave = async () => {
    setSaving(true);
    if (recordId) {
      await base44.entities.PDFCalibration.update(recordId, values);
    } else {
      const rec = await base44.entities.PDFCalibration.create(values);
      setRecordId(rec.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm("Remettre tous les réglages aux valeurs par défaut ?")) setValues(DEFAULTS);
  };

  const generatePreview = async () => {
    setPdfLoading(true);
    try {
      const res = await base44.functions.invoke('generateBilanPDF', {
        patientName: "DUPONT", prenom: "Jean", dateNaissance: "01/01/1950",
        prescripteur: "Dr Martin", datePrescription: "06/04/2026",
        datePrescriptionOrdonnance: "01/04/2026",
        aJeun: true,
        poids: 72.5,
        examens: ["NFS", "Glycémie", "Créatinine", "SGOT", "NT-pro-BNP", "TP/INR", "Hépatite B Ag HBs", "PSA"],
        nbEchantillons: 1, calibration: values,
      });
      const base64 = res.data?.pdf_base64;
      if (base64) setPdfUrl(`data:application/pdf;base64,${base64}`);
    } catch (err) {
      console.error(err);
    }
    setPdfLoading(false);
  };

  useEffect(() => {
    if (!recordId) return;
    const t = setTimeout(async () => {
      try {
        await base44.entities.PDFCalibration.update(recordId, values);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) { console.error('Auto-save failed:', err); }
    }, 1500);
    return () => clearTimeout(t);
  }, [values, recordId]);

  useEffect(() => {
    const t = setTimeout(() => generatePreview(), 500);
    return () => clearTimeout(t);
  }, [values]);

  return (
    <AdminPasswordGate>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Calibration PDF Bilan</h1>
            <p className="text-sm text-slate-500 mt-1">Cliquez "Positionner" puis cliquez directement sur le PDF.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Défauts
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Sauvegarde..." : saved ? "Sauvegardé ✓" : "Sauvegarder"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            {SECTIONS.map(({ label, xKey, yKey }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h2 className="font-semibold text-slate-700 text-sm">{label}</h2>
                  {clickTarget?.label === label ? (
                    <Button size="sm" variant="destructive" onClick={() => setClickTarget(null)} className="gap-1 h-7 text-xs">
                      <XCircle className="h-3 w-3" /> Annuler
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setClickTarget({ xKey, yKey, label })} className="gap-1 h-7 text-xs">
                      <Crosshair className="h-3 w-3" /> Positionner
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-700">Position X</p>
                    <NumericInput value={values[xKey]} onChange={val => handleChange(xKey, val)} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-700">Position Y (depuis le haut)</p>
                    <NumericInput value={values[yKey]} onChange={val => handleChange(yKey, val)} />
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <h2 className="font-semibold text-slate-700 text-sm mb-3 border-b border-slate-100 pb-2">NFS — Décalage Y supplémentaire</h2>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400">Négatif = vers le haut</p>
                <NumericInput value={values.nfs_y_extra} onChange={val => handleChange('nfs_y_extra', val)} />
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">1 pt ≈ 0,35 mm · 3 pts ≈ 1 mm</p>
          </div>

          <div className="col-span-2">
            <div className="bg-white border border-slate-100 rounded-xl p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {clickTarget ? `→ Positionner : ${clickTarget.label}` : "Aperçu PDF"}
              </h3>
              <div
                onClick={handleCanvasClick}
                className="relative w-full bg-slate-100 rounded border border-slate-200 flex items-center justify-center"
                style={{ minHeight: 400, cursor: clickTarget ? 'crosshair' : 'default' }}
              >
                <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
                {pdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 rounded">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                )}
                {clickTarget && !pdfLoading && (
                  <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium">
                      Cliquez sur le PDF pour positionner
                    </div>
                  </div>
                )}
                {!pdfUrl && !pdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Chargement...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AdminPasswordGate>
  );
}
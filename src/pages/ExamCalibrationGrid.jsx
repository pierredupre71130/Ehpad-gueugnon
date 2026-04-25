import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AdminPasswordGate from "@/components/AdminPasswordGate";
import { Save, RotateCcw, Plus, Trash2, Loader2, Crosshair, XCircle } from "lucide-react";

const DEFAULT_COORDS = {
  "BHCG": [18, 649], "NT-pro-BNP": [18, 636],
  "Troponine": [120, 636], "Phosphatases alcalines": [120, 623],
  "Iono complet": [18, 623], "CPK": [200, 623],
  "Urée": [18, 610], "LDH": [120, 610], "Créatinine": [18, 597], "Calcium": [120, 597],
  "Iono simple": [18, 584], "Calcium corrigé": [120, 584], "Potassium": [18, 571],
  "Phosphore": [120, 571], "Réserve alcaline": [18, 558], "EAL": [120, 558],
  "Cholestérol": [120, 545], "Protéines totales": [18, 545], "Glycémie": [18, 532],
  "Triglycérides": [120, 532], "Acide urique": [18, 519], "Ferritine": [120, 519],
  "Lipase": [18, 506], "Amylase": [70, 506], "Bilirubine": [18, 493],
  "Coef. transferrine": [120, 493], "SGOT": [18, 480], "Transferrine": [120, 480],
  "SGPT": [70, 480], "Gamma GT": [200, 480], "Magnésium": [120, 467], "T4L": [18, 467], "T3L": [50, 467],
  "TSH": [82, 467], "T.S.H": [82, 467], "Albumine": [18, 454], "CRP": [120, 454],
  "IgG": [18, 441], "Alcoolémie": [120, 441], "Haptoglobine": [18, 428],
  "Procalcitonine": [120, 428], "Préalbumine": [200, 428],
  "NFS": [18, 369], "Numération formule": [18, 369], "Plaquettes": [18, 367],
  "Réticulocytes": [120, 380], "Vitesse de sédimentation": [120, 367], "VS": [120, 367],
  "Groupe sanguin": [18, 407], "Coombs direct": [120, 407], "RAI": [120, 394],
  "HbA1c": [18, 347], "Hémoglobine glyquée": [18, 347], "HBA1C": [18, 347],
  "Glycémie à jeun": [18, 312], "Cycle glycémique": [140, 299],
  "TP/INR": [18, 246], "INR": [18, 246], "TCK": [18, 233], "Fibrinogène": [120, 246],
  "D-dimères": [120, 233], "Anti Xa": [18, 220], "PDF": [120, 220], "TCA": [18, 207],
  "Electrophorèse protéines": [310, 649], "Immunoélectrophorèse": [310, 636],
  "Calcium ionisé": [310, 623], "Vitamine B12": [390, 623], "Folates": [470, 623],
  "Vitamine B9": [470, 623], "CDT": [310, 610], "Béta2microglobuline": [390, 610],
  "Vitamine D": [310, 597], "Hépatite A IgG": [310, 558], "BW": [450, 558],
  "Syphilis": [450, 558], "Hépatite A IgM": [310, 545], "Borréliose": [450, 545],
  "Hépatite B Ag HBs": [310, 532], "EBV": [450, 532], "Hépatite B Ac anti HBs": [310, 519],
  "HIV": [450, 519], "Hépatite B Ac anti HBc": [310, 506], "Toxoplasmose": [450, 506],
  "Hépatite C": [310, 493], "CMV": [450, 493], "Hépatite E": [310, 480],
  "Rubéole": [450, 480], "Facteurs rhumatoïdes": [310, 467], "Ac anti-CCP": [450, 467],
  "Prolactine": [310, 432], "Cortisol": [390, 432], "Oestradiol": [450, 432],
  "Parathormone": [310, 419], "PTH": [310, 419], "Progestérone": [390, 419],
  "FSH": [310, 406], "LH": [390, 406], "Testostérone": [310, 393], "AMH": [390, 393],
  "ACE": [310, 362], "CA 15-3": [390, 362], "AFP": [450, 362], "CA 125": [310, 349],
  "CA 19-9": [390, 349], "PSA": [450, 349], "PSA libre": [490, 349],
  "Lithium": [310, 312], "Digoxine": [310, 299], "Paracétamol": [390, 299],
  "Vancomycine": [450, 299], "Gentamicine": [310, 286], "Amikacine": [390, 286],
  "Phénobarbitalémie": [310, 273],
  "β-HCG": [18, 649], "Ionogramme": [18, 623], "PAL": [120, 623],
};

function NumericInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => onChange(value - 1)} className="w-6 h-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs flex items-center justify-center font-bold">−</button>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-14 text-center border border-slate-200 rounded px-1.5 py-0.5 text-xs outline-none focus:border-slate-400" />
      <button onClick={() => onChange(value + 1)} className="w-6 h-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs flex items-center justify-center font-bold">+</button>
    </div>
  );
}

export default function ExamCalibrationGrid() {
  const [exams, setExams] = useState([]);
  const [cleanExams, setCleanExams] = useState([]);
  const [newExam, setNewExam] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [clickTarget, setClickTarget] = useState(null);
  const canvasRef = useRef(null);
  const naturalSizeRef = useRef(null);

  const examAliases = { "β-HCG": "BHCG", "Ionogramme": "Iono complet", "PAL": "Phosphatases alcalines" };
  const reverseAliases = Object.entries(examAliases).reduce((acc, [original, normalized]) => ({ ...acc, [normalized]: original }), {});

  const location = useLocation();
  useEffect(() => { loadExams(); }, [location.pathname]);

  const loadExams = () => {
    base44.entities.ExamCalibration.list().then(records => {
      const savedMap = new Map();
      records.forEach(rec => {
        savedMap.set(rec.exam_name, { x: rec.x, y: rec.y });
        const denorm = reverseAliases[rec.exam_name] || rec.exam_name;
        savedMap.set(denorm, { x: rec.x, y: rec.y });
      });
      const defaultOrder = Object.keys(DEFAULT_COORDS);
      const items = defaultOrder.map(name => {
        const saved = savedMap.get(name);
        return {
          exam_name: name,
          x: saved ? saved.x : DEFAULT_COORDS[name][0],
          y: saved ? saved.y : DEFAULT_COORDS[name][1],
        };
      });
      setExams(items);
      setCleanExams(JSON.parse(JSON.stringify(items)));
      setSaved(false);
    });
  };

  const handleChange = (idx, field, val) => {
    setExams(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleAddExam = () => {
    if (newExam.trim()) {
      const normalizedName = examAliases[newExam] || newExam;
      const [x, y] = DEFAULT_COORDS[normalizedName] || DEFAULT_COORDS[newExam] || [0, 0];
      setExams(prev => [...prev, { exam_name: newExam, x, y }]);
      setNewExam("");
    }
  };

  const handleDelete = (idx) => setExams(prev => prev.filter((_, i) => i !== idx));

  const handleReset = () => {
    if (confirm("Remettre tous les examens aux coordonnées par défaut ?")) {
      setExams(Object.entries(DEFAULT_COORDS).map(([name, [x, y]]) => ({ exam_name: name, x, y })));
    }
  };

  // Sauvegarde complète (bouton Sauvegarder)
  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.ExamCalibration.list();
      const existingMap = new Map(existing.map(rec => [rec.exam_name, rec.id]));
      for (const exam of exams) {
        const normalizedName = examAliases[exam.exam_name] || exam.exam_name;
        const examToSave = { ...exam, exam_name: normalizedName };
        if (existingMap.has(normalizedName)) {
          await base44.entities.ExamCalibration.update(existingMap.get(normalizedName), { x: examToSave.x, y: examToSave.y });
        } else if (existingMap.has(exam.exam_name)) {
          await base44.entities.ExamCalibration.update(existingMap.get(exam.exam_name), { x: examToSave.x, y: examToSave.y });
        } else {
          await base44.entities.ExamCalibration.create(examToSave);
        }
      }
      for (const [examName, id] of existingMap) {
        if (!exams.some(e => (examAliases[e.exam_name] || e.exam_name) === examName)) {
          await base44.entities.ExamCalibration.delete(id);
        }
      }
      setCleanExams(JSON.parse(JSON.stringify(exams)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadExams();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save rapide : sauvegarde uniquement l'examen modifié (1 appel API)
  const autoSaveExam = async (exam, idx) => {
    const normalizedName = examAliases[exam.exam_name] || exam.exam_name;
    try {
      const existing = await base44.entities.ExamCalibration.list();
      const existingRecord = existing.find(r => r.exam_name === normalizedName || r.exam_name === exam.exam_name);
      if (existingRecord) {
        await base44.entities.ExamCalibration.update(existingRecord.id, { x: exam.x, y: exam.y });
      } else {
        await base44.entities.ExamCalibration.create({ exam_name: normalizedName, x: exam.x, y: exam.y });
      }
      // Mettre à jour cleanExams pour cet examen uniquement
      setCleanExams(prev => prev.map((e, i) => i === idx ? { ...e, x: exam.x, y: exam.y } : e));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const generatePreview = async (examNameOrArray, examsOverride) => {
    const examsList = Array.isArray(examNameOrArray) ? examNameOrArray : [examNameOrArray];
    const examsSource = examsOverride || exams;
    setPdfLoading(true);
    try {
      const examCalibration = {};
      examsSource.forEach(exam => { examCalibration[exam.exam_name] = { x: exam.x, y: exam.y }; });
      const res = await base44.functions.invoke('generateBilanPDF', {
        patientName: "DUPONT", prenom: "Jean", dateNaissance: "01/01/1950",
        prescripteur: "Dr Martin", datePrescription: "06/04/2026",
        examens: examsList, nbEchantillons: 1, examCalibration,
      });
      const base64 = res.data?.pdf_base64;
      if (base64) setPdfUrl(`data:application/pdf;base64,${base64}`);
    } catch (err) {
      console.error(err);
    }
    setPdfLoading(false);
  };

  useEffect(() => {
    if (exams.length > 0 && !pdfUrl) {
      generatePreview(exams.map(e => e.exam_name));
    }
  }, [exams]);

  useEffect(() => {
    if (clickTarget && exams.length > 0) {
      generatePreview(clickTarget.examName);
    }
  }, [clickTarget]);

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

  const handleCanvasClick = (e) => {
    if (!clickTarget || !canvasRef.current || !naturalSizeRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    if (cssX < 0 || cssX > rect.width || cssY < 0 || cssY > rect.height) return;
    const { width: W, height: H } = naturalSizeRef.current;
    const pdfX = Math.round(cssX / rect.width * W);
    const pdfY = Math.round((1 - cssY / rect.height) * H);

    const updatedExams = exams.map((exam, i) =>
      i === clickTarget.idx ? { ...exam, x: pdfX, y: pdfY } : exam
    );
    const savedIdx = clickTarget.idx;

    handleChange(clickTarget.idx, 'x', pdfX);
    handleChange(clickTarget.idx, 'y', pdfY);
    setClickTarget(null);

    generatePreview(updatedExams.map(e => e.exam_name), updatedExams);
    // Auto-save uniquement l'examen modifié (rapide, 1 appel API)
    autoSaveExam(updatedExams[savedIdx], savedIdx);
  };

  useEffect(() => {
    if (exams.length !== cleanExams.length) { setHasChanges(true); return; }
    setHasChanges(exams.some((exam, i) =>
      exam.exam_name !== cleanExams[i]?.exam_name ||
      exam.x !== cleanExams[i]?.x ||
      exam.y !== cleanExams[i]?.y
    ));
  }, [exams, cleanExams]);

  return (
    <AdminPasswordGate>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Calibration des examens</h1>
            <p className="text-sm text-slate-500 mt-1">Cliquez "Positionner" sur un examen puis cliquez directement sur le PDF.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Défauts
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Sauvegarde..." : saved ? "Sauvegardé ✓" : "Sauvegarder"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-6">
            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <div className="flex gap-2">
                <input
                  list="exam-list"
                  value={newExam}
                  onChange={e => setNewExam(e.target.value)}
                  placeholder="Rechercher ou ajouter un examen..."
                  className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <Button size="sm" onClick={handleAddExam} className="gap-1">
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
                <datalist id="exam-list">
                  {Object.keys(DEFAULT_COORDS).map(name => <option key={name} value={name} />)}
                </datalist>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 border-b border-slate-100 font-semibold text-xs text-slate-600 uppercase">
                <div className="col-span-2">Examen</div>
                <div className="text-center">X</div>
                <div className="text-center">Y</div>
                <div className="text-center">Positionner</div>
                <div className="text-center">Suppr.</div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {exams.map((exam, idx) => (
                  <div key={`${exam.exam_name}-${idx}`} className={`grid grid-cols-6 gap-2 px-3 py-2 items-center transition-colors ${
                    clickTarget?.examName === exam.exam_name ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-slate-50'
                  }`}>
                    <div className="col-span-2 text-sm font-medium text-slate-700 truncate">{exam.exam_name}</div>
                    <div className="flex justify-center">
                      <NumericInput value={exam.x} onChange={val => handleChange(idx, "x", val)} />
                    </div>
                    <div className="flex justify-center">
                      <NumericInput value={exam.y} onChange={val => handleChange(idx, "y", val)} />
                    </div>
                    <div className="flex justify-center">
                      {clickTarget?.examName === exam.exam_name ? (
                        <Button size="sm" variant="destructive" onClick={() => setClickTarget(null)} className="gap-1 h-7 text-xs px-2">
                          <XCircle className="h-3 w-3" /> Annuler
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setClickTarget({ examName: exam.exam_name, idx })} className="gap-1 h-7 text-xs px-2">
                          <Crosshair className="h-3 w-3" /> Positionner
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <button onClick={() => handleDelete(idx)} className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Total: {exams.length} examen(s)</p>
          </div>

          <div className="col-span-2">
            <div className="bg-white border border-slate-100 rounded-xl p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {clickTarget ? `→ Positionner : ${clickTarget.examName}` : "Aperçu PDF"}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AdminPasswordGate>
  );
}
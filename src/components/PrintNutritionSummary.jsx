import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// Décode le champ suspected_cause (JSON ou texte brut)
const parseCause = (raw) => {
  try {
    const p = JSON.parse(raw || '{}');
    if (p && typeof p === 'object') return { cause: p.cause || '', albumine: p.albumine || '', albumine_date: p.albumine_date || '', etat: p.etat || '' };
  } catch {}
  return { cause: raw || '', albumine: '', albumine_date: '', etat: '' };
};

// Parse les suppléments depuis annotations (même logique que SurveillancePoids)
const SUPPL_MARKER = '\n---SUPPL:';
const parseSupplFromAnnotations = (annotations) => {
  if (!annotations) return [];
  const idx = annotations.indexOf(SUPPL_MARKER);
  if (idx === -1) return [];
  try {
    const json = annotations.slice(idx + SUPPL_MARKER.length);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

export default function PrintNutritionSummary({ residentId, residentName, residentData }) {
  const [records, setRecords] = useState([]);
  const [resident, setResident] = useState(residentData || null);
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => { loadData(); }, [residentId]);

  const loadData = async () => {
    setLoading(true);
    const [nutritionRecords, weightRecords, residentList] = await Promise.all([
      base44.entities.NutritionalStatus.filter({ resident_id: residentId }, "-date_assessment", 100),
      base44.entities.WeightMonitoring.filter({ resident_id: residentId }, "-weighing_date", 100),
      base44.entities.Resident.filter({ id: residentId }, undefined, 1),
    ]);
    setRecords(nutritionRecords);
    setWeights(weightRecords);
    // Toujours utiliser les données fraîches de l'API pour avoir tous les champs
    if (residentList && residentList.length > 0) {
      setResident(residentList[0]);
    } else if (residentData) {
      setResident(residentData);
    }
    setLoading(false);
  };

  const drawWeightChartInPDF = (pdf, data, startX, startY, chartWidth, chartHeight) => {
    if (!data || data.length < 2) return;

    const weightValues = data.map(d => d.poids).filter(p => p !== null);
    const minW = Math.floor(Math.min(...weightValues)) - 2;
    const maxW = Math.ceil(Math.max(...weightValues)) + 2;
    const wRange = maxW - minW;

    pdf.setFillColor(248, 250, 252);
    pdf.rect(startX, startY, chartWidth, chartHeight, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.rect(startX, startY, chartWidth, chartHeight);

    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const yRatio = i / gridCount;
      const gy = startY + yRatio * chartHeight;
      const labelVal = maxW - yRatio * wRange;
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.15);
      pdf.line(startX, gy, startX + chartWidth, gy);
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(labelVal.toFixed(1), startX - 2, gy + 1, { align: 'right' });
    }

    const points = data.map((d, i) => ({
      x: startX + (i / (data.length - 1)) * chartWidth,
      y: d.poids !== null ? startY + chartHeight - ((d.poids - minW) / wRange) * chartHeight : null,
      date: d.date,
      poids: d.poids,
      isSupplement: d.isSupplement,
    }));

    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(1.2);
    let lastValidPoint = null;
    for (let i = 0; i < points.length; i++) {
      if (points[i].y !== null) {
        if (lastValidPoint) {
          pdf.line(lastValidPoint.x, lastValidPoint.y, points[i].x, points[i].y);
        }
        lastValidPoint = points[i];
      }
    }

    pdf.setFillColor(59, 130, 246);
    points.forEach(p => {
      if (p.y !== null) pdf.ellipse(p.x, p.y, 1.2, 1.2, 'F');
    });

    // Labels de poids sur chaque point
    pdf.setFontSize(6); pdf.setFont(undefined, 'bold'); pdf.setTextColor(30, 64, 175);
    points.forEach(p => {
      if (p.y !== null && p.poids !== null) {
        pdf.text(p.poids.toFixed(1), p.x, p.y - 2.5, { align: 'center' });
      }
    });
    pdf.setFont(undefined, 'normal');

    const suppPoint = points.find(p => p.isSupplement);
    if (suppPoint) {
      pdf.setDrawColor(16, 185, 129);
      pdf.setLineWidth(0.8);
      pdf.setLineDash([2, 2]);
      pdf.line(suppPoint.x, startY, suppPoint.x, startY + chartHeight);
      pdf.setLineDash([]);
    }

    const step = Math.max(1, Math.ceil(data.length / 8));
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    points.forEach((p, i) => {
      if (i % step === 0 || i === points.length - 1) {
        pdf.text(p.date, p.x, startY + chartHeight + 5, { align: 'center' });
      }
    });
  };

  const handleGeneratePDF = async () => {
    if (!resident) return;
    setGeneratingPDF(true);

    const pdf = new jsPDF('p', 'mm', 'A4');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 15;

    pdf.setFontSize(20);
    pdf.setTextColor(30, 41, 59);
    pdf.text('DOSSIER NUTRITIONNEL', 15, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Suivi de l'état nutritionnel et du statut clinique", 15, yPosition);
    yPosition += 10;

    // En-tête compact
    const suppItemsPdf = parseSupplFromAnnotations(resident?.annotations);
    const headerH = suppItemsPdf.length > 0 ? 32 : 22;
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.rect(15, yPosition - 2, pageWidth - 30, headerH, 'FD');

    // Nom
    pdf.setFontSize(6.5); pdf.setFont(undefined, 'normal'); pdf.setTextColor(100, 116, 139);
    pdf.text('NOM ET PRÉNOM', 19, yPosition + 2);
    pdf.setFontSize(12); pdf.setFont(undefined, 'bold'); pdf.setTextColor(15, 23, 42);
    pdf.text(residentName + (resident?.first_name ? ' ' + resident.first_name : ''), 19, yPosition + 9);

    // Infos droite
    const infosPdf = [];
    if (resident?.room) infosPdf.push({ label: 'CHAMBRE', val: resident.room });
    if (resident?.floor) infosPdf.push({ label: 'ÉTAGE', val: resident.floor });
    if (resident?.date_naissance) infosPdf.push({ label: 'NÉ(E) LE', val: new Date(resident.date_naissance).toLocaleDateString('fr-FR') });
    if (resident?.date_entree) infosPdf.push({ label: 'ENTRÉE', val: new Date(resident.date_entree).toLocaleDateString('fr-FR') });
    if (resident?.medecin) infosPdf.push({ label: 'MÉDECIN', val: resident.medecin });

    const colWPdf = (pageWidth - 80) / Math.max(infosPdf.length, 1);
    infosPdf.forEach((info, i) => {
      const x = 80 + i * colWPdf;
      pdf.setFontSize(6); pdf.setFont(undefined, 'normal'); pdf.setTextColor(100, 116, 139);
      pdf.text(info.label, x, yPosition + 2);
      pdf.setFontSize(8.5); pdf.setFont(undefined, 'bold'); pdf.setTextColor(30, 41, 59);
      pdf.text(String(info.val), x, yPosition + 8);
    });

    // Compléments
    if (suppItemsPdf.length > 0) {
      pdf.setFontSize(6); pdf.setFont(undefined, 'normal'); pdf.setTextColor(100, 116, 139);
      pdf.text('COMPLÉMENTS ALIMENTAIRES', 19, yPosition + 17);
      let cx = 19;
      suppItemsPdf.forEach((sup) => {
        const txt = `${sup.type || 'Complément'}${sup.date_debut ? ' — introduit le ' + new Date(sup.date_debut).toLocaleDateString('fr-FR') : ''}`;
        pdf.setFontSize(7.5); pdf.setFont(undefined, 'bold'); pdf.setTextColor(6, 78, 59);
        pdf.setFillColor(209, 250, 229);
        const tw = pdf.getTextWidth(txt) + 6;
        pdf.roundedRect(cx, yPosition + 20, tw, 6, 1, 1, 'F');
        pdf.text(txt, cx + 3, yPosition + 24.5);
        cx += tw + 4;
      });
    }

    yPosition += headerH + 6;

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('SUIVI NUTRITIONNEL', 15, yPosition);
    yPosition += 8;

    // Pré-calcul surcharge pour masquer le bloc "aucune dénutrition" si surcharge présente
    const preCheckGainAlert = (() => {
      if (weights.length < 2) return false;
      const sw = [...weights].sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
      const lw = sw[0]; const ld = new Date(lw.weighing_date);
      const f40 = new Date(ld); f40.setDate(f40.getDate() - 40);
      const r40 = sw.find(w => new Date(w.weighing_date) <= f40);
      if (r40 && ((lw.weight - r40.weight) / r40.weight) * 100 >= 5) return true;
      const f6 = new Date(ld); f6.setMonth(f6.getMonth() - 6);
      const r6 = sw.find(w => new Date(w.weighing_date) <= f6);
      if (r6 && ((lw.weight - r6.weight) / r6.weight) * 100 >= 10) return true;
      return false;
    })();

    if (records.length > 0) {
      const headers = ['Date', 'Statut', 'IMC', 'Albumine', 'État général', 'Cause suspectée', 'Notes'];
      const colWidths = [22, 18, 13, 26, 24, 35, 42];

      const rowHeight = 7;

      // En-tête du tableau
      pdf.setLineWidth(0.2);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');

      let xPos = 15;
      headers.forEach((header, i) => {
        // Forcer couleur fond gris clair et texte sombre à chaque cellule
        pdf.setFillColor(220, 228, 240);
        pdf.setDrawColor(150, 170, 200);
        pdf.setTextColor(20, 30, 50);
        pdf.rect(xPos, yPosition - rowHeight + 1, colWidths[i], rowHeight, 'FD');
        pdf.text(header, xPos + 1.5, yPosition - 1.5);
        xPos += colWidths[i];
      });

      yPosition += 2;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7.5);

      records.forEach((record, idx) => {
        const cp = parseCause(record.suspected_cause);
        const rowData = [
          new Date(record.date_assessment).toLocaleDateString('fr-FR'),
          record.status.charAt(0).toUpperCase() + record.status.slice(1),
          record.imc ? record.imc.toFixed(1) : '-',
          cp.albumine ? `${cp.albumine} g/L${cp.albumine_date ? ' (' + new Date(cp.albumine_date).toLocaleDateString('fr-FR') + ')' : ''}` : '-',
          cp.etat || '-',
          cp.cause || '-',
          record.clinical_notes || '-',
        ];

        // Wrap chaque cellule selon la largeur de colonne
        pdf.setFontSize(7.5); pdf.setFont(undefined, 'normal');
        const wrappedLines = rowData.map((cell, i) => pdf.splitTextToSize(String(cell), colWidths[i] - 3));
        const maxLines = Math.max(...wrappedLines.map(l => l.length));
        const dynRowH = Math.max(rowHeight, maxLines * 4 + 3);

        if (yPosition > pageHeight - dynRowH - 10) { pdf.addPage(); yPosition = 15; }

        // Fond de ligne
        pdf.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255);
        xPos = 15;
        headers.forEach((_, i) => {
          pdf.rect(xPos, yPosition, colWidths[i], dynRowH, 'F');
          xPos += colWidths[i];
        });

        // Texte multi-lignes
        pdf.setTextColor(30, 41, 59);
        xPos = 15;
        wrappedLines.forEach((lines, i) => {
          lines.forEach((line, li) => {
            pdf.text(line, xPos + 1.5, yPosition + 4.5 + li * 4);
          });
          xPos += colWidths[i];
        });

        // Bordures
        pdf.setLineWidth(0.1); pdf.setDrawColor(203, 213, 225);
        xPos = 15;
        headers.forEach((_, i) => {
          pdf.rect(xPos, yPosition, colWidths[i], dynRowH);
          xPos += colWidths[i];
        });

        yPosition += dynRowH;
      });

      yPosition += 10;
    } else if (!preCheckGainAlert) {
      // Bloc "aucune alerte de dénutrition" — seulement si pas d'alerte surcharge
      if (yPosition > pageHeight - 60) { pdf.addPage(); yPosition = 15; }

      pdf.setFillColor(240, 253, 244);
      pdf.setDrawColor(187, 247, 208);
      pdf.setLineWidth(0.3);
      pdf.rect(15, yPosition, pageWidth - 30, 50, 'FD');

      pdf.setFontSize(10); pdf.setFont(undefined, 'bold'); pdf.setTextColor(22, 101, 52);
      pdf.text('Aucune alerte de dénutrition détectée', 22, yPosition + 9);

      pdf.setFontSize(8); pdf.setFont(undefined, 'normal'); pdf.setTextColor(21, 128, 61);
      pdf.text('Ce résident ne présente pas de critère HAS de dénutrition à ce jour.', 22, yPosition + 17);
      pdf.text("Aucune évaluation nutritionnelle formelle n'a été nécessaire.", 22, yPosition + 23);

      pdf.setFontSize(7.5); pdf.setFont(undefined, 'bold'); pdf.setTextColor(22, 101, 52);
      pdf.text('Rappel des critères HAS déclenchant une évaluation :', 22, yPosition + 32);
      pdf.setFont(undefined, 'normal');
      pdf.text('• Perte de poids > 5 % en 1 mois', 22, yPosition + 38);
      pdf.text('• Perte de poids > 10 % en 6 mois', 22, yPosition + 43);
      pdf.text('• IMC < 18,5 kg/m² ou albumine < 35 g/L', 22, yPosition + 48);

      if (weights.length >= 2) {
        const sorted = [...weights].sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
        const oldest = sorted[0];
        const latest = sorted[sorted.length - 1];
        const diff = latest.weight - oldest.weight;
        const pct = (diff / oldest.weight) * 100;
        pdf.setFillColor(209, 250, 229);
        pdf.setDrawColor(167, 243, 208);
        pdf.rect(pageWidth - 75, yPosition + 15, 60, 28, 'FD');
        pdf.setFontSize(7); pdf.setFont(undefined, 'normal'); pdf.setTextColor(22, 101, 52);
        pdf.text('Variation globale', pageWidth - 45, yPosition + 22, { align: 'center' });
        pdf.setFontSize(11); pdf.setFont(undefined, 'bold');
        pdf.text((diff > 0 ? '+' : '') + diff.toFixed(1) + ' kg', pageWidth - 45, yPosition + 30, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text((pct > 0 ? '+' : '') + pct.toFixed(1) + ' %', pageWidth - 45, yPosition + 37, { align: 'center' });
      }

      yPosition += 58;
    }

    // ─── Carte variation depuis 1ère pesée ───────────────────────────────────
    if (weights.length >= 2) {
      const sorted = [...weights].sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
      const refW = sorted[0];
      const latW = sorted[sorted.length - 1];
      const diffKg = latW.weight - refW.weight;
      const diffPct = (diffKg / refW.weight) * 100;

      if (yPosition > pageHeight - 45) { pdf.addPage(); yPosition = 15; }

      let bg = [240, 253, 244];
      if (diffPct <= -10) bg = [254, 242, 242];
      else if (diffPct <= -5) bg = [255, 247, 237];
      else if (diffPct >= 5) bg = [250, 245, 255];

      pdf.setFillColor(...bg);
      pdf.setDrawColor(200, 200, 210);
      pdf.setLineWidth(0.3);
      pdf.rect(15, yPosition, pageWidth - 30, 30, 'FD');

      pdf.setFontSize(9); pdf.setFont(undefined, 'bold'); pdf.setTextColor(71, 85, 105);
      pdf.text('Depuis la première pesée', 20, yPosition + 7);
      pdf.setFont(undefined, 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
      pdf.text('(' + new Date(refW.weighing_date).toLocaleDateString('fr-FR') + ')', 76, yPosition + 7);

      pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139); pdf.setFont(undefined, 'normal');
      pdf.text('Référence', 20, yPosition + 15);
      pdf.setFontSize(12); pdf.setFont(undefined, 'bold'); pdf.setTextColor(30, 41, 59);
      pdf.text(refW.weight.toFixed(1) + ' kg', 20, yPosition + 22);
      pdf.setFontSize(7); pdf.setFont(undefined, 'normal'); pdf.setTextColor(148, 163, 184);
      pdf.text(new Date(refW.weighing_date).toLocaleDateString('fr-FR'), 20, yPosition + 27);

      pdf.setFontSize(14); pdf.setTextColor(203, 213, 225);
      pdf.text('→', 62, yPosition + 22);

      pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139); pdf.setFont(undefined, 'normal');
      pdf.text('Actuel', 75, yPosition + 15);
      pdf.setFontSize(12); pdf.setFont(undefined, 'bold'); pdf.setTextColor(30, 41, 59);
      pdf.text(latW.weight.toFixed(1) + ' kg', 75, yPosition + 22);
      pdf.setFontSize(7); pdf.setFont(undefined, 'normal'); pdf.setTextColor(148, 163, 184);
      pdf.text(new Date(latW.weighing_date).toLocaleDateString('fr-FR'), 75, yPosition + 27);

      let vBg = [220, 252, 231]; let vFg = [21, 128, 61];
      if (diffPct <= -10) { vBg = [254, 226, 226]; vFg = [185, 28, 28]; }
      else if (diffPct <= -5) { vBg = [255, 237, 213]; vFg = [194, 65, 12]; }
      else if (diffPct >= 5) { vBg = [243, 232, 255]; vFg = [126, 34, 206]; }

      pdf.setFillColor(...vBg);
      pdf.roundedRect(pageWidth - 55, yPosition + 4, 42, 22, 2, 2, 'F');
      pdf.setFontSize(7); pdf.setFont(undefined, 'normal'); pdf.setTextColor(...vFg);
      pdf.text('Variation totale', pageWidth - 34, yPosition + 10, { align: 'center' });
      pdf.setFontSize(12); pdf.setFont(undefined, 'bold');
      pdf.text((diffKg > 0 ? '+' : '') + diffKg.toFixed(1) + ' kg', pageWidth - 34, yPosition + 18, { align: 'center' });
      pdf.setFontSize(9);
      pdf.text((diffPct > 0 ? '+' : '') + diffPct.toFixed(1) + '%', pageWidth - 34, yPosition + 25, { align: 'center' });

      yPosition += 38;

      // Alertes dénutrition / surcharge dans le PDF
      const sortedForAlerts = [...weights].sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
      const latestA = sortedForAlerts[0];
      const latestDateA = new Date(latestA.weighing_date);
      const pdfLossAlerts = [];
      const pdfGainAlerts = [];
      const oneMonthAgoA = new Date(latestDateA); oneMonthAgoA.setMonth(oneMonthAgoA.getMonth() - 1);
      const ref1A = sortedForAlerts.find(w => new Date(w.weighing_date) <= oneMonthAgoA);
      if (ref1A) { const p = ((latestA.weight - ref1A.weight) / ref1A.weight) * 100; if (p <= -5) pdfLossAlerts.push({ critere: '5% en 1 mois', pct: Math.abs(p).toFixed(1), value: Math.abs(latestA.weight - ref1A.weight).toFixed(1), refWeight: ref1A.weight, refDate: ref1A.weighing_date, latestWeight: latestA.weight, latestDate: latestA.weighing_date }); }
      const sixMonthsAgoA = new Date(latestDateA); sixMonthsAgoA.setMonth(sixMonthsAgoA.getMonth() - 6);
      const ref6A = sortedForAlerts.find(w => new Date(w.weighing_date) <= sixMonthsAgoA);
      if (ref6A && pdfLossAlerts.length === 0) { const p = ((latestA.weight - ref6A.weight) / ref6A.weight) * 100; if (p <= -10) pdfLossAlerts.push({ critere: '10% en 6 mois', pct: Math.abs(p).toFixed(1), value: Math.abs(latestA.weight - ref6A.weight).toFixed(1), refWeight: ref6A.weight, refDate: ref6A.weighing_date, latestWeight: latestA.weight, latestDate: latestA.weighing_date }); }
      const fortyDaysAgoA = new Date(latestDateA); fortyDaysAgoA.setDate(fortyDaysAgoA.getDate() - 40);
      const ref40A = sortedForAlerts.find(w => new Date(w.weighing_date) <= fortyDaysAgoA);
      if (ref40A) { const p = ((latestA.weight - ref40A.weight) / ref40A.weight) * 100; if (p >= 5) pdfGainAlerts.push({ critere: '5% en 40 jours', pct: p.toFixed(1), value: Math.abs(latestA.weight - ref40A.weight).toFixed(1), refWeight: ref40A.weight, refDate: ref40A.weighing_date, latestWeight: latestA.weight, latestDate: latestA.weighing_date }); }
      if (ref6A && pdfGainAlerts.length === 0) { const p = ((latestA.weight - ref6A.weight) / ref6A.weight) * 100; if (p >= 10) pdfGainAlerts.push({ critere: '10% en 6 mois', pct: p.toFixed(1), value: Math.abs(latestA.weight - ref6A.weight).toFixed(1), refWeight: ref6A.weight, refDate: ref6A.weighing_date, latestWeight: latestA.weight, latestDate: latestA.weighing_date }); }

      const drawAlertBlock = (alertsList, type) => {
        alertsList.forEach(a => {
          if (yPosition > pageHeight - 30) { pdf.addPage(); yPosition = 15; }
          const isLoss = type === 'loss';
          const bgRGB = isLoss ? [254, 226, 226] : [243, 232, 255];
          const fgRGB = isLoss ? [185, 28, 28] : [126, 34, 206];
          const borderRGB = isLoss ? [252, 165, 165] : [216, 180, 254];
          pdf.setFillColor(...bgRGB);
          pdf.setDrawColor(...borderRGB);
          pdf.setLineWidth(0.3);
          pdf.rect(15, yPosition, pageWidth - 30, 30, 'FD');
          pdf.setFontSize(7); pdf.setFont(undefined, 'bold'); pdf.setTextColor(...fgRGB);
          pdf.text((isLoss ? '! Critere HAS : perte > ' : '! Alerte surcharge : prise > ') + a.critere, 19, yPosition + 6);
          pdf.setFontSize(8); pdf.setFont(undefined, 'normal'); pdf.setTextColor(71, 85, 105);
          pdf.text('Reference (' + new Date(a.refDate).toLocaleDateString('fr-FR') + ')', 19, yPosition + 13);
          pdf.setFont(undefined, 'bold'); pdf.setTextColor(30, 41, 59);
          pdf.text(Number(a.refWeight).toFixed(1) + ' kg', 19, yPosition + 19);
          pdf.setFont(undefined, 'normal'); pdf.setTextColor(148, 163, 184);
          pdf.text('->', 58, yPosition + 19);
          pdf.setFontSize(8); pdf.setFont(undefined, 'normal'); pdf.setTextColor(71, 85, 105);
          pdf.text('Actuel (' + new Date(a.latestDate).toLocaleDateString('fr-FR') + ')', 65, yPosition + 13);
          pdf.setFont(undefined, 'bold'); pdf.setTextColor(30, 41, 59);
          pdf.text(Number(a.latestWeight).toFixed(1) + ' kg', 65, yPosition + 19);
          const boxX = pageWidth - 50;
          const boxW = 32;
          pdf.setFillColor(...bgRGB);
          pdf.roundedRect(boxX, yPosition + 3, boxW, 23, 2, 2, 'F');
          pdf.setFontSize(7); pdf.setFont(undefined, 'normal'); pdf.setTextColor(...fgRGB);
          pdf.text('Variation', boxX + boxW / 2, yPosition + 9, { align: 'center' });
          pdf.setFontSize(10); pdf.setFont(undefined, 'bold');
          pdf.text((isLoss ? '-' : '+') + a.value + ' kg', boxX + boxW / 2, yPosition + 17, { align: 'center' });
          pdf.setFontSize(8);
          pdf.text((isLoss ? '-' : '+') + a.pct + '%', boxX + boxW / 2, yPosition + 23, { align: 'center' });
          yPosition += 34;
        });
      };
      drawAlertBlock(pdfLossAlerts, 'loss');
      drawAlertBlock(pdfGainAlerts, 'gain');
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (weights.length >= 2) {
      if (yPosition > pageHeight - 85) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('ÉVOLUTION DU POIDS', 15, yPosition);
      yPosition += 6;

      const chartData = [...weights]
        .sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date))
        .map(w => ({
          date: new Date(w.weighing_date).toLocaleDateString('fr-FR'),
          poids: w.weight,
        }));

      // Injecter les suppléments (même logique que l'affichage)
      const suppItemsPdfChart = parseSupplFromAnnotations(resident?.annotations);
      const suppListForChart = suppItemsPdfChart.length > 0
        ? suppItemsPdfChart
        : (resident?.complement_alimentaire && resident?.complement_alimentaire_date
            ? [{ type: 'Compléments', date_debut: resident.complement_alimentaire_date }]
            : []);

      for (const sup of suppListForChart) {
        if (!sup.date_debut) continue;
        const suppLabel = new Date(sup.date_debut).toLocaleDateString('fr-FR');
        const suppDateObj = new Date(sup.date_debut);
        if (!chartData.some(d => d.date === suppLabel)) {
          const insertIdx = chartData.findIndex(d => {
            const [day, month, year] = d.date.split('/');
            return new Date(`${year}-${month}-${day}`) > suppDateObj;
          });
          const phantom = { date: suppLabel, poids: null, isSupplement: true };
          if (insertIdx === -1) chartData.push(phantom);
          else chartData.splice(insertIdx, 0, phantom);
        } else {
          // Marquer le point existant
          const existing = chartData.find(d => d.date === suppLabel);
          if (existing) existing.isSupplement = true;
        }
      }

      drawWeightChartInPDF(pdf, chartData, 30, yPosition, pageWidth - 45, 62);
      yPosition += 80;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      'Document confidentiel - Établissement de Santé',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    pdf.save(`Dossier_Nutritionnel_${residentName}_${new Date().toISOString().split('T')[0]}.pdf`);
    setGeneratingPDF(false);
  };

  const handlePrint = () => {
    const printArea = document.getElementById('nutrition-print-area');
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Dossier Nutritionnel — ${residentName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 12px; color: #1e293b; font-size: 11px; }
            h1 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
            h2 { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 12px; margin-bottom: 5px; }
            h3 { font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 5px; }
            .subtitle { font-size: 10px; color: #64748b; padding-bottom: 8px; border-bottom: 2px solid #cbd5e1; margin-bottom: 10px; }
            .header-box { padding: 7px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 5px; margin-bottom: 10px; }
            .header-main { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 5px; }
            .header-name { flex: 1; min-width: 150px; }
            .header-infos { display: flex; flex-wrap: wrap; gap: 10px; }
            .info-block { text-align: left; }
            .label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 1px; }
            .value-lg { font-size: 14px; font-weight: 800; color: #0f172a; }
            .value { font-size: 10px; font-weight: 600; color: #1e293b; }
            .supps { display: flex; flex-wrap: wrap; gap: 4px; padding-top: 5px; border-top: 1px solid #e2e8f0; }
            .supp-badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 600; background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            /* Table */
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
            th { background: #cbd5e1; padding: 4px 6px; text-align: left; font-weight: 700; border: 1px solid #94a3b8; color: #1e293b; }
            td { padding: 3px 6px; border: 1px solid #94a3b8; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            /* Weight card */
            .weight-card { border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 10px; margin: 7px 0; }
            .weight-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
            .weight-val { font-size: 16px; font-weight: 800; color: #1e293b; }
            .weight-badge { margin-left: auto; text-align: center; padding: 5px 12px; border-radius: 8px; }
            /* Alert box */
            .alert-green { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 8px; }
            /* Chart */
            .chart-wrap { width: 100%; overflow: hidden; }
            svg { display: block; }
            .footer { font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 12px; }
            /* Tailwind utility mapping — tailles réduites */
            .bg-slate-100 { background: #f1f5f9; } .bg-white { background: #fff; }
            .border { border: 1px solid #e2e8f0; } .border-slate-300 { border-color: #cbd5e1; }
            .rounded-lg { border-radius: 6px; } .p-4 { padding: 8px; } .p-8 { padding: 12px; }
            .mb-6 { margin-bottom: 10px; } .mb-8 { margin-bottom: 12px; } .mb-4 { margin-bottom: 8px; }
            .pb-4 { padding-bottom: 8px; } .border-b { border-bottom: 1px solid #e2e8f0; }
            .text-4xl { font-size: 18px; font-weight: 800; } .text-xl { font-size: 14px; font-weight: 700; }
            .font-extrabold { font-weight: 800; } .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; }
            .text-slate-900 { color: #0f172a; } .text-slate-800 { color: #1e293b; } .text-slate-700 { color: #334155; }
            .text-slate-600 { color: #475569; } .text-slate-500 { color: #64748b; } .text-slate-400 { color: #94a3b8; }
            .text-sm { font-size: 10px; } .text-xs { font-size: 9px; } .text-\[10px\] { font-size: 8px; }
            .text-lg { font-size: 12px; } .text-base { font-size: 11px; } .text-2xl { font-size: 15px; }
            .text-3xl { font-size: 18px; }
            .uppercase { text-transform: uppercase; } .tracking-widest { letter-spacing: 0.06em; }
            .flex { display: flex; } .flex-wrap { flex-wrap: wrap; } .items-center { align-items: center; }
            .gap-x-6 { column-gap: 14px; } .gap-y-2 { row-gap: 5px; } .gap-4 { gap: 10px; } .gap-2 { gap: 5px; }
            .ml-auto { margin-left: auto; } .mt-1 { margin-top: 2px; }
            .text-center { text-align: center; }
            .pt-2 { padding-top: 5px; } .border-t { border-top: 1px solid #e2e8f0; } .border-slate-200 { border-color: #e2e8f0; }
            .inline-flex { display: inline-flex; } .gap-1\.5 { gap: 4px; }
            .px-3 { padding-left: 8px; padding-right: 8px; } .py-1 { padding-top: 2px; padding-bottom: 2px; }
            .rounded-full { border-radius: 999px; } .bg-emerald-100 { background: #d1fae5; } .text-emerald-800 { color: #065f46; } .border-emerald-200 { border-color: #a7f3d0; }
            .overflow-x-auto { overflow-x: auto; } .w-full { width: 100%; } .border-collapse { border-collapse: collapse; }
            .border-slate-400 { border-color: #94a3b8; } .bg-slate-300 { background: #cbd5e1; }
            .py-3 { padding-top: 6px; padding-bottom: 6px; } .py-2 { padding-top: 4px; padding-bottom: 4px; }
            .text-left { text-align: left; } .bg-green-50 { background: #f0fdf4; } .border-green-200 { border-color: #bbf7d0; }
            .rounded-xl { border-radius: 8px; } .px-5 { padding-left: 12px; padding-right: 12px; }
            .bg-red-50 { background: #fef2f2; } .border-red-200 { border-color: #fecaca; } .bg-orange-50 { background: #fff7ed; } .border-orange-200 { border-color: #fed7aa; } .bg-purple-50 { background: #faf5ff; } .border-purple-200 { border-color: #e9d5ff; }
            .bg-red-100 { background: #fee2e2; } .text-red-800 { color: #991b1b; } .bg-orange-100 { background: #ffedd5; } .text-orange-800 { color: #9a3412; } .bg-purple-100 { background: #f3e8ff; } .text-purple-800 { color: #6b21a8; } .bg-green-100 { background: #dcfce7; } .text-green-800 { color: #166534; }
            .h-72 { height: 220px; } .space-y-4 > * + * { margin-top: 8px; }
            .mt-3 { margin-top: 6px; } .pt-3 { padding-top: 6px; } .space-y-2 > * + * { margin-top: 5px; }
            .px-4 { padding-left: 10px; padding-right: 10px; } .py-4 { padding-top: 8px; padding-bottom: 8px; }
            .gap-3 { gap: 8px; } .gap-6 { gap: 14px; } .mt-4 { margin-top: 8px; } .pt-4 { padding-top: 8px; }
            @media print { body { padding: 6px; } @page { margin: 0.8cm; size: A4 portrait; } }
          </style>
        </head>
        <body>${printArea.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 800);
  };

  if (loading) return null;

  let chartData = [...weights]
    .sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date))
    .map(w => ({
      date: new Date(w.weighing_date).toLocaleDateString('fr-FR'),
      poids: w.weight,
    }));

  // Date d'entrée
  const entreeLabel = resident?.date_entree
    ? new Date(resident.date_entree).toLocaleDateString('fr-FR')
    : null;

  // Injecter phantom pour date d'entrée dans chartData
  if (entreeLabel && !chartData.some(d => d.date === entreeLabel)) {
    const entreeDateObj = new Date(resident.date_entree);
    const insertIdx = chartData.findIndex(d => {
      const [day, month, year] = d.date.split('/');
      return new Date(`${year}-${month}-${day}`) > entreeDateObj;
    });
    const phantom = { date: entreeLabel, poids: null };
    if (insertIdx === -1) chartData.push(phantom);
    else chartData.splice(insertIdx, 0, phantom);
  }

  // Tous les suppléments : depuis annotations (nouveau) + ancien champ
  const allSupps = parseSupplFromAnnotations(resident?.annotations);
  // Si pas de suppléments dans annotations, fallback sur l'ancien champ
  const suppItems = allSupps.length > 0
    ? allSupps
    : (resident?.complement_alimentaire && resident?.complement_alimentaire_date
        ? [{ type: 'Compléments', date_debut: resident.complement_alimentaire_date }]
        : []);

  // Injecter les points fantômes pour chaque supplément
  for (const sup of suppItems) {
    if (!sup.date_debut) continue;
    const suppLabel = new Date(sup.date_debut).toLocaleDateString('fr-FR');
    const suppDateObj = new Date(sup.date_debut);
    if (!chartData.some(d => d.date === suppLabel)) {
      const insertIdx = chartData.findIndex(d => {
        const [day, month, year] = d.date.split('/');
        return new Date(`${year}-${month}-${day}`) > suppDateObj;
      });
      const phantom = { date: suppLabel, poids: null };
      if (insertIdx === -1) chartData.push(phantom);
      else chartData.splice(insertIdx, 0, phantom);
    }
  }

  const supplementDateLabel = suppItems.length > 0 && suppItems[0].date_debut
    ? new Date(suppItems[0].date_debut).toLocaleDateString('fr-FR')
    : null;

  let refWeight = null, latestWeight = null, totalDiffKg = null, totalPct = null, refCardColor = '', refValueColor = '';
  const lossAlerts = [];
  const gainAlerts = [];
  if (weights.length >= 2) {
    const sortedW = [...weights].sort((a, b) => new Date(b.weighing_date) - new Date(a.weighing_date));
    const latest = sortedW[0];
    const latestDate = new Date(latest.weighing_date);
    // Assign ref/latest for the card
    const sortedAsc = [...weights].sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
    refWeight = sortedAsc[0];
    latestWeight = sortedAsc[sortedAsc.length - 1];
    totalDiffKg = latestWeight.weight - refWeight.weight;
    totalPct = (totalDiffKg / refWeight.weight) * 100;
    if (totalPct <= -10) { refCardColor = 'border-red-200 bg-red-50'; refValueColor = 'bg-red-100 text-red-700'; }
    else if (totalPct <= -5) { refCardColor = 'border-orange-200 bg-orange-50'; refValueColor = 'bg-orange-100 text-orange-700'; }
    else if (totalPct >= 5) { refCardColor = 'border-purple-200 bg-purple-50'; refValueColor = 'bg-purple-100 text-purple-700'; }
    else { refCardColor = 'border-green-200 bg-green-50'; refValueColor = 'bg-green-100 text-green-700'; }
    const oneMonthAgo = new Date(latestDate); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const ref1 = sortedW.find(w => new Date(w.weighing_date) <= oneMonthAgo);
    if (ref1) {
      const pct = ((latest.weight - ref1.weight) / ref1.weight) * 100;
      if (pct <= -5) lossAlerts.push({ critere: '5% en 1 mois', pct: Math.abs(pct).toFixed(1), value: Math.abs(latest.weight - ref1.weight).toFixed(1), refWeight: ref1.weight, refDate: ref1.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
    }
    const sixMonthsAgo = new Date(latestDate); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const ref6 = sortedW.find(w => new Date(w.weighing_date) <= sixMonthsAgo);
    if (ref6 && lossAlerts.length === 0) {
      const pct = ((latest.weight - ref6.weight) / ref6.weight) * 100;
      if (pct <= -10) lossAlerts.push({ critere: '10% en 6 mois', pct: Math.abs(pct).toFixed(1), value: Math.abs(latest.weight - ref6.weight).toFixed(1), refWeight: ref6.weight, refDate: ref6.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
    }
    const fortyDaysAgo = new Date(latestDate); fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    const ref40 = sortedW.find(w => new Date(w.weighing_date) <= fortyDaysAgo);
    if (ref40) {
      const pct = ((latest.weight - ref40.weight) / ref40.weight) * 100;
      if (pct >= 5) gainAlerts.push({ critere: '5% en 40 jours', pct: pct.toFixed(1), value: Math.abs(latest.weight - ref40.weight).toFixed(1), refWeight: ref40.weight, refDate: ref40.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
    }
    if (ref6 && gainAlerts.length === 0) {
      const pct = ((latest.weight - ref6.weight) / ref6.weight) * 100;
      if (pct >= 10) gainAlerts.push({ critere: '10% en 6 mois', pct: pct.toFixed(1), value: Math.abs(latest.weight - ref6.weight).toFixed(1), refWeight: ref6.weight, refDate: ref6.weighing_date, latestWeight: latest.weight, latestDate: latest.weighing_date });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleGeneratePDF}
          disabled={generatingPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          {generatingPDF ? 'Génération...' : 'Télécharger PDF'}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="h-4 w-4" /> Imprimer
        </button>
      </div>

      <div id="nutrition-print-area" className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="mb-8 pb-4 border-b border-slate-300">
          <h1 className="text-4xl font-bold text-slate-900">Dossier nutritionnel</h1>
          <p className="text-sm text-slate-600 mt-2">Suivi de l'état nutritionnel et du statut clinique</p>
        </div>

        <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
          {/* Ligne principale */}
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mb-2">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nom et Prénom</p>
              <p className="text-xl font-extrabold text-slate-900">{residentName} {resident?.first_name || ''}</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap ml-auto">
              {resident?.room && (
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chambre</p>
                  <p className="text-lg font-bold text-slate-800">{resident.room}</p>
                </div>
              )}
              {resident?.floor && (
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Étage</p>
                  <p className="text-base font-semibold text-slate-700">{resident.floor}</p>
                </div>
              )}
              {resident?.date_naissance && (
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Né(e) le</p>
                  <p className="text-base font-semibold text-slate-700">{new Date(resident.date_naissance).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {resident?.date_entree && (
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entrée</p>
                  <p className="text-base font-semibold text-slate-700">{new Date(resident.date_entree).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
              {resident?.medecin && (
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Médecin</p>
                  <p className="text-base font-semibold text-slate-700">{resident.medecin}</p>
                </div>
              )}
            </div>
          </div>
          {/* Compléments */}
          {suppItems.length > 0 && (
            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 mt-1">
              {suppItems.map((sup, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  💊 {sup.type || 'Complément'}{sup.date_debut ? ` — introduit le ${new Date(sup.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Suivi nutritionnel</h2>
          {records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-300">
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">Date</th>
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">Statut</th>
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">IMC</th>
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">Albumine</th>
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">État général</th>
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">Cause suspectée</th>
                    <th className="border border-slate-400 px-3 py-3 text-left font-bold text-slate-900">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, i) => {
                    const cp = parseCause(record.suspected_cause);
                    return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-slate-100' : 'bg-white'}>
                      <td className="border border-slate-400 px-3 py-2 text-xs">
                        {new Date(record.date_assessment).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="border border-slate-400 px-3 py-2 text-xs font-semibold">
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </td>
                      <td className="border border-slate-400 px-3 py-2 text-xs">
                        {record.imc ? record.imc.toFixed(1) : '-'}
                      </td>
                      <td className="border border-slate-400 px-3 py-2 text-xs">
                        {cp.albumine ? `${cp.albumine} g/L` : '-'}
                        {cp.albumine_date && <div className="text-slate-400 text-xs mt-0.5">{new Date(cp.albumine_date).toLocaleDateString('fr-FR')}</div>}
                      </td>
                      <td className="border border-slate-400 px-3 py-2 text-xs">
                        {cp.etat || '-'}
                      </td>
                      <td className="border border-slate-400 px-3 py-2 text-xs">{cp.cause || '-'}</td>
                      <td className="border border-slate-400 px-3 py-2 text-xs">{record.clinical_notes || '-'}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : lossAlerts.length === 0 && gainAlerts.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-green-800 text-base mb-1">Aucune alerte de dénutrition détectée</p>
                  <p className="text-sm text-green-700">Ce résident ne présente pas de critère HAS de dénutrition à ce jour. Aucune évaluation nutritionnelle formelle n'a été nécessaire.</p>
                  <div className="mt-3 text-xs text-green-600 space-y-1">
                    <p className="font-semibold">Rappel des critères HAS déclenchant une évaluation :</p>
                    <p>• Perte de poids &gt; 5 % en 1 mois</p>
                    <p>• Perte de poids &gt; 10 % en 6 mois</p>
                    <p>• IMC &lt; 18,5 kg/m² ou albumine &lt; 35 g/L</p>
                  </div>
                </div>
              </div>
              {weights.length >= 2 && (() => {
                const sorted = [...weights].sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
                const oldest = sorted[0];
                const latest = sorted[sorted.length - 1];
                const diff = latest.weight - oldest.weight;
                const pct = (diff / oldest.weight) * 100;
                const color = pct <= -5 ? 'text-red-700' : pct <= -2 ? 'text-orange-600' : pct >= 5 ? 'text-purple-700' : 'text-green-700';
                return (
                  <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-6 flex-wrap">
                    <div>
                      <p className="text-xs text-green-600 mb-0.5">Première pesée</p>
                      <p className="font-bold text-slate-700">{oldest.weight.toFixed(1)} kg <span className="text-xs font-normal text-slate-400">({new Date(oldest.weighing_date).toLocaleDateString('fr-FR')})</span></p>
                    </div>
                    <div className="text-slate-300 text-xl">→</div>
                    <div>
                      <p className="text-xs text-green-600 mb-0.5">Dernière pesée</p>
                      <p className="font-bold text-slate-700">{latest.weight.toFixed(1)} kg <span className="text-xs font-normal text-slate-400">({new Date(latest.weighing_date).toLocaleDateString('fr-FR')})</span></p>
                    </div>
                    <div className="ml-4">
                      <p className="text-xs text-green-600 mb-0.5">Variation globale</p>
                      <p className={`font-bold text-lg ${color}`}>{diff > 0 ? '+' : ''}{diff.toFixed(1)} kg ({pct > 0 ? '+' : ''}{pct.toFixed(1)} %)</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>

        {weights.length >= 2 && refWeight && latestWeight && (() => {
          // Calcul évolution depuis date d'entrée (si différente de première pesée)
          const dateEntree = resident?.date_entree ? new Date(resident.date_entree) : null;
          const sortedAscAll = [...weights].sort((a, b) => new Date(a.weighing_date) - new Date(b.weighing_date));
          const weightAtEntree = dateEntree
            ? sortedAscAll.find(w => new Date(w.weighing_date) >= dateEntree) || null
            : null;
          const isEntreeRefDifferent = weightAtEntree && weightAtEntree.id !== refWeight.id;
          const entreeDiff = weightAtEntree ? latestWeight.weight - weightAtEntree.weight : null;
          const entreePct = weightAtEntree ? (entreeDiff / weightAtEntree.weight) * 100 : null;
          const entreePctColor = entreePct === null ? '' : entreePct <= -10 ? 'text-red-700' : entreePct <= -5 ? 'text-orange-600' : entreePct >= 5 ? 'text-purple-700' : 'text-green-700';
          const entreeBadgeColor = entreePct === null ? '' : entreePct <= -10 ? 'bg-red-100 text-red-700' : entreePct <= -5 ? 'bg-orange-100 text-orange-700' : entreePct >= 5 ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700';

          return (
        <div className={`border rounded-lg p-4 mb-8 ${refCardColor}`}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              Depuis la première pesée
              <span className="text-xs font-normal text-slate-400">({new Date(refWeight.weighing_date).toLocaleDateString('fr-FR')})</span>
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Référence</p>
                <p className="text-2xl font-bold text-slate-800">{refWeight.weight.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-400">{new Date(refWeight.weighing_date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-slate-300 text-3xl font-light">→</div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Actuel</p>
                <p className="text-2xl font-bold text-slate-800">{latestWeight.weight.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
                <p className="text-xs text-slate-400">{new Date(latestWeight.weighing_date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className={`ml-auto text-center px-5 py-3 rounded-xl ${refValueColor}`}>
                <p className="text-xs font-medium opacity-70 mb-1">Variation totale</p>
                <p className="text-3xl font-bold">{totalDiffKg > 0 ? '+' : ''}{totalDiffKg.toFixed(1)} kg</p>
                <p className="text-sm font-semibold">{totalPct > 0 ? '+' : ''}{totalPct.toFixed(1)}%</p>
              </div>
            </div>
            {lossAlerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                {lossAlerts.map((a, i) => (
                  <div key={i} className="bg-white border border-red-200 rounded-lg px-3 py-2 text-sm">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1.5">⚠ Critère HAS : perte &gt; {a.critere}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Référence ({new Date(a.refDate).toLocaleDateString('fr-FR')})</p>
                        <p className="text-lg font-bold text-slate-700">{Number(a.refWeight).toFixed(1)} kg</p>
                      </div>
                      <div className="text-red-400 text-xl">→</div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Actuel ({new Date(a.latestDate).toLocaleDateString('fr-FR')})</p>
                        <p className="text-lg font-bold text-slate-700">{Number(a.latestWeight).toFixed(1)} kg</p>
                      </div>
                      <div className="ml-auto bg-red-100 text-red-700 rounded-lg px-3 py-1.5 text-center">
                        <p className="text-xs font-medium opacity-70">Variation</p>
                        <p className="text-xl font-bold">−{a.value} kg</p>
                        <p className="text-sm font-semibold">−{a.pct}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {gainAlerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-200 space-y-2">
                {gainAlerts.map((a, i) => (
                  <div key={i} className="bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">⚠ Alerte surcharge : prise &gt; {a.critere}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Référence ({new Date(a.refDate).toLocaleDateString('fr-FR')})</p>
                        <p className="text-lg font-bold text-slate-700">{Number(a.refWeight).toFixed(1)} kg</p>
                      </div>
                      <div className="text-purple-400 text-xl">→</div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Actuel ({new Date(a.latestDate).toLocaleDateString('fr-FR')})</p>
                        <p className="text-lg font-bold text-slate-700">{Number(a.latestWeight).toFixed(1)} kg</p>
                      </div>
                      <div className="ml-auto bg-purple-100 text-purple-700 rounded-lg px-3 py-1.5 text-center">
                        <p className="text-xs font-medium opacity-70">Variation</p>
                        <p className="text-xl font-bold">+{a.value} kg</p>
                        <p className="text-sm font-semibold">+{a.pct}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Évolution depuis la date d'entrée */}
            {isEntreeRefDifferent && weightAtEntree && entreeDiff !== null && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  🏠 Depuis l'entrée ({new Date(resident.date_entree).toLocaleDateString('fr-FR')})
                </p>
                <div className="flex items-center gap-4 flex-wrap bg-white/60 rounded-lg px-3 py-2">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-0.5">Poids à l'entrée</p>
                    <p className="text-xl font-bold text-slate-800">{weightAtEntree.weight.toFixed(1)} <span className="text-xs font-normal">kg</span></p>
                    <p className="text-xs text-slate-400">{new Date(weightAtEntree.weighing_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-slate-300 text-2xl font-light">→</div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-0.5">Actuel</p>
                    <p className="text-xl font-bold text-slate-800">{latestWeight.weight.toFixed(1)} <span className="text-xs font-normal">kg</span></p>
                    <p className="text-xs text-slate-400">{new Date(latestWeight.weighing_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className={`ml-auto text-center px-4 py-2 rounded-lg ${entreeBadgeColor}`}>
                    <p className="text-xs font-medium opacity-70 mb-0.5">Variation depuis entrée</p>
                    <p className="text-2xl font-bold">{entreeDiff > 0 ? '+' : ''}{entreeDiff.toFixed(1)} kg</p>
                    <p className="text-sm font-semibold">{entreePct > 0 ? '+' : ''}{entreePct.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}
            {/* Si la première pesée coïncide avec l'entrée, juste l'afficher clairement */}
            {!isEntreeRefDifferent && dateEntree && weightAtEntree && (
              <p className="text-xs text-slate-400 mt-2 italic">
                La première pesée ({new Date(refWeight.weighing_date).toLocaleDateString('fr-FR')}) correspond à la date d'entrée ou est la plus proche de celle-ci.
              </p>
            )}
          </div>
          );
        })()}

        {chartData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Évolution du poids</h2>
            <div className="w-full h-72 bg-white border border-slate-300 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} domain={[dataMin => Math.floor(dataMin) - 2, dataMax => Math.ceil(dataMax) + 2]} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f1f5f9' }} />
                  <Legend />
                  {entreeLabel && (
                    <ReferenceLine
                      x={entreeLabel}
                      stroke="#6366f1"
                      strokeDasharray="5 3"
                      strokeWidth={2}
                      label={{ value: '🏠 Entrée', position: 'insideTopRight', fill: '#6366f1', fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                  {suppItems.map((sup, idx) => {
                    if (!sup.date_debut) return null;
                    const colors = ['#10b981','#0891b2','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];
                    const color = colors[idx % colors.length];
                    const label = new Date(sup.date_debut).toLocaleDateString('fr-FR');
                    return (
                      <ReferenceLine
                        key={idx}
                        x={label}
                        stroke={color}
                        strokeDasharray="5 3"
                        strokeWidth={2}
                        label={{ value: `💊 ${sup.type || 'Compléments'}`, position: 'insideTopLeft', fill: color, fontSize: 11, fontWeight: 600 }}
                      />
                    );
                  })}
                  <Line
                   type="monotone"
                   dataKey="poids"
                   stroke="#3b82f6"
                   strokeWidth={2}
                   dot={{ fill: '#3b82f6', r: 3 }}
                   name="Poids (kg)"
                   connectNulls={true}
                   label={{ position: 'top', fontSize: 10, fill: '#1e40af', fontWeight: 600, formatter: v => v ? `${v.toFixed(1)}` : '' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 text-center pt-6 border-t border-slate-300 mt-8">
          Document confidentiel - Établissement de Santé | {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
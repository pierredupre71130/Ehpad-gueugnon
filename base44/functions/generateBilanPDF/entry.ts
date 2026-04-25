import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const BLANK_PDF_URL = "https://media.base44.com/files/public/6995c3a5ea2c6edf28d3279a/b00a4a18b_0157_001.pdf";

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

// Examens hors formulaire : texte libre au lieu d'une croix
// Pour en ajouter un autre, ajouter simplement une ligne ici
const TEXT_EXAMS = {
  "Phénobarbitalémie": "Phénobarbitalémie (tube rouge) A jeun",
};

const EXAM_TUBE = {
  // VERT
  "β-HCG": "vert", "BHCG": "vert", "NT-pro-BNP": "vert", "Troponine": "vert",
  "Phosphatases alcalines": "vert", "PAL": "vert", "Iono complet": "vert", "Ionogramme": "vert",
  "CPK": "vert", "Urée": "vert", "LDH": "vert", "Créatinine": "vert", "Calcium": "vert",
  "Iono simple": "vert", "Calcium corrigé": "vert", "Potassium": "vert", "Phosphore": "vert",
  "Réserve alcaline": "vert", "EAL": "vert", "Cholestérol": "vert", "Protéines totales": "vert",
  "Triglycérides": "vert", "Acide urique": "vert", "Ferritine": "vert",
  "Lipase": "vert", "Amylase": "vert", "Bilirubine": "vert", "Coef. transferrine": "vert",
  "SGOT": "vert", "Transferrine": "vert", "SGPT": "vert", "Gamma GT": "vert", "Magnésium": "vert",
  "T4L": "vert", "T3L": "vert", "TSH": "vert", "T.S.H": "vert",
  "Albumine": "vert", "CRP": "vert", "IgG": "vert", "Alcoolémie": "vert",
  "Haptoglobine": "vert", "Procalcitonine": "vert", "Préalbumine": "vert",
  // VIOLET
  "NFS": "violet", "Numération formule": "violet", "Plaquettes": "violet",
  "Réticulocytes": "violet", "Vitesse de sédimentation": "violet", "VS": "violet",
  "Groupe sanguin": "violet", "Coombs direct": "violet", "RAI": "violet",
  "HbA1c": "violet", "Hémoglobine glyquée": "violet", "HBA1C": "violet",
  // GRIS
  "Glycémie": "gris", "Glycémie à jeun": "gris", "Cycle glycémique": "gris",
  // BLEU
  "TP/INR": "bleu", "INR": "bleu", "TCK": "bleu", "Fibrinogène": "bleu",
  "D-dimères": "bleu", "Anti Xa": "bleu", "PDF": "bleu", "TCA": "bleu",
  // JAUNE
  "Electrophorèse protéines": "jaune", "Immunoélectrophorèse": "jaune",
  "Calcium ionisé": "jaune", "Vitamine B12": "jaune", "Folates": "jaune",
  "Vitamine B9": "jaune", "CDT": "jaune", "Béta2microglobuline": "jaune", "Vitamine D": "jaune",
  // ROUGE
  "Hépatite A IgG": "rouge", "BW": "rouge", "Syphilis": "rouge",
  "Hépatite A IgM": "rouge", "Borréliose": "rouge", "Hépatite B Ag HBs": "rouge",
  "EBV": "rouge", "Hépatite B Ac anti HBs": "rouge", "HIV": "rouge",
  "Hépatite B Ac anti HBc": "rouge", "Toxoplasmose": "rouge", "Hépatite C": "rouge",
  "CMV": "rouge", "Hépatite E": "rouge", "Rubéole": "rouge",
  "Facteurs rhumatoïdes": "rouge", "Ac anti-CCP": "rouge",
  "Prolactine": "rouge", "Cortisol": "rouge", "Oestradiol": "rouge",
  "Parathormone": "rouge", "PTH": "rouge", "Progestérone": "rouge",
  "FSH": "rouge", "LH": "rouge", "Testostérone": "rouge", "AMH": "rouge",
  "ACE": "rouge", "CA 15-3": "rouge", "AFP": "rouge", "CA 125": "rouge",
  "CA 19-9": "rouge", "PSA": "rouge", "PSA libre": "rouge",
  "Lithium": "rouge", "Digoxine": "rouge", "Paracétamol": "rouge",
  "Vancomycine": "rouge", "Gentamicine": "rouge", "Amikacine": "rouge",
  "Phénobarbitalémie": "rouge",
};

const CHECK_COORDS = {
  // === VERT - BIOCHIMIE-ENZYMOLOGIE ===
  "β-HCG": [18, 649],
  "BHCG": [18, 649],
  "NT-pro-BNP": [18, 636],
  "Troponine": [120, 636],
  "Phosphatases alcalines": [120, 623],
  "PAL": [120, 623],
  "Iono complet": [18, 623],
  "Ionogramme": [18, 623],
  "CPK": [200, 623],
  "Urée": [18, 610],
  "LDH": [120, 610],
  "Créatinine": [18, 597],
  "Calcium": [120, 597],
  "Iono simple": [18, 584],
  "Calcium corrigé": [120, 584],
  "Potassium": [18, 571],
  "Phosphore": [120, 571],
  "Réserve alcaline": [18, 558],
  "EAL": [120, 558],
  "Cholestérol": [120, 545],
  "Protéines totales": [18, 545],
  "Glycémie": [18, 532],
  "Triglycérides": [120, 532],
  "Acide urique": [18, 519],
  "Ferritine": [120, 519],
  "Lipase": [18, 506],
  "Amylase": [70, 506],
  "Bilirubine": [18, 493],
  "Coef. transferrine": [120, 493],
  "SGOT": [18, 480],
  "Transferrine": [120, 480],
  "SGPT": [70, 480],
  "Gamma GT": [200, 480],
  "Magnésium": [120, 467],
  "T4L": [18, 467],
  "T3L": [50, 467],
  "TSH": [82, 467],
  "T.S.H": [82, 467],
  "Albumine": [18, 454],
  "CRP": [120, 454],
  "IgG": [18, 441],
  "Alcoolémie": [120, 441],
  "Haptoglobine": [18, 428],
  "Procalcitonine": [120, 428],
  "Préalbumine": [200, 428],
  // === VIOLET - HEMATOLOGIE ===
  "NFS": [18, 369],
  "Numération formule": [18, 369],
  "Plaquettes": [18, 367],
  "Réticulocytes": [120, 380],
  "Vitesse de sédimentation": [120, 367],
  "VS": [120, 367],
  "Groupe sanguin": [18, 407],
  "Coombs direct": [120, 407],
  "RAI": [120, 394],
  // === VIOLET - HbA1c ===
  "HbA1c": [18, 347],
  "Hémoglobine glyquée": [18, 347],
  "HBA1C": [18, 347],
  // === GRIS ===
  "Glycémie à jeun": [18, 312],
  "Cycle glycémique": [140, 299],
  // === BLEU - HEMOSTASE ===
  "TP/INR": [18, 246],
  "INR": [18, 246],
  "TCK": [18, 233],
  "Fibrinogène": [120, 246],
  "D-dimères": [120, 233],
  "Anti Xa": [18, 220],
  "PDF": [120, 220],
  "TCA": [18, 207],
  // === JAUNE - BIOCHIMIE SPECIALISEE ===
  "Electrophorèse protéines": [310, 649],
  "Immunoélectrophorèse": [310, 636],
  "Calcium ionisé": [310, 623],
  "Vitamine B12": [390, 623],
  "Folates": [470, 623],
  "Vitamine B9": [470, 623],
  "CDT": [310, 610],
  "Béta2microglobuline": [390, 610],
  "Vitamine D": [310, 597],
  // === SEROLOGIE ===
  "Hépatite A IgG": [310, 558],
  "BW": [450, 558],
  "Syphilis": [450, 558],
  "Hépatite A IgM": [310, 545],
  "Borréliose": [450, 545],
  "Hépatite B Ag HBs": [310, 532],
  "EBV": [450, 532],
  "Hépatite B Ac anti HBs": [310, 519],
  "HIV": [450, 519],
  "Hépatite B Ac anti HBc": [310, 506],
  "Toxoplasmose": [450, 506],
  "Hépatite C": [310, 493],
  "CMV": [450, 493],
  "Hépatite E": [310, 480],
  "Rubéole": [450, 480],
  "Facteurs rhumatoïdes": [310, 467],
  "Ac anti-CCP": [450, 467],
  // === HORMONOLOGIE ===
  "Prolactine": [310, 432],
  "Cortisol": [390, 432],
  "Oestradiol": [450, 432],
  "Parathormone": [310, 419],
  "PTH": [310, 419],
  "Progestérone": [390, 419],
  "FSH": [310, 406],
  "LH": [390, 406],
  "Testostérone": [310, 393],
  "AMH": [390, 393],
  // === MARQUEURS TUMORAUX ===
  "ACE": [310, 362],
  "CA 15-3": [390, 362],
  "AFP": [450, 362],
  "CA 125": [310, 349],
  "CA 19-9": [390, 349],
  "PSA": [450, 349],
  "PSA libre": [490, 349],
  // === MEDICAMENTS ===
  "Lithium": [310, 312],
  "Digoxine": [310, 299],
  "Paracétamol": [390, 299],
  "Vancomycine": [450, 299],
  "Gentamicine": [310, 286],
  "Amikacine": [390, 286],
  // === HORS FORMULAIRE (texte libre) ===
  "Phénobarbitalémie": [310, 273],
};

const EXAM_ALIASES = {
  "Ionogramme": "Iono complet",
  "Iono": "Iono complet",
  "β-HCG": "BHCG",
  "Phosphatases alcalines": "PAL",
  "Albuminémie": "Albumine",
  "Gamma GT": "Gamma GT",
  "NFS": "NFS",
  "Glycémie": "Glycémie",
  "CRP": "CRP",
  "TSH": "TSH",
  "HBG": "HbA1c",
  "PSA": "PSA",
  "PTH": "PTH",
  "Ferritine": "Ferritine",
  "Créatinine": "Créatinine",
  "Vitamine D": "Vitamine D",
  "INR": "INR",
  "VS": "VS",
  "Calcémie": "Calcium",
  "Calcium": "Calcium",
  "Vit B12": "Vitamine B12",
  "Vitamine B12": "Vitamine B12",
  "Vit D": "Vitamine D",
  "Vit B9": "Folates",
  "Folates (Vit B9)": "Folates",
};

function resolveExam(name) {
  if (!name) return null;
  const normalized = name.trim();
  if (EXAM_ALIASES[normalized]) return EXAM_ALIASES[normalized];
  for (const key of Object.keys(CHECK_COORDS)) {
    if (key.toLowerCase() === normalized.toLowerCase()) return key;
  }
  for (const key of Object.keys(CHECK_COORDS)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) return key;
    if (key.toLowerCase().includes(normalized.toLowerCase())) return key;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { patientName, prenom, dateNaissance, prescripteur, datePrescription, datePrescriptionOrdonnance, aJeun, poids, examens, nbEchantillons, service, calibration, examCalibration, croix_seulement } = body;

    let calib = { ...DEFAULTS };
    if (calibration) {
      calib = { ...DEFAULTS, ...calibration };
    } else {
      const calibRecords = await base44.asServiceRole.entities.PDFCalibration.list();
      if (calibRecords.length > 0) calib = { ...DEFAULTS, ...calibRecords[0] };
    }

    let EXAM_COORDS_LIVE = CHECK_COORDS;
    if (examCalibration) {
      EXAM_COORDS_LIVE = {};
      for (const [name, coords] of Object.entries(examCalibration)) {
        if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords) {
          EXAM_COORDS_LIVE[name] = [coords.x, coords.y];
        }
      }
      for (const [name, defaultCoords] of Object.entries(CHECK_COORDS)) {
        if (!EXAM_COORDS_LIVE[name]) {
          EXAM_COORDS_LIVE[name] = defaultCoords;
        }
      }
    } else {
      const examCalibRecords = await base44.asServiceRole.entities.ExamCalibration.list();
      if (examCalibRecords.length > 0) {
        EXAM_COORDS_LIVE = {};
        for (const rec of examCalibRecords) {
          EXAM_COORDS_LIVE[rec.exam_name] = [rec.x, rec.y];
        }
      }
    }

    let pdfDoc, page, width, height;
    if (croix_seulement) {
      pdfDoc = await PDFDocument.create();
      width = 595.28; height = 841.89; // A4
      page = pdfDoc.addPage([width, height]);
    } else {
      const pdfBytes = await fetch(BLANK_PDF_URL).then(r => r.arrayBuffer());
      pdfDoc = await PDFDocument.load(pdfBytes);
      page = pdfDoc.getPages()[0];
      ({ width, height } = page.getSize());
    }

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const textSize = 8;
    const checkSize = 9;

    if (patientName) {
      page.drawText(patientName.toUpperCase(), {
        x: calib.nom_x, y: height - calib.nom_y_from_top,
        size: textSize, font: helveticaBold, color: black,
      });
    }
    if (prenom) {
      page.drawText(prenom, {
        x: calib.prenom_x, y: height - calib.prenom_y_from_top,
        size: textSize, font: helvetica, color: black,
      });
    }
    if (prescripteur) {
      page.drawText(prescripteur, {
        x: calib.prescripteur_x, y: height - calib.prescripteur_y_from_top,
        size: textSize, font: helvetica, color: black,
      });
    }
    if (datePrescription) {
      const parts = datePrescription.split('/');
      const day = (parts[0] || '').padStart(2, '0');
      const month = (parts[1] || '').padStart(2, '0');
      const year = parts[2] || '';
      page.drawText(day, { x: calib.jour_x, y: height - calib.jour_y_from_top, size: textSize, font: helvetica, color: black });
      page.drawText(month, { x: calib.mois_x, y: height - calib.mois_y_from_top, size: textSize, font: helvetica, color: black });
      page.drawText(year, { x: calib.annee_x, y: height - calib.annee_y_from_top, size: textSize, font: helvetica, color: black });
    }
    if (datePrescriptionOrdonnance) {
      // Accepte YYYY-MM-DD ou DD/MM/YYYY
      let day2, month2, year2;
      if (datePrescriptionOrdonnance.includes('-')) {
        const p = datePrescriptionOrdonnance.split('-');
        year2 = p[0]; month2 = (p[1] || '').padStart(2, '0'); day2 = (p[2] || '').padStart(2, '0');
      } else {
        const p = datePrescriptionOrdonnance.split('/');
        day2 = (p[0] || '').padStart(2, '0'); month2 = (p[1] || '').padStart(2, '0'); year2 = p[2] || '';
      }
      page.drawText(day2, { x: calib.presc_jour_x, y: height - calib.presc_jour_y_from_top, size: textSize, font: helvetica, color: black });
      page.drawText(month2, { x: calib.presc_mois_x, y: height - calib.presc_mois_y_from_top, size: textSize, font: helvetica, color: black });
      page.drawText(year2, { x: calib.presc_annee_x, y: height - calib.presc_annee_y_from_top, size: textSize, font: helvetica, color: black });
    }

    const tubesUsed = new Set();
    for (const exam of (examens || [])) {
      const resolved = resolveExam(exam);
      if (!resolved || !EXAM_TUBE[resolved]) continue;
      const tubeColor = EXAM_TUBE[resolved];
      if (tubeColor === 'violet') {
        if (['Groupe sanguin', 'Coombs direct', 'RAI'].includes(resolved)) {
          tubesUsed.add('violet_gs');
        } else if (['NFS', 'Numération formule', 'Réticulocytes', 'Plaquettes', 'Vitesse de sédimentation', 'VS'].includes(resolved)) {
          tubesUsed.add('violet_nfs');
        } else if (['HbA1c', 'Hémoglobine glyquée', 'HBA1C'].includes(resolved)) {
          tubesUsed.add('violet_hba1c');
        }
      } else {
        tubesUsed.add(tubeColor);
      }
    }
    const nbTubes = tubesUsed.size || 1;
    page.drawText(String(nbTubes), {
      x: calib.nb_echantillons_x, y: height - calib.nb_echantillons_y_from_top,
      size: textSize, font: helveticaBold, color: black,
    });

    // ─── COCHER LES CASES / TEXTES LIBRES ────────────────────────────────────
    const checked = new Set();
    for (const exam of (examens || [])) {
      const resolved = resolveExam(exam);
      if (!resolved) continue;
      if (checked.has(resolved)) continue;
      checked.add(resolved);

      const coords = EXAM_COORDS_LIVE[resolved];
      if (!coords) continue;
      const [cx, cy] = coords;

      // Examen hors formulaire → texte libre (applique les mêmes offsets que les croix)
      if (TEXT_EXAMS[resolved]) {
        page.drawText(TEXT_EXAMS[resolved], {
          x: cx + calib.check_x_offset, y: cy + calib.check_y_offset,
          size: 9, font: helvetica, color: black,
        });
        continue;
      }

      // Examen standard → croix X dans la case
      let extraY = 0;
      if (resolved === "NFS" || resolved === "Numération formule") extraY = calib.nfs_y_extra || 0;
      page.drawText("X", {
        x: cx + calib.check_x_offset, y: cy + calib.check_y_offset + extraY,
        size: checkSize, font: helveticaBold, color: black,
      });
    }

    if (aJeun) {
      page.drawText("X", {
        x: calib.ajeun_x, y: height - calib.ajeun_y_from_top,
        size: checkSize, font: helveticaBold, color: black,
      });
    }
    if (poids !== undefined && poids !== null) {
      page.drawText(String(poids), {
        x: calib.poids_x, y: height - calib.poids_y_from_top,
        size: textSize, font: helvetica, color: black,
      });
    }

    const filledPdfBytes = await pdfDoc.save();
    const uint8 = new Uint8Array(filledPdfBytes);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    return Response.json({ pdf_base64: base64 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
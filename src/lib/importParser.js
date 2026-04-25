import * as pdfjs from 'pdfjs-dist';
// Charger le worker depuis un CDN avec la version exacte installée
// Le fichier bundlé local est bloqué en production sur Base44 (CSP)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m + 1}, (_, i) =>
    Array.from({length: n + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Parse le texte brut (OCR ou PDF) en liste de patients avec leurs lignes
export function parseNursingText(rawText) {
  const cleaned = rawText.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  const allLines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const patientRe = /^Patient\s*:\s*(.+)$/i;
  const patientsMap = {}; // nom → { name, lignes[] }
  let currentKey = null;

  for (const line of allLines) {
    const m = line.match(patientRe);
    if (m) {
      const key = m[1].trim().toUpperCase();
      if (!patientsMap[key]) patientsMap[key] = { name: m[1].trim(), lignes: [] };
      currentKey = key;
    } else if (currentKey && line.length > 3) {
      const lNorm = normalize(line);
      const si_besoin = lNorm.includes("si besoin") || lNorm.includes("a la demande") || lNorm.includes("a la dem");
      const dateM = line.match(/(\d{2}\/\d{2}\/(\d{2}|\d{4}))/);
      const date_heure = dateM ? dateM[1] : null;
      patientsMap[currentKey].lignes.push({ texte: line, si_besoin, date_heure });
    }
  }

  return Object.values(patientsMap);
}

// Extrait le numéro de chambre et déduit l'étage (RDC < 100, 1ER >= 100)
function deduceFloorFromRoom(roomNumber) {
  const num = parseInt(roomNumber, 10);
  if (isNaN(num)) return null;
  return num >= 100 ? "1ER" : "RDC";
}

// Normalise une date du format DD/MM/YY ou DD/MM/YYYY vers YYYY-MM-DD
function normalizeDateFormat(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{2,4})/);
  if (!match) return null;
  let [, day, month, year] = match;
  if (year.length === 2) {
    const yNum = parseInt(year, 10);
    year = (yNum > 50 ? "19" : "20") + year;
  }
  return `${year}-${month}-${day}`;
}

// Extrait les groupes patient+contentions depuis une liste de patients parsés
export function extractContentionGroups(patients, residents, keywords, floor) {
  const seenNames = new Set();
  const groups = [];

  for (const p of patients) {
    const key = normalize(p.name || "");
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    let roomNumber = null;
    for (const ligne of p.lignes || []) {
      const roomMatch = ligne.texte.match(/[Cc]hambre\s*:?\s*[A-Za-z]*(\d+)/i);
      if (roomMatch) {
        roomNumber = roomMatch[1];
        break;
      }
    }
    
    const deducedFloor = roomNumber ? deduceFloorFromRoom(roomNumber) : null;
    if (floor && deducedFloor && deducedFloor !== floor) {
      continue;
    }
    
    const pParts = key.split(/\s+/).filter(w => w.length > 2);
    let residentId = "";
    if (pParts.length > 0) {
      const matched = residents.find((r) => {
        const ln = normalize(r.last_name || "");
        const fn = normalize(r.first_name || "");
        const lnMatch = pParts.some(part => ln === part || (ln.length > 3 && levenshtein(ln, part) <= 1));
        const fnMatch = !fn || pParts.some(part => fn === part || (fn.length > 3 && levenshtein(fn, part) <= 1));
        return lnMatch && (fnMatch || pParts.length === 1);
      });
      if (matched) residentId = matched.id;
    }

    const contentionsByType = {};
    const lines = p.lignes || [];
    const contentionCategories = Object.fromEntries(
      Object.entries(keywords).filter(([cat]) => cat !== "si besoin")
    );
    const siBesoinKeywords = keywords["si besoin"] || [];
    
    for (let i = 0; i < lines.length; i++) {
      const ligne = lines[i];
      const texteUpper = (ligne.texte || "").toUpperCase();
      
      for (const [cat, kwList] of Object.entries(contentionCategories)) {
        if (contentionsByType[cat]) continue;
        
        const matchedKw = kwList.find(kw => kw.trim() && texteUpper.includes(kw.toUpperCase()));
        if (matchedKw) {
          let date_prescription = ligne.date_heure ? normalizeDateFormat(ligne.date_heure) : null;
          let si_besoin = ligne.si_besoin || false;
          
          // Check for "si besoin" keywords in current line
          if (!si_besoin) {
            const lNorm = normalize(ligne.texte || "");
            si_besoin = siBesoinKeywords.some(kw => lNorm.includes(normalize(kw)));
          }
          
          if (!date_prescription) {
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
              const nextLineUpper = (lines[j].texte || "").toUpperCase();
              const dateMatch = nextLineUpper.match(/DEBUT\s+LE\s+(\d{2}\/\d{2}\/\d{2,4})/) || nextLineUpper.match(/(\d{2}\/\d{2}\/\d{2,4})/);
              if (dateMatch) {
                date_prescription = normalizeDateFormat(dateMatch[1]);
                break;
              }
            }
            if (!date_prescription) {
              for (let j = Math.max(0, i - 5); j < i; j++) {
                const prevLineUpper = (lines[j].texte || "").toUpperCase();
                const dateMatch = prevLineUpper.match(/DEBUT\s+LE\s+(\d{2}\/\d{2}\/\d{2,4})/) || prevLineUpper.match(/(\d{2}\/\d{2}\/\d{2,4})/);
                if (dateMatch) {
                  date_prescription = normalizeDateFormat(dateMatch[1]);
                  break;
                }
              }
            }
          }
          
          if (!si_besoin) {
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              const nextLine = normalize(lines[j].texte || "");
              if (nextLine.includes("si besoin") || nextLine.includes("a la demande") || nextLine.includes("a la dem")) {
                si_besoin = true;
                break;
              }
            }
          }
          
          contentionsByType[cat] = {
            type: cat,
            date_prescription,
            si_besoin,
            matched_line: ligne.texte,
            selected: true,
          };
        }
      }
    }

    const contentions = Object.values(contentionsByType);
    if (contentions.length > 0) {
      groups.push({ patient_name: p.name || "", resident_id: residentId, contentions });
    }
  }

  return groups;
}

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items;
    let lastY = null;
    for (const item of items) {
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        fullText += "\n";
      } else if (fullText.length > 0 && item.str && !fullText.endsWith(" ") && !item.str.startsWith(" ")) {
        fullText += " ";
      }
      fullText += item.str;
      if (item.str.trim()) lastY = y;
    }
    fullText += "\n";
  }
  return fullText;
}

const extractDateFromText = (text) => {
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
  ];

  const dateStrings = [];
  datePatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dateStrings.push(match[0]);
    }
  });

  return dateStrings.map((dateStr) => {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) {
        [year, month, day] = parts;
      } else {
        [day, month, year] = parts;
      }
      if (year.length === 2) year = (parseInt(year) > 50 ? "19" : "20") + year;
      day = day.padStart(2, "0");
      month = month.padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return null;
  }).filter(Boolean);
};

const parseTextContent = (text, keywords) => {
  const results = [];
  const lines = text.split("\n");

  for (const [type, typeKeywords] of Object.entries(keywords)) {
    const matchedLines = [];
    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      typeKeywords.forEach((keyword) => {
        if (lowerLine.includes(keyword.toLowerCase())) matchedLines.push(line);
      });
    });

    if (matchedLines.length > 0) {
      const combinedText = matchedLines.join(" ");
      const dates = extractDateFromText(combinedText);
      results.push({
        type,
        date_prescription: dates[0] || null,
        date_fin: dates[1] || null,
        selected: false,
        source: matchedLines[0],
      });
    }
  }

  return results;
};

export const parseContentionFile = async (file, keywords) => {
  if (file.type === "application/pdf") {
    const text = await extractTextFromPDF(file);
    return parseTextContent(text, keywords);
  } else {
    const text = await file.text();
    return parseTextContent(text, keywords);
  }
};
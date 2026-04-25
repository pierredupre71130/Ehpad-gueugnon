import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { floor } = body;

    // Récupère résidents + vaccinations en mode service (pas de problème d'auth)
    const residents = await base44.asServiceRole.entities.Resident.filter({ floor });
    const vaccinations = await base44.asServiceRole.entities.Vaccination.filter({});

    // Crée un objet de vaccinatio par resident pour accès rapide
    const vaccByResident = {};
    vaccinations.forEach(v => {
      if (!vaccByResident[v.resident_id]) {
        vaccByResident[v.resident_id] = [];
      }
      vaccByResident[v.resident_id].push(v);
    });

    // Filtre vaccinations pour 2026
    const residentsSorted = residents.sort((a, b) => {
      const numA = parseInt(a.room) || 999;
      const numB = parseInt(b.room) || 999;
      return numA - numB;
    });

    const currentYear = new Date().getFullYear();

    // Crée PDF A4 paysage
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pageWidth - 2 * margin;

    let yPos = margin;
    const lineHeight = 5;
    const maxY = pageHeight - margin;
    let pageNum = 1;

    // En-tête
    const addHeader = () => {
      yPos = margin;
      doc.setFontSize(10);
      doc.text(`Recueil des choix de vaccinations - ${floor} - ${currentYear}`, margin, yPos);
      yPos += 8;
      
      // En-têtes colonnes
      doc.setFontSize(7);
      const colWidths = [20, 15, 18, 18, 18, 18, 30];
      const cols = ['Résid', 'Chambre', 'COVID Inj.1', 'COVID Inj.2', 'COVID Inj.3', 'Grippe', 'Infos'];
      let xPos = margin;
      cols.forEach((col, i) => {
        doc.text(col, xPos, yPos);
        xPos += colWidths[i];
      });
      yPos += 5;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    };

    const addNewPage = () => {
      doc.addPage();
      pageNum++;
      addHeader();
    };

    addHeader();

    // Ajoute les résidents
    doc.setFontSize(6.5);
    const colWidths = [20, 15, 18, 18, 18, 18, 30];

    residentsSorted.forEach(resident => {
      const vacc = vaccByResident[resident.id]?.find(v => v.year === currentYear) || {};
      
      const covidInj1 = vacc.covid_inj1 || '—';
      const covidInj2 = vacc.covid_inj2 || '—';
      const covidInj3 = vacc.covid_inj3 || '—';
      const grippeInj1 = vacc.grippe_inj1 || '—';
      const infos = vacc.infos ? vacc.infos.substring(0, 30) : '';

      // Vérifie si on a besoin d'une nouvelle page
      if (yPos + lineHeight > maxY) {
        addNewPage();
      }

      const cols = [
        resident.last_name.substring(0, 12),
        resident.room,
        covidInj1,
        covidInj2,
        covidInj3,
        grippeInj1,
        infos
      ];

      let xPos = margin;
      cols.forEach((col, i) => {
        doc.text(String(col), xPos, yPos);
        xPos += colWidths[i];
      });

      yPos += lineHeight;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=vaccinations_${floor}_${currentYear}.pdf`
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
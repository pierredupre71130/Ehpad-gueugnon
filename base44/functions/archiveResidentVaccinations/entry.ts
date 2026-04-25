import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Only act on update events where resident is now archived
    if (event?.type !== 'update') return Response.json({ ok: true });
    if (!data?.archived) return Response.json({ ok: true });

    const residentId = data.id;
    const residentName = `${data.last_name || ''} ${data.first_name || ''}`.trim();

    // Find all vaccinations for this resident
    const vaccinations = await base44.asServiceRole.entities.Vaccination.filter({
      resident_id: residentId,
      archived: false,
    });

    // Archive them all
    for (const v of vaccinations) {
      await base44.asServiceRole.entities.Vaccination.update(v.id, { archived: true });
    }

    return Response.json({ ok: true, archived: vaccinations.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
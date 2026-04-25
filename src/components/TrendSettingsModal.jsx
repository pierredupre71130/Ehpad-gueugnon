import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const DEFAULT_ALERT_SETTINGS = {
  loss_1m_pct: 5, loss_1m_days: 30,
  loss_6m_pct: 10, loss_6m_days: 180,
  gain_short_pct: 5, gain_short_days: 40,
  gain_long_pct: 10, gain_long_days: 180,
};

export { DEFAULT_ALERT_SETTINGS };

function Field({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value))}
        step="0.1" className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function TrendSettingsModal({ isOpen, onClose, settings, onSave }) {
  const [local, setLocal] = useState(settings);

  useEffect(() => { setLocal(settings); }, [settings]);

  if (!isOpen) return null;

  const set = (key) => (val) => setLocal(v => ({ ...v, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-800">Paramètres tendance & alertes poids</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Flèches tendance */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Flèches de tendance (entre 2 pesées)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seuil perte ↓ (%)" hint="ex: -2 pour -2%" value={local.downThreshold} onChange={set('downThreshold')} />
            <Field label="Seuil gain ↑ (%)" hint="ex: 2 pour +2%" value={local.upThreshold} onChange={set('upThreshold')} />
          </div>
        </div>

        {/* Alertes dénutrition */}
        <div className="mb-5 border border-red-100 rounded-lg p-4 bg-red-50/40">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Alertes dénutrition (critères HAS)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Perte % (période courte)" value={local.loss_1m_pct} onChange={set('loss_1m_pct')} />
            <Field label="Nb jours (période courte)" hint="Défaut : 30 jours" value={local.loss_1m_days} onChange={set('loss_1m_days')} />
            <Field label="Perte % (période longue)" value={local.loss_6m_pct} onChange={set('loss_6m_pct')} />
            <Field label="Nb jours (période longue)" hint="Défaut : 180 jours" value={local.loss_6m_days} onChange={set('loss_6m_days')} />
          </div>
        </div>

        {/* Alertes surcharge */}
        <div className="mb-6 border border-orange-100 rounded-lg p-4 bg-orange-50/40">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3">Alertes surcharge (prise de poids)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gain % (période courte)" value={local.gain_short_pct} onChange={set('gain_short_pct')} />
            <Field label="Nb jours (période courte)" hint="Défaut : 40 jours" value={local.gain_short_days} onChange={set('gain_short_days')} />
            <Field label="Gain % (période longue)" value={local.gain_long_pct} onChange={set('gain_long_pct')} />
            <Field label="Nb jours (période longue)" hint="Défaut : 180 jours" value={local.gain_long_days} onChange={set('gain_long_days')} />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
          <button onClick={() => { onSave(local); onClose(); }} className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
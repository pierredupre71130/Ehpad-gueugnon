import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

const DEFAULT_CONFIG = {
  lit: ["SANGLE VENTRALE"],
  fauteuil: ["CONTENTIONS FAUTEUIL"],
  "barrière gauche": ["barrière gauche"],
  "barrière droite": ["barrière droite"],
  "barrière x2": ["BARRIERES AU LIT", "BARRIÈRES AU LIT"],
};

export default function ImportKeywordConfig({ open, onOpenChange, onSave, initialConfig }) {
  const [config, setConfig] = useState(initialConfig || DEFAULT_CONFIG);

  useEffect(() => {
    if (open) {
      setConfig(initialConfig || DEFAULT_CONFIG);
    }
  }, [open, initialConfig]);

  const handleAddKeyword = (type) => {
    setConfig({
      ...config,
      [type]: [...(config[type] || []), ""],
    });
  };

  const handleRemoveKeyword = (type, idx) => {
    setConfig({
      ...config,
      [type]: config[type].filter((_, i) => i !== idx),
    });
  };

  const handleKeywordChange = (type, idx, value) => {
    const updated = [...config[type]];
    updated[idx] = value;
    setConfig({ ...config, [type]: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration des mots-clés pour l'import</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {Object.keys(config).map((type) => (
            <div key={type} className="border rounded-lg p-4 bg-slate-50">
              <h3 className="font-bold text-sm mb-3 text-slate-900 capitalize">{type}</h3>
              <div className="space-y-2">
                {(config[type] || []).map((keyword, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={keyword}
                      onChange={(e) => handleKeywordChange(type, idx, e.target.value)}
                      placeholder="Ex: lit barreaudé"
                      className="text-xs"
                    />
                    <Button
                      onClick={() => handleRemoveKeyword(type, idx)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => handleAddKeyword(type)}
                size="sm"
                variant="outline"
                className="mt-2 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> Ajouter mot-clé
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={() => {
              onSave(config);
              onOpenChange(false);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Enregistrer
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
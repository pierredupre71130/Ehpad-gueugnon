import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Pencil, Check, X, Loader2 } from "lucide-react";

const FICHE_AS_MATIN_DEFAULT = `FICHE DE TÂCHES - AS MATIN EHPAD GUEUGNON
Date d'application : 24 juil. 2024

06h45 / 06h50 - Habillage

06h50 / 07h00 - Transmissions avec l'équipe de nuit

07h00 / 08h15 - Réalisation des soins d'hygiène, de confort et préventifs (douches et toilettes)
Réfection des lits, traçabilité des soins

08h15 / 08h50 - Installation des résidents alités en binôme avec l'ASH
Aide à la prise du petit déjeuner en chambre

08h50 / 09h00 - Pause

09h00 / 11h30 - Réalisation des soins d'hygiène, de confort et préventifs
Douche ou toilette complète au lit
Réfection des lits

11h30 / 12h00 - Installation des résidents en SAM
Installation des résidents en chambre
Préparation des plateaux repas en collaboration avec l'IDE pour les traitements

12h00 / 12h50 - Distribution et aide au repas en chambre

12h50 / 13h00 - Installation des résidents sur les lieux de vie ou en chambre pour la sieste

13h00 / 13h20 - Pause

13h20 / 14h00 - Gestion logistique : fiches repas et commandes
Ateliers selon organisation hebdomadaire : PVI ou ateliers bien être

14h00 / 14h20 - Transmissions en équipe pluri disciplinaire

14h20 / 14h25 - Déshabillage

14h25 - Fin de poste`;

const FICHE_AS_SOIR_DEFAULT = `FICHE DE TÂCHES - AS SOIR EHPAD GUEUGNON
Date d'application : 25 juil. 2024

12h40 / 12h45 - Habillage

12h45 / 12h50 - Distribution du café en SAM

12h50 / 14h00 - Accompagnement des résidents en chambre ou sur les lieux de vie
Réalisations des soins d'hygiène, de confort et préventifs
Traçabilité des soins effectués

14h00 / 14h20 - Transmissions en équipe pluridisciplinaire

14h20 / 14h50 - Préparation de la collation

14h50 / 16h00 - Distribution et aide à la prise de la collation en chambre et sur les lieux de vie
Ramassage de la collation, ouverture des lits
Traçabilité des soins effectués

16h00 / 16h10 - Pause

16h10 / 17h30 - Réalisations des soins d'hygiène, de confort et préventifs

17h30 / 17h45 - Accompagnement des résidents en SAM
Installation des résidents en chambre
Préparation des plateau repas en collaboration avec l'IDE pour les traitements

17h45 / 18h30 - Distribution et aide à la prise des repas en chambre

18h30 / 19h55 - Accompagnement des résidents en chambre et préparation pour la nuit
Réalisations des soins d'hygiène, de confort et préventifs
Traçabilité des soins effectués

19h55 / 20h15 - Pause

20h15 / 20h20 - Déshabillage

20h20 - Fin de poste`;

const FICHE_AS_NUIT_DEFAULT = `FICHE DE TÂCHES - AS NUIT EHPAD GUEUGNON
Date d'application : 24 juil. 2024

21h00 / 21h05 - Habillage

21h05 / 21h20 - Prise de connaissance des transmissions pour la nuit

21h20 / 23h30 - Réinstallation des résidents pour la nuit
Réalisations des soins d'hygiène, de confort et préventifs
Distribution des produits de soins et protections
Surveillance si besoin des paramètres vitaux
Aide à la prise des traitements sur délégation IDE
Traçabilité des soins effectuées

23h30 / 00h00 - Préparation des chariots AS pour le lendemain

00h00 / 00h30 - Pause

00h40 / 02h00 - Gestion de la logistique : commande de linge et / ou de protections

02h00 / 04h45 - Surveillance des résidents et réponse aux sollicitations

04h45 / 06h45 - Réinstallation des résidents pour la nuit
Réalisations des soins d'hygiène, de confort et préventifs
Traçabilité des soins effectuées

06h45 / 06h55 - Transmissions à l'équipe de jour

06h55 / 07h00 - Déshabillage

07h00 - Fin de poste`;

const FICHE_ASH_MATIN_DEFAULT = `FICHE DE TÂCHES - ASH MATIN EHPAD GUEUGNON
Date d'application : 24 juil. 2024

07h00 / 07h05 - Habillage

07h05 / 07h30 - Préparation des chariots ménage (Secteur vert et rose)
Prise des températures des frigos (Secteur jaune)
Préparation des petits déjeuners
Mise du couvert en SAM (secteur bleu)

07h30 / 08h30 - Aide à l'installation des résidents pour le petit déjeuner, service en chambre des plateaux

08h30 / 08h45 - Débarrassage des plateaux et descente de la vaisselle en cuisine

08h50 / 09h00 - Pause

09h00 / 11h40 - Entretien des chambres
Mise en tension du chauffe assiettes, eau sur table

11h40 / 12h50 - Installation des résidents en SAM
Récupération du chariot repas en cuisine
Service et aide au repas en SAM

12h50 / 13h00 - Descente du chariot repas en cuisine après débarrassage de la vaisselle et nettoyage de la SAM

13h00 / 13h20 - Pause

13h20 / 14h00 - Activité selon calendrier établis des taches à la semaine (Linge, commande, ménage de fond, entretien matériel)

14h00 / 14h20 - Transmissions en équipe pluri disciplinaire

14h20 / 14h25 - Déshabillage

14h25 - Fin de poste`;

const FICHE_ASH_SOIR_DEFAULT = `FICHE DE TÂCHES - ASH SOIR EHPAD GUEUGNON
Date d'application : 24 juil. 2024

11h30 / 11h35 - Habillage

11h35 / 12h15 - Entretien des chambres

12h15 / 13h00 - Fin du service en salle à manger : préparation du fromage et dessert à l'assiette
Descente du chariot repas en cuisine après débarrassage de la vaisselle et nettoyage de la SAM

13h00 / 13h20 - Pause

13h20 / 14h00 - Mise du couvert en SAM pour le diner
Préparation des plateaux du petit déjeuner
Activité selon calendrier établis des taches à la semaine (Linge, commande, ménage de fond, entretien matériel)

14h00 / 14h20 - Transmissions en équipe pluri disciplinaire

14h20 / 17h00 - Activité selon calendrier établis des taches à la semaine (Linge, commande, ménage de fond, entretien matériel)

16h00 / 16h10 - Pause

17h00 / 17h45 - Vérification des stocks, mise du pain et de l'eau sur les tables, en SAM
Mise en tension du chauffe assiettes
Récupération du chariot repas en cuisine

17h45 / 18h30 - Service du repas en SAM

18h30 / 19h05 - Descente du chariot repas après débarrassage des tables et nettoyage de la SAM
Descente des poubelles

19h05 / 19h10 - Déshabillage`;

const FICHE_IDE_MATIN_DEFAULT = `FICHE DE TÂCHES - IDE MATIN EHPAD GUEUGNON
Date d'application : 24 juil. 2024

06h45 / 06h50 - Habillage

06h50 / 07h00 - Transmissions avec l'équipe de nuit

07h00 / 08h50 - Distribution des traitements en chambre, surveillance des paramètres vitaux

08h50 / 09h00 - Pause

09h00 / 12h00 - Tour de soins divers, pansements, visite médicale

12h00 / 12h30 - Distribution des médicaments en SAM

12h30 / 13h00 - Transmissions sur le DSI

13h00 / 13h20 - Pause

13h20 / 14h00 - Rangement, validation des stocks
Validation des soins faits

14h00 / 14h20 - Transmissions en équipe pluridisciplinaire

14h20 / 14h25 - Déshabillage

14h25 - Fin de poste`;

const FICHE_IDE_SOIR_DEFAULT = `FICHE DE TÂCHES - IDE SOIR EHPAD GUEUGNON
Date d'application : 24 juil. 2024

13h20 / 13h25 - Habillage

13h25 / 14h00 - Vérification et déblisterage des médicaments pour l'après-midi

14h00 / 14h20 - Transmissions en équipe pluridisciplinaire

14h20 / 16h00 - Vérification et déblisterage des médicaments pour l'après-midi (suite)

16h00 / 16h10 - Pause

16h10 / 17h45 - Tour de soins divers : glycémie capillaire, administration des collyres, aérosol

17h45 / 18h30 - Distribution des médicaments sur les lieux de vie et en chambre

18h30 / 19h30 - Distribution des traitements pour la nuit

19h30 / 20h00 - Traçabilité des soins sur DSI et cahier de transmissions nuit

20h00 / 20h20 - Pause

20h20 / 20h55 - Préparation des RDV pour le lendemain + BS
Validation des soins faits

20h55 / 21h00 - Déshabillage

21h00 - Fin de poste`;

function FicheView({ fiche, defaultContent, poste, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);

  const content = fiche?.contenu ?? defaultContent;
  const displayValue = value ?? content;

  const generatePassword = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return day + month;
  };

  const handleEdit = () => {
    const password = prompt("Entrez le mot de passe pour modifier :");
    if (password === generatePassword()) {
      setValue(content);
      setEditing(true);
    } else if (password !== null) {
      alert("Mot de passe incorrect");
    }
  };

  const handleCancel = () => {
    setValue(null);
    setEditing(false);
  };

  const handleSave = async () => {
    await onSave(fiche?.id, poste, value);
    setValue(null);
    setEditing(false);
  };

  const lines = displayValue.split("\n");

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3 print:hidden">
        {editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-red-500">
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="h-4 w-4 mr-1" /> Enregistrer
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Modifier
          </Button>
        )}
      </div>

      {editing ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono text-sm min-h-[600px] w-full"
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-sm leading-relaxed">
          {lines.map((line, i) => {
            const isTitle = line.startsWith("FICHE DE POSTE") || line.startsWith("!!!") ;
            const isHoraire = /^\d{1,2}h/.test(line.trim()) || /^\d{1,2}h\d{2}/.test(line.trim());
            if (line.trim() === "") return <div key={i} className="h-2" />;
            return (
              <p
                key={i}
                className={
                  isTitle
                    ? "font-bold text-slate-900 text-base uppercase mb-2"
                    : isHoraire
                    ? "font-bold text-blue-800 mt-4 mb-1"
                    : "text-slate-700 mb-1 pl-2"
                }
              >
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FichesDePoste() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const posteParam = urlParams.get("poste") || "AS Matin";
  const [tab, setTab] = useState(posteParam);

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ["fiches_de_poste"],
    queryFn: () => base44.entities.FicheDePoste.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, poste, contenu }) => {
      if (id) {
        return base44.entities.FicheDePoste.update(id, { contenu });
      } else {
        return base44.entities.FicheDePoste.create({ poste, contenu });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fiches_de_poste"] }),
  });

  const handleSave = (id, poste, contenu) => {
    return saveMutation.mutateAsync({ id, poste, contenu });
  };

  const ficheASMatin = fiches.find((f) => f.poste === "AS Matin");
  const ficheASSoir = fiches.find((f) => f.poste === "AS Soir");
  const ficheASNuit = fiches.find((f) => f.poste === "AS Nuit");
  const ficheASHMatin = fiches.find((f) => f.poste === "ASH Matin");
  const ficheASHSoir = fiches.find((f) => f.poste === "ASH Soir");
  const ficheIDEMatin = fiches.find((f) => f.poste === "IDE Matin");
  const ficheIDESoir = fiches.find((f) => f.poste === "IDE Soir");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-800">Fiches de Poste</h1>
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-6 print:hidden space-y-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="AS Matin">AS Matin</TabsTrigger>
            <TabsTrigger value="AS Soir">AS Soir</TabsTrigger>
            <TabsTrigger value="AS Nuit">AS Nuit</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="ASH Matin">ASH Matin</TabsTrigger>
            <TabsTrigger value="ASH Soir">ASH Soir</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="IDE Matin">IDE Matin</TabsTrigger>
            <TabsTrigger value="IDE Soir">IDE Soir</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="AS Matin">
          <FicheView fiche={ficheASMatin} defaultContent={FICHE_AS_MATIN_DEFAULT} poste="AS Matin" onSave={handleSave} />
        </TabsContent>

        <TabsContent value="AS Soir">
          <FicheView fiche={ficheASSoir} defaultContent={FICHE_AS_SOIR_DEFAULT} poste="AS Soir" onSave={handleSave} />
        </TabsContent>

        <TabsContent value="AS Nuit">
          <FicheView fiche={ficheASNuit} defaultContent={FICHE_AS_NUIT_DEFAULT} poste="AS Nuit" onSave={handleSave} />
        </TabsContent>

        <TabsContent value="ASH Matin">
          <FicheView fiche={ficheASHMatin} defaultContent={FICHE_ASH_MATIN_DEFAULT} poste="ASH Matin" onSave={handleSave} />
        </TabsContent>

        <TabsContent value="ASH Soir">
          <FicheView fiche={ficheASHSoir} defaultContent={FICHE_ASH_SOIR_DEFAULT} poste="ASH Soir" onSave={handleSave} />
        </TabsContent>

        <TabsContent value="IDE Matin">
          <FicheView fiche={ficheIDEMatin} defaultContent={FICHE_IDE_MATIN_DEFAULT} poste="IDE Matin" onSave={handleSave} />
        </TabsContent>

        <TabsContent value="IDE Soir">
          <FicheView fiche={ficheIDESoir} defaultContent={FICHE_IDE_SOIR_DEFAULT} poste="IDE Soir" onSave={handleSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
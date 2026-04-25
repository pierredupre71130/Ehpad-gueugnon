import { useState } from "react";
import { ChevronDown, Lock, X } from "lucide-react";

export default function ArchivesPanel({ archivedDates, onSelectDate, onDeleteDate, onClean, currentDate }) {
  const [expandedMonths, setExpandedMonths] = useState({});

  // Grouper les archives par mois-année
  const groupedByMonth = {};
  archivedDates.forEach((d) => {
    const date = new Date(d + "T12:00:00");
    const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
    groupedByMonth[monthKey].push(d);
  });

  // Trier les mois en ordre décroissant
  const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(year, parseInt(month), 1);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  const toggleMonth = (monthKey) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">
          Archives — {archivedDates.length} date{archivedDates.length > 1 ? "s" : ""}
        </h3>
        <button
          onClick={onClean}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
        >
          Nettoyer archives vides
        </button>
      </div>

      {archivedDates.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune archive.</p>
      ) : (
        <div className="space-y-2">
          {sortedMonths.map((monthKey) => {
            const isExpanded = expandedMonths[monthKey];
            const dates = groupedByMonth[monthKey];

            return (
              <div key={monthKey} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* En-tête du mois */}
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {formatMonth(monthKey)}
                    </span>
                    <span className="text-xs text-slate-500">({dates.length})</span>
                  </div>
                </button>

                {/* Dates du mois */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {dates
                      .sort()
                      .reverse()
                      .map((d) => (
                        <div key={d} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                          <button
                            onClick={() => onSelectDate(d)}
                            className={`flex items-center gap-2 flex-1 text-left px-2 py-1.5 rounded text-sm transition-colors ${
                              d === currentDate
                                ? "bg-slate-800 text-white"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            <span>
                              {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                              })}
                            </span>
                          </button>
                          <button
                            onClick={() => onDeleteDate(d)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                            title="Supprimer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
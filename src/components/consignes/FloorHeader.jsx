import React from "react";
import { Key, Lock, Monitor } from "lucide-react";

export default function FloorHeader({ floorInfo, date, ideAstreinte }) {
  if (!floorInfo) return null;

  return (
    <div className="mb-6 print:mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 print:mb-2">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">DATE :</span>{" "}
          <span className="text-slate-600">{date || "_______________"}</span>
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">IDE ASTREINTE :</span>{" "}
          <span className="text-slate-600">{ideAstreinte || "_______________"}</span>
        </div>
      </div>

    </div>
  );
}
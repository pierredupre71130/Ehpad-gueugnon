import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const vue = urlParams.get("vue");

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="print:hidden bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-6">
          {currentPageName !== "Home" && (
            vue ? (
              <Link
                to={`/?vue=${vue}`}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            ) : (
              <Link
                to={createPageUrl("Home")}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            )
          )}
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

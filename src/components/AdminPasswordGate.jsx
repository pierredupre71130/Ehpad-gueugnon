import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPasswordGate({ children }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  if (unlocked) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === "mapad2022") {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-slate-100 rounded-full p-4">
            <Lock className="h-7 w-7 text-slate-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">Accès restreint</h2>
            <p className="text-sm text-slate-500 mt-1">Mot de passe administrateur nécessaire.</p>
          </div>
          <form onSubmit={handleSubmit} className="w-full space-y-3 mt-2">
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              placeholder="Mot de passe"
              autoFocus
              className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-slate-400 ${error ? "border-red-400 bg-red-50" : "border-slate-200"}`}
            />
            {error && <p className="text-xs text-red-500 text-center">Mot de passe incorrect.</p>}
            <Button type="submit" className="w-full">Accéder</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
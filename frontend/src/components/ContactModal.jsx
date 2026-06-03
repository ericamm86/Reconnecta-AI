import { X } from "lucide-react";

export function ContactModal({ open, form, setForm, onClose, onSubmit }) {
  if (!open) return null;

  const updateTags = (value) => {
    setForm({
      ...form,
      tagsText: value,
      tags: value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur">
      <form onSubmit={onSubmit} className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-mint">New connection</p>
            <h2 className="text-2xl font-black text-white">Criar contato</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-line text-slate-300 hover:bg-white/8">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["name", "Nome"],
            ["email", "Email"],
            ["company", "Empresa"],
            ["role", "Cargo"],
            ["area", "Area"]
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-semibold text-slate-300">
              {label}
              <input
                value={form[key] || ""}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-mint/50"
              />
            </label>
          ))}
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-300">
          Grau de proximidade: {form.proximity}
          <input
            type="range"
            min="0"
            max="100"
            value={form.proximity}
            onChange={(event) => setForm({ ...form, proximity: Number(event.target.value) })}
            className="mt-3 w-full accent-mint"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-300">
          Tags separadas por virgula
          <input
            value={form.tagsText ?? form.tags?.join(", ") ?? ""}
            onChange={(event) => updateTags(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-line bg-black/25 px-3 text-white outline-none focus:border-mint/50"
          />
        </label>

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 border-t border-line bg-panel/95 p-5 backdrop-blur">
          <button className="h-11 w-full rounded-lg bg-mint text-sm font-black text-ink hover:bg-cyan">
            Salvar contato
          </button>
        </div>
      </form>
    </div>
  );
}

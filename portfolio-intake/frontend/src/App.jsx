import React, { useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const THEMES = [
  { style_name: "Midnight Hacker", theme: "dark", primary_color: "#6366f1", font_preference: "monospace", vibe: "For the builder who lives in the terminal", bg: "bg-slate-900", fontClass: "font-mono" },
  { style_name: "Ocean Breeze", theme: "light", primary_color: "#0ea5e9", font_preference: "clean sans-serif", vibe: "Clean, calm, and confident", bg: "bg-sky-50", fontClass: "" },
  { style_name: "Forest Minimal", theme: "light", primary_color: "#10b981", font_preference: "modern geometric", vibe: "Understated and elegant", bg: "bg-emerald-50", fontClass: "" },
  { style_name: "Sunset Creative", theme: "dark", primary_color: "#f97316", font_preference: "bold display", vibe: "Bold, loud, and unforgettable", bg: "bg-orange-950", fontClass: "" },
  { style_name: "Corporate Clean", theme: "light", primary_color: "#3b82f6", font_preference: "professional serif", vibe: "Sharp and boardroom-ready", bg: "bg-blue-50", fontClass: "" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function App() {
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [styleIdx, setStyleIdx] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const emailValid = EMAIL_RE.test(email);
  const canSubmit = emailValid && file && styleIdx !== null && status !== "loading";
  const selectedStyle = styleIdx !== null ? THEMES[styleIdx] : null;

  function pickFile(f) {
    if (!f) return;
    const ok = /\.(pdf|txt)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");
    if (!ok) {
      setError("Please upload a PDF or .txt file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("email", email);
      const { bg, fontClass, ...stylePayload } = selectedStyle;
      fd.append("style", JSON.stringify(stylePayload));
      const res = await fetch(`${API_URL}/parse`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again or ask a helper.");
        setStatus("error");
        return;
      }
      setResult(json.parsed || {});
      setStatus("success");
    } catch (_) {
      setError("Something went wrong. Please try again or ask a helper.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <Header />
      <main className="px-4 pb-24">
        <div className="mx-auto w-full max-w-[640px]">
          {status === "success" ? (
            <SuccessView result={result} style={selectedStyle} />
          ) : (
            <form onSubmit={submit} className="space-y-8">
              {status === "error" && error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
                  {error}
                </div>
              )}

              <Field label="Your email" required>
                <input
                  type="email"
                  required
                  disabled={status === "loading"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-base outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                />
              </Field>

              <Field label="Upload your CV" required>
                <Dropzone
                  file={file}
                  dragOver={dragOver}
                  disabled={status === "loading"}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileRef.current?.click()}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                {error && status !== "error" && (
                  <p className="mt-2 text-sm text-red-300">{error}</p>
                )}
              </Field>

              <Field label="Pick your portfolio style" required>
                <ThemeGrid selected={styleIdx} onSelect={setStyleIdx} disabled={status === "loading"} />
              </Field>

              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:opacity-60 disabled:shadow-none"
              >
                {status === "loading" ? <Loading /> : "Generate my portfolio →"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="px-4 pt-12 pb-10 text-center sm:pt-16">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium tracking-wider text-slate-300">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        GDGC AUCKLAND
      </div>
      <h1 className="mt-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
        Portfolio Builder — CV Upload
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-balance text-base text-slate-400 sm:text-lg">
        Upload your CV and we'll generate your portfolio live at the workshop.
      </p>
    </header>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Dropzone({ file, dragOver, disabled, onDragOver, onDragLeave, onDrop, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition disabled:opacity-50 ${
        dragOver
          ? "border-indigo-400 bg-indigo-500/10"
          : file
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/70"
      }`}
    >
      {file ? (
        <>
          <FileIcon className="h-10 w-10 text-emerald-400" />
          <p className="mt-3 break-all font-medium text-slate-100">{file.name}</p>
          <p className="text-sm text-slate-400">{bytes(file.size)} — click to change</p>
        </>
      ) : (
        <>
          <UploadIcon className="h-10 w-10 text-slate-400" />
          <p className="mt-3 font-medium text-slate-200">
            Drag & drop your CV, or <span className="text-indigo-400">browse</span>
          </p>
          <p className="text-sm text-slate-500">PDF or .txt — max 5MB</p>
        </>
      )}
    </button>
  );
}

function ThemeGrid({ selected, onSelect, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {THEMES.map((t, i) => (
        <ThemeCard
          key={t.style_name}
          theme={t}
          selected={selected === i}
          onClick={() => !disabled && onSelect(i)}
        />
      ))}
    </div>
  );
}

function ThemeCard({ theme, selected, onClick }) {
  const isDark = theme.theme === "dark";
  return (
    <button
      type="button"
      onClick={onClick}
      style={selected ? { "--glow": theme.primary_color } : {}}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? "glow scale-[1.02] border-transparent"
          : "border-slate-800 bg-slate-900/60 hover:-translate-y-0.5 hover:border-slate-600"
      }`}
    >
      <div
        className={`absolute inset-0 -z-10 opacity-0 transition group-hover:opacity-100 ${selected ? "opacity-100" : ""}`}
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, ${theme.primary_color}22 0%, transparent 60%)`,
        }}
      />
      <div className={`mb-3 flex h-16 items-center justify-center rounded-xl ${theme.bg} ${theme.fontClass}`}>
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: theme.primary_color }}
        >
          Aa
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 flex-none rounded-full ring-2 ring-white/10"
          style={{ backgroundColor: theme.primary_color }}
        />
        <h3 className={`truncate text-sm font-semibold ${theme.fontClass}`}>{theme.style_name}</h3>
      </div>
      <p className="mt-1 truncate text-xs text-slate-400">{theme.font_preference}</p>
      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{theme.vibe}</p>
    </button>
  );
}

function SuccessView({ result, style }) {
  const r = result || {};
  const recentRole = r.experience?.[0]?.role || "";
  const color = style?.primary_color || "#6366f1";
  return (
    <div className="space-y-6 text-center">
      <div className="pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-400/40">
        <svg viewBox="0 0 52 52" className="h-12 w-12">
          <path
            className="draw"
            d="M14 27 L23 36 L40 18"
            fill="none"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">
          You're all set{r.name ? `, ${r.name}` : ""}!
        </h2>
        <p className="mx-auto mt-2 max-w-md text-slate-400">
          Your portfolio will be generated live at the workshop. Check your email afterwards for your live link.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold">{r.name || "Your CV"}</h3>
          {recentRole && <span className="text-sm text-slate-400">{recentRole}</span>}
        </div>

        {Array.isArray(r.skills) && r.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {r.skills.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${color}22`,
                  color,
                  border: `1px solid ${color}44`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 text-sm text-slate-400">
          {(r.projects?.length || 0)} project{(r.projects?.length || 0) === 1 ? "" : "s"} detected
        </p>

        {(r.github || r.linkedin) && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {r.github && (
              <a href={r.github} target="_blank" rel="noreferrer" className="text-slate-300 underline-offset-2 hover:underline" style={{ color }}>
                GitHub
              </a>
            )}
            {r.linkedin && (
              <a href={r.linkedin} target="_blank" rel="noreferrer" className="text-slate-300 underline-offset-2 hover:underline" style={{ color }}>
                LinkedIn
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <span className="inline-flex items-center gap-3">
      <svg viewBox="0 0 24 24" className="spin h-5 w-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      Gemini is reading your CV…
    </span>
  );
}

function UploadIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}

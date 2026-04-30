import React, { useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Official Google brand colors
const G = {
  blue:   "#4285F4",
  red:    "#EA4335",
  yellow: "#FBBC05",
  green:  "#34A853",
};

const THEMES = [
  {
    style_name: "Midnight Hacker",
    theme: "dark",  primary_color: "#6366f1", font_preference: "Monospace",          bg: "bg-slate-900",  fontClass: "font-mono",
    summary: "Dark terminal-style site with indigo glows, monospace type, and code-block sections. Built for developers.",
    tags: ["Dark", "Monospace", "Dev"],
  },
  {
    style_name: "Ocean Breeze",
    theme: "light", primary_color: "#0ea5e9", font_preference: "Clean sans-serif",   bg: "bg-sky-50",     fontClass: "",
    summary: "Light, airy layout with sky-blue accents and clean sans-serif headings. Calm, confident, and professional.",
    tags: ["Light", "Sans-serif", "Calm"],
  },
  {
    style_name: "Forest Minimal",
    theme: "light", primary_color: "#10b981", font_preference: "Modern geometric",   bg: "bg-emerald-50", fontClass: "",
    summary: "Soft green on white with geometric type and generous whitespace. Understated, elegant, and design-forward.",
    tags: ["Light", "Geometric", "Minimal"],
  },
  {
    style_name: "Sunset Creative",
    theme: "dark",  primary_color: "#f97316", font_preference: "Bold display",       bg: "bg-orange-950", fontClass: "",
    summary: "Bold dark canvas with orange-red gradients and large display type. Loud, energetic, and unforgettable.",
    tags: ["Dark", "Display", "Bold"],
  },
  {
    style_name: "Corporate Clean",
    theme: "light", primary_color: "#3b82f6", font_preference: "Professional serif", bg: "bg-blue-50",    fontClass: "",
    summary: "Crisp white layout with blue accents and serif headings. Sharp, structured, and boardroom-ready.",
    tags: ["Light", "Serif", "Corporate"],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function App() {
  const [email,        setEmail]        = useState("");
  const [file,         setFile]         = useState(null);
  const [styleIdx,     setStyleIdx]     = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [githubUrl,    setGithubUrl]    = useState("");
  const [linkedinUrl,  setLinkedinUrl]  = useState("");
  const [websiteUrl,   setWebsiteUrl]   = useState("");
  const [dragOver,     setDragOver]     = useState(false);
  const [status,       setStatus]       = useState("idle");
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState(null);
  const fileRef = useRef(null);

  const emailValid    = EMAIL_RE.test(email);
  const canSubmit     = emailValid && file && styleIdx !== null && status !== "loading";
  const selectedStyle = styleIdx !== null ? THEMES[styleIdx] : null;

  function pickFile(f) {
    if (!f) return;
    const ok = /\.(pdf|txt)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");
    if (!ok)                       { setError("Please upload a PDF or .txt file."); return; }
    if (f.size > 5 * 1024 * 1024) { setError("File must be under 5MB.");           return; }
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
      fd.append("github_url",   githubUrl.trim());
      fd.append("linkedin_url", linkedinUrl.trim());
      fd.append("website_url",  websiteUrl.trim());
      const { bg, fontClass, icon, tags, summary, ...stylePayload } = selectedStyle;
      if (customPrompt.trim()) stylePayload.custom_prompt = customPrompt.trim();
      fd.append("style", JSON.stringify(stylePayload));
      const res  = await fetch(`${API_URL}/parse`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again or ask a helper.");
        setStatus("error");
        return;
      }
      setResult({ ...(json.parsed || {}), _githubUrl: githubUrl.trim(), _linkedinUrl: linkedinUrl.trim(), _websiteUrl: websiteUrl.trim() });
      setStatus("success");
    } catch (_) {
      setError("Something went wrong. Please try again or ask a helper.");
      setStatus("error");
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#0a0c12" }}>
      <AuroraBackground />
      <div className="relative z-10">
        <Header />
        <main className="px-4 pb-28">
          <div className="mx-auto w-full max-w-[640px]">
            {status === "success" ? (
              <SuccessView result={result} style={selectedStyle} customPrompt={customPrompt} />
            ) : (
              <form onSubmit={submit} className="space-y-8">
                {status === "error" && error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: `${G.red}18`, border: `1px solid ${G.red}55`, color: G.red }}
                  >
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
                    placeholder="you@aucklanduni.ac.nz"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-100 placeholder-slate-500 outline-none backdrop-blur-sm transition disabled:opacity-50"
                    onFocus={e => { e.target.style.borderColor = G.blue; e.target.style.boxShadow = `0 0 0 3px ${G.blue}28`; }}
                    onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = ""; }}
                  />
                </Field>

                <SocialLinks
                  githubUrl={githubUrl}   setGithubUrl={setGithubUrl}
                  linkedinUrl={linkedinUrl} setLinkedinUrl={setLinkedinUrl}
                  websiteUrl={websiteUrl}  setWebsiteUrl={setWebsiteUrl}
                  disabled={status === "loading"}
                />

                <Field label="Upload your CV" required>
                  <Dropzone
                    file={file} dragOver={dragOver} disabled={status === "loading"}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                    onClick={() => fileRef.current?.click()}
                  />
                  <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain"
                    className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                  {error && status !== "error" && (
                    <p className="mt-2 text-sm" style={{ color: G.red }}>{error}</p>
                  )}
                </Field>

                

                <Field
                  label="Pick your portfolio style"
                  hint="Choose one of the styles below, or skip this and describe your own in the optional section."
                  required
                >
                  <ThemeGrid selected={styleIdx} onSelect={setStyleIdx} disabled={status === "loading"} />
                </Field>

                <CustomStylePrompt
                  value={customPrompt} onChange={setCustomPrompt}
                  disabled={status === "loading"} selectedTheme={selectedStyle}
                />

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full overflow-hidden rounded-xl px-6 py-4 text-base font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: canSubmit ? `linear-gradient(135deg, ${G.blue} 0%, #1a73e8 100%)` : "rgba(255,255,255,0.08)",
                    boxShadow:  canSubmit ? `0 4px 32px ${G.blue}55` : "none",
                  }}
                  onMouseEnter={e => { if (canSubmit) e.currentTarget.style.filter = "brightness(1.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = ""; }}
                >
                  {status === "loading" ? <Loading /> : "Generate my portfolio"}
                </button>
              </form>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

/* ── Aurora background ────────────────────────────────────── */
function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div style={{ position:"absolute", top:"-15%", left:"-10%", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle, ${G.blue}30 0%, transparent 70%)`, filter:"blur(60px)" }} />
      <div style={{ position:"absolute", top:"-10%", right:"-12%", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${G.red}22 0%, transparent 70%)`, filter:"blur(70px)" }} />
      <div style={{ position:"absolute", top:"40%", right:"-8%", width:380, height:380, borderRadius:"50%", background:`radial-gradient(circle, ${G.yellow}18 0%, transparent 70%)`, filter:"blur(60px)" }} />
      <div style={{ position:"absolute", bottom:"-10%", left:"-8%", width:520, height:520, borderRadius:"50%", background:`radial-gradient(circle, ${G.green}22 0%, transparent 70%)`, filter:"blur(70px)" }} />
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translateX(-50%)", width:700, height:400, borderRadius:"50%", background:`radial-gradient(ellipse, ${G.blue}0d 0%, transparent 70%)`, filter:"blur(40px)" }} />
      <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)`, backgroundSize:"28px 28px" }} />
    </div>
  );
}

/* ── Header ───────────────────────────────────────────────── */
function Header() {
  return (
    <header className="px-4 pt-12 pb-10 text-center sm:pt-16">
      <div className="mb-6 flex flex-col items-center gap-3">
        <img src="/Logo.webp" alt="GDGC Auckland logo" width={76} height={76}
          className="select-none drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 0 18px rgba(66,133,244,0.35))" }} />
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider text-slate-200"
          style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.13)", backdropFilter:"blur(8px)" }}
        >
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: G.blue   }} />
            <span className="h-2 w-2 rounded-full" style={{ background: G.red    }} />
            <span className="h-2 w-2 rounded-full" style={{ background: G.yellow }} />
            <span className="h-2 w-2 rounded-full" style={{ background: G.green  }} />
          </span>
          GDGC · University of Auckland
        </div>
      </div>

      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl" style={{
        background: `linear-gradient(135deg, ${G.blue} 0%, #a8c7fa 40%, #fff 55%, #a8d5b8 75%, ${G.green} 100%)`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>
        Portfolio Builder: CV Upload
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-balance text-base text-slate-400 sm:text-lg">
        Upload your CV and we'll generate your portfolio live at the workshop.
      </p>

      <div className="mx-auto mt-8 flex h-[3px] w-28 overflow-hidden rounded-full">
        <div className="flex-1" style={{ background: G.blue   }} />
        <div className="flex-1" style={{ background: G.red    }} />
        <div className="flex-1" style={{ background: G.yellow }} />
        <div className="flex-1" style={{ background: G.green  }} />
      </div>
    </header>
  );
}

/* ── Footer ───────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="pb-8 text-center">
      <div className="mx-auto mb-3 flex h-[2px] w-16 overflow-hidden rounded-full">
        <div className="flex-1" style={{ background: G.blue   }} />
        <div className="flex-1" style={{ background: G.red    }} />
        <div className="flex-1" style={{ background: G.yellow }} />
        <div className="flex-1" style={{ background: G.green  }} />
      </div>
      <p className="text-xs text-slate-600">
        © {new Date().getFullYear()} Google Developer Groups on Campus · University of Auckland
      </p>
    </footer>
  );
}

/* ── Field wrapper ────────────────────────────────────────── */
function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-300">
        {label}{required && <span style={{ color: G.red }}> *</span>}
      </label>
      {hint && (
        <p className="mb-2 text-xs text-slate-500">{hint}</p>
      )}
      {children}
    </div>
  );
}

/* ── Dropzone ─────────────────────────────────────────────── */
function Dropzone({ file, dragOver, disabled, onDragOver, onDragLeave, onDrop, onClick }) {
  let borderColor = "rgba(255,255,255,0.1)";
  let bgColor     = "rgba(255,255,255,0.03)";
  if (dragOver)  { borderColor = G.blue;         bgColor = `${G.blue}18`;  }
  else if (file) { borderColor = `${G.green}99`; bgColor = `${G.green}0e`; }

  return (
    <button
      type="button" disabled={disabled}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onClick}
      className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
      style={{ borderColor, background: bgColor }}
      onMouseEnter={e => { if (!file && !dragOver) e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
      onMouseLeave={e => { if (!file && !dragOver) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
    >
      {file ? (
        <>
          <FileIcon className="h-10 w-10" color={G.green} />
          <p className="mt-3 break-all font-medium text-slate-100">{file.name}</p>
          <p className="text-sm text-slate-400">{bytes(file.size)} · click to change</p>
        </>
      ) : (
        <>
          <UploadIcon className="h-10 w-10 text-slate-500" />
          <p className="mt-3 font-medium text-slate-200">
            Drag & drop your CV, or <span style={{ color: G.blue }}>browse</span>
          </p>
          <p className="text-sm text-slate-500">PDF or .txt, max 5MB</p>
        </>
      )}
    </button>
  );
}

/* ── Theme picker ─────────────────────────────────────────── */
function ThemeGrid({ selected, onSelect, disabled }) {
  return (
    <div className="flex flex-col gap-3">
      {THEMES.map((t, i) => (
        <ThemeRow
          key={t.style_name}
          theme={t}
          selected={selected === i}
          onClick={() => !disabled && onSelect(selected === i ? null : i)}
        />
      ))}
    </div>
  );
}

function ThemeRow({ theme, selected, onClick }) {
  const c = theme.primary_color;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-300"
      style={{
        background: selected
          ? `linear-gradient(120deg, ${c}20 0%, rgba(255,255,255,0.04) 60%)`
          : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${selected ? c + "88" : "rgba(255,255,255,0.07)"}`,
        boxShadow: selected
          ? `0 0 0 1px ${c}33, 0 8px 32px ${c}28, inset 0 1px 0 rgba(255,255,255,0.06)`
          : "0 1px 3px rgba(0,0,0,0.3)",
        transform: selected ? "translateY(-1px)" : "translateY(0)",
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.border = `1.5px solid rgba(255,255,255,0.16)`;
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.border = `1.5px solid rgba(255,255,255,0.07)`;
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-300"
        style={{ background: c, opacity: selected ? 1 : 0.2 }}
      />

      {/* Hover shimmer */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${c}10 0%, transparent 65%)` }}
      />

      <div className="relative flex items-center gap-4 py-4 pl-5 pr-4">

        {/* Preview swatch */}
        <div
          className={`relative flex h-14 w-14 flex-none flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl shadow-lg ${theme.bg} ${theme.fontClass}`}
          style={{ border: `2px solid ${c}44`, flexShrink: 0 }}
        >
          <span className="text-lg font-bold leading-none" style={{ color: c }}>Aa</span>
          <span className="text-[9px] font-semibold leading-none opacity-50" style={{ color: c }}>
            {theme.theme}
          </span>
          {/* Shine overlay */}
          <div className="pointer-events-none absolute inset-0" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)"
          }} />
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold text-slate-100 ${theme.fontClass}`}>
              {theme.style_name}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}
            >
              {theme.font_preference}
            </span>
          </div>

          {/* Summary */}
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{theme.summary}</p>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {theme.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: selected ? `${c}18` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${selected ? c + "44" : "rgba(255,255,255,0.08)"}`,
                  color: selected ? c : "rgba(255,255,255,0.4)",
                  transition: "all 0.2s",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Radio indicator */}
        <div className="flex-none pl-1">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300"
            style={{
              background:   selected ? c : "transparent",
              border:       `2px solid ${selected ? c : "rgba(255,255,255,0.2)"}`,
              boxShadow:    selected ? `0 0 10px ${c}66` : "none",
              transform:    selected ? "scale(1.1)" : "scale(1)",
            }}
          >
            {selected && (
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Social links ─────────────────────────────────────────── */
function SocialLinks({ githubUrl, setGithubUrl, linkedinUrl, setLinkedinUrl, websiteUrl, setWebsiteUrl, disabled }) {
  const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none backdrop-blur-sm transition disabled:opacity-50";
  const focusOn  = e => { e.target.style.borderColor = G.blue; e.target.style.boxShadow = `0 0 0 3px ${G.blue}28`; };
  const focusOff = e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = ""; };

  return (
    <div
      className="rounded-2xl p-5 backdrop-blur-sm space-y-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div>
        <p className="text-sm font-medium text-slate-300">Social Links <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>Optional</span></p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          These are the links that will appear in your portfolio — please make sure they work before submitting. Open each one in your browser to double check.
        </p>
      </div>
      <div className="space-y-3">
        {[
          { label: "GitHub",           value: githubUrl,   set: setGithubUrl,   placeholder: "https://github.com/yourusername" },
          { label: "LinkedIn",         value: linkedinUrl, set: setLinkedinUrl, placeholder: "https://linkedin.com/in/yourusername" },
          { label: "Personal Website", value: websiteUrl,  set: setWebsiteUrl,  placeholder: "https://yourwebsite.com" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
            <input
              type="text" value={value} disabled={disabled} placeholder={placeholder}
              onChange={e => set(e.target.value)}
              className={inputClass} onFocus={focusOn} onBlur={focusOff}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Custom style prompt ──────────────────────────────────── */
function CustomStylePrompt({ value, onChange, disabled, selectedTheme }) {
  const charLimit  = 300;
  const remaining  = charLimit - value.length;
  const isNearLimit = remaining < 60;

  return (
    <div
      className="rounded-2xl p-5 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-base"
            style={{ background: `${G.blue}22`, border: `1px solid ${G.blue}44` }}
          >
            ✦
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Describe your style</p>
            <p className="text-xs text-slate-500">Optional · our AI will use this to customise your portfolio</p>
          </div>
        </div>
        <span className="flex-none rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
          Optional
        </span>
      </div>

      <textarea
        value={value}
        onChange={e => { if (e.target.value.length <= charLimit) onChange(e.target.value); }}
        disabled={disabled}
        rows={3}
        placeholder='e.g. "I want a space-themed dark portfolio with neon green accents and a creative layout"'
        className="w-full resize-none rounded-xl border bg-transparent px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition disabled:opacity-50"
        style={{
          borderColor: value ? `${G.blue}55` : "rgba(255,255,255,0.09)",
          boxShadow:   value ? `0 0 0 2px ${G.blue}18` : "none",
        }}
        onFocus={e => { e.target.style.borderColor = G.blue; e.target.style.boxShadow = `0 0 0 3px ${G.blue}22`; }}
        onBlur={e  => { e.target.style.borderColor = value ? `${G.blue}55` : "rgba(255,255,255,0.09)"; e.target.style.boxShadow = ""; }}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {["Dark & minimal", "Bright & bold", "Creative & artistic", "Clean & corporate"].map(chip => (
            <button
              key={chip} type="button" disabled={disabled}
              onClick={() => {
                const next = value ? `${value.trim()}, ${chip.toLowerCase()}` : chip;
                if (next.length <= charLimit) onChange(next);
              }}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${G.blue}22`; e.currentTarget.style.borderColor = `${G.blue}66`; e.currentTarget.style.color = G.blue; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
            >
              + {chip}
            </button>
          ))}
        </div>
        <span className="ml-auto flex-none text-xs tabular-nums"
          style={{ color: isNearLimit ? G.yellow : "rgba(255,255,255,0.25)" }}>
          {remaining} left
        </span>
      </div>
    </div>
  );
}

/* ── Success view ─────────────────────────────────────────── */
function SuccessView({ result, style, customPrompt }) {
  const r     = result || {};
  const color = style?.primary_color || G.blue;

  function safeHref(url) {
    if (!url) return null;
    return url.startsWith("http") ? url : `https://${url}`;
  }
  const githubHref   = safeHref(r._githubUrl);
  const linkedinHref = safeHref(r._linkedinUrl);
  const websiteHref  = safeHref(r._websiteUrl);

  return (
    <div className="space-y-5 text-center">
      <div className="pop mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-2"
        style={{ background: `${G.green}26`, borderColor: `${G.green}66` }}>
        <svg viewBox="0 0 52 52" className="h-12 w-12">
          <path className="draw" d="M14 27 L23 36 L40 18" fill="none" stroke={G.green} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
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

      <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
        <img src="/Logo.webp" alt="" width={18} height={18} className="opacity-50" />
        GDGC Auckland · University of Auckland
      </div>

      <div className="rounded-2xl p-6 text-left backdrop-blur-sm space-y-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-0.5">Parsed as</p>
            <h3 className="text-xl font-bold text-slate-100">{r.name || "Your CV"}</h3>
            {r.summary && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{r.summary}</p>}
          </div>
          {style && (
            <span className="flex-none rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {style.style_name}{customPrompt ? " + custom" : ""}
            </span>
          )}
        </div>

        {Array.isArray(r.experience) && r.experience.length > 0 && (
          <Section label="Experience" color={color}>
            <ul className="space-y-1.5">
              {r.experience.map((ex, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />
                  <div>
                    <span className="text-sm font-medium text-slate-200">{ex.role}</span>
                    {ex.company  && <span className="text-sm text-slate-400"> · {ex.company}</span>}
                    {ex.duration && <span className="ml-1 text-xs text-slate-600">({ex.duration})</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {Array.isArray(r.education) && r.education.length > 0 && (
          <Section label="Education" color={color}>
            <ul className="space-y-1.5">
              {r.education.map((ed, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />
                  <div>
                    <span className="text-sm font-medium text-slate-200">{ed.degree}</span>
                    {ed.institution && <span className="text-sm text-slate-400"> · {ed.institution}</span>}
                    {ed.duration    && <span className="ml-1 text-xs text-slate-600">({ed.duration})</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {Array.isArray(r.skills) && r.skills.length > 0 && (
          <Section label="Skills" color={color}>
            <div className="flex flex-wrap gap-2">
              {r.skills.map((s) => (
                <span key={s} className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}

        {Array.isArray(r.projects) && r.projects.length > 0 && (
          <Section label="Projects" color={color}>
            <ul className="space-y-1.5">
              {r.projects.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />
                  <span className="text-sm font-medium text-slate-200">{p.name}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(githubHref || linkedinHref || websiteHref) && (
          <div className="flex flex-wrap gap-4 border-t border-white/5 pt-4 text-sm">
            {githubHref && (
              <a href={githubHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium transition-opacity hover:opacity-75"
                style={{ color: G.blue }}>
                <GitHubIcon className="h-4 w-4" /> GitHub
              </a>
            )}
            {linkedinHref && (
              <a href={linkedinHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium transition-opacity hover:opacity-75"
                style={{ color: G.blue }}>
                LinkedIn
              </a>
            )}
            {websiteHref && (
              <a href={websiteHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium transition-opacity hover:opacity-75"
                style={{ color: G.blue }}>
                Website
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, color, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color }}>{label}</p>
      {children}
    </div>
  );
}

/* ── Loading ──────────────────────────────────────────────── */
function Loading() {
  return (
    <span className="inline-flex items-center gap-3">
      <svg viewBox="0 0 24 24" className="spin h-5 w-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      Gemini is reading your CV...
    </span>
  );
}

/* ── Icons ────────────────────────────────────────────────── */
function UploadIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon({ className, color }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.7" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}

function GitHubIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}


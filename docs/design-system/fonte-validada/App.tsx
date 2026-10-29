import React, { useEffect, useState, useRef } from "react";
import {
  Check,
  Copy,
  Moon,
  Sun,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Users,
  Settings,
  LayoutDashboard,
  History,
  Plus,
  Search,
  Calendar,
  Building2,
  FileWarning,
  ArrowUpRight,
  Trash2,
  UploadCloud,
  Info,
  AlertCircle,
  XCircle,
  CheckCircle,
  ChevronDown,
  MoreHorizontal,
  Tag,
  ShieldCheck,
  Eye,
  Layers,
  Sparkles,
  Type,
  Palette,
  Ruler,
  Box,
  Zap,
  Moon as DarkIcon,
  LayoutGrid,
  Smartphone,
  Monitor,
  Triangle,
  Circle,
} from "lucide-react";

// Types for checklist persistence
type ChecklistRecord = {
  id: string;
  value: { checked: boolean; label: string };
  created_at: string;
  updated_at: string;
};

const SECTIONS = [
  { id: "conceito", label: "Conceito", icon: Sparkles },
  { id: "tokens", label: "Tokens", icon: Palette },
  { id: "componentes", label: "Componentes", icon: Box },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "icones-logo", label: "Ícones & Logo", icon: Type },
  { id: "voz", label: "Tom de Voz", icon: FileText },
  { id: "checklist", label: "Checklist", icon: ShieldCheck },
  { id: "css", label: "Tokens CSS", icon: Ruler },
];

const CHECKLIST_ITEMS = [
  { id: "contraste", label: "Contraste AA verificado em todos os textos e status" },
  { id: "foco", label: "Foco visível com Tab em todos os interativos" },
  { id: "toque", label: "Alvos de toque com mínimo 44px no mobile" },
  { id: "fonte", label: "Campos com fonte 16px para evitar zoom no iPhone" },
  { id: "labels", label: "Labels associadas aos inputs (for/id)" },
  { id: "erro", label: "Estados de erro com texto explicativo, não só cor" },
  { id: "loading", label: "Loading com aria-busy e texto alternativo" },
  { id: "safe", label: "Safe-area-inset aplicado em header e bottom tabs" },
  { id: "motion", label: "Respeita prefers-reduced-motion" },
  { id: "status", label: "Cores de status não usadas como decoração" },
  { id: "etiqueta", label: "Etiqueta com data legível a 1m de distância em campo" },
  { id: "primario", label: "Apenas um botão primário por tela" },
];

async function apiCall(action: string, args: any) {
  const res = await fetch("actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || "Erro na API");
  return json.data;
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; desc: string; type: "success" | "info" } | null>(null);
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [uploadState, setUploadState] = useState<"empty" | "file">("empty");
  const [showModal, setShowModal] = useState(false);
  const [metricSelected, setMetricSelected] = useState("vencidos");
  const mainRef = useRef<HTMLDivElement>(null);

  // Theme init
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const saved = (mql.matches ? "dark" : "light") as "light" | "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  // Load checklist from backend
  useEffect(() => {
    (async () => {
      try {
        const data = await apiCall("records.list", { collection: "pc_checklist", limit: 100 });
        const records: ChecklistRecord[] = data.records || [];
        const map: Record<string, boolean> = {};
        records.forEach((r) => (map[r.id] = r.value.checked));
        if (Object.keys(map).length > 0) setCheckState(map);
      } catch {}
    })();
  }, []);

  const toggleCheck = async (id: string, label: string) => {
    const newVal = !checkState[id];
    setCheckState((s) => ({ ...s, [id]: newVal }));
    try {
      const existing = await apiCall("records.get", { collection: "pc_checklist", id });
      if (existing) {
        await apiCall("records.replace", {
          collection: "pc_checklist",
          id,
          value: { checked: newVal, label },
        });
      } else {
        await apiCall("records.create", {
          collection: "pc_checklist",
          id,
          value: { checked: newVal, label },
        });
      }
    } catch {
      try {
        await apiCall("records.create", {
          collection: "pc_checklist",
          id,
          value: { checked: newVal, label },
        });
      } catch {}
    }
  };

  const copy = (text: string, id: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    // @ts-ignore
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const showToastDemo = (type: "success" | "info" = "success") => {
    setToast({
      title: type === "success" ? "PMOC do Frigorífico Boi Bom renovado" : "Sincronização com Google Agenda",
      desc: type === "success" ? "Próximo vencimento em 30/11/2026." : "3 vencimentos adicionados à sua agenda.",
      type,
    });
    setTimeout(() => setToast(null), 4000);
  };

  const cssTokens = `/* FIX DARK CONTRAST AAA */
:root{
  /* Brand */
  --pc-brand-50:#f0f7fc; --pc-brand-100:#d8eaf5; --pc-brand-300:#7bb0d0;
  --pc-brand-500:#1e6a94; --pc-brand-700:#155179; --pc-brand-800:#123f5e; --pc-brand-900:#0f324b;
  /* Neutros */
  --pc-neutral-0:#ffffff; --pc-neutral-50:#f6f8f9; --pc-neutral-100:#f3f5f6;
  --pc-neutral-200:#e6e9ee; --pc-neutral-300:#dddfe4; --pc-neutral-400:#b8bec9;
  --pc-neutral-500:#6a7181; --pc-neutral-700:#2e343f; --pc-neutral-900:#16181d;
  /* Status Vencido */
  --pc-danger-bg:#fef3f2; --pc-danger-border:#fecdca; --pc-danger-text:#b42318; --pc-danger-strong:#7a271a;
  --pc-status-danger-bg:#fef3f2; --pc-status-danger-border:#fecdca; --pc-status-danger-text:#b42318; --pc-status-danger-icon:#d92d20;
  /* Status Aviso */
  --pc-warning-bg:#fef3c7; --pc-warning-border:#fde68a; --pc-warning-text:#92400e; --pc-warning-strong:#78350f;
  --pc-status-warning-bg:#fef3c7; --pc-status-warning-border:#fde68a; --pc-status-warning-text:#92400e; --pc-status-warning-icon:#d97706;
  /* Status OK */
  --pc-success-bg:#dcfce7; --pc-success-border:#bbf7d0; --pc-success-text:#166534; --pc-success-strong:#14532d;
  --pc-status-success-bg:#dcfce7; --pc-status-success-border:#bbf7d0; --pc-status-success-text:#166534; --pc-status-success-icon:#15803d;
  /* Semantic */
  --pc-bg:var(--pc-neutral-100); --pc-surface:var(--pc-neutral-0); --pc-border:var(--pc-neutral-300);
  --pc-text:var(--pc-neutral-900); --pc-text-secondary:var(--pc-neutral-500); --pc-text-inverse:#ffffff;
  /* Raio & Sombra */
  --pc-radius-xs:6px; --pc-radius-sm:8px; --pc-radius-md:12px; --pc-radius-lg:16px; --pc-radius-xl:24px; --pc-radius-pill:999px;
  --pc-shadow-sm:0 1px 2px rgba(16,24,40,.06); --pc-shadow-md:0 4px 8px rgba(16,24,40,.08);
  --pc-shadow-lg:0 12px 24px rgba(16,24,40,.12); --pc-shadow-focus:0 0 0 3px rgba(21,81,121,.25);
  --pc-duration-fast:150ms; --pc-duration-base:250ms; --pc-ease-out:cubic-bezier(.16,1,.3,1);
}
[data-theme="dark"]{
  /* FIX DARK CONTRAST - WCAG AA */
  --pc-neutral-0:#1a212b; --pc-neutral-50:#1e2936; --pc-neutral-100:#121821;
  --pc-neutral-200:#2a3441; --pc-neutral-300:#3a4554; --pc-neutral-400:#7a8699;
  --pc-neutral-500:#9aa5b5; --pc-neutral-700:#d0d7e2; --pc-neutral-900:#f0f3f6;
  --pc-brand-50:#0f2a3a; --pc-brand-100:#123a4f; --pc-brand-300:#4a9ac4;
  --pc-brand-500:#7bb0d0; --pc-brand-700:#a8d0e6; --pc-brand-800:#c3e0ee; --pc-brand-900:#d8eaf5;
  --pc-bg:#121821; --pc-surface:#1a212b; --pc-surface-2:#1e2936; --pc-border:#3a4554;
  --pc-text:#f0f3f6; --pc-text-secondary:#9aa5b5; --pc-text-inverse:#0f141a;
  /* Status dark - never light bg */
  --pc-danger-bg:#2a1515; --pc-danger-border:#5c2222; --pc-danger-text:#fca5a5; --pc-danger-strong:#fecaca; --pc-danger-icon:#f87171;
  --pc-status-danger-bg:#2a1515; --pc-status-danger-border:#5c2222; --pc-status-danger-text:#fca5a5; --pc-status-danger-icon:#f87171; --pc-status-danger-text-strong:#fecaca;
  --pc-warning-bg:#2a2010; --pc-warning-border:#5c4a1e; --pc-warning-text:#fde68a; --pc-warning-strong:#fef3c7; --pc-warning-icon:#fbbf24;
  --pc-status-warning-bg:#2a2010; --pc-status-warning-border:#5c4a1e; --pc-status-warning-text:#fde68a; --pc-status-warning-icon:#fbbf24;
  --pc-success-bg:#12261a; --pc-success-border:#1e4a2e; --pc-success-text:#86efac; --pc-success-strong:#bbf7d0; --pc-success-icon:#4ade80;
  --pc-status-success-bg:#12261a; --pc-status-success-border:#1e4a2e; --pc-status-success-text:#86efac; --pc-status-success-icon:#4ade80;
  --pc-info-bg:#0f2a3a; --pc-info-border:#123a4f; --pc-info-text:#a8d0e6;
  --pc-shadow-focus:0 0 0 3px rgba(74,154,196,.4);
}`;

  return (
    <div
      data-safe-area-inset-root
      style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)", minHeight: "100vh" }}
      className="w-full bg-[var(--pc-bg)] text-[var(--pc-text)]"
    >
      {/* Top bar */}
      <header
        data-safe-area-sticky-top
        style={{ top: "var(--safe-area-inset-top)" }}
        className="sticky z-30 backdrop-blur-xl border-b border-[var(--pc-border)] bg-[color-mix(in_srgb,var(--pc-surface)_85%,transparent)]"
      >
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden w-10 h-10 grid place-items-center rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] pc-focus"
              aria-label="Abrir navegação"
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Logo mini */}
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-[8px] bg-[var(--pc-brand-700)] grid place-items-center shadow-[var(--pc-shadow-sm)]">
                <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-[var(--pc-bg)] border-[2px] border-[var(--pc-brand-700)]" />
                <div className="w-5 h-[22px] bg-white rounded-[4px] grid place-items-center">
                  <Check size={12} className="text-[#15803d] stroke-[3]" />
                </div>
              </div>
              <div className="leading-none">
                <div className="font-semibold text-[14px] tracking-tight">PRAZO CERTO</div>
                <div className="text-[11px] text-[var(--pc-text-secondary)] font-medium">Design System 2.0</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-2 px-3 h-8 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[12px] font-medium text-[var(--pc-text)]">
              <span className="w-2 h-2 rounded-full bg-[#15803d] animate-pulse" />
              WCAG 2.2 AA • PWA Ready • PRO MAX
            </span>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 grid place-items-center rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] pc-focus btn-secondary"
              aria-label="Alternar tema"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <a
              href="#css"
              className="hidden md:inline-flex h-10 px-4 items-center gap-2 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] text-[14px] font-semibold pc-focus hover:brightness-110 transition btn-primary"
            >
              <Copy size={16} /> Copiar tokens
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] flex items-start">
        {/* Sidebar desktop */}
        <aside className="hidden md:block sticky top-[calc(64px+var(--safe-area-inset-top))] h-[calc(100vh-64px-var(--safe-area-inset-top))] w-[280px] shrink-0 border-r border-[var(--pc-border)] bg-[var(--pc-surface)] overflow-y-auto">
          <div className="p-6">
            <div className="mb-8">
              <div className="w-full rounded-[var(--pc-radius-md)] bg-[var(--pc-brand-50)] border border-[var(--pc-brand-100)] p-4 flex gap-3">
                <div className="w-10 h-10 rounded-[var(--pc-radius-sm)] bg-[var(--pc-brand-700)] grid place-items-center text-[var(--pc-text-inverse)]">
                  <Layers size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--pc-text)]">Versão 2.0 — Estável</div>
                  <div className="text-[12px] text-[var(--pc-text-secondary)]">Última atualização hoje</div>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group flex items-center gap-3 px-3 h-10 rounded-[var(--pc-radius-xs)] text-[14px] font-medium text-[var(--pc-text-secondary)] hover:bg-[var(--pc-surface-2)] hover:text-[var(--pc-text)] pc-focus transition"
                >
                  <s.icon size={18} className="opacity-70 group-hover:opacity-100" />
                  {s.label}
                </a>
              ))}
            </nav>

            <div className="mt-8 p-4 rounded-[var(--pc-radius-md)] bg-[var(--pc-surface-2)] border border-[var(--pc-border)]">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)] mb-2">Para devs</div>
              <div className="text-[13px] leading-5 text-[var(--pc-text)]">Tokens em CSS, componentes em HTML puro, pronto para Next.js. Sem CAIXA ALTA, sem ruído.</div>
              <button
                onClick={() => showToastDemo("info")}
                className="mt-3 w-full h-9 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface)] border border-[var(--pc-border)] text-[13px] font-medium pc-focus btn-secondary text-[var(--pc-text)]"
              >
                Ver toast
              </button>
            </div>
          </div>

          <div className="sticky bottom-0 p-4 border-t border-[var(--pc-border)] bg-[var(--pc-surface)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--pc-brand-100)] border border-[var(--pc-brand-300)] grid place-items-center text-[12px] font-bold text-[var(--pc-brand-700)]">
              CA
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate text-[var(--pc-text)]">ClimaTech Admin</div>
              <div className="text-[12px] text-[var(--pc-text-secondary)] truncate">admin@climatech.com</div>
            </div>
            <Settings size={16} className="text-[var(--pc-text-secondary)]" />
          </div>
        </aside>

        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileNavOpen(false)}>
            <div
              className="w-[300px] h-full bg-[var(--pc-surface)] border-r border-[var(--pc-border)] p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-semibold text-[var(--pc-text)]">Navegação</span>
                <button onClick={() => setMobileNavOpen(false)} className="w-8 h-8 grid place-items-center rounded text-[var(--pc-text)]">
                  <X size={18} />
                </button>
              </div>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-3 px-3 h-11 rounded-[var(--pc-radius-xs)] text-[15px] font-medium text-[var(--pc-text)]"
                  >
                    <s.icon size={20} />
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main */}
        <main ref={mainRef} className="flex-1 min-w-0 overflow-x-clip">
          {/* HERO */}
          <section className="px-4 md:px-8 lg:px-10 py-8 md:py-14 border-b border-[var(--pc-border)] bg-[var(--pc-surface)]">
            <div className="max-w-[1100px]">
              <div className="flex flex-wrap items-start gap-8 md:gap-12">
                <div className="relative">
                  {/* Etiqueta hero */}
                  <div className="w-[132px] h-[148px] rounded-[16px] bg-[var(--pc-brand-700)] p-2 shadow-[var(--pc-shadow-lg)] rotate-[-2deg]">
                    <div className="w-full h-full bg-white rounded-[12px] relative flex flex-col items-center justify-center gap-2">
                      <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full bg-[var(--pc-bg)] border-[2.5px] border-[var(--pc-brand-700)] shadow-[inset_0_1px_2px_rgba(0,0,0,.1)]" />
                      <div className="mt-2 w-12 h-12 rounded-full bg-[#dcfce7] border border-[#bbf7d0] grid place-items-center">
                        <Check size={24} className="text-[#15803d] stroke-[3]" />
                      </div>
                      <div className="text-[11px] font-bold tracking-widest text-[var(--pc-brand-700)]">PRAZO CERTO</div>
                      <div className="absolute bottom-2 w-[60%] h-[2px] bg-[var(--pc-neutral-200)] rounded-full" />
                    </div>
                  </div>
                  <div className="absolute -bottom-3 -right-3 px-3 h-7 rounded-full bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] text-[11px] font-semibold grid place-items-center shadow-[var(--pc-shadow-md)]">
                    v2.0 • PRO MAX
                  </div>
                </div>

                <div className="flex-1 min-w-[280px]">
                  <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-[var(--pc-brand-50)] border border-[var(--pc-brand-100)] text-[12px] font-semibold text-[var(--pc-brand-700)] mb-4">
                    <Sparkles size={14} /> Design System definitivo
                  </div>
                  <h1 className="text-[30px] md:text-[40px] font-bold tracking-tight leading-[0.95] mb-4 text-[var(--pc-text)]">
                    Prazo Certo —<br />
                    <span className="text-[var(--pc-brand-700)]">Design System 2.0</span>
                  </h1>
                  <p className="text-[16px] md:text-[18px] leading-7 text-[var(--pc-text-secondary)] max-w-[60ch]">
                    Sistema operacional para empresas de climatização. Feito para ser lido em campo, com luva, sob sol forte, entre um chiller e outro. Nada pisca. Tudo informa.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href="#componentes"
                      className="h-11 px-5 inline-flex items-center gap-2 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] font-semibold text-[14px] pc-focus btn-primary"
                    >
                      Ver componentes <ArrowUpRight size={16} />
                    </a>
                    <a
                      href="#tokens"
                      className="h-11 px-5 inline-flex items-center gap-2 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface)] border border-[var(--pc-border)] font-semibold text-[14px] pc-focus btn-secondary text-[var(--pc-text)]"
                    >
                      <Palette size={16} /> Explorar tokens
                    </a>
                    <div className="h-11 px-4 inline-flex items-center gap-2 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[13px] text-[var(--pc-text)]">
                      <span className="w-2 h-2 rounded-full bg-[#15803d]" /> WCAG 2.2 AA
                      <span className="w-px h-4 bg-[var(--pc-border)]" />
                      <span>PWA Ready</span>
                      <span className="w-px h-4 bg-[var(--pc-border)]" />
                      <span>44px touch</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini metrics */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Componentes", value: "16", sub: "com estados completos" },
                  { label: "Tokens", value: "84", sub: "cores, tipos, raios" },
                  { label: "Breakpoints", value: "4", sub: "mobile → wide" },
                  { label: "Acessibilidade", value: "AA", sub: "contraste garantido" },
                ].map((m) => (
                  <div key={m.label} className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface-2)] border border-[var(--pc-border)] p-4 metric-card">
                    <div className="text-[28px] font-bold leading-none text-[var(--pc-text)] metric-number">{m.value}</div>
                    <div className="text-[13px] font-semibold mt-1 text-[var(--pc-text)] metric-label">{m.label}</div>
                    <div className="text-[12px] text-[var(--pc-text-secondary)]">{m.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CONCEITO */}
          <section id="conceito" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] grid place-items-center">
                  <Sparkles size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Conceito e personalidade visual</h2>
              </div>

              <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6 md:p-8">
                <p className="text-[18px] leading-8 max-w-[70ch] text-[var(--pc-text)]">
                  O Prazo Certo é a ferramenta que tira peso da cabeça do gestor. Visual calmo, sólido e técnico, como um painel de controle de hospital: nada pisca, tudo informa. A etiqueta com furo é o coração — transforma data abstrata em objeto físico, fácil de reconhecer em campo. Usamos azul profundo como âncora de confiança, neutros quentes para leitura longa e cor apenas para status, nunca para enfeitar.
                </p>

                <div className="mt-8 grid md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: ShieldCheck,
                      title: "Confiável",
                      desc: "Azul profundo, sem ruído, sem gradiente. Bordas suaves, sombras sutis. Parece equipamento que dura 10 anos.",
                      color: "brand",
                    },
                    {
                      icon: Eye,
                      title: "Óbvio",
                      desc: "Hierarquia forte, toque grande, rótulos que dizem o que fazem. Nenhum ícone sozinho, sempre com texto.",
                      color: "neutral",
                    },
                    {
                      icon: Layers,
                      title: "Calmo",
                      desc: "Muito espaço em branco, pouca cor, tipografia generosa. Deixa a cor falar só quando importa: vencido, vence logo, em dia.",
                      color: "success",
                    },
                  ].map((p) => (
                    <div key={p.title} className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] p-5 bg-[var(--pc-surface-2)]">
                      <div className="w-10 h-10 rounded-[var(--pc-radius-sm)] bg-[var(--pc-surface)] border border-[var(--pc-border)] grid place-items-center mb-3">
                        <p.icon size={20} className={p.color === "brand" ? "text-[var(--pc-brand-700)]" : p.color === "success" ? "text-[var(--pc-success-icon)]" : "text-[var(--pc-text)]"} />
                      </div>
                      <div className="font-semibold text-[16px] text-[var(--pc-text)]">{p.title}</div>
                      <div className="text-[14px] leading-6 text-[var(--pc-text-secondary)] mt-1">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* TOKENS */}
          <section id="tokens" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16 bg-[var(--pc-surface)] border-y border-[var(--pc-border)]">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] grid place-items-center">
                  <Palette size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Tokens</h2>
                <span className="ml-2 px-2.5 h-6 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[12px] font-medium grid place-items-center text-[var(--pc-text)]">Fundação</span>
              </div>

              {/* Colors */}
              <div className="space-y-10">
                <div>
                  <h3 className="text-[18px] font-semibold mb-1 text-[var(--pc-text)]">Cores</h3>
                  <p className="text-[14px] text-[var(--pc-text-secondary)] mb-4">Brand é ação principal, neutros são leitura, status só para status. Clique para copiar.</p>

                  <div className="grid gap-6">
                    {/* Brand */}
                    <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] overflow-hidden">
                      <div className="px-5 h-12 flex items-center justify-between bg-[var(--pc-surface-2)] border-b border-[var(--pc-border)]">
                        <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--pc-text)]">Brand • Azul confiança</span>
                        <span className="text-[12px] text-[var(--pc-text-secondary)]">Uso: 700 é ação principal, 50 fundos informativos</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                        {[
                          { name: "50", hex: "#f0f7fc", text: "dark", use: "bg info" },
                          { name: "100", hex: "#d8eaf5", text: "dark", use: "borda info" },
                          { name: "300", hex: "#7bb0d0", text: "dark", use: "dark mode action" },
                          { name: "500", hex: "#1e6a94", text: "light", use: "hover" },
                          { name: "700", hex: "#155179", text: "light", use: "primary" },
                          { name: "800", hex: "#123f5e", text: "light", use: "pressed" },
                          { name: "900", hex: "#0f324b", text: "light", use: "texto escuro" },
                        ].map((c) => (
                          <button
                            key={c.name}
                            onClick={() => copy(c.hex, `brand-${c.name}`)}
                            className="group text-left rounded-[var(--pc-radius-sm)] border border-[var(--pc-border)] overflow-hidden pc-focus"
                          >
                            <div className="h-[64px]" style={{ background: c.hex }} />
                            <div className="p-2.5 bg-[var(--pc-surface)] token-swatch-label">
                              <div className="text-[12px] font-semibold flex items-center justify-between text-[var(--pc-text)]">
                                {c.name} {copied === `brand-${c.name}` ? <Check size={12} className="text-green-600" /> : null}
                              </div>
                              <div className="text-[11px] text-[var(--pc-text-secondary)] font-mono">{c.hex}</div>
                              <div className="text-[10px] text-[var(--pc-text-secondary)] mt-1">{c.use}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Neutrals */}
                    <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] overflow-hidden">
                      <div className="px-5 h-12 flex items-center justify-between bg-[var(--pc-surface-2)] border-b border-[var(--pc-border)]">
                        <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--pc-text)]">Neutros • Leitura longa</span>
                        <span className="text-[12px] text-[var(--pc-text-secondary)]">Quentes, não azulados</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-3">
                        {[
                          { name: "0", hex: "#ffffff", label: "superfície" },
                          { name: "50", hex: "#f6f8f9", label: "hover" },
                          { name: "100", hex: "#f3f5f6", label: "fundo app" },
                          { name: "200", hex: "#e6e9ee", label: "separador" },
                          { name: "300", hex: "#dddfe4", label: "borda" },
                          { name: "400", hex: "#b8bec9", label: "ícone disabled" },
                          { name: "500", hex: "#6a7181", label: "secundário" },
                          { name: "700", hex: "#2e343f", label: "título suave" },
                          { name: "900", hex: "#16181d", label: "texto" },
                        ].map((c) => (
                          <button
                            key={c.name}
                            onClick={() => copy(c.hex, `neutral-${c.name}`)}
                            className="group text-left rounded-[var(--pc-radius-sm)] border border-[var(--pc-border)] overflow-hidden pc-focus"
                          >
                            <div className="h-[56px] border-b border-[var(--pc-border)]" style={{ background: c.hex }} />
                            <div className="p-2 bg-[var(--pc-surface)] token-swatch-label">
                              <div className="text-[12px] font-semibold text-[var(--pc-text)]">{c.name}</div>
                              <div className="text-[10px] font-mono text-[var(--pc-text-secondary)]">{c.hex}</div>
                              <div className="text-[10px] text-[var(--pc-text-secondary)]">{c.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        {
                          title: "Vencido • Danger",
                          bg: "var(--pc-danger-bg)",
                          border: "var(--pc-danger-border)",
                          text: "var(--pc-danger-text)",
                          strong: "var(--pc-danger-strong)",
                          icon: "var(--pc-danger-icon)",
                          hexBg: "#fef3f2",
                          hexText: "#b42318",
                          hexBgDark: "#2a1515",
                          hexTextDark: "#fca5a5",
                        },
                        {
                          title: "Vence logo • Warning",
                          bg: "var(--pc-warning-bg)",
                          border: "var(--pc-warning-border)",
                          text: "var(--pc-warning-text)",
                          strong: "var(--pc-warning-strong)",
                          icon: "var(--pc-warning-icon)",
                          hexBg: "#fef3c7",
                          hexText: "#92400e",
                          hexBgDark: "#2a2010",
                          hexTextDark: "#fde68a",
                        },
                        {
                          title: "Em dia • Success",
                          bg: "var(--pc-success-bg)",
                          border: "var(--pc-success-border)",
                          text: "var(--pc-success-text)",
                          strong: "var(--pc-success-strong)",
                          icon: "var(--pc-success-icon)",
                          hexBg: "#dcfce7",
                          hexText: "#166534",
                          hexBgDark: "#12261a",
                          hexTextDark: "#86efac",
                        },
                      ].map((s) => (
                        <div key={s.title} className="rounded-[var(--pc-radius-md)] border p-4" style={{ background: s.bg, borderColor: s.border }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full grid place-items-center" style={{ background: s.icon, color: theme === "dark" ? "#0f141a" : "white" }}>
                              {s.title.includes("Vencido") ? <XCircle size={14} /> : s.title.includes("logo") ? <Clock3 size={14} /> : <CheckCircle size={14} />}
                            </div>
                            <div className="text-[13px] font-semibold" style={{ color: s.text }}>
                              {s.title}
                            </div>
                          </div>
                          <div className="space-y-2 text-[12px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-[var(--pc-text-secondary)]">bg light</span> <span style={{ color: s.text }}>{s.hexBg}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--pc-text-secondary)]">bg dark</span> <span style={{ color: s.text }}>{s.hexBgDark}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--pc-text-secondary)]">text</span> <span style={{ color: s.text }}>{s.hexText} / {s.hexTextDark}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-[12px] leading-5" style={{ color: s.text }}>
                            Uso exclusivo para status. Nunca decoração. Dark usa fundo escuro.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Typography */}
                <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-6">
                  <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-6">
                    <h4 className="text-[14px] font-semibold uppercase tracking-wide mb-4 text-[var(--pc-text)]">Tipografia • Work Sans</h4>
                    <div className="space-y-4">
                      {[
                        { label: "xs 12/16", size: "12px", lh: "16px", cls: "text-[12px] leading-4" },
                        { label: "sm 14/20", size: "14px", lh: "20px", cls: "text-[14px] leading-5" },
                        { label: "base 16/24", size: "16px", lh: "24px", cls: "text-[16px] leading-6" },
                        { label: "md 18/28", size: "18px", lh: "28px", cls: "text-[18px] leading-7" },
                        { label: "lg 20/28", size: "20px", lh: "28px", cls: "text-[20px] leading-7 font-semibold" },
                        { label: "xl 24/32", size: "24px", lh: "32px", cls: "text-[24px] leading-8 font-semibold" },
                        { label: "2xl 30/36", size: "30px", lh: "36px", cls: "text-[30px] leading-[36px] font-bold" },
                        { label: "3xl 36/40", size: "36px", lh: "40px", cls: "text-[36px] leading-10 font-bold tracking-tight" },
                      ].map((t) => (
                        <div key={t.label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--pc-border)] pb-3 last:border-0">
                          <div className={`${t.cls} text-[var(--pc-text)]`}>PMOC do Hospital Santa Clara</div>
                          <div className="text-[11px] font-mono text-[var(--pc-text-secondary)] whitespace-nowrap">{t.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex gap-2 text-[12px] flex-wrap">
                      {[
                        { w: "400", label: "regular" },
                        { w: "500", label: "medium" },
                        { w: "600", label: "semibold" },
                        { w: "700", label: "bold" },
                      ].map((w) => (
                        <span key={w.w} className="px-2.5 h-6 rounded-full border border-[var(--pc-border)] grid place-items-center font-mono bg-[var(--pc-surface-2)] text-[var(--pc-text)]" style={{ fontWeight: Number(w.w) }}>
                          {w.w} {w.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-5">
                      <h5 className="text-[13px] font-semibold mb-3 text-[var(--pc-text)]">Espaçamento • base 4</h5>
                      <div className="space-y-2">
                        {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64].map((s) => (
                          <div key={s} className="flex items-center gap-3">
                            <span className="text-[11px] font-mono w-8 text-[var(--pc-text-secondary)]">{s}</span>
                            <div className="h-3 rounded bg-[var(--pc-brand-100)] border border-[var(--pc-brand-300)]" style={{ width: s * 2 }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-5">
                      <h5 className="text-[13px] font-semibold mb-3 text-[var(--pc-text)]">Raios</h5>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { name: "xs 6px", r: "6px" },
                          { name: "sm 8px", r: "8px" },
                          { name: "md 12px", r: "12px" },
                          { name: "lg 16px", r: "16px" },
                          { name: "xl 24px", r: "24px" },
                          { name: "pill", r: "999px" },
                        ].map((rad) => (
                          <div key={rad.name} className="text-center">
                            <div className="w-12 h-12 bg-[var(--pc-surface-2)] border border-[var(--pc-border)]" style={{ borderRadius: rad.r }} />
                            <div className="text-[10px] mt-1 font-mono text-[var(--pc-text-secondary)]">{rad.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-5">
                      <h5 className="text-[13px] font-semibold mb-3 text-[var(--pc-text)]">Sombras & Movimento</h5>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-16 h-10 rounded-[8px] bg-[var(--pc-surface)] border border-[var(--pc-border)]" style={{ boxShadow: "var(--pc-shadow-sm)" }} />
                          <div className="w-16 h-10 rounded-[8px] bg-[var(--pc-surface)] border border-[var(--pc-border)]" style={{ boxShadow: "var(--pc-shadow-md)" }} />
                          <div className="w-16 h-10 rounded-[8px] bg-[var(--pc-surface)] border border-[var(--pc-border)]" style={{ boxShadow: "var(--pc-shadow-lg)" }} />
                        </div>
                        <div className="text-[11px] font-mono text-[var(--pc-text-secondary)]">sm • md • lg • focus 0 0 0 3px rgba(74,154,196,.4)</div>
                        <div className="pt-3 border-t border-[var(--pc-border)]">
                          <div className="flex gap-2 flex-wrap">
                            <span className="px-2 h-6 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[11px] grid place-items-center font-mono text-[var(--pc-text)]">150ms fast</span>
                            <span className="px-2 h-6 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[11px] grid place-items-center font-mono text-[var(--pc-text)]">250ms base</span>
                            <span className="px-2 h-6 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[11px] grid place-items-center font-mono text-[var(--pc-text)]">350ms slow</span>
                          </div>
                          <div className="text-[11px] text-[var(--pc-text-secondary)] mt-2">ease: cubic-bezier(.16,1,.3,1) • respeitar prefers-reduced-motion</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dark mode */}
                <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] bg-[#121821] text-[#f0f3f6] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DarkIcon size={16} /> <span className="text-[13px] font-semibold uppercase tracking-wide">Modo escuro • corrigido WCAG AA</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-[13px]">
                    <div>
                      <div className="text-[#9aa5b5] text-[12px] mb-1">Fundo & superfície</div>
                      <div className="font-mono">bg #121821</div>
                      <div className="font-mono">surface #1a212b</div>
                      <div className="font-mono">border #3a4554</div>
                      <div className="font-mono">surface-2 #1e2936</div>
                    </div>
                    <div>
                      <div className="text-[#9aa5b5] text-[12px] mb-1">Texto & Brand</div>
                      <div className="font-mono">text #f0f3f6 (7:1)</div>
                      <div className="font-mono">secondary #9aa5b5 (4.6:1)</div>
                      <div className="font-mono">brand 300 #4a9ac4 + text #0f141a</div>
                      <div className="font-mono">brand 700 #a8d0e6 + text #0f141a</div>
                    </div>
                    <div>
                      <div className="text-[#9aa5b5] text-[12px] mb-1">Status dark • fundo escuro</div>
                      <div className="font-mono">danger bg #2a1515 text #fca5a5</div>
                      <div className="font-mono">warning bg #2a2010 text #fde68a</div>
                      <div className="font-mono">success bg #12261a text #86efac</div>
                      <div className="text-[12px] mt-2 text-[#9aa5b5]">Nunca bg claro #dcfce7 no dark. Sempre fundo escuro + texto claro.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* COMPONENTES */}
          <section id="componentes" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16">
            <div className="max-w-[1100px] space-y-16">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] grid place-items-center">
                    <Box size={16} />
                  </div>
                  <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Componentes</h2>
                </div>
                <p className="text-[14px] text-[var(--pc-text-secondary)] max-w-[65ch]">Todos renderizados de verdade. Estados: padrão, hover, foco com anel, ativo, desabilitado, carregando, erro. Toque mínimo 44px no mobile. Dark com contraste AA garantido.</p>
              </div>

              {/* Botões */}
              <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] overflow-hidden">
                <div className="px-6 h-[56px] flex items-center justify-between border-b border-[var(--pc-border)]">
                  <h3 className="font-semibold text-[var(--pc-text)]">Botão • contraste corrigido no dark</h3>
                  <span className="text-[12px] text-[var(--pc-text-secondary)]">sm 32px • md 40px • lg 44px (mobile padrão)</span>
                </div>
                <div className="p-6 space-y-8">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)]">Primary • text-inverse</div>
                      <button className="btn-primary w-full h-11 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] font-semibold text-[14px] pc-focus hover:brightness-110 transition">
                        Renovar vencimento
                      </button>
                      <button className="btn-primary w-full h-11 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] font-semibold text-[14px] opacity-60">
                        Desabilitado
                      </button>
                      <button className="btn-primary w-full h-11 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] font-semibold text-[14px] inline-flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[var(--pc-text-inverse)]/40 border-t-[var(--pc-text-inverse)] rounded-full animate-spin" /> Carregando
                      </button>
                      <div className="text-[11px] text-[var(--pc-text-secondary)]">Light: bg #155179 + white 7:1. Dark: bg #4a9ac4 + #0f141a 7:1.</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)]">Secondary • transparent dark</div>
                      <button className="btn-secondary w-full h-11 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface)] border border-[var(--pc-border)] font-semibold text-[14px] pc-focus hover:bg-[var(--pc-surface-2)] transition text-[var(--pc-text)]">
                        Concluir sem renovar
                      </button>
                      <button className="btn-secondary w-full h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface)] border border-[var(--pc-border)] font-medium text-[13px] text-[var(--pc-text)]">Pequeno 32px</button>
                      <button className="btn-secondary w-full h-11 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface)] border border-[var(--pc-border)] font-semibold text-[14px] flex items-center justify-center gap-2 text-[var(--pc-text)]">
                        <Search size={16} /> Buscar vencimentos
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)]">Ghost</div>
                      <button className="btn-ghost w-full h-11 rounded-[var(--pc-radius-xs)] hover:bg-[var(--pc-surface-2)] font-medium text-[14px] pc-focus text-[var(--pc-text)]">Cancelar</button>
                      <button className="btn-ghost w-full h-11 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface-2)] font-medium text-[14px] text-[var(--pc-text)]">Hover state</button>
                      <div className="text-[11px] text-[var(--pc-text-secondary)]">Dark: #f0f3f6 em fundo transparente.</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)]">Danger • dark bg #2a1515</div>
                      <button onClick={() => setShowModal(true)} className="btn-danger w-full h-11 rounded-[var(--pc-radius-xs)] bg-[#b42318] text-white font-semibold text-[14px] pc-focus hover:bg-[#7a271a] transition">
                        Excluir vencimento
                      </button>
                      <div className="text-[11px] text-[var(--pc-text-secondary)]">Dark usa #7a271a + #fecaca border #5c2222.</div>
                    </div>
                  </div>

                  <div className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface-2)] border border-[var(--pc-border)] p-4">
                    <div className="text-[12px] font-semibold mb-2 text-[var(--pc-text)]">Regras • contraste</div>
                    <ul className="text-[13px] leading-6 list-disc pl-5 text-[var(--pc-text-secondary)]">
                      <li>Primary light: #155179 + white 7:1. Primary dark: #4a9ac4 + #0f141a 7:1.</li>
                      <li>Secondary dark: transparent + border #3a4554 + text #f0f3f6.</li>
                      <li>Nunca texto #f0f3f6 em fundo #f0f7fc. Verificado.</li>
                      <li>Foco sempre com anel de 3px brand/40% no dark.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Campos */}
              <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] overflow-hidden">
                <div className="px-6 h-[56px] flex items-center justify-between border-b border-[var(--pc-border)]">
                  <h3 className="font-semibold text-[var(--pc-text)]">Campo de texto • Select • Textarea</h3>
                  <span className="text-[12px] text-[var(--pc-text-secondary)]">label 14px medium • campo 16px • altura 44px</span>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div>
                      <label className="text-[14px] font-medium block mb-1.5 text-[var(--pc-text)]">Título do vencimento</label>
                      <input
                        placeholder="Ex: PMOC - Hospital Santa Clara"
                        className="w-full h-11 rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] px-3 text-[16px] pc-focus outline-none focus:border-[var(--pc-brand-700)] focus:shadow-[var(--pc-shadow-focus)] text-[var(--pc-text)] placeholder:text-[var(--pc-text-secondary)]"
                      />
                      <div className="text-[12px] text-[var(--pc-text-secondary)] mt-1.5">Use um nome que você reconheça em campo.</div>
                    </div>

                    <div>
                      <label className="text-[14px] font-medium block mb-1.5 text-[var(--pc-text)]">Cliente</label>
                      <div className="relative">
                        <select className="w-full h-11 rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] px-3 text-[16px] pc-focus outline-none appearance-none text-[var(--pc-text)]">
                          <option>Frigorífico Boi Bom</option>
                          <option>Hospital Santa Clara</option>
                          <option>Shopping Center Norte</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--pc-text-secondary)]" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[14px] font-medium block mb-1.5 text-[var(--pc-text)]">Observações</label>
                      <textarea
                        rows={3}
                        placeholder="Detalhes que ajudam o técnico na próxima visita..."
                        className="w-full rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-3 text-[16px] pc-focus outline-none focus:border-[var(--pc-brand-700)] text-[var(--pc-text)] placeholder:text-[var(--pc-text-secondary)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[14px] font-medium block mb-1.5 text-[var(--pc-danger-text)]">Data de vencimento • com erro</label>
                      <input
                        value=""
                        placeholder="Selecione a data"
                        className="w-full h-11 rounded-[var(--pc-radius-xs)] border border-[var(--pc-danger-border)] bg-[var(--pc-danger-bg)] px-3 text-[16px] pc-focus outline-none text-[var(--pc-text)] placeholder:text-[var(--pc-text-secondary)]"
                      />
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--pc-danger-text)] mt-1.5">
                        <AlertCircle size={14} /> Informe a data de vencimento para continuar
                      </div>
                    </div>

                    <div className="opacity-60">
                      <label className="text-[14px] font-medium block mb-1.5 text-[var(--pc-text)]">CNPJ (desabilitado)</label>
                      <input disabled value="12.345.678/0001-90" className="w-full h-11 rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface-2)] px-3 text-[16px] text-[var(--pc-text)]" />
                    </div>

                    <div className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface-2)] border border-[var(--pc-border)] p-4">
                      <div className="text-[12px] font-semibold text-[var(--pc-text)]">Estados</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="px-2 h-7 rounded border bg-[var(--pc-surface)] border-[var(--pc-border)] grid place-items-center text-[var(--pc-text)]">default</div>
                        <div className="px-2 h-7 rounded border border-[var(--pc-brand-700)] shadow-[var(--pc-shadow-focus)] bg-[var(--pc-surface)] grid place-items-center text-[var(--pc-text)]">focus</div>
                        <div className="px-2 h-7 rounded border border-[var(--pc-danger-border)] bg-[var(--pc-danger-bg)] grid place-items-center text-[var(--pc-danger-text)]">erro</div>
                        <div className="px-2 h-7 rounded border bg-[var(--pc-surface-2)] grid place-items-center text-[var(--pc-text-secondary)]">disabled</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload + Metric + Etiqueta */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                  <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Upload de arquivo</h3>
                  {uploadState === "empty" ? (
                    <div className="rounded-[var(--pc-radius-md)] border-2 border-dashed border-[var(--pc-border)] bg-[var(--pc-surface-2)] p-8 text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[var(--pc-surface)] border border-[var(--pc-border)] grid place-items-center mb-3">
                        <UploadCloud size={20} className="text-[var(--pc-text)]" />
                      </div>
                      <div className="font-medium text-[14px] text-[var(--pc-text)]">Arraste o PDF ou foto aqui</div>
                      <div className="text-[13px] text-[var(--pc-text-secondary)] mt-1">PDF, JPG ou PNG até 10MB. Foto do documento em campo funciona.</div>
                      <button
                        onClick={() => setUploadState("file")}
                        className="mt-4 h-9 px-4 rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] font-medium text-[13px] pc-focus btn-secondary text-[var(--pc-text)]"
                      >
                        Selecionar arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] p-4 flex items-center gap-3 bg-[var(--pc-surface-2)]">
                      <div className="w-10 h-10 rounded-[var(--pc-radius-sm)] bg-[var(--pc-warning-bg)] border border-[var(--pc-warning-border)] grid place-items-center text-[var(--pc-warning-text)]">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium truncate text-[var(--pc-text)]">PMOC_Hospital_Santa_Clara_2026.pdf</div>
                        <div className="text-[12px] text-[var(--pc-text-secondary)]">2.4 MB • adicionado agora</div>
                      </div>
                      <button onClick={() => setUploadState("empty")} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--pc-surface)] pc-focus btn-ghost">
                        <Trash2 size={16} className="text-[var(--pc-text)]" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                  <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Card de métrica • dark corrigido</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "vencidos", label: "Vencidos", value: "12", sub: "3 clientes", color: "danger" },
                      { id: "breve", label: "Vencem logo", value: "8", sub: "em 7 dias", color: "warning" },
                      { id: "emdia", label: "Em dia", value: "47", sub: "tudo certo", color: "success" },
                      { id: "ativos", label: "Ativos", value: "67", sub: "total", color: "neutral" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMetricSelected(m.id)}
                        className={`metric-card text-left rounded-[var(--pc-radius-md)] border p-4 pc-focus transition ${
                          metricSelected === m.id ? "border-[var(--pc-brand-700)] ring-[1px] ring-[var(--pc-brand-700)] bg-[var(--pc-brand-50)]" : "border-[var(--pc-border)] bg-[var(--pc-surface-2)] hover:bg-[var(--pc-surface)]"
                        }`}
                      >
                        <div className="text-[28px] font-bold leading-none text-[var(--pc-text)] metric-number">{m.value}</div>
                        <div className="text-[13px] font-semibold mt-1 flex items-center gap-1.5 text-[var(--pc-text)] metric-label">
                          {m.color === "danger" && <span className="w-2 h-2 rounded-full bg-[#d92d20]" />}
                          {m.color === "warning" && <span className="w-2 h-2 rounded-full bg-[#d97706]" />}
                          {m.color === "success" && <span className="w-2 h-2 rounded-full bg-[#15803d]" />}
                          {m.label}
                        </div>
                        <div className="text-[12px] text-[var(--pc-text-secondary)]">{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Etiqueta */}
              <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] overflow-hidden">
                <div className="px-6 h-[56px] flex items-center justify-between border-b border-[var(--pc-border)]">
                  <h3 className="font-semibold flex items-center gap-2 text-[var(--pc-text)]">
                    <Tag size={16} /> Etiqueta de vencimento • componente assinatura
                  </h3>
                  <span className="text-[12px] text-[var(--pc-text-secondary)]">52×52 • radius 8 • furo 6px • padding 8px</span>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-6">
                    {[
                      { day: "09", mon: "NOV", status: "vencido", label: "Vencido", bg: "var(--pc-danger-bg)", border: "var(--pc-danger-border)", text: "var(--pc-danger-text)" },
                      { day: "15", mon: "NOV", status: "logo", label: "Vence logo", bg: "var(--pc-warning-bg)", border: "var(--pc-warning-border)", text: "var(--pc-warning-text)" },
                      { day: "30", mon: "NOV", status: "emdia", label: "Em dia", bg: "var(--pc-success-bg)", border: "var(--pc-success-border)", text: "var(--pc-success-text)" },
                      { day: "12", mon: "DEZ", status: "neutro", label: "Padrão", bg: "var(--pc-surface)", border: "var(--pc-border)", text: "var(--pc-text)" },
                    ].map((e) => (
                      <div key={e.label} className="flex flex-col items-center gap-2">
                        <div
                          className="relative w-[52px] h-[52px] rounded-[8px] border grid place-items-center p-[8px]"
                          style={{ background: e.bg, borderColor: e.border }}
                        >
                          <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-[var(--pc-bg)] border-2" style={{ borderColor: e.border }} />
                          <div className="text-center leading-none">
                            <div className="text-[20px] font-bold" style={{ color: e.text }}>
                              {e.day}
                            </div>
                            <div className="text-[10px] font-bold tracking-wide mt-[2px]" style={{ color: e.text }}>
                              {e.mon}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium px-2 h-5 rounded-full border grid place-items-center" style={{ background: e.bg, borderColor: e.border, color: e.text }}>
                          {e.label}
                        </span>
                      </div>
                    ))}

                    <div className="ml-6 pl-6 border-l border-[var(--pc-border)]">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)] mb-2">Anatomia</div>
                      <div className="text-[13px] leading-6 text-[var(--pc-text-secondary)]">
                        • Quadrado 52×52, radius 8px
                        <br />• Furo 6px com borda interna
                        <br />• Dia 20px bold + mês 10px
                        <br />• Cor só por status, nunca decoração
                        <br />• Dark: bg #2a1515 / #2a2010 / #12261a
                        <br />• Legível a 1m em campo
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* List item + badges */}
              <div className="grid lg:grid-cols-[1.6fr_.9fr] gap-6">
                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                  <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Item da lista</h3>
                  <div className="space-y-3">
                    {[
                      { day: "09", mon: "NOV", title: "PMOC - Frigorífico Boi Bom", meta: "Frigorífico Boi Bom • PMOC", status: "9 dias vencido", tone: "danger" },
                      { day: "15", mon: "NOV", title: "Laudo de qualidade do ar - Hospital Santa Clara", meta: "Hospital Santa Clara • Laudo", status: "vence em 3 dias", tone: "warning" },
                      { day: "30", mon: "NOV", title: "ART - Shopping Center Norte", meta: "Shopping Center Norte • ART", status: "em dia", tone: "success" },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex gap-3 p-3 rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] hover:bg-[var(--pc-surface-2)] transition bg-[var(--pc-surface)]"
                      >
                        <div
                          className="shrink-0 w-[52px] h-[52px] rounded-[8px] border grid place-items-center relative"
                          style={{
                            background: item.tone === "danger" ? "var(--pc-danger-bg)" : item.tone === "warning" ? "var(--pc-warning-bg)" : "var(--pc-success-bg)",
                            borderColor: item.tone === "danger" ? "var(--pc-danger-border)" : item.tone === "warning" ? "var(--pc-warning-border)" : "var(--pc-success-border)",
                          }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--pc-bg)] border-2" style={{ borderColor: item.tone === "danger" ? "var(--pc-danger-border)" : item.tone === "warning" ? "var(--pc-warning-border)" : "var(--pc-success-border)" }} />
                          <div className="text-center leading-none">
                            <div className="text-[18px] font-bold" style={{ color: item.tone === "danger" ? "var(--pc-danger-text)" : item.tone === "warning" ? "var(--pc-warning-text)" : "var(--pc-success-text)" }}>{item.day}</div>
                            <div className="text-[10px] font-bold" style={{ color: item.tone === "danger" ? "var(--pc-danger-text)" : item.tone === "warning" ? "var(--pc-warning-text)" : "var(--pc-success-text)" }}>{item.mon}</div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[16px] font-semibold leading-5 truncate text-[var(--pc-text)]">{item.title}</div>
                          <div className="text-[13px] text-[var(--pc-text-secondary)] flex items-center gap-1.5 mt-1">
                            <Building2 size={14} /> {item.meta}
                          </div>
                          <div className="md:hidden mt-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[12px] font-medium border ${
                                item.tone === "danger" ? "bg-[var(--pc-danger-bg)] border-[var(--pc-danger-border)] text-[var(--pc-danger-text)]" : item.tone === "warning" ? "bg-[var(--pc-warning-bg)] border-[var(--pc-warning-border)] text-[var(--pc-warning-text)]" : "bg-[var(--pc-success-bg)] border-[var(--pc-success-border)] text-[var(--pc-success-text)]"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" /> {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="hidden md:flex items-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[12px] font-medium border ${
                              item.tone === "danger" ? "bg-[var(--pc-danger-bg)] border-[var(--pc-danger-border)] text-[var(--pc-danger-text)]" : item.tone === "warning" ? "bg-[var(--pc-warning-bg)] border-[var(--pc-warning-border)] text-[var(--pc-warning-text)]" : "bg-[var(--pc-success-bg)] border-[var(--pc-success-border)] text-[var(--pc-success-text)]"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" /> {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                    <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Selo de status • dark corrigido</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[var(--pc-danger-bg)] border border-[var(--pc-danger-border)] text-[13px] font-medium text-[var(--pc-danger-text)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--pc-danger-icon)]" /> Vencido
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[var(--pc-warning-bg)] border border-[var(--pc-warning-border)] text-[13px] font-medium text-[var(--pc-warning-text)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--pc-warning-icon)]" /> Vence logo
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[var(--pc-success-bg)] border border-[var(--pc-success-border)] text-[13px] font-medium text-[var(--pc-success-text)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--pc-success-icon)]" /> Em dia
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] text-[13px] font-medium text-[var(--pc-text)]">Arquivado</span>
                    </div>
                    <div className="mt-3 text-[11px] text-[var(--pc-text-secondary)]">Dark: bg #2a1515/#2a2010/#12261a + texto claro AA.</div>
                  </div>

                  <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                    <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Aviso (alert)</h3>
                    <div className="rounded-[var(--pc-radius-md)] bg-[var(--pc-info-bg)] border border-[var(--pc-info-border)] p-4 flex gap-3">
                      <Info size={18} className="shrink-0 mt-0.5 text-[var(--pc-brand-700)]" />
                      <div>
                        <div className="text-[14px] font-medium text-[var(--pc-text)]">Você está no ambiente de demonstração</div>
                        <div className="text-[13px] text-[var(--pc-text-secondary)] mt-1">Todos os dados são fictícios. Seus vencimentos reais estão no ambiente de produção.</div>
                        <a href="#" className="inline-flex mt-2 text-[13px] font-semibold text-[var(--pc-brand-700)] hover:underline">
                          Entrar no sistema →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar, mobile tabs, page header, table, empty, modal */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Sidebar preview */}
                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] overflow-hidden">
                  <div className="px-5 h-12 flex items-center justify-between border-b border-[var(--pc-border)] bg-[var(--pc-surface-2)]">
                    <span className="text-[13px] font-semibold uppercase text-[var(--pc-text)]">Barra lateral • 280px • desktop</span>
                  </div>
                  <div className="flex h-[320px]">
                    <div className="w-[200px] border-r border-[var(--pc-border)] bg-[var(--pc-surface)] p-3 flex flex-col">
                      <div className="flex items-center gap-2 mb-6 px-1">
                        <div className="w-8 h-8 rounded-[6px] bg-[var(--pc-brand-700)] grid place-items-center text-[var(--pc-text-inverse)]">
                          <Check size={16} />
                        </div>
                        <span className="font-bold text-[13px] text-[var(--pc-text)]">PRAZO CERTO</span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { icon: LayoutDashboard, label: "Painel", active: true },
                          { icon: Users, label: "Clientes" },
                          { icon: History, label: "Histórico" },
                          { icon: Settings, label: "Ajustes" },
                        ].map((it) => (
                          <div key={it.label} className={`flex items-center gap-2.5 px-2.5 h-9 rounded-[6px] text-[13px] font-medium ${it.active ? "bg-[var(--pc-brand-50)] text-[var(--pc-brand-700)] border-l-[3px] border-[var(--pc-brand-700)]" : "text-[var(--pc-text-secondary)]"}`}>
                            <it.icon size={18} /> {it.label}
                          </div>
                        ))}
                      </div>
                      <div className="mt-auto pt-3 border-t border-[var(--pc-border)] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--pc-neutral-200)]" />
                        <div className="text-[12px] leading-tight">
                          <div className="font-medium text-[var(--pc-text)]">Você</div>
                          <div className="text-[var(--pc-text-secondary)]">Sair</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 bg-[var(--pc-bg)] p-4">
                      <div className="h-6 w-32 bg-[var(--pc-neutral-200)] rounded mb-3" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 bg-[var(--pc-surface)] rounded-[8px] border border-[var(--pc-border)]" />
                        <div className="h-16 bg-[var(--pc-surface)] rounded-[8px] border border-[var(--pc-border)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile tabs preview */}
                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] overflow-hidden">
                  <div className="px-5 h-12 flex items-center justify-between border-b border-[var(--pc-border)] bg-[var(--pc-surface-2)]">
                    <span className="text-[13px] font-semibold uppercase text-[var(--pc-text)]">Barra de abas • mobile • 72px + safe-area</span>
                  </div>
                  <div className="relative h-[320px] bg-[var(--pc-bg)]">
                    <div className="p-4">
                      <div className="h-5 w-40 bg-[var(--pc-neutral-200)] rounded mb-2" />
                      <div className="h-24 bg-[var(--pc-surface)] rounded-[12px] border border-[var(--pc-border)]" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-[var(--pc-surface)] border-t border-[var(--pc-border)] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
                      {[
                        { icon: LayoutDashboard, label: "Painel", active: true },
                        { icon: Users, label: "Clientes" },
                        { icon: Plus, label: "Novo", fab: true },
                        { icon: History, label: "Histórico" },
                        { icon: Settings, label: "Ajustes" },
                      ].map((it) => (
                        <div key={it.label} className="flex flex-col items-center gap-1">
                          {it.fab ? (
                            <div className="w-[56px] h-[56px] rounded-full bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] grid place-items-center shadow-[var(--pc-shadow-lg)] -translate-y-3">
                              <Plus size={24} />
                            </div>
                          ) : (
                            <>
                              <it.icon size={20} className={it.active ? "text-[var(--pc-brand-700)]" : "text-[var(--pc-text-secondary)]"} />
                              <span className={`text-[10px] font-medium ${it.active ? "text-[var(--pc-brand-700)]" : "text-[var(--pc-text-secondary)]"}`}>{it.label}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Page header + Table + Empty */}
              <div className="grid gap-6">
                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                  <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Cabeçalho de página</h3>
                  <div className="rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] p-4 md:p-6 bg-[var(--pc-surface-2)]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-[30px] font-bold leading-none tracking-tight text-[var(--pc-text)]">Vencimentos</h4>
                        <div className="text-[14px] text-[var(--pc-text-secondary)] mt-2 flex items-center gap-2">
                          <Calendar size={14} /> Hoje, 12 de novembro de 2026 • 67 itens ativos
                        </div>
                      </div>
                      <button className="btn-primary h-11 px-5 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] font-semibold text-[14px] inline-flex items-center gap-2 self-start md:self-auto pc-focus">
                        <Plus size={16} /> Novo vencimento
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-[12px] text-[var(--pc-text-secondary)]">Desktop: ação à direita. Mobile: ação abaixo do título, full-width. Contraste AA garantido no dark.</div>
                </div>

                <div className="grid lg:grid-cols-[1.4fr_.6fr] gap-6">
                  <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] overflow-hidden">
                    <div className="px-6 h-12 flex items-center justify-between border-b border-[var(--pc-border)]">
                      <h3 className="font-semibold text-[var(--pc-text)]">Tabela • Admin</h3>
                      <span className="text-[12px] text-[var(--pc-text-secondary)]">header 12px uppercase • linha 44px • hover 50</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[var(--pc-border)] bg-[var(--pc-surface-2)]">
                            <th className="px-4 h-10 text-[12px] font-medium uppercase tracking-wide text-[var(--pc-text-secondary)]">Empresa</th>
                            <th className="px-4 h-10 text-[12px] font-medium uppercase tracking-wide text-[var(--pc-text-secondary)]">Plano</th>
                            <th className="px-4 h-10 text-[12px] font-medium uppercase tracking-wide text-[var(--pc-text-secondary)]">Status</th>
                            <th className="px-4 h-10 text-[12px] font-medium uppercase tracking-wide text-[var(--pc-text-secondary)]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { empresa: "ClimaTech Sul", plano: "Pro • R$149/mês", status: "Ativa" },
                            { empresa: "Ar Frio Hospitalar", plano: "Base • R$79/mês", status: "Suspensa" },
                            { empresa: "Frigotec Industrial", plano: "Pro • R$149/mês", status: "Ativa" },
                          ].map((row) => (
                            <tr key={row.empresa} className="border-b border-[var(--pc-border)] last:border-0 h-[44px] hover:bg-[var(--pc-surface-2)] transition">
                              <td className="px-4 text-[14px] font-medium text-[var(--pc-text)]">{row.empresa}</td>
                              <td className="px-4 text-[13px] text-[var(--pc-text-secondary)]">{row.plano}</td>
                              <td className="px-4">
                                <span className={`px-2 h-6 rounded-full inline-grid place-items-center text-[12px] font-medium border ${row.status === "Ativa" ? "bg-[var(--pc-success-bg)] border-[var(--pc-success-border)] text-[var(--pc-success-text)]" : "bg-[var(--pc-danger-bg)] border-[var(--pc-danger-border)] text-[var(--pc-danger-text)]"}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 text-right">
                                <button className="w-8 h-8 grid place-items-center rounded hover:bg-[var(--pc-surface-2)] pc-focus btn-ghost">
                                  <MoreHorizontal size={16} className="text-[var(--pc-text)]" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-8 text-center">
                    <div className="w-20 h-20 mx-auto rounded-[16px] bg-[var(--pc-surface-2)] border border-[var(--pc-border)] grid place-items-center relative mb-4">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--pc-bg)] border-2 border-[var(--pc-border)]" />
                      <FileWarning size={28} className="text-[var(--pc-text-secondary)] opacity-60" />
                    </div>
                    <h4 className="font-semibold text-[var(--pc-text)]">Nenhum vencimento por aqui</h4>
                    <p className="text-[14px] text-[var(--pc-text-secondary)] mt-2 leading-6 max-w-[28ch] mx-auto">Que bom — ou cadastre o primeiro para começar a controlar.</p>
                    <button className="btn-primary mt-4 h-10 px-4 rounded-[var(--pc-radius-xs)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] font-semibold text-[14px] pc-focus">Cadastrar primeiro vencimento</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LAYOUT RESPONSIVO */}
          <section id="layout" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16 bg-[var(--pc-surface)] border-y border-[var(--pc-border)]">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] grid place-items-center">
                  <LayoutGrid size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Layout responsivo</h2>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-[var(--pc-radius-lg)] border border-[var(--pc-border)] bg-[var(--pc-surface-2)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Monitor size={16} className="text-[var(--pc-text)]" /> <span className="text-[13px] font-semibold uppercase text-[var(--pc-text)]">Breakpoints</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                    {[
                      { name: "mobile", range: "<768px", desc: "sem sidebar, padding 16px, bottom tabs 72px + safe-area" },
                      { name: "tablet", range: "768-1024", desc: "sidebar overlay colapsável" },
                      { name: "desktop", range: ">1024", desc: "sidebar fixa 280px + conteúdo max 1280 centralizado padding 32px" },
                      { name: "wide", range: ">1280", desc: "grid 12 col gap 24px" },
                    ].map((bp) => (
                      <div key={bp.name} className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface)] border border-[var(--pc-border)] p-4">
                        <div className="font-semibold text-[var(--pc-text)]">{bp.name}</div>
                        <div className="font-mono text-[12px] text-[var(--pc-brand-700)]">{bp.range}</div>
                        <div className="text-[12px] text-[var(--pc-text-secondary)] mt-2 leading-5">{bp.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    <div className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface)] border border-[var(--pc-border)] p-4">
                      <div className="text-[13px] font-semibold mb-2 text-[var(--pc-text)]">Regras de grid</div>
                      <ul className="text-[13px] leading-6 text-[var(--pc-text-secondary)] list-disc pl-5">
                        <li>Cards métrica: 4 col desktop, 2×2 mobile</li>
                        <li>Listas: full width sempre</li>
                        <li>Formulários: 1 coluna mobile, 2 colunas desktop para campos curtos</li>
                        <li>Conteúdo max 1280px centralizado</li>
                      </ul>
                    </div>
                    <div className="rounded-[var(--pc-radius-md)] bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] p-4">
                      <div className="text-[13px] font-semibold mb-2">Safe areas iPhone</div>
                      <div className="text-[13px] leading-6 opacity-90">
                        Header com env(safe-area-inset-top). Bottom tabs com padding-bottom env(safe-area-inset-bottom). Campos 16px para evitar zoom automático.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[var(--pc-radius-lg)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone size={16} className="text-[var(--pc-text)]" /> <span className="text-[13px] font-semibold text-[var(--pc-text)]">Mobile first</span>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 rounded-full bg-[var(--pc-neutral-200)] w-full" />
                      <div className="h-2 rounded-full bg-[var(--pc-neutral-200)] w-[70%]" />
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="h-20 rounded-[12px] bg-[var(--pc-surface-2)] border border-[var(--pc-border)]" />
                        <div className="h-20 rounded-[12px] bg-[var(--pc-surface-2)] border border-[var(--pc-border)]" />
                      </div>
                      <div className="h-10 rounded-[8px] bg-[var(--pc-brand-700)]" />
                    </div>
                  </div>

                  <div className="rounded-[var(--pc-radius-lg)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-5">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)] mb-2">Exemplo código layout</div>
                    <pre className="text-[11px] font-mono leading-5 bg-[var(--pc-surface-2)] border border-[var(--pc-border)] rounded-[8px] p-3 overflow-x-auto text-[var(--pc-text)]">{`.shell{
  sidebar: 280px fixed
  content: max 1280px
  padding: 32px desktop / 16px mobile
  grid: 12 cols gap 24px
}
@media <768px{
  .shell{ padding:16px; bottom-tabs:72px }
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ÍCONES E LOGO */}
          <section id="icones-logo" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] grid place-items-center">
                  <Type size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Ícones e logo</h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                  <h3 className="font-semibold mb-1 text-[var(--pc-text)]">Ícones • Lucide outline</h3>
                  <p className="text-[13px] text-[var(--pc-text-secondary)] mb-4">Stroke 2px, 20px padrão, 16px para meta, 24px para navegação mobile. Nunca preenchido, nunca com cor exceto status.</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {[
                      { ic: LayoutDashboard, label: "Painel" },
                      { ic: Users, label: "Clientes" },
                      { ic: FileText, label: "Documento" },
                      { ic: Calendar, label: "Data" },
                      { ic: Search, label: "Busca" },
                      { ic: Settings, label: "Ajustes" },
                      { ic: Building2, label: "Empresa" },
                      { ic: Clock3, label: "Tempo" },
                      { ic: CheckCircle2, label: "Em dia" },
                      { ic: AlertTriangle, label: "Aviso" },
                      { ic: XCircle, label: "Vencido" },
                      { ic: UploadCloud, label: "Upload" },
                    ].map((it) => (
                      <div key={it.label} className="rounded-[var(--pc-radius-sm)] border border-[var(--pc-border)] bg-[var(--pc-surface-2)] p-3 flex flex-col items-center gap-2">
                        <it.ic size={20} strokeWidth={2} className="text-[var(--pc-text)]" />
                        <span className="text-[10px] font-medium text-[var(--pc-text)]">{it.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-[var(--pc-radius-md)] bg-[var(--pc-surface-2)] border border-[var(--pc-border)] p-3 flex gap-2 text-[12px] text-[var(--pc-text)]">
                    <Circle size={14} className="mt-0.5" />
                    <span>Sempre outline 2px. Ícone sozinho nunca, sempre com rótulo textual.</span>
                  </div>
                </div>

                <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                  <h3 className="font-semibold mb-4 text-[var(--pc-text)]">Logo evolução</h3>
                  <div className="flex gap-6 items-start">
                    <div className="w-[88px] h-[100px] rounded-[12px] bg-[var(--pc-brand-700)] p-1.5 shadow-[var(--pc-shadow-md)]">
                      <div className="w-full h-full bg-white rounded-[8px] relative grid place-items-center">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[var(--pc-bg)] border-2 border-[var(--pc-brand-700)]" />
                        <Check size={20} className="text-[#15803d] stroke-[3] mt-2" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-6 text-[var(--pc-text)]">
                        <strong>Manter:</strong> etiqueta com furo e visto. Proporção 1:1.2, furo com borda interna, visto com cantos arredondados, versão monocromática para PWA.
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded border border-[var(--pc-success-border)] bg-[var(--pc-success-bg)] text-[var(--pc-success-text)] p-2 flex gap-1.5">
                          <CheckCircle2 size={14} /> Não rotacionar etiqueta
                        </div>
                        <div className="rounded border border-[var(--pc-success-border)] bg-[var(--pc-success-bg)] text-[var(--pc-success-text)] p-2 flex gap-1.5">
                          <CheckCircle2 size={14} /> Visto sempre verde
                        </div>
                        <div className="rounded border border-[var(--pc-danger-border)] bg-[var(--pc-danger-bg)] text-[var(--pc-danger-text)] p-2 flex gap-1.5">
                          <XCircle size={14} /> Sem sombra colorida
                        </div>
                        <div className="rounded border border-[var(--pc-danger-border)] bg-[var(--pc-danger-bg)] text-[var(--pc-danger-text)] p-2 flex gap-1.5">
                          <XCircle size={14} /> Verde só no visto
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[var(--pc-border)]">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)] mb-2">Versões</div>
                    <div className="flex gap-3 flex-wrap">
                      <div className="px-3 h-8 rounded-full bg-[var(--pc-brand-700)] text-[var(--pc-text-inverse)] text-[12px] font-semibold grid place-items-center">Colorida • padrão</div>
                      <div className="px-3 h-8 rounded-full bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] text-[12px] font-semibold grid place-items-center">Mono • PWA</div>
                      <div className="px-3 h-8 rounded-full bg-[var(--pc-surface)] border border-[var(--pc-border)] text-[12px] font-semibold grid place-items-center text-[var(--pc-text)]">Branco • sobre azul</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TOM DE VOZ */}
          <section id="voz" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16 bg-[var(--pc-surface)] border-y border-[var(--pc-border)]">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] grid place-items-center">
                  <FileText size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Tom de voz</h2>
              </div>

              <div className="rounded-[var(--pc-radius-lg)] border border-[var(--pc-border)] bg-[var(--pc-surface-2)] p-6 md:p-8">
                <p className="text-[16px] leading-7 max-w-[65ch] text-[var(--pc-text)]">Direto, humano, sem tecnicês. Falar como supervisor experiente que já viu tudo vencer. Sem CAIXA ALTA, sem jargão.</p>

                <div className="mt-8 overflow-x-auto rounded-[var(--pc-radius-md)] border border-[var(--pc-border)] bg-[var(--pc-surface)]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[var(--pc-surface-2)] border-b border-[var(--pc-border)]">
                        <th className="px-5 h-12 text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-text)]">Contexto</th>
                        <th className="px-5 h-12 text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-danger-text)]">Evitar</th>
                        <th className="px-5 h-12 text-[12px] font-semibold uppercase tracking-wide text-[var(--pc-success-text)]">Usar</th>
                      </tr>
                    </thead>
                    <tbody className="text-[14px]">
                      <tr className="border-b border-[var(--pc-border)]">
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Botões</td>
                        <td className="px-5 py-4 text-[var(--pc-text-secondary)]">Salvar, Finalizar</td>
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Renovar e criar próximo vencimento, Concluir sem renovar</td>
                      </tr>
                      <tr className="border-b border-[var(--pc-border)]">
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Erros</td>
                        <td className="px-5 py-4 text-[var(--pc-text-secondary)]">Campo obrigatório</td>
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Informe a data de vencimento para continuar</td>
                      </tr>
                      <tr className="border-b border-[var(--pc-border)]">
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Vazios</td>
                        <td className="px-5 py-4 text-[var(--pc-text-secondary)]">Nenhum dado encontrado</td>
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Nenhum vencimento por aqui. Que bom — ou cadastre o primeiro para começar a controlar.</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">Toasts</td>
                        <td className="px-5 py-4 text-[var(--pc-text-secondary)]">Operação realizada com sucesso</td>
                        <td className="px-5 py-4 font-medium text-[var(--pc-text)]">PMOC do Frigorífico Boi Bom renovado. Próximo vencimento em 30/11/2026.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid md:grid-cols-3 gap-4">
                  {[
                    { title: "Direto", desc: "Frases curtas, verbo no início. 'Informe', 'Renove', 'Conclua'." },
                    { title: "Humano", desc: "Reconhece esforço. 'Que bom' quando não há vencidos." },
                    { title: "Técnico sem tecnicês", desc: "PMOC, ART são do dia a dia, mas explicamos. Sem 'parametrize'." },
                  ].map((p) => (
                    <div key={p.title} className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface)] border border-[var(--pc-border)] p-4">
                      <div className="font-semibold text-[14px] text-[var(--pc-text)]">{p.title}</div>
                      <div className="text-[13px] text-[var(--pc-text-secondary)] mt-1 leading-6">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CHECKLIST */}
          <section id="checklist" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[#15803d] text-white grid place-items-center">
                  <ShieldCheck size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Checklist de qualidade • contraste corrigido</h2>
                <span className="ml-2 text-[12px] px-2.5 h-6 rounded-full bg-[var(--pc-success-bg)] border border-[var(--pc-success-border)] text-[var(--pc-success-text)] font-medium grid place-items-center">
                  {Object.values(checkState).filter(Boolean).length}/{CHECKLIST_ITEMS.length} concluídos
                </span>
              </div>

              <div className="rounded-[var(--pc-radius-lg)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-sm)] p-6">
                <div className="grid md:grid-cols-2 gap-3">
                  {CHECKLIST_ITEMS.map((item) => {
                    const checked = !!checkState[item.id];
                    return (
                      <label
                        key={item.id}
                        className={`checklist-item ${checked ? "is-checked" : ""} group flex items-start gap-3 p-3 rounded-[var(--pc-radius-md)] border cursor-pointer transition pc-focus`}
                      >
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleCheck(item.id, item.label)} />
                        <span className={`checklist-checkbox ${checked ? "is-checked" : ""} shrink-0 w-5 h-5 rounded-[5px] border grid place-items-center mt-0.5 transition ${checked ? "bg-[#15803d] border-[#15803d] text-white" : "bg-[var(--pc-surface)] border-[var(--pc-border)]"}`}>
                          {checked && <Check size={12} strokeWidth={3} className="text-white" />}
                        </span>
                        <span className={`checklist-label text-[14px] leading-6 ${checked ? "text-[var(--pc-success-text)]" : "text-[var(--pc-text)]"}`}>
                          {item.label}
                          {checked && <span className="ml-2 text-[11px] font-mono opacity-80">✓ AA</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-[var(--pc-radius-md)] bg-[var(--pc-brand-50)] border border-[var(--pc-brand-100)] p-4 flex gap-3">
                  <Info size={18} className="text-[var(--pc-brand-700)] shrink-0 mt-0.5" />
                  <div className="text-[13px] leading-6 text-[var(--pc-text)]">
                    <span className="font-semibold">Fix contraste AA:</span> Concluído agora usa <code className="px-1.5 py-0.5 rounded bg-[var(--pc-surface)] border border-[var(--pc-border)] font-mono text-[11px] text-[var(--pc-text)]">bg #12261a + text #86efac</code> no dark (8.2:1) e <code className="px-1.5 py-0.5 rounded bg-[var(--pc-surface)] border font-mono text-[11px]">bg #dcfce7 + text #166534</code> no light (7.1:1). Persistido em <code className="px-1.5 py-0.5 rounded bg-[var(--pc-surface)] border font-mono text-[11px] text-[var(--pc-text)]">pc_checklist</code>.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CSS TOKENS */}
          <section id="css" className="scroll-mt-[80px] px-4 md:px-8 lg:px-10 py-12 md:py-16 bg-[var(--pc-surface)] border-t border-[var(--pc-border)]">
            <div className="max-w-[1100px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-[var(--pc-radius-xs)] bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] grid place-items-center">
                  <Ruler size={16} />
                </div>
                <h2 className="text-[24px] font-bold text-[var(--pc-text)]">Tokens CSS • pronto para copiar</h2>
                <button
                  onClick={() => copy(cssTokens, "css")}
                  className="ml-auto h-9 px-3 inline-flex items-center gap-1.5 rounded-[var(--pc-radius-xs)] border border-[var(--pc-border)] bg-[var(--pc-surface)] text-[13px] font-medium pc-focus btn-secondary text-[var(--pc-text)]"
                >
                  {copied === "css" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied === "css" ? "Copiado!" : "Copiar :root"}
                </button>
              </div>

              <div className="rounded-[var(--pc-radius-lg)] border border-[var(--pc-border)] overflow-hidden">
                <div className="px-4 h-10 flex items-center justify-between bg-[var(--pc-neutral-900)] text-[var(--pc-neutral-0)] text-[12px] font-mono">
                  <span>tokens.css • :root + [data-theme="dark"] • FIX DARK CONTRAST AAA</span>
                  <span className="opacity-60">Work Sans • 16px base • 44px touch</span>
                </div>
                <pre className="p-6 text-[12px] leading-6 font-mono overflow-x-auto bg-[#121821] text-[#d0d8e3] max-h-[520px] overflow-y-auto">
                  {cssTokens}
                </pre>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-[12px]">
                <span className="px-3 h-8 rounded-full bg-[var(--pc-surface-2)] border border-[var(--pc-border)] inline-flex items-center gap-1.5 text-[var(--pc-text)]">
                  <Zap size={14} /> Aplicar direto no Next.js globals.css
                </span>
                <span className="px-3 h-8 rounded-full bg-[var(--pc-success-bg)] border border-[var(--pc-success-border)] text-[var(--pc-success-text)] inline-flex items-center gap-1.5">
                  <Triangle size={12} /> WCAG AA garantido nos pares texto/fundo dark corrigido
                </span>
              </div>

              <footer className="mt-16 pt-8 border-t border-[var(--pc-border)] flex flex-col md:flex-row items-start justify-between gap-4 text-[13px] text-[var(--pc-text-secondary)]">
                <div>
                  <div className="font-semibold text-[var(--pc-text)]">Prazo Certo — Design System 2.0 • FIX DARK CONTRAST AAA</div>
                  <div className="mt-1 max-w-[50ch] leading-6">Ferramenta de trabalho confiável para quem não pode deixar vencer. Feito para campo, escritório e PWA. Dark com #121821 bg + #f0f3f6 texto 7:1, status com fundo escuro #2a1515/#12261a.</div>
                </div>
                <div className="text-[12px] font-mono">
                  Work Sans • #155179 / #a8d0e6 dark • 6px / 12px / pill
                  <br />
                  Status só para status • Etiqueta com furo • #86efac / #fca5a5 dark
                </div>
              </footer>
            </div>
          </section>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-[480px] rounded-[var(--pc-radius-xl)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-lg)] p-6 animate-[in_.25s_var(--pc-ease-out)]">
            <div className="w-10 h-10 rounded-full bg-[var(--pc-danger-bg)] border border-[var(--pc-danger-border)] grid place-items-center text-[var(--pc-danger-text)] mb-4">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-[18px] font-semibold text-[var(--pc-text)]">Excluir vencimento?</h3>
            <p className="text-[14px] text-[var(--pc-text-secondary)] leading-6 mt-2">
              Essa ação não pode ser desfeita. O histórico de renovações também será removido.
              <br />
              <strong className="text-[var(--pc-text)]">PMOC - Frigorífico Boi Bom • vence em 09/11/2026</strong>
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary h-10 px-4 rounded-[var(--pc-radius-xs)] bg-[var(--pc-surface)] border border-[var(--pc-border)] font-medium text-[14px] pc-focus text-[var(--pc-text)]">
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  showToastDemo("info");
                }}
                className="btn-danger h-10 px-4 rounded-[var(--pc-radius-xs)] bg-[#b42318] text-white font-semibold text-[14px] pc-focus"
              >
                Excluir vencimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed z-50 bottom-6 right-6 md:bottom-6 md:right-6 top-auto left-4 md:left-auto md:w-[360px] animate-[in_.3s_var(--pc-ease-out)]">
          <div className="rounded-[var(--pc-radius-md)] bg-[var(--pc-surface)] border border-[var(--pc-border)] shadow-[var(--pc-shadow-lg)] p-4 flex gap-3">
            <div className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${toast.type === "success" ? "bg-[var(--pc-success-bg)] text-[var(--pc-success-text)] border border-[var(--pc-success-border)]" : "bg-[var(--pc-brand-50)] text-[var(--pc-brand-700)] border border-[var(--pc-brand-100)]"}`}>
              {toast.type === "success" ? <CheckCircle2 size={18} /> : <Info size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold leading-5 text-[var(--pc-text)]">{toast.title}</div>
              <div className="text-[13px] text-[var(--pc-text-secondary)] leading-5 mt-1">{toast.desc}</div>
            </div>
            <button onClick={() => setToast(null)} className="w-7 h-7 grid place-items-center rounded hover:bg-[var(--pc-surface-2)] shrink-0 btn-ghost">
              <X size={14} className="text-[var(--pc-text)]" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes in { from { opacity:0; transform: translateY(8px) scale(.98) } to { opacity:1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

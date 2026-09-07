"use client";

import { useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  ArrowUp,
  Bot,
  Bug,
  ChevronDown,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Moon,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Rocket,
  ScanSearch,
  Settings,
  Sparkles,
  Sun,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";

type FileItem = { name: string; size: number; content?: string };
type Msg = { role: "user" | "assistant"; text: string; files?: FileItem[] };
type NavItem = readonly [typeof LayoutDashboard, string, string];

type FilePillsProps = {
  files: FileItem[];
  centered?: boolean;
  removable?: boolean;
  onRemove?: (file: FileItem) => void;
};

const nav: NavItem[] = [
  [LayoutDashboard, "Home", "home"],
  [Upload, "Dashboard", "dashboard"],
  [FolderKanban, "New Project", "new"],
  [Sparkles, "Templates", "templates"],
  [Bot, "AI Assistant", "assistant"],
  [ScanSearch, "Code Analyzer", "analyzer"],
  [Wand2, "UI Generator", "ui"],
  [Bug, "Bug Finder", "bugs"],
  [Gauge, "Performance", "performance"],
  [FolderKanban, "My Projects", "projects"],
  [Rocket, "Deployments", "deployments"],
  [Plug, "Integrations", "integrations"],
  [Settings, "Settings", "settings"],
];

const suggestions = ["Draft an email", "Analyze a spreadsheet", "Write some code", "Brainstorm ideas"];
const models = [
  { id: "auto", name: "Auren Auto", desc: "Routes to the best available model" },
  { id: "openai", name: "OpenAI", desc: "GPT via OpenAI API" },
  { id: "gemini", name: "Google Gemini", desc: "Gemini via Google API" },
  { id: "anthropic", name: "Anthropic Claude", desc: "Claude via Anthropic API" },
] as const;
const projects = [
  { n: "Finance Dashboard", s: "Live", f: "React · Next.js" },
  { n: "E-Commerce App", s: "In Progress", f: "Vue · Nuxt" },
  { n: "AI Chat Platform", s: "Review", f: "React · Node" },
  { n: "Analytics Tool", s: "Live", f: "Svelte · Go" },
];
const allowedSource = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md|py|html|htm|sql|java|c|cpp|h|hpp|go|rs|php|rb|swift|kt|kts|yaml|yml|xml|txt)$/i;
const MAX_FILES = 20;
const MAX_FILE_BYTES = 500_000;
const ACCEPTED_SOURCE = ".ts,.tsx,.js,.jsx,.mjs,.cjs,.json,.css,.scss,.md,.py,.html,.htm,.sql,.java,.c,.cpp,.h,.hpp,.go,.rs,.php,.rb,.swift,.kt,.kts,.yaml,.yml,.xml,.txt";

function FilePills({ files, centered, removable, onRemove }: FilePillsProps) {
  if (!files.length) return null;
  return (
    <div className="file-list" style={centered ? { justifyContent: "center" } : undefined}>
      {files.map((file) => (
        <span className="file" key={`${file.name}-${file.size}`}>
          {file.name}
          {file.size > 0 && centered ? ` · ${(file.size / 1024).toFixed(0)} KB` : ""}
          {removable && onRemove ? <X size={11} onClick={() => onRemove(file)} /> : null}
        </span>
      ))}
    </div>
  );
}

function SourceInput({ inputRef, onChange }: { inputRef: React.RefObject<HTMLInputElement | null>; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <input ref={inputRef} hidden type="file" multiple accept={ACCEPTED_SOURCE} onChange={onChange} />;
}

export default function Page() {
  const [dark, setDark] = useState(false);
  const [side, setSide] = useState(true);
  const [page, setPage] = useState("home");
  const [model, setModel] = useState<(typeof models)[number]>(models[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [analysis, setAnalysis] = useState(0);
  const [analysisText, setAnalysisText] = useState("");
  const [uploaded, setUploaded] = useState<FileItem[]>([]);
  const [tab, setTab] = useState("Preview");
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const vars = useMemo<Record<string, string>>(
    () =>
      dark
        ? {
            "--bg": "#1e1d1b", "--sidebar": "#232220", "--panel": "#2a2926", "--border": "#3a3835",
            "--border-soft": "#333130", "--text": "#ece9e1", "--text2": "#a9a59d", "--text3": "#75716a",
            "--accent": "#d97757", "--accent-soft": "rgba(217,119,87,.16)", "--shadow": "rgba(0,0,0,.3)",
          }
        : {
            "--bg": "#faf9f6", "--sidebar": "#f0eee5", "--panel": "#fff", "--border": "#e3e0d6",
            "--border-soft": "#ebe8de", "--text": "#2e2b26", "--text2": "#6b675e", "--text3": "#9a968a",
            "--accent": "#c2603f", "--accent-soft": "#f1e1d6", "--shadow": "rgba(60,50,40,.08)",
          },
    [dark],
  );

  async function readFiles(list: FileList | null) {
    if (!list) return [];
    const out: FileItem[] = [];
    for (const file of Array.from(list).slice(0, MAX_FILES)) {
      if (file.size > MAX_FILE_BYTES) continue;
      out.push({ name: file.name, size: file.size, content: allowedSource.test(file.name) ? await file.text() : undefined });
    }
    return out;
  }

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value && !files.length) return;
    const nextMessages = [...messages, { role: "user" as const, text: value, files }];
    setMessages(nextMessages);
    setInput("");
    setFiles([]);
    setThinking(true);
    try {
      const history = nextMessages.map((message) => ({
        role: message.role,
        content: `${message.text}${message.files?.length ? `\nFiles: ${message.files.map((file) => file.name).join(", ")}` : ""}`,
      }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, provider: model.id === "auto" ? undefined : model.id }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", text: data.text || data.error || "No response returned." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "Auren could not reach the server. Start the Next.js app and check your provider configuration." }]);
    } finally {
      setThinking(false);
    }
  }

  async function startAnalysis(list: FileList | null) {
    const selected = await readFiles(list);
    if (!selected.length) return;
    setUploaded(selected);
    setAnalysis(10);
    setAnalysisText("");
    setPage("dashboard");
    let progress = 10;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + 18);
      setAnalysis(progress);
      if (progress >= 100) clearInterval(timer);
    }, 350);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: selected, provider: model.id === "auto" ? undefined : model.id }),
      });
      const data = await response.json();
      setAnalysisText(data.text || data.error || "");
    } catch {
      setAnalysisText("Analysis endpoint unavailable. Run the application server and try again.");
    }
  }

  function toolPage() {
    const info: Record<string, [string, string]> = {
      new: ["New Project", "Start a project by uploading source files for Auren to inspect."],
      templates: ["Templates", "Reusable prompts and project workflows."],
      assistant: ["AI Assistant", "Use the conversational Auren workspace with your configured provider."],
      analyzer: ["Code Analyzer", "Upload source files and receive architecture, security, bug and quality findings."],
      ui: ["UI Generator", "Describe a screen and ask Auren to produce a component specification."],
      bugs: ["Bug Finder", "Feed Auren source and error context to prioritize likely defects."],
      performance: ["Performance", "Analyze slow paths, bundle size, rendering and network opportunities."],
      projects: ["My Projects", "Your analyzed projects and workspaces appear here."],
      deployments: ["Deployments", "Deployment preparation and environment checks."],
      integrations: ["Integrations", "Connect model providers and future external services."],
      settings: ["Settings", "Local preferences, theme and provider configuration."],
    };
    const [title, desc] = info[page] || info.new;
    const uploadTool = ["new", "analyzer", "bugs", "performance", "ui"].includes(page);
    return (
      <div className="dashboard">
        <div className="card"><div className="serif">{title}</div><p className="muted">{desc}</p></div>
        {uploadTool ? (
          <div className="tool-grid">
            <div className="card tool">
              <h3><Upload size={16} /> Input</h3>
              <p>Choose project files. Text-based source is inspected directly; binary files are retained as metadata.</p>
              <SourceInput inputRef={projectRef} onChange={(event) => void startAnalysis(event.target.files)} />
              <button className="primary" onClick={() => projectRef.current?.click()}>Upload files</button>
            </div>
            <div className="card tool">
              <h3><Sparkles size={16} /> Auren workflow</h3>
              <p>{analysis ? `Analysis progress: ${analysis}%` : "Upload files to start."}</p>
              <div className="bar"><i style={{ width: `${analysis}%` }} /></div>
            </div>
          </div>
        ) : <div className="empty">This workspace is ready for the next project operation.</div>}
        {analysisText && <div className="card"><h3>Latest analysis</h3><div className="codebox">{analysisText}</div></div>}
      </div>
    );
  }

  return (
    <div className="app" style={vars as CSSProperties}>
      {side && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-row"><span className="brand-dot"><i /></span><span className="brand-name">Auren</span></div>
            <div className="tagline">Build. Upload. Evolve.</div>
            {page === "home" && <button className="new-chat" onClick={() => setMessages([])}>＋ New conversation</button>}
          </div>
          <nav className="nav">{nav.map(([Icon, label, key]) => <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}><Icon size={15} />{label}</button>)}</nav>
          <div className="history">
            <div className="history-label">Recent</div>
            {["Q3 revenue variance analysis", "Draft vendor renewal email", "Summarize compliance memo", "Onboarding checklist", "Competitive landscape brief"].map((item) => <button key={item} onClick={() => { setPage("home"); setInput(item); }}><FileText size={13} />{item}</button>)}
          </div>
          <div className="upgrade"><strong>Project mode</strong><p>Connect a model key to enable live inference. Without keys, Auren remains usable in local demo mode.</p></div>
        </aside>
      )}

      <main className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="icon" onClick={() => setSide(!side)}>{side ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</button>
            {page === "home" && (
              <div style={{ position: "relative" }}>
                <button className="select" onClick={() => setModelOpen(!modelOpen)}>{model.name} <ChevronDown size={13} /></button>
                {modelOpen && <div className="card" style={{ position: "absolute", top: 42, left: 0, width: 260, zIndex: 10, padding: 6 }}>
                  {models.map((item) => <button key={item.id} onClick={() => { setModel(item); setModelOpen(false); }} style={{ display: "block", width: "100%", border: 0, background: item.id === model.id ? "var(--accent-soft)" : "transparent", color: "var(--text)", textAlign: "left", padding: 9, borderRadius: 7 }}><b>{item.name}</b><small style={{ display: "block", color: "var(--text2)" }}>{item.desc}</small></button>)}
                </div>}
              </div>
            )}
          </div>
          <button className="icon" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        </header>

        <section className="content">
          {page === "home" ? (
            <div className="home">
              <div className="chat"><div className="chat-inner">
                {!messages.length && <><div className="hello">Hello, User</div><div className="muted" style={{ marginBottom: 18 }}>I’m Auren. What would you like to build, analyze or understand?</div></>}
                {messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                  <div className="role">{message.role === "user" ? "You" : "Auren"}</div>
                  <FilePills files={message.files ?? []} />
                  <div>{message.text}</div>
                </div>)}
                {thinking && <div className="message"><div className="role">Auren</div><div>Thinking…</div></div>}
              </div></div>
              <div className="composer-wrap"><div className="composer">
                <FilePills files={files} removable onRemove={(file) => setFiles((current) => current.filter((item) => item !== file))} />
                <textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="How can I help you today?" />
                <div className="composer-bottom">
                  <input ref={fileRef} hidden type="file" multiple accept={ACCEPTED_SOURCE} onChange={async (event) => { const selected = await readFiles(event.target.files); setFiles((current) => [...current, ...selected].slice(0, MAX_FILES)); event.currentTarget.value = ""; }} />
                  <button className="icon" onClick={() => fileRef.current?.click()}><Paperclip size={17} /></button>
                  <button className="send" disabled={!input.trim() && !files.length} onClick={() => void send()}><ArrowUp size={16} /></button>
                </div>
              </div><div className="chips">{suggestions.map((suggestion) => <button className="chip" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div></div>
            </div>
          ) : page === "dashboard" ? (
            <div className="dashboard">
              <div className="dash-head"><div><div className="serif">Hello, User</div><div className="muted">What will we build today?</div></div><button className="primary" onClick={() => projectRef.current?.click()}><Zap size={14} /> Quick action</button></div>
              <div className="card"><div className="drop"><div className="upload-icon"><Upload /></div><div className="serif" style={{ fontSize: 20 }}>Upload Your App</div><p className="muted">Drop an existing app or project and let Auren inspect its structure, flag issues and suggest improvements.</p><SourceInput inputRef={projectRef} onChange={(event) => void startAnalysis(event.target.files)} /><button className="primary" onClick={() => projectRef.current?.click()}>Upload App</button><FilePills files={uploaded} centered /></div></div>
              <div className="card"><div className="muted" style={{ marginBottom: 18 }}>AI Workflow</div><div className="workflow">{["Upload", "Analyze", "Plan", "Enhance", "Deploy"].map((item, index) => <div className={`step ${analysis > index * 20 ? "done" : ""}`} key={item}><b>{analysis > index * 20 ? "✓" : index + 1}</b>{item}</div>)}</div></div>
              <div className="card"><div className="serif" style={{ fontSize: 16 }}>Analysis</div><div className="analysis-grid"><div className="orb">A</div><div>{["Scanning files", "Understanding structure", "Analyzing dependencies", "Identifying improvements", "Generating suggestions"].map((item, index) => { const value = Math.min(100, Math.max(0, analysis - index * 20)); return <div className="progress" key={item}><div className="progress-head"><span>{item}</span><span>{value}%</span></div><div className="bar"><i style={{ width: `${value}%` }} /></div></div>; })}</div><div><div className="tabs">{["Preview", "Code", "Structure", "Logs"].map((item) => <button className={`tab ${tab === item ? "active" : ""}`} key={item} onClick={() => setTab(item)}>{item}</button>)}</div><div className="codebox">{tab === "Preview" ? "Auren project preview ready." : tab === "Code" ? "> src/components/Dashboard.tsx\n> src/app/page.tsx" : tab === "Structure" ? "app/\n  api/\n  components/\n  lib/" : "[auren] analysis pipeline initialized"}</div></div></div></div>
              {analysisText && <div className="card"><h3>AI findings</h3><div className="codebox">{analysisText}</div></div>}
              <div><div className="serif" style={{ fontSize: 16, marginBottom: 12 }}>Your Projects</div><div className="projects">{projects.map((project) => <div className="card project" key={project.n}><div className="project-banner" /><div className="project-body"><div className="project-title">{project.n}</div><div className="muted">{project.f}</div><span className="pill">{project.s}</span></div></div>)}</div></div>
            </div>
          ) : toolPage()}
        </section>
      </main>
    </div>
  );
}

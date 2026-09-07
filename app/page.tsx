"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { ArrowUp, Bot, Bug, Check, ChevronDown, FileText, FolderKanban, Gauge, LayoutDashboard, Moon, Paperclip, PanelLeftClose, PanelLeftOpen, Plug, Rocket, ScanSearch, Settings, Sparkles, Sun, Upload, Wand2, X } from "lucide-react";

type FileItem = { name: string; size: number; content?: string };
type Msg = { role: "user" | "assistant"; text: string; files?: FileItem[]; meta?: string };
type ProviderId = "auto" | "openai" | "gemini" | "anthropic";
type NavItem = readonly [typeof LayoutDashboard, string, string];
type Status = { providers: Record<string, boolean>; models: Record<string, string> };

const nav: NavItem[] = [
  [LayoutDashboard, "Home", "home"], [Upload, "Dashboard", "dashboard"], [FolderKanban, "New Project", "new"], [Sparkles, "Templates", "templates"],
  [Bot, "AI Assistant", "assistant"], [ScanSearch, "Code Analyzer", "analyzer"], [Wand2, "UI Generator", "ui"], [Bug, "Bug Finder", "bugs"],
  [Gauge, "Performance", "performance"], [FolderKanban, "My Projects", "projects"], [Rocket, "Deployments", "deployments"], [Plug, "Integrations", "integrations"], [Settings, "Settings", "settings"],
];
const models: Array<{ id: ProviderId; name: string; desc: string }> = [
  { id: "auto", name: "Auren Auto", desc: "Ask all configured models and synthesize one answer" },
  { id: "openai", name: "OpenAI", desc: "GPT via OpenAI API" }, { id: "gemini", name: "Google Gemini", desc: "Gemini via Google API" }, { id: "anthropic", name: "Anthropic Claude", desc: "Claude via Anthropic API" },
];
const suggestions = ["Draft an email", "Analyze my code", "Design a UI", "Find bugs", "Improve performance"];
const allowedSource = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md|py|html|htm|sql|java|c|cpp|h|hpp|go|rs|php|rb|swift|kt|kts|yaml|yml|xml|txt)$/i;
const ACCEPTED_SOURCE = ".ts,.tsx,.js,.jsx,.mjs,.cjs,.json,.css,.scss,.md,.py,.html,.htm,.sql,.java,.c,.cpp,.h,.hpp,.go,.rs,.php,.rb,.swift,.kt,.kts,.yaml,.yml,.xml,.txt";
const MAX_FILES = 20;
const MAX_FILE_BYTES = 500_000;

function FilePills({ files, removable, onRemove }: { files: FileItem[]; removable?: boolean; onRemove?: (file: FileItem) => void }) {
  if (!files.length) return null;
  return <div className="file-list">{files.map((file) => <span className="file" key={`${file.name}-${file.size}`}>{file.name}{removable && onRemove ? <X size={11} onClick={() => onRemove(file)} /> : null}</span>)}</div>;
}
function SourceInput({ inputRef, onChange }: { inputRef: React.RefObject<HTMLInputElement | null>; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <input ref={inputRef} hidden type="file" multiple accept={ACCEPTED_SOURCE} onChange={onChange} />;
}
function ResultCard({ title, text, loading }: { title: string; text: string; loading?: boolean }) {
  if (!text && !loading) return null;
  return <div className="card result-card"><div className="result-head"><h3>{title}</h3>{loading ? <span className="muted">Working…</span> : <Check size={15} />}</div><div className="result-text">{loading ? "Auren is asking the configured AI model(s), comparing their answers, and preparing the result." : text}</div></div>;
}

export default function Page() {
  const [dark, setDark] = useState(false); const [side, setSide] = useState(true); const [page, setPage] = useState("home");
  const [model, setModel] = useState<ProviderId>("auto"); const [modelOpen, setModelOpen] = useState(false); const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]); const [thinking, setThinking] = useState(false); const [files, setFiles] = useState<FileItem[]>([]);
  const [analysis, setAnalysis] = useState(0); const [analysisText, setAnalysisText] = useState(""); const [uploaded, setUploaded] = useState<FileItem[]>([]);
  const [taskPrompt, setTaskPrompt] = useState(""); const [taskResult, setTaskResult] = useState(""); const [taskLoading, setTaskLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null); const [projectName, setProjectName] = useState(""); const [savedProjects, setSavedProjects] = useState<Array<{ name: string; files: number; createdAt: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null); const projectRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (window.localStorage.getItem("auren-theme") === "dark") setDark(true); try { setSavedProjects(JSON.parse(window.localStorage.getItem("auren-projects") || "[]")); } catch { setSavedProjects([]); } }, []);
  useEffect(() => { window.localStorage.setItem("auren-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { if (page === "integrations") void loadStatus(); }, [page]);

  const vars = useMemo<Record<string, string>>(() => dark ? {
    "--bg":"#1e1d1b","--sidebar":"#232220","--panel":"#2a2926","--border":"#3a3835","--border-soft":"#333130","--text":"#ece9e1","--text2":"#a9a59d","--text3":"#75716a","--accent":"#d97757","--accent-soft":"rgba(217,119,87,.16)","--shadow":"rgba(0,0,0,.3)",
  } : {
    "--bg":"#faf9f6","--sidebar":"#f0eee5","--panel":"#fff","--border":"#e3e0d6","--border-soft":"#ebe8de","--text":"#2e2b26","--text2":"#6b675e","--text3":"#9a968a","--accent":"#c2603f","--accent-soft":"#f1e1d6","--shadow":"rgba(60,50,40,.08)",
  }, [dark]);

  async function loadStatus() { try { const response = await fetch("/api/status", { cache: "no-store" }); if (response.ok) setStatus(await response.json()); } catch { setStatus(null); } }
  async function readFiles(list: FileList | null) { if (!list) return []; const out: FileItem[] = []; for (const file of Array.from(list).slice(0, MAX_FILES)) { if (file.size > MAX_FILE_BYTES) continue; out.push({ name:file.name, size:file.size, content:allowedSource.test(file.name) ? await file.text() : undefined }); } return out; }

  async function send(text?: string) {
    const value = (text ?? input).trim(); if (!value && !files.length) return;
    const nextMessages = [...messages, { role:"user" as const, text:value, files }]; setMessages(nextMessages); setInput(""); setFiles([]); setThinking(true);
    try {
      const history = nextMessages.map((message) => ({ role:message.role, content:`${message.text}${message.files?.length ? `\nAttached files: ${message.files.map((file) => file.name).join(", ")}` : ""}` }));
      const response = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:history, provider:model === "auto" ? undefined : model }) });
      const data = await response.json(); const meta = data.mode === "multi-model-synthesis" ? `Synthesized from ${data.sources?.length || 0} AI models` : data.model;
      setMessages((current) => [...current, { role:"assistant", text:data.text || data.error || "No response returned.", meta }]);
    } catch { setMessages((current) => [...current, { role:"assistant", text:"Auren could not reach the server. Check that npm run dev is running." }]); } finally { setThinking(false); }
  }

  async function startAnalysis(list: FileList | null) {
    const selected = await readFiles(list); if (!selected.length) return; setUploaded(selected); setAnalysis(10); setAnalysisText(""); setPage("dashboard");
    let progress = 10; const timer = window.setInterval(() => { progress = Math.min(90, progress + 16); setAnalysis(progress); }, 350);
    try { const response = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ files:selected, provider:model === "auto" ? undefined : model }) }); const data = await response.json(); setAnalysisText(data.text || data.error || "No analysis returned."); setAnalysis(100); }
    catch { setAnalysisText("Analysis endpoint unavailable. Check the development server and provider configuration."); setAnalysis(100); } finally { window.clearInterval(timer); }
  }

  async function runTask(task: string, prompt?: string, taskFiles: FileItem[] = []) {
    const value = (prompt ?? taskPrompt).trim(); if (!value) return; setTaskLoading(true); setTaskResult("");
    try { const response = await fetch("/api/task", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ task, prompt:value, files:taskFiles, provider:model === "auto" ? undefined : model }) }); const data = await response.json(); setTaskResult(data.text || data.error || "No result returned."); }
    catch { setTaskResult("Auren could not complete this task. Check that the server is running."); } finally { setTaskLoading(false); }
  }
  function saveProject() { const name = projectName.trim(); if (!name || !uploaded.length) return; const item = { name, files:uploaded.length, createdAt:new Date().toLocaleString() }; const next = [item, ...savedProjects]; setSavedProjects(next); window.localStorage.setItem("auren-projects", JSON.stringify(next)); setProjectName(""); setPage("projects"); }

  function toolPage() {
    if (page === "dashboard") return <div className="dashboard"><div className="dash-head"><div><div className="serif">Dashboard</div><p className="muted">Live workspace activity and the latest Auren analysis.</p></div><button className="primary" onClick={() => setPage("new")}>New project</button></div><div className="stats"><div className="card stat"><b>{messages.length}</b><span>Chat messages</span></div><div className="card stat"><b>{uploaded.length}</b><span>Files analyzed</span></div><div className="card stat"><b>{savedProjects.length}</b><span>Saved projects</span></div><div className="card stat"><b>{analysis}%</b><span>Latest analysis</span></div></div>{uploaded.length ? <div className="card"><h3>Current project input</h3><FilePills files={uploaded} /><div className="progress"><div className="progress-head"><span>Auren analysis</span><span>{analysis}%</span></div><div className="bar"><i style={{width:`${analysis}%`}} /></div></div></div> : <div className="empty">No project has been analyzed yet. Use New Project or Code Analyzer to start.</div>}{analysisText && <ResultCard title="Latest analysis" text={analysisText} />}</div>;

    if (page === "new") return <div className="dashboard"><div className="serif">New Project</div><p className="muted">Upload source files. Auren will inspect them with the selected AI model configuration.</p><div className="card"><input className="field" value={projectName} onChange={(e)=>setProjectName(e.target.value)} placeholder="Project name" /><div className="drop"><div className="upload-icon"><Upload /></div><h3>Upload project files</h3><p className="muted">Up to 20 supported source files, 500 KB each.</p><SourceInput inputRef={projectRef} onChange={(e)=>void startAnalysis(e.target.files)} /><button className="primary" onClick={()=>projectRef.current?.click()}>Choose files</button>{uploaded.length > 0 && <><FilePills files={uploaded} /><button className="primary secondary" onClick={saveProject}>Save project</button></>}</div></div>{analysisText && <ResultCard title="Auren project analysis" text={analysisText} />}</div>;

    if (page === "templates") { const templates = [["Code review","Review this code for correctness, security, maintainability and concrete fixes."],["Product requirements","Turn this product idea into requirements, user stories, acceptance criteria and milestones."],["UI specification","Design a responsive production UI for this product, including states, accessibility and components."],["Debugging","Find the most likely root cause of this error, explain it and give a verified fix strategy."]]; return <div className="dashboard"><div className="serif">Templates</div><p className="muted">Choose a workflow. Each template opens the live Auren assistant.</p><div className="template-grid">{templates.map(([name,prompt])=><button className="card template" key={name} onClick={()=>{setPage("assistant");setTaskPrompt(prompt);}}><Sparkles size={17}/><h3>{name}</h3><p>{prompt}</p><span>Use template →</span></button>)}</div></div>; }

    if (page === "assistant") return <div className="dashboard"><div className="serif">AI Assistant</div><p className="muted">Use the live Auren engine with the selected provider mode.</p><div className="card"><textarea className="task-area" rows={5} value={taskPrompt} onChange={(e)=>setTaskPrompt(e.target.value)} placeholder="Ask Auren anything…" /><div className="action-row"><button className="primary" onClick={()=>void runTask("new")}>Ask Auren</button><button className="secondary" onClick={()=>{setTaskPrompt("");setTaskResult("");}}>Clear</button></div></div><ResultCard title="Auren response" text={taskResult} loading={taskLoading}/></div>;

    if (page === "analyzer") return <div className="dashboard"><div className="serif">Code Analyzer</div><p className="muted">Upload source and receive architecture, bugs, security risks, performance opportunities and prioritized next steps.</p><div className="card"><SourceInput inputRef={fileRef} onChange={(e)=>void startAnalysis(e.target.files)} /><button className="primary" onClick={()=>fileRef.current?.click()}>Upload source files</button><FilePills files={uploaded}/></div>{analysisText && <ResultCard title="Code analysis" text={analysisText}/>}</div>;

    if (["ui","bugs","performance","deployments"].includes(page)) {
      const config: Record<string,[string,string,string]> = {
        ui:["UI Generator","Describe the screen, app or component you want Auren to design.","ui"], bugs:["Bug Finder","Paste an error, behavior, stack trace or code context. Auren will rank likely causes and fixes.","bugs"],
        performance:["Performance","Describe the slow page, endpoint, component or workload. Include metrics or code when available.","performance"], deployments:["Deployments","Describe your deployment target and configuration. Auren will produce a release-readiness plan; it will not claim to deploy anything.","deployments"],
      }; const [title,desc,task] = config[page]; return <div className="dashboard"><div className="serif">{title}</div><p className="muted">{desc}</p><div className="card"><textarea className="task-area" rows={7} value={taskPrompt} onChange={(e)=>setTaskPrompt(e.target.value)} placeholder="Describe what you need…" /><div className="action-row"><button className="primary" onClick={()=>void runTask(task)}>Run with Auren</button><button className="secondary" onClick={()=>void runTask(task, task === "ui" ? "Design a clean dashboard for a context-aware AI assistant." : taskPrompt)}>Use example</button></div></div><ResultCard title="Auren result" text={taskResult} loading={taskLoading}/></div>;
    }

    if (page === "projects") return <div className="dashboard"><div className="dash-head"><div><div className="serif">My Projects</div><p className="muted">Projects saved in this browser.</p></div><button className="primary" onClick={()=>setPage("new")}>New project</button></div>{savedProjects.length ? <div className="projects">{savedProjects.map((project,index)=><div className="card project" key={`${project.name}-${index}`}><div className="project-banner"/><div className="project-body"><div className="project-title">{project.name}</div><div className="muted">{project.files} files · {project.createdAt}</div><span className="pill">Analyzed by Auren</span></div></div>)}</div> : <div className="empty">No saved projects yet. Create a project and save it after analysis.</div>}</div>;

    if (page === "integrations") return <div className="dashboard"><div className="serif">Integrations</div><p className="muted">Provider keys are checked on the server. Secret values are never displayed.</p><div className="integration-grid">{models.slice(1).map((item)=>{const key=item.id;const connected=status?.providers[key];return <div className="card integration" key={item.id}><div><h3>{item.name}</h3><p className="muted">{item.desc}</p></div><span className={connected ? "status connected" : "status"}>{connected ? "Connected" : "Not configured"}</span><small>{status?.models[key] || "Checking…"}</small></div>;})}</div><div className="card"><h3>Auren Auto</h3><p className="muted">Auto sends the same request to every configured provider in parallel, compares the answers, and uses an available model to synthesize one final response.</p><button className="secondary" onClick={()=>void loadStatus()}>Refresh status</button></div></div>;

    if (page === "settings") return <div className="dashboard"><div className="serif">Settings</div><p className="muted">Local interface preferences and model selection.</p><div className="card setting-row"><div><h3>Theme</h3><p className="muted">Saved in this browser.</p></div><button className="secondary" onClick={()=>setDark(!dark)}>{dark ? <Sun size={15}/> : <Moon size={15}/>} {dark ? "Light mode" : "Dark mode"}</button></div><div className="card"><h3>Default model</h3><p className="muted">Current: {models.find((item)=>item.id===model)?.name}</p><div className="model-list">{models.map((item)=><button key={item.id} className={model===item.id ? "model-choice selected" : "model-choice"} onClick={()=>setModel(item.id)}><b>{item.name}</b><span>{item.desc}</span></button>)}</div></div><div className="card"><h3>Provider keys</h3><p className="muted">Keys are configured in <code>.env.local</code>. Never paste API keys into chat.</p><button className="secondary" onClick={()=>setPage("integrations")}>Open integrations</button></div></div>;
    return null;
  }

  const selectedModel = models.find((item)=>item.id===model) || models[0];
  return <div className="app" style={vars as CSSProperties}>
    {side && <aside className="sidebar"><div className="brand"><div className="brand-row"><span className="brand-dot"><i/></span><span className="brand-name">Auren</span></div><div className="tagline">Build. Upload. Evolve.</div>{page === "home" && <button className="new-chat" onClick={()=>{setMessages([]);setFiles([]);}}>＋ New conversation</button>}</div><nav className="nav">{nav.map(([Icon,label,key])=><button key={key} className={page===key ? "active" : ""} onClick={()=>setPage(key)}><Icon size={15}/>{label}</button>)}</nav><div className="history"><div className="history-label">Recent</div>{["Explain this code","Design a login page","Find bugs in my API","Plan a deployment"].map((item)=><button key={item} onClick={()=>{setPage("home");setInput(item);}}><FileText size={13}/>{item}</button>)}</div><div className="upgrade"><strong>{model === "auto" ? "Multi-model mode" : selectedModel.name}</strong><p>{model === "auto" ? "Auren queries every configured provider and synthesizes one final answer." : "Auren uses this provider for the next request."}</p></div></aside>}
    <main className="main"><header className="topbar"><div className="top-left"><button className="icon" onClick={()=>setSide(!side)}>{side ? <PanelLeftClose size={17}/> : <PanelLeftOpen size={17}/>}</button><div style={{position:"relative"}}><button className="select" onClick={()=>setModelOpen(!modelOpen)}>{selectedModel.name} <ChevronDown size={13}/></button>{modelOpen && <div className="card model-menu">{models.map((item)=><button key={item.id} className={item.id===model ? "model-choice selected" : "model-choice"} onClick={()=>{setModel(item.id);setModelOpen(false);}}><b>{item.name}</b><span>{item.desc}</span></button>)}</div>}</div></div><button className="icon" onClick={()=>setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button></header>
      <section className="content">{page === "home" ? <div className="home"><div className="chat"><div className="chat-inner">{!messages.length && <><div className="hello">Hello, User</div><div className="muted" style={{marginBottom:18}}>I’m Auren. Ask one question and I can use your configured AI models, compare their answers, and return one final response.</div><div className="chips">{suggestions.map((suggestion)=><button className="chip" key={suggestion} onClick={()=>setInput(suggestion)}>{suggestion}</button>)}</div></>}{messages.map((message,index)=><div className={`message ${message.role}`} key={`${message.role}-${index}`}><div className="role">{message.role === "user" ? "You" : "Auren"}{message.meta ? ` · ${message.meta}` : ""}</div><FilePills files={message.files || []}/><div>{message.text}</div></div>)}{thinking && <div className="message"><div className="role">Auren</div><div>Asking configured model(s), comparing answers, and synthesizing…</div></div>}</div></div><div className="composer-wrap"><div className="composer"><FilePills files={files} removable onRemove={(file)=>setFiles((current)=>current.filter((item)=>item!==file))}/><textarea rows={2} value={input} onChange={(event)=>setInput(event.target.value)} onKeyDown={(event)=>{if(event.key === "Enter" && !event.shiftKey){event.preventDefault();void send();}}} placeholder="Message Auren…"/><div className="composer-bottom"><div><input ref={fileRef} hidden type="file" multiple accept={ACCEPTED_SOURCE} onChange={async(event)=>setFiles(await readFiles(event.target.files))}/><button className="icon" onClick={()=>fileRef.current?.click()} title="Attach source files"><Paperclip size={16}/></button></div><button className="send" onClick={()=>void send()} disabled={thinking}><ArrowUp size={15}/></button></div></div></div></div> : toolPage()}</section></main>
  </div>;
}

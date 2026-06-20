import { useEffect, useMemo, useState } from "react";
import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Tabs } from "@cloudflare/kumo/components/tabs";
import { CaretDownIcon, LightningIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import appSource from "./App.jsx?raw";
import indexHtmlSource from "../index.html?raw";
import viteConfigSource from "../../vite.config.js?raw";
import entrySource from "../../src/entry.py?raw";
import wranglerSource from "../../wrangler.jsonc?raw";

const pretty = (data) => JSON.stringify(data, null, 2);

const fileMap = [
  {
    path: "src/entry.py",
    role: "FastAPI defines the API, Pydantic models, OpenAPI docs, and Python Worker fetch entrypoint.",
    source: entrySource,
  },
  {
    path: "frontend/src/App.jsx",
    role: "React 19 + Kumo UI renders this page and calls /api with fetch().",
    source: appSource,
  },
  {
    path: "frontend/index.html",
    role: "Vite's HTML entry document sets the page title and loads the React module.",
    source: indexHtmlSource,
  },
  {
    path: "vite.config.js",
    role: "Vite builds the frontend into dist/ and proxies /api during local frontend dev.",
    source: viteConfigSource,
  },
  {
    path: "wrangler.jsonc",
    role: "Cloudflare serves dist/ as static assets; unmatched paths like /api fall through to the Python Worker.",
    source: wranglerSource,
  },
];

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(pretty(body));
  }

  return body;
}

function ResponsePanel({ title, response }) {
  return (
    <div className="response-panel">
      <div className="response-header">
        <span>{title}</span>
        <Badge variant={response.ok ? "success" : "warning"} appearance="dot">
          {response.ok ? "Live" : "Waiting"}
        </Badge>
      </div>
      <pre>{response.text}</pre>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("get");
  const [itemId, setItemId] = useState("42");
  const [query, setQuery] = useState("from-react-and-kumo");
  const [itemResponse, setItemResponse] = useState({ ok: false, text: "{}" });
  const [openFiles, setOpenFiles] = useState(() => new Set());
  const [form, setForm] = useState({
    name: "Example inventory item",
    description: "Submitted from the React frontend",
    price: "12.50",
    tax: "1.25",
  });
  const [createResponse, setCreateResponse] = useState({ ok: false, text: "{}" });

  const tabs = useMemo(
    () => [
      { value: "get", label: "GET item" },
      { value: "post", label: "POST item" },
    ],
    [],
  );

  function toggleFile(path) {
    setOpenFiles((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  async function fetchItem(event) {
    event?.preventDefault();
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    setItemResponse({ ok: false, text: "Loading..." });

    try {
      const data = await fetchJson(`/api/items/${itemId || "1"}${params}`);
      setItemResponse({ ok: true, text: pretty(data) });
    } catch (error) {
      setItemResponse({ ok: false, text: error.message });
    }
  }

  async function createItem(event) {
    event?.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      tax: form.tax === "" ? null : Number(form.tax),
    };
    setCreateResponse({ ok: false, text: "Loading..." });

    try {
      const data = await fetchJson("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCreateResponse({ ok: true, text: pretty(data) });
    } catch (error) {
      setCreateResponse({ ok: false, text: error.message });
    }
  }

  useEffect(() => {
    fetchItem();
    createItem();
  }, []);

  return (
    <main className="shell">
      <section className="workspace">
        <header className="mast">
          <h1>FastAPI app.frontend() on Python Workers</h1>
          <p className="lede">
            Vite builds this React app into static assets.
            Cloudflare serves those assets, and FastAPI handles every `/api` request.
          </p>
        </header>

        <LayerCard className="teaching-surface">
          <div className="section-heading">
            <p className="eyebrow">Code structure</p>
          </div>
          <div className="file-map">
            {fileMap.map((item) => {
              const isOpen = openFiles.has(item.path);

              return (
                <div className="file-item" key={item.path}>
                  <button
                    className="file-row"
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`source-${item.path}`}
                    onClick={() => toggleFile(item.path)}
                  >
                    <span className="file-name">
                      <CaretDownIcon className="file-caret" size={18} weight="bold" />
                      <code>{item.path}</code>
                    </span>
                    <span className="file-role">{item.role}</span>
                  </button>
                  {isOpen ? (
                    <pre className="source-preview" id={`source-${item.path}`}>
                      <code>{item.source}</code>
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        </LayerCard>

        <LayerCard className="demo-surface">
          <div className="demo-header">
            <div>
              <h2>Try the backend from the React frontend</h2>
            </div>
            <Tabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
          </div>

          {activeTab === "get" ? (
            <div className="demo-grid">
              <form className="form-panel" onSubmit={fetchItem}>
                <div className="endpoint-callout">
                  <span>Request</span>
                  <strong>GET /api/items/:item_id</strong>
                </div>
                <Input
                  label="Item ID"
                  type="number"
                  min="1"
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                />
                <Input
                  label="Query"
                  maxLength={50}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button type="submit" variant="primary" icon={LightningIcon}>
                  Fetch item
                </Button>
              </form>
              <ResponsePanel title="GET /api/items/{item_id}" response={itemResponse} />
            </div>
          ) : (
            <div className="demo-grid">
              <form className="form-panel create-form" onSubmit={createItem}>
                <div className="endpoint-callout">
                  <span>Request</span>
                  <strong>POST /api/items</strong>
                </div>
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
                <Input
                  label="Price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
                <Input
                  label="Tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax}
                  onChange={(event) => setForm({ ...form, tax: event.target.value })}
                />
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
                <Button type="submit" variant="primary" icon={PaperPlaneTiltIcon}>
                  Create item
                </Button>
              </form>
              <ResponsePanel title="POST /api/items" response={createResponse} />
            </div>
          )}
        </LayerCard>
      </section>
    </main>
  );
}

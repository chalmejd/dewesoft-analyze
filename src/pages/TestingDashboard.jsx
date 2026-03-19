import React, { useCallback, useEffect, useRef, useState } from "react";
import "./TestingDashboard.css";

/* ── defaults ── */
const DEFAULT_AB_URL = "http://localhost:5000";
const DEFAULT_M700_URL = "http://localhost:5000";
const AB_API_PREFIX = "/api/testing-dashboard/ab";
const M700_API_PREFIX = "/api/testing-dashboard/m700";
const POLL_AB = 1000;
const POLL_M700 = 750;

/* ══════════════════════════════════════════════════════════
   Trend-chart painter (shared by both tabs)
   ══════════════════════════════════════════════════════════ */
function drawTrend(canvas, values) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pad = 36;

  ctx.clearRect(0, 0, w, h);

  // grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad + ((h - pad * 2) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  if (!values.length) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "15px Arial";
    ctx.fillText("No samples yet", pad, h / 2);
    return;
  }

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "12px Arial";
  ctx.fillText(`Max: ${max}`, pad, 16);
  ctx.fillText(`Min: ${min}`, pad, h - 8);

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + ((w - pad * 2) * i) / Math.max(values.length - 1, 1);
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#646cff";
  ctx.stroke();
}

/* ══════════════════════════════════════════════════════════
   StatusPill
   ══════════════════════════════════════════════════════════ */
function StatusPill({ ok, text }) {
  return (
    <div className="td-status">
      <span className={`td-dot ${ok ? "td-dot-ok" : "td-dot-bad"}`} />
      <span>{text}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Info row
   ══════════════════════════════════════════════════════════ */
function InfoRow({ label, value }) {
  return (
    <div className="td-row">
      <span className="td-label">{label}</span>
      <span className="td-value">{value ?? "-"}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Register cards
   ══════════════════════════════════════════════════════════ */
function RegisterCards({ registers, prefix }) {
  if (!registers || !registers.length) return null;
  return (
    <div className="td-cards">
      {registers.map((val, i) => (
        <div key={i} className="td-card">
          <div className="td-card-name">{prefix} {i}</div>
          <div className="td-card-num">{val}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AB  Dashboard tab
   ══════════════════════════════════════════════════════════ */
function ABDashboard({ baseUrl }) {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState(null);
  const [ok, setOk] = useState(false);
  const [statusText, setStatusText] = useState("Waiting for data");
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  // load device list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}${AB_API_PREFIX}/devices`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatusText(json.error || "Cannot load AB devices");
          return;
        }
        setDevices(json.devices || []);
        setSelected(json.default_device || (json.devices?.[0]?.name ?? ""));
      } catch {
        setStatusText("Cannot reach AB backend");
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  // poll data
  const loadData = useCallback(async () => {
    if (!selected) return;
    try {
      const res = await fetch(
        `${baseUrl}${AB_API_PREFIX}/data?device=${encodeURIComponent(selected)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setOk(false);
        setStatusText(json.error || "Request failed");
        return;
      }
      setData(json);
      setOk(json.ok);
      setStatusText(json.ok ? "Connected and updating live" : "Disconnected or read error");
      const samples = (json.samples || []).map((s) => s.value).filter((v) => typeof v === "number");
      drawTrend(canvasRef.current, samples);
    } catch (err) {
      setOk(false);
      setStatusText(`Fetch failed: ${err}`);
    }
  }, [baseUrl, selected]);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, POLL_AB);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const dev = data?.device || {};
  const decoded = data?.decoded || [];

  return (
    <div className="td-grid">
      {/* left panel */}
      <div className="td-panel">
        <StatusPill ok={ok} text={statusText} />

        <div className="td-toolbar">
          <div>
            <label>Test Stand</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {devices.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <InfoRow label="Selected stand" value={dev.name} />
        <InfoRow label="IP" value={dev.ip} />
        <InfoRow label="Unit ID" value={dev.unit_id} />
        <InfoRow label="Table" value={dev.table} />
        <InfoRow label="Start address" value={dev.start_address} />
        <InfoRow label="Register count" value={dev.register_count} />
        <InfoRow label="Last update" value={data?.last_update} />
        <InfoRow label="Last error" value={data?.last_error || "None"} />

        <canvas ref={canvasRef} className="td-canvas" width={800} height={260} />
        <p className="td-small">Trend chart follows the first raw register in the selected block.</p>
      </div>

      {/* right panel */}
      <div className="td-panel">
        <h2>Raw Registers</h2>
        <RegisterCards registers={data?.raw_registers} prefix="Register +" />

        <h2 style={{ marginTop: 20 }}>Decoded Channels</h2>
        <div className="td-table-wrap">
          <table className="td-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Register</th>
                <th>Type</th>
                <th>Value</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {decoded.map((item, i) => {
                let valueHtml = item.display || item.raw || "";
                let details = item.description || "";
                if (item.type === "bitfield") {
                  valueHtml = `Raw ${item.raw}`;
                  details = (item.bits || []).map((b) => (
                    <span key={b.name} className="td-bit-pill">{b.name}: {b.text}</span>
                  ));
                }
                return (
                  <tr key={i}>
                    <td>{item.name || ""}</td>
                    <td>{item.register ?? ""}</td>
                    <td>{item.type || ""}</td>
                    <td>{valueHtml}</td>
                    <td>{details}</td>
                  </tr>
                );
              })}
              {decoded.length === 0 && (
                <tr><td colSpan={5} style={{ color: "#888" }}>No decoded data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   M700 Dashboard tab
   ══════════════════════════════════════════════════════════ */
function M700Dashboard({ baseUrl }) {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState("");
  const [trendReg, setTrendReg] = useState("0");
  const [data, setData] = useState(null);
  const [ok, setOk] = useState(false);
  const [statusText, setStatusText] = useState("Waiting for data");
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}${M700_API_PREFIX}/devices`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatusText(json.error || "Cannot load M700 devices");
          return;
        }
        setDevices(json.devices || []);
        setSelected(json.default_device || (json.devices?.[0]?.name ?? ""));
      } catch {
        setStatusText("Cannot reach M700 backend");
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  const loadData = useCallback(async () => {
    if (!selected) return;
    try {
      const res = await fetch(
        `${baseUrl}${M700_API_PREFIX}/registers?device=${encodeURIComponent(selected)}&register=${encodeURIComponent(trendReg)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setOk(false);
        setStatusText(json.error || "Request failed");
        return;
      }
      setData(json);
      setOk(json.ok);
      setStatusText(json.ok ? "Connected and updating live" : "Disconnected or read error");
      const values = (json.samples || []).map((s) => s.value).filter((v) => typeof v === "number");
      drawTrend(canvasRef.current, values);
    } catch (err) {
      setOk(false);
      setStatusText(`Fetch failed: ${err}`);
    }
  }, [baseUrl, selected, trendReg]);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, POLL_M700);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  const dev = data?.device || {};

  return (
    <div className="td-grid">
      {/* left panel */}
      <div className="td-panel">
        <StatusPill ok={ok} text={statusText} />

        <div className="td-toolbar td-toolbar-2">
          <div>
            <label>Test Stand</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {devices.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Trend Register</label>
            <select value={trendReg} onChange={(e) => setTrendReg(e.target.value)}>
              {[0, 1, 2, 3, 4].map((r) => (
                <option key={r} value={String(r)}>Register {r}</option>
              ))}
            </select>
          </div>
        </div>

        <InfoRow label="Selected stand" value={dev.name} />
        <InfoRow label="Device IP" value={dev.ip} />
        <InfoRow label="Port" value={dev.port} />
        <InfoRow label="Unit ID" value={dev.unit_id} />
        <InfoRow label="Start address" value={dev.start_address} />
        <InfoRow label="Register count" value={dev.register_count} />
        <InfoRow label="Poll interval" value={dev.poll_interval_seconds ? `${dev.poll_interval_seconds}s` : undefined} />
        <InfoRow label="Last update" value={data?.last_update} />
        <InfoRow label="Last error" value={data?.last_error || "None"} />
      </div>

      {/* right panel */}
      <div className="td-panel">
        <h2>Live Registers</h2>
        <RegisterCards registers={data?.registers} prefix="Register" />

        <canvas ref={canvasRef} className="td-canvas" width={900} height={300} />
        <p className="td-small">Chart uses backend history for the selected stand and register.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main page component
   ══════════════════════════════════════════════════════════ */
export default function TestingDashboard() {
  const [tab, setTab] = useState("ab");
  const [abUrl, setAbUrl] = useState(DEFAULT_AB_URL);
  const [m700Url, setM700Url] = useState(DEFAULT_M700_URL);

  return (
    <div className="td-page">
      <h1 style={{ fontSize: 40 }}>Testing Dashboard</h1>
      <hr />

      {/* backend URL config */}
      <div className="td-config">
        <label>
          {tab === "ab" ? "AB" : "M700"} Backend URL:
        </label>
        {tab === "ab" ? (
          <input
            type="text"
            value={abUrl}
            onChange={(e) => setAbUrl(e.target.value)}
          />
        ) : (
          <input
            type="text"
            value={m700Url}
            onChange={(e) => setM700Url(e.target.value)}
          />
        )}
      </div>

      {/* tab bar */}
      <div className="td-tabs">
        <button
          className={`td-tab ${tab === "ab" ? "active" : ""}`}
          onClick={() => setTab("ab")}
        >
          Allen-Bradley
        </button>
        <button
          className={`td-tab ${tab === "m700" ? "active" : ""}`}
          onClick={() => setTab("m700")}
        >
          M700
        </button>
      </div>

      {/* active tab content */}
      {tab === "ab" ? (
        <ABDashboard baseUrl={abUrl} />
      ) : (
        <M700Dashboard baseUrl={m700Url} />
      )}
    </div>
  );
}

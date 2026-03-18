import React, { useCallback, useEffect, useRef, useState } from "react";
import "./ThreeClickAngle.css";

/* ── helpers ─────────────────────────────────────────────── */

const POINT_COLORS = ["#ff5555", "#ffd54f", "#5eead4"];

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleDeg(c, p1, p2) {
  const v1x = p1.x - c.x, v1y = p1.y - c.y;
  const v2x = p2.x - c.x, v2y = p2.y - c.y;
  const d = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, d / (m1 * m2)));
  return Math.acos(cos) * 180 / Math.PI;
}

function csvEscape(v) {
  const t = String(v ?? "");
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function nextLabel(label) {
  const m = label.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : label;
}

function promptFor(n, hasImg) {
  if (!hasImg) return "Waiting for image";
  return ["Click 1: bolt center", "Click 2: bolt paint mark", "Click 3: reference stripe"][n] || "Click 1: bolt center";
}

/* ── SVG sub-components ──────────────────────────────────── */

function MeasurementSVG({ m, s }) {
  const [c, p1, p2] = m.points;
  const cx = c.x * s, cy = c.y * s;
  const x1 = p1.x * s, y1 = p1.y * s;
  const x2 = p2.x * s, y2 = p2.y * s;
  const tx = (cx + x1 + x2) / 3 + 8;
  const ty = (cy + y1 + y2) / 3 - 8;
  const text = `${m.label}: ${m.angle.toFixed(1)}\u00B0`;
  return (
    <g>
      <line x1={cx} y1={cy} x2={x1} y2={y1} stroke="#ffd54f" strokeWidth="2.5" />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#5eead4" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="5" fill="#ff5555" stroke="#fff" strokeWidth="2" />
      <circle cx={x1} cy={y1} r="5" fill="#ffd54f" stroke="#fff" strokeWidth="2" />
      <circle cx={x2} cy={y2} r="5" fill="#5eead4" stroke="#fff" strokeWidth="2" />
      <text x={tx} y={ty} className="at-label-stroke">{text}</text>
      <text x={tx} y={ty} className="at-label-fill">{text}</text>
    </g>
  );
}

function CurrentPointsSVG({ pts, s }) {
  if (!pts.length) return null;
  const c = pts[0];
  return (
    <g>
      {pts.length >= 2 && pts.slice(1).map((p, i) => (
        <line key={i} x1={c.x * s} y1={c.y * s} x2={p.x * s} y2={p.y * s}
          stroke={i === 0 ? "#ffd54f" : "#5eead4"} strokeWidth="2" />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x * s} cy={p.y * s} r="5"
          fill={POINT_COLORS[i]} stroke="#fff" strokeWidth="2" />
      ))}
    </g>
  );
}

/* ── main component ──────────────────────────────────────── */

export default function ThreeClickAngle() {
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const cardRef = useRef(null);
  const crossRef = useRef(null);
  const flashRef = useRef(null);
  const magRef = useRef(null);
  const magCvsRef = useRef(null);
  const objUrlRef = useRef(null);

  const [src, setSrc] = useState(null);           // object-URL string
  const [imgEl, setImgEl] = useState(null);        // HTMLImageElement (for magnifier / export)
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [imgFileName, setImgFileName] = useState("");
  const [scaleMode, setScaleMode] = useState("fit");
  const [stageW, setStageW] = useState(0);
  const [stageH, setStageH] = useState(0);
  const [scale, setScale] = useState(1);

  const [pts, setPts] = useState([]);              // current 0-3 click points
  const [meas, setMeas] = useState([]);            // completed measurements
  const [showMag, setShowMag] = useState(true);
  const [bolt, setBolt] = useState("Bolt 1");
  const [minDist, setMinDist] = useState(0);
  const [status, setStatus] = useState("Waiting for image");
  const [imgInfo, setImgInfo] = useState("");

  /* ── sizing ── */
  const recompute = useCallback((w = natW, h = natH, mode = scaleMode) => {
    if (!w || !h) return;
    const avail = cardRef.current ? Math.max(1, cardRef.current.clientWidth - 24) : w;
    const s = mode === "fit" ? Math.min(1, avail / w) : 1;
    setScale(s);
    setStageW(Math.round(w * s));
    setStageH(Math.round(h * s));
  }, [natW, natH, scaleMode]);

  useEffect(() => { recompute(); }, [recompute]);

  useEffect(() => {
    const h = () => recompute();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [recompute]);

  useEffect(() => {
    if (!cardRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [recompute]);

  /* ── image load ── */
  const loadImage = useCallback((file) => {
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    const url = URL.createObjectURL(file);
    objUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setSrc(url);
      setNatW(img.width);
      setNatH(img.height);
      setImgFileName(file.name.replace(/\.[^.]+$/, ""));
      setPts([]);
      setMeas([]);
      setScaleMode("fit");
      setStatus("Click 1: bolt center");
      setImgInfo(`Loaded ${file.name} (${img.width} \u00d7 ${img.height})`);
      if (fileRef.current) fileRef.current.value = "";
      if (crossRef.current) crossRef.current.style.display = "none";
      if (magRef.current) magRef.current.style.display = "none";
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      objUrlRef.current = null;
      setImgInfo(`Could not load: ${file.name}`);
      setStatus("Image load failed.");
    };
    img.src = url;
  }, []);

  /* ── coordinate mapping ── */
  const imgPoint = useCallback((e) => {
    const el = imgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || !natW) return null;
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const x = cx * natW / r.width;
    const y = cy * natH / r.height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y, cx, cy };
  }, [natW, natH]);

  /* ── reject flash ── */
  const flash = useCallback((cx, cy) => {
    const el = flashRef.current;
    if (!el) return;
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.classList.remove("active");
    void el.offsetWidth;
    el.classList.add("active");
  }, []);

  /* ── magnifier ── */
  const paintMag = useCallback((imgX, imgY) => {
    if (!imgEl || !showMag || !magCvsRef.current || !magRef.current) return;
    magRef.current.style.display = "block";
    const ctx = magCvsRef.current.getContext("2d");
    if (!ctx) return;
    const sz = 28;
    ctx.clearRect(0, 0, 170, 170);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imgEl, imgX - sz / 2, imgY - sz / 2, sz, sz, 0, 0, 170, 170);
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(85, 0); ctx.lineTo(85, 170);
    ctx.moveTo(0, 85); ctx.lineTo(170, 85);
    ctx.stroke();
    ctx.strokeStyle = "#ff5555";
    ctx.strokeRect(79, 79, 12, 12);
  }, [imgEl, showMag]);

  /* ── click handler ── */
  const handleClick = useCallback((e) => {
    if (!src) return;
    const p = imgPoint(e);
    if (!p) return;
    const md = Math.max(0, Number(minDist) || 0);
    for (const ep of pts) {
      const d = dist(p, ep);
      if (d < 0.5) { setStatus("Duplicate click."); flash(p.cx, p.cy); return; }
      if (md > 0 && d < md) {
        setStatus(`Too close (${d.toFixed(1)}px < ${md}px).`);
        flash(p.cx, p.cy);
        return;
      }
    }
    const next = [...pts, { x: p.x, y: p.y }];
    if (next.length < 3) {
      setPts(next);
      setStatus(next.length === 1 ? "Click 2: bolt paint mark" : "Click 3: reference stripe");
    } else {
      const a = angleDeg(next[0], next[1], next[2]);
      if (!Number.isFinite(a)) {
        setPts([]); setStatus("Invalid angle. Try again."); return;
      }
      const label = bolt.trim() || `Bolt ${meas.length + 1}`;
      setMeas(prev => [...prev, { label, points: next, angle: a, offset: Math.abs(180 - a) }]);
      setPts([]);
      setStatus(`Saved ${label}. Click next 3 points.`);
      setBolt(prev => nextLabel(prev));
    }
  }, [bolt, flash, imgPoint, meas.length, minDist, pts, src]);

  /* ── undo / clear ── */
  const undo = useCallback(() => {
    if (pts.length) {
      const n = pts.slice(0, -1);
      setPts(n);
      setStatus(promptFor(n.length, !!src));
    } else if (meas.length) {
      const last = meas[meas.length - 1];
      setMeas(prev => prev.slice(0, -1));
      setBolt(last.label);
      setStatus(promptFor(0, !!src));
    }
  }, [meas, pts, src]);

  const clearCur = useCallback(() => {
    setPts([]);
    setStatus(promptFor(0, !!src));
  }, [src]);

  const clearAll = useCallback(() => {
    if (!pts.length && !meas.length) { setStatus("Nothing to clear."); return; }
    if (!window.confirm("Clear all?")) return;
    setPts([]); setMeas([]); setStatus(promptFor(0, !!src));
  }, [meas.length, pts.length, src]);

  /* ── exports ── */
  const exportCsv = useCallback(() => {
    if (!meas.length) { setStatus("Nothing to export."); return; }
    const rows = [["Bolt", "Angle_deg", "Offset_from_180_deg"],
      ...meas.map(m => [m.label, m.angle.toFixed(3), m.offset.toFixed(3)])];
    const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `${imgFileName || "angles"}_measurements.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 0);
  }, [imgFileName, meas]);

  const exportPng = useCallback(() => {
    if (!imgEl || !meas.length) { setStatus("Nothing to export."); return; }
    const c = document.createElement("canvas");
    c.width = imgEl.width; c.height = imgEl.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(imgEl, 0, 0);
    for (const m of meas) {
      const [ce, p1, p2] = m.points;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffd54f"; ctx.beginPath(); ctx.moveTo(ce.x, ce.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.strokeStyle = "#5eead4"; ctx.beginPath(); ctx.moveTo(ce.x, ce.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      for (const [pt, col] of [[ce, "#ff5555"], [p1, "#ffd54f"], [p2, "#5eead4"]]) {
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
      }
      const tx = (ce.x + p1.x + p2.x) / 3 + 8;
      const ty = (ce.y + p1.y + p2.y) / 3 - 8;
      ctx.font = "bold 16px Arial"; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 4;
      const txt = `${m.label}: ${m.angle.toFixed(1)} deg`;
      ctx.strokeText(txt, tx, ty); ctx.fillText(txt, tx, ty);
    }
    c.toBlob(blob => {
      if (!blob) { setStatus("Export failed."); return; }
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u; a.download = `${imgFileName || "annotated"}_annotated.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 0);
    }, "image/png");
  }, [imgEl, imgFileName, meas]);

  const toggleMag = useCallback(() => {
    setShowMag(prev => {
      if (prev && magRef.current) magRef.current.style.display = "none";
      return !prev;
    });
  }, []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const h = (e) => {
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); undo(); return; }
      if (typing && e.key !== "Escape") return;
      if (e.key === "Escape") { e.preventDefault(); clearCur(); return; }
      if (e.shiftKey && e.key === "Delete") { e.preventDefault(); clearAll(); return; }
      if (e.key.toLowerCase() === "m" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleMag(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [clearAll, clearCur, toggleMag, undo]);

  useEffect(() => {
    return () => { if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current); };
  }, []);

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="angle-tool-page">
      <h1 style={{ fontSize: 40 }}>Bolt Angle Tool</h1>
      <hr />
      <p style={{ maxWidth: 900 }}>
        Upload an image, then click three points for each bolt: center, paint mark, and reference
        stripe. The tool computes included angle and offset from 180&deg;.
      </p>

      <div className="at-layout">
        {/* ── sidebar ── */}
        <aside className="at-sidebar">
          <section className="at-panel">
            <h2>Image</h2>
            <label className="at-file-label" htmlFor="at-file">Upload image</label>
            <input id="at-file" ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f); }} />
            <div className="at-row">
              <button type="button" onClick={() => { setScaleMode("fit"); recompute(natW, natH, "fit"); }}>Fit to width</button>
              <button type="button" onClick={() => { setScaleMode("actual"); recompute(natW, natH, "actual"); }}>Actual size</button>
            </div>
            <div className="at-status">{imgInfo}</div>
          </section>

          <section className="at-panel">
            <h2>Current bolt</h2>
            <label htmlFor="at-bolt">Bolt label</label>
            <input id="at-bolt" type="text" value={bolt} onChange={e => setBolt(e.target.value)} />
            <label htmlFor="at-mindist" style={{ marginTop: 10, display: "block" }}>Min click spacing (px)</label>
            <input id="at-mindist" type="number" min="0" step="1" value={minDist}
              onChange={e => { const v = Number(e.target.value); setMinDist(Number.isFinite(v) ? Math.max(0, v) : 0); }} />
            <div className="at-status">{status}</div>
            <div className="at-note">
              Colors: <span style={{ color: "#ff5555" }}>red</span> = center,{" "}
              <span style={{ color: "#ffd54f" }}>yellow</span> = paint,{" "}
              <span style={{ color: "#5eead4" }}>teal</span> = stripe.
            </div>
          </section>

          <section className="at-panel">
            <h2>Actions</h2>
            <div className="at-row">
              <button type="button" onClick={undo}>Undo</button>
              <button type="button" onClick={clearCur}>Clear current</button>
              <button type="button" className="at-danger" onClick={clearAll}>Clear all</button>
            </div>
            <div className="at-row">
              <button type="button" onClick={exportCsv}>Export CSV</button>
              <button type="button" onClick={toggleMag}>Toggle magnifier</button>
              <button type="button" onClick={exportPng}>Download PNG</button>
            </div>
            <div className="at-note">Ctrl+Z undo &middot; Esc clear &middot; Shift+Del clear all &middot; M magnifier</div>
          </section>

          <section className="at-panel">
            <h2>Results</h2>
            <table className="at-table">
              <thead><tr><th>Bolt</th><th>Angle</th><th>Offset</th></tr></thead>
              <tbody>
                {meas.map(m => (
                  <tr key={`${m.label}-${m.angle}`} onClick={() => { setBolt(m.label); setStatus(`${m.label}: ${m.angle.toFixed(1)}\u00B0, offset ${m.offset.toFixed(1)}\u00B0`); }}>
                    <td>{m.label}</td><td>{m.angle.toFixed(1)}&deg;</td><td>{m.offset.toFixed(1)}&deg;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>

        {/* ── stage ── */}
        <main className="at-main">
          <div ref={cardRef} className="at-card">
            {src ? (
              <div className="at-stage" style={{ width: stageW, height: stageH }}>
                <img ref={imgRef} className="at-img" src={src} alt="Uploaded"
                  draggable="false" style={{ width: stageW, height: stageH }} />

                <svg className="at-svg" width={stageW} height={stageH}
                  viewBox={`0 0 ${stageW} ${stageH}`}
                  onMouseMove={e => {
                    const p = imgPoint(e);
                    if (!p) return;
                    if (crossRef.current) {
                      crossRef.current.style.display = "block";
                      crossRef.current.style.left = `${p.cx}px`;
                      crossRef.current.style.top = `${p.cy}px`;
                    }
                    if (showMag) paintMag(p.x, p.y);
                  }}
                  onMouseLeave={() => {
                    if (crossRef.current) crossRef.current.style.display = "none";
                    if (flashRef.current) flashRef.current.classList.remove("active");
                    if (magRef.current) magRef.current.style.display = "none";
                  }}
                  onClick={handleClick}
                >
                  <rect width={stageW} height={stageH} fill="transparent" />
                  {meas.map(m => <MeasurementSVG key={`${m.label}-${m.angle}`} m={m} s={scale} />)}
                  <CurrentPointsSVG pts={pts} s={scale} />
                </svg>

                <div ref={flashRef} className="at-flash"
                  onAnimationEnd={() => flashRef.current?.classList.remove("active")} />
                <div ref={crossRef} className="at-cross" />
              </div>
            ) : (
              <div className="at-placeholder">Upload an image to begin.</div>
            )}

            <div ref={magRef} className="at-mag">
              <canvas ref={magCvsRef} width="170" height="170" />
            </div>
          </div>
          <p className="at-tip">Tip: browser zoom helps with precision. Calculations use original pixel coordinates.</p>
        </main>
      </div>
    </div>
  );
}

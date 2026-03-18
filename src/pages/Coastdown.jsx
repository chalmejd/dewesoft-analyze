import React, { useMemo, useState } from "react";
import LoadingBars from "../components/LoadingBars/LoadingBars";

const API_BASE_URL = "http://localhost:5000";

// Format rule:
// - |x| >= 1  -> 3 decimals
// - |x| <  1  -> 6 decimals
function formatNumber(val) {
  if (val === null || val === undefined) return "";
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);

  const abs = Math.abs(n);
  const decimals = abs >= 1 ? 3 : 6;

  // Keep as a string; avoid scientific notation for small-ish values
  return n.toFixed(decimals);
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Coastdown() {
  // Upload files
  const [mf4File, setMf4File] = useState(null);
  const [dbcFile, setDbcFile] = useState(null);

  // Returned by /api/coastdown/channels
  const [mf4Path, setMf4Path] = useState("");
  const [dbcPath, setDbcPath] = useState("");

  // Channels
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");

  // Preprocess config
  const [vehicleMassKg, setVehicleMassKg] = useState("");
  const [speedUnitsMode, setSpeedUnitsMode] = useState("auto"); // auto|km/h|m/s|mph
  const [resampleIntervalS, setResampleIntervalS] = useState(""); // optional
  const [smoothingWindow, setSmoothingWindow] = useState(""); // optional int

  // Segment detection config (target start/end + tolerance)
  const [minStartSpeedMph, setMinStartSpeedMph] = useState("45"); // TARGET start speed
  const [minEndSpeedMph, setMinEndSpeedMph] = useState("0"); // TARGET end speed
  const [toleranceMph, setToleranceMph] = useState("2"); // tolerance band
  const [minDurationS, setMinDurationS] = useState("10");
  const [maxPositiveAccel, setMaxPositiveAccel] = useState("0.15");

  // State flags
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [runningPreprocess, setRunningPreprocess] = useState(false);
  const [detectingSegments, setDetectingSegments] = useState(false);
  const [fitting, setFitting] = useState(false);

  // Results
  const [preprocessResult, setPreprocessResult] = useState(null); // {meta, data}
  const [segmentsResult, setSegmentsResult] = useState(null); // {segments:[...], debug?:{...}}
  const [fitResult, setFitResult] = useState(null); // {per_segment:[...], combined:{...}, meta:{...}}

  // Selected segments
  const [selectedSegmentIds, setSelectedSegmentIds] = useState(new Set());

  // Errors
  const [error, setError] = useState("");

  const canLoadChannels = !!mf4File && !!dbcFile && !loadingChannels;
  const canPreprocess =
    !!mf4Path && !!dbcPath && !!selectedChannel && vehicleMassKg !== "" && !runningPreprocess;
  const canDetectSegments = !!preprocessResult && !detectingSegments;
  const canFit = !!segmentsResult?.segments?.length && selectedSegmentIds.size > 0 && !fitting;

  const preprocessConfig = useMemo(() => {
    return {
      speed_channels: selectedChannel ? [selectedChannel] : [],
      combine_method: "mean",
      vehicle_mass_kg: vehicleMassKg === "" ? null : Number(vehicleMassKg),
      speed_units_mode: speedUnitsMode,
      resample_interval_s: resampleIntervalS === "" ? null : Number(resampleIntervalS),
      smoothing_window: smoothingWindow === "" ? null : Number(smoothingWindow),
    };
  }, [selectedChannel, vehicleMassKg, speedUnitsMode, resampleIntervalS, smoothingWindow]);

  const segmentConfig = useMemo(() => {
    return {
      start_speed_mph: Number(minStartSpeedMph),
      end_speed_mph: Number(minEndSpeedMph),
      tolerance_mph: Number(toleranceMph),

      require_decelerating: true,
      decel_lookahead_points: 3,

      min_duration_s: Number(minDurationS),

      // fixed tuning knobs for now (can be UI later)
      min_points: 20,
      require_monotonic_fraction: 0.4,

      max_positive_accel_mps2: Number(maxPositiveAccel),
    };
  }, [minStartSpeedMph, minEndSpeedMph, toleranceMph, minDurationS, maxPositiveAccel]);

  function toggleSegment(id) {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLoadChannels() {
    setError("");
    setPreprocessResult(null);
    setSegmentsResult(null);
    setFitResult(null);
    setSelectedSegmentIds(new Set());

    setChannels([]);
    setSelectedChannel("");
    setMf4Path("");
    setDbcPath("");

    setLoadingChannels(true);
    try {
      const formData = new FormData();
      formData.append("mf4", mf4File);
      formData.append("dbc", dbcFile);

      const resp = await fetch(`${API_BASE_URL}/api/coastdown/channels`, {
        method: "POST",
        body: formData,
      });

      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to load channels.");
      }

      setChannels(json.channels || []);
      setMf4Path(json.mf4_path);
      setDbcPath(json.dbc_path);

      if (json.channels?.length) setSelectedChannel(json.channels[0]);
      if (!json.channels?.length) setError("No channels returned.");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingChannels(false);
    }
  }

  async function handlePreprocess() {
    setError("");
    setPreprocessResult(null);
    setSegmentsResult(null);
    setFitResult(null);
    setSelectedSegmentIds(new Set());

    setRunningPreprocess(true);
    try {
      const payload = {
        mf4_path: mf4Path,
        dbc_path: dbcPath,
        ...preprocessConfig,
      };

      const resp = await fetch(`${API_BASE_URL}/api/coastdown/preprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.message || "Preprocess failed.");
      }

      setPreprocessResult(json.result);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunningPreprocess(false);
    }
  }

  async function handleDetectSegments() {
    setError("");
    setSegmentsResult(null);
    setFitResult(null);
    setSelectedSegmentIds(new Set());

    setDetectingSegments(true);
    try {
      const payload = {
        mf4_path: mf4Path,
        dbc_path: dbcPath,
        preprocess_config: preprocessConfig,
        segment_config: segmentConfig,
      };

      const resp = await fetch(`${API_BASE_URL}/api/coastdown/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.message || "Segment detection failed.");
      }

      const resultObj = json.result || {};
      setSegmentsResult(resultObj);

      const ids = new Set((resultObj.segments || []).map((s) => s.id));
      setSelectedSegmentIds(ids);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setDetectingSegments(false);
    }
  }

  async function handleFit() {
    setError("");
    setFitResult(null);

    setFitting(true);
    try {
      const payload = {
        mf4_path: mf4Path,
        dbc_path: dbcPath,
        preprocess_config: preprocessConfig,
        segments: segmentsResult?.segments || [],
        segment_ids: Array.from(selectedSegmentIds),
      };

      const resp = await fetch(`${API_BASE_URL}/api/coastdown/fit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.message || "Fit failed.");
      }

      setFitResult(json.result);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setFitting(false);
    }
  }

  return (
    <div>
      <h1 style={{fontSize: 40}}>Coastdown Coefficients</h1>
      <hr />

      {/* Step 1 */}
      <h2>1) Upload MF4 + DBC</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label>MF4 file (.mf4): </label>
          <input
            type="file"
            accept=".mf4"
            onChange={(e) => setMf4File(e.target.files?.[0] || null)}
          />
        </div>
        <div>
          <label>DBC file (.dbc): </label>
          <input
            type="file"
            accept=".dbc"
            onChange={(e) => setDbcFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button disabled={!canLoadChannels} onClick={handleLoadChannels}>
          Load Channels
        </button>
      </div>
      {loadingChannels && <LoadingBars />}

      {/* Step 2 */}
      <h2 style={{ marginTop: 24 }}>2) Preprocess</h2>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div>
          <label>Wheel speed channel: </label>
          <select
            style={{ width: "100%" }}
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            disabled={channels.length === 0}
          >
            {channels.length === 0 ? (
              <option value="">Load channels first</option>
            ) : (
              channels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label>Vehicle mass (kg): </label>
          <input
            style={{ width: "100%" }}
            type="number"
            value={vehicleMassKg}
            onChange={(e) => setVehicleMassKg(e.target.value)}
            placeholder="e.g. 2150"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div>
          <label>Speed units:</label>
          <select
            style={{ width: "100%" }}
            value={speedUnitsMode}
            onChange={(e) => setSpeedUnitsMode(e.target.value)}
          >
            <option value="auto">auto</option>
            <option value="km/h">km/h</option>
            <option value="m/s">m/s</option>
            <option value="mph">mph</option>
          </select>
        </div>

        <div>
          <label>Resample interval (s, optional):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            step="0.01"
            value={resampleIntervalS}
            onChange={(e) => setResampleIntervalS(e.target.value)}
            placeholder="e.g. 0.02"
          />
        </div>

        <div>
          <label>Smoothing window (samples, optional):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            step="1"
            value={smoothingWindow}
            onChange={(e) => setSmoothingWindow(e.target.value)}
            placeholder="e.g. 11"
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button disabled={!canPreprocess} onClick={handlePreprocess}>
          Run Preprocessing
        </button>

        {preprocessResult && (
          <button
            style={{ marginLeft: 8 }}
            onClick={() => downloadJson("coastdown_preprocessed.json", preprocessResult)}
          >
            Download JSON
          </button>
        )}
      </div>
      {runningPreprocess && <LoadingBars />}

      {/* Step 3 */}
      <h2 style={{ marginTop: 24 }}>3) Detect Segments</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <div>
          <label>Start speed target (mph):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            value={minStartSpeedMph}
            onChange={(e) => setMinStartSpeedMph(e.target.value)}
          />
        </div>

        <div>
          <label>End speed target (mph):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            value={minEndSpeedMph}
            onChange={(e) => setMinEndSpeedMph(e.target.value)}
          />
        </div>

        <div>
          <label>Tolerance (mph):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            step="0.1"
            value={toleranceMph}
            onChange={(e) => setToleranceMph(e.target.value)}
          />
        </div>

        <div>
          <label>Min duration (s):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            value={minDurationS}
            onChange={(e) => setMinDurationS(e.target.value)}
          />
        </div>

        <div>
          <label>Max positive accel (m/s²):</label>
          <input
            style={{ width: "100%" }}
            type="number"
            step="0.01"
            value={maxPositiveAccel}
            onChange={(e) => setMaxPositiveAccel(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button disabled={!canDetectSegments} onClick={handleDetectSegments}>
          Detect Segments
        </button>
      </div>
      {detectingSegments && <LoadingBars />}

      {segmentsResult?.segments?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Detected Segments</h3>
          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th>Use</th>
                  <th>ID</th>
                  <th>t_start</th>
                  <th>t_end</th>
                  <th>v_start_mph</th>
                  <th>v_end_mph</th>
                  <th>n</th>
                </tr>
              </thead>
              <tbody>
                {segmentsResult.segments.map((s) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedSegmentIds.has(s.id)}
                        onChange={() => toggleSegment(s.id)}
                      />
                    </td>
                    <td>{s.id}</td>
                    <td>{formatNumber(s.t_start)}</td>
                    <td>{formatNumber(s.t_end)}</td>
                    <td>{formatNumber(s.v_start_mph)}</td>
                    <td>{formatNumber(s.v_end_mph)}</td>
                    <td>{s.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 4 */}
      <h2 style={{ marginTop: 24 }}>4) Fit A/B/C</h2>
      <div style={{ marginTop: 12 }}>
        <button disabled={!canFit} onClick={handleFit}>
          Fit Coefficients
        </button>

        {fitResult && (
          <button
            style={{ marginLeft: 8 }}
            onClick={() => downloadJson("coastdown_coefficients.json", fitResult)}
          >
            Download Fit JSON
          </button>
        )}
      </div>
      {fitting && <LoadingBars />}

      {/* Fit results */}
      {fitResult && (
        <div style={{ marginTop: 16 }}>
          <h3>Fit Results</h3>

          {/* Combined fit */}
          {fitResult.combined && (
            <div style={{ marginBottom: 16 }}>
              <h4>Combined Fit (All Selected Segments)</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <h5>USCS</h5>
                  <pre style={{ padding: 12 }}>
{JSON.stringify(fitResult.combined.coefficients_us ?? {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <h5>SI</h5>
                  <pre style={{ padding: 12 }}>
{JSON.stringify(fitResult.combined.coefficients_si ?? {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <h5>Fit Quality</h5>
                  <pre style={{ padding: 12 }}>
{JSON.stringify(fitResult.combined.fit_quality ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Per-segment */}
          <h4>Per-Segment Coefficients</h4>
          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>t_start</th>
                  <th>t_end</th>
                  <th>v_start_mph</th>
                  <th>v_end_mph</th>

                  <th>A (lbf)</th>
                  <th>B (lbf·s/ft)</th>
                  <th>C (lbf·s²/ft²)</th>

                  <th>A (N)</th>
                  <th>B (N·s/m)</th>
                  <th>C (N·s²/m²)</th>

                  <th>R²</th>
                  <th>RMSE (lbf)</th>
                  <th>n</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(fitResult.per_segment || []).map((row) => {
                  const us = row.coefficients_us || {};
                  const si = row.coefficients_si || {};
                  const q = row.fit_quality || {};
                  const status = row.error ? row.error : "OK";

                  return (
                    <tr key={row.segment_id}>
                      <td>{row.segment_id}</td>
                      <td>{formatNumber(row.t_start)}</td>
                      <td>{formatNumber(row.t_end)}</td>
                      <td>{formatNumber(row.v_start_mph)}</td>
                      <td>{formatNumber(row.v_end_mph)}</td>

                      <td>{formatNumber(us.A_lbf)}</td>
                      <td>{formatNumber(us.B_lbf_s_per_ft)}</td>
                      <td>{formatNumber(us.C_lbf_s2_per_ft2)}</td>

                      <td>{formatNumber(si.A_N)}</td>
                      <td>{formatNumber(si.B_Ns_per_m)}</td>
                      <td>{formatNumber(si.C_Ns2_per_m2)}</td>

                      <td>{formatNumber(q.r2)}</td>
                      <td>{formatNumber(q.rmse_lbf)}</td>
                      <td>{q.n_points}</td>
                      <td style={{ color: row.error ? "crimson" : "inherit" }}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, color: "crimson" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

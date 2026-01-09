import React, { useMemo, useState } from "react";
import LoadingBars from "../components/LoadingBars/LoadingBars";

const BACKEND = "http://localhost:5000";

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
  const [mf4File, setMf4File] = useState(null);
  const [dbcFile, setDbcFile] = useState(null);

  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");

  const [vehicleMassKg, setVehicleMassKg] = useState("");

  // These are returned by /api/coastdown/channels so we don't have to re-upload MF4/DBC
  const [fileRefs, setFileRefs] = useState({ mf4_path: "", dbc_path: "" });

  const [result, setResult] = useState(null); // { meta, data }
  const [error, setError] = useState("");

  const canLoadChannels = !!mf4File && !!dbcFile && !isLoadingChannels;
  const canRun =
    !!fileRefs.mf4_path &&
    !!fileRefs.dbc_path &&
    !!selectedChannel &&
    vehicleMassKg !== "" &&
    !isRunning;

  const previewRows = useMemo(() => {
    if (!result?.data) return [];
    return result.data.slice(0, 50);
  }, [result]);

  const handleLoadChannels = async () => {
    setError("");
    setResult(null);
    setChannels([]);
    setSelectedChannel("");
    setFileRefs({ mf4_path: "", dbc_path: "" });

    if (!mf4File || !dbcFile) {
      setError("Please select both an MF4 file and a DBC file.");
      return;
    }

    setIsLoadingChannels(true);
    try {
      const formData = new FormData();
      formData.append("mf4", mf4File);
      formData.append("dbc", dbcFile);

      const resp = await fetch(`${BACKEND}/api/coastdown/channels`, {
        method: "POST",
        body: formData,
      });

      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to load channels.");
      }

      setChannels(json.channels || []);
      setFileRefs({ mf4_path: json.mf4_path, dbc_path: json.dbc_path });

      if (json.channels?.length) setSelectedChannel(json.channels[0]);
      if (!json.channels?.length) setError("No channels returned. Check MF4/DBC compatibility.");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleRunPreprocess = async () => {
    setError("");
    setResult(null);

    if (!canRun) {
      setError("Please load channels, select a wheel speed channel, and enter vehicle mass.");
      return;
    }

    setIsRunning(true);
    try {
      const payload = {
        mf4_path: fileRefs.mf4_path,
        dbc_path: fileRefs.dbc_path,
        selected_speed_channel: selectedChannel,
        vehicle_mass_kg: Number(vehicleMassKg),
      };

      const resp = await fetch(`${BACKEND}/api/coastdown/preprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to run preprocessing.");
      }

      // backend returns { status: "success", result: { meta, data } }
      setResult(json.result);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <h1 style={{ fontSize: 40 }}>Coastdown Coefficient Prep</h1>
      <hr />

      <div className="card" style={{ padding: 16 }}>
        <h2>Upload MF4 + DBC</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Select MF4 file (.mf4): </label>
            <input
              type="file"
              accept=".mf4"
              onChange={(e) => setMf4File(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label>Select DBC file (.dbc): </label>
            <input
              type="file"
              accept=".dbc"
              onChange={(e) => setDbcFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={handleLoadChannels} disabled={!canLoadChannels}>
            Load Channels
          </button>
        </div>

        {isLoadingChannels && <LoadingBars />}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h2>Configure Coastdown Preprocessing</h2>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div>
            <label>Wheel speed channel:</label>
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
            <label>Vehicle mass (kg):</label>
            <input
              style={{ width: "100%" }}
              type="number"
              placeholder="e.g. 2150"
              value={vehicleMassKg}
              onChange={(e) => setVehicleMassKg(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={handleRunPreprocess} disabled={!canRun}>
            Run Preprocessing
          </button>

          {result && (
            <button
              style={{ marginLeft: 8 }}
              onClick={() => downloadJson("coastdown_preprocessed.json", result)}
            >
              Download JSON
            </button>
          )}
        </div>

        {isRunning && <LoadingBars />}
      </div>

      {error && (
        <div className="card" style={{ padding: 16, color: "crimson" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: 16 }}>
          <h2>Preview (first {previewRows.length} rows)</h2>

          <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>
            <div>
              <strong>Channel:</strong> {result.meta?.wheel_speed_channel}
            </div>
            <div>
              <strong>Vehicle mass (kg):</strong> {result.meta?.vehicle_mass_kg}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th>t_s</th>
                  <th>wheel_speed_mph</th>
                  <th>accel_ms2</th>
                  <th>force_lbf</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.t_s}</td>
                    <td>{r.wheel_speed_mph}</td>
                    <td>{r.accel_ms2}</td>
                    <td>{r.force_lbf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            Tip: In coastdown segments, accel and force should mostly be negative.
          </div>
        </div>
      )}
    </>
  );
}

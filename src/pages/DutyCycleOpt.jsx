import React, { useState } from "react";
//import { API_BASE_URL } from "../apiConfig"; // or replace with 
const API_BASE_URL = "http://localhost:5000";

const DutyCycleOpt = () => {
  const [label, setLabel] = useState("Custom Scenario");
  const [iterMin, setIterMin] = useState(1);
  const [iterMax, setIterMax] = useState(10);

  // dynamic rows: [{exp, total, rear, front}, ...]
  const [rows, setRows] = useState([
    { exp: 3.0, total: "", rear: "", front: "" }, // start with one row
  ]);

  // --- NEW: advanced parameter state ---
  const [rearMin, setRearMin] = useState(0);
  const [rearMax, setRearMax] = useState(4000);

  const [frontMin, setFrontMin] = useState(0);
  const [frontMax, setFrontMax] = useState(5200);

  const [cycleMin, setCycleMin] = useState(0);
  const [cycleMax, setCycleMax] = useState(1e8);

  const [maxTotalCycles, setMaxTotalCycles] = useState(1e9);

  const [popsize, setPopsize] = useState(15);
  const [maxiter, setMaxiter] = useState(500);
  const [workers, setWorkers] = useState(1); // later you can set default -1

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { exp: "", total: "", rear: "", front: "" },
    ]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev; // require at least one row
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!rows.length) {
        throw new Error("At least one exponent row is required.");
      }

      const wtExponents = [];
      const designLifeValues = [];

      for (const row of rows) {
        const exp = parseFloat(row.exp);
        const total = parseFloat(row.total);
        const rear = parseFloat(row.rear);
        const front = parseFloat(row.front);

        if (
          Number.isNaN(exp) ||
          Number.isNaN(total) ||
          Number.isNaN(rear) ||
          Number.isNaN(front)
        ) {
          throw new Error(
            "All exponent and design-life fields must be numeric."
          );
        }

        wtExponents.push(exp);
        designLifeValues.push([total, rear, front]);
      }

      const body = {
        label,
        iterMin,
        iterMax,
        wtExponents,
        designLifeValues,

        // --- NEW: advanced parameters sent to backend ---
        rearBounds: [rearMin, rearMax],
        frontBounds: [frontMin, frontMax],
        cycleBounds: [cycleMin, cycleMax],
        maxTotalCycles,
        popsize,
        maxiter,
        workers,
      };

      // Optional: debug
      // console.log("Sending:", JSON.stringify(body, null, 2));

      const resp = await fetch(`${API_BASE_URL}/optimizeDutyCycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (!resp.ok || data.status !== "success") {
        throw new Error(data.message || "Optimization failed.");
      }

      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for grouped damage display
  const renderDamageTable = () => {
    if (!result) return null;

    const numExp = result.wt_exponents.length;
    const totals = result.damage.slice(0, numExp);
    const rears = result.damage.slice(numExp, 2 * numExp);
    const fronts = result.damage.slice(2 * numExp, 3 * numExp);

    return (
      <div>
        <h3>Damage by Exponent</h3>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Exponent
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Total (%)
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Rear (%)
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Front (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {result.wt_exponents.map((exp, i) => (
              <tr key={i}>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  {exp}
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  {(totals[i] * 100).toFixed(1)}
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  {(rears[i] * 100).toFixed(1)}
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  {(fronts[i] * 100).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Duty Cycle Optimization</h1>

      {/* Scenario label and ITER range */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>
            Scenario Label:&nbsp;
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ width: "250px" }}
            />
          </label>
        </div>

        <div>
          <label>
            ITER min:&nbsp;
            <input
              type="number"
              value={iterMin}
              min={1}
              onChange={(e) => setIterMin(Number(e.target.value))}
              style={{ width: "80px" }}
            />
          </label>
          <span>&nbsp;to&nbsp;</span>
          <label>
            ITER max:&nbsp;
            <input
              type="number"
              value={iterMax}
              min={iterMin}
              onChange={(e) => setIterMax(Number(e.target.value))}
              style={{ width: "80px" }}
            />
          </label>
        </div>
      </div>

      {/* Exponents + design life table */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Exponents & Design-Life Values</h2>
        <p style={{ maxWidth: "600px" }}>
          For each exponent, enter the corresponding design-life values for:
          Total (Front + Rear), Rear, and Front. You must have at least one
          row. The tool will handle 5 or more rows without issue.
        </p>

        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                #
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Exponent
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Total (F+R)
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Rear
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Front
              </th>
              <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  {idx + 1}
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  <input
                    type="number"
                    value={row.exp}
                    onChange={(e) =>
                      handleRowChange(idx, "exp", e.target.value)
                    }
                    style={{ width: "100px" }}
                  />
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  <input
                    type="number"
                    value={row.total}
                    onChange={(e) =>
                      handleRowChange(idx, "total", e.target.value)
                    }
                    style={{ width: "140px" }}
                  />
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  <input
                    type="number"
                    value={row.rear}
                    onChange={(e) =>
                      handleRowChange(idx, "rear", e.target.value)
                    }
                    style={{ width: "140px" }}
                  />
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  <input
                    type="number"
                    value={row.front}
                    onChange={(e) =>
                      handleRowChange(idx, "front", e.target.value)
                    }
                    style={{ width: "140px" }}
                  />
                </td>
                <td
                  style={{ border: "1px solid #ccc", padding: "4px" }}
                >
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    disabled={rows.length <= 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "10px" }}>
          <button onClick={handleAddRow}>Add Exponent Row</button>
        </div>
      </div>

      {/* --- NEW: Advanced parameters section --- */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? "Hide Advanced Parameters" : "Show Advanced Parameters"}
        </button>

        {showAdvanced && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              maxWidth: "800px",
            }}
          >
            <h2>Advanced Parameters</h2>

            <div style={{ marginBottom: "8px" }}>
              <strong>Torque Bounds</strong>
              <div>
                <label>
                  Rear min:&nbsp;
                  <input
                    type="number"
                    value={rearMin}
                    onChange={(e) =>
                      setRearMin(parseFloat(e.target.value))
                    }
                    style={{ width: "100px" }}
                  />
                </label>
                <span>&nbsp;to&nbsp;</span>
                <label>
                  Rear max:&nbsp;
                  <input
                    type="number"
                    value={rearMax}
                    onChange={(e) =>
                      setRearMax(parseFloat(e.target.value))
                    }
                    style={{ width: "100px" }}
                  />
                </label>
              </div>
              <div>
                <label>
                  Front min:&nbsp;
                  <input
                    type="number"
                    value={frontMin}
                    onChange={(e) =>
                      setFrontMin(parseFloat(e.target.value))
                    }
                    style={{ width: "100px" }}
                  />
                </label>
                <span>&nbsp;to&nbsp;</span>
                <label>
                  Front max:&nbsp;
                  <input
                    type="number"
                    value={frontMax}
                    onChange={(e) =>
                      setFrontMax(parseFloat(e.target.value))
                    }
                    style={{ width: "100px" }}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <strong>Cycle Bounds</strong>
              <div>
                <label>
                  Cycles min:&nbsp;
                  <input
                    type="number"
                    value={cycleMin}
                    onChange={(e) =>
                      setCycleMin(parseFloat(e.target.value))
                    }
                    style={{ width: "140px" }}
                  />
                </label>
                <span>&nbsp;to&nbsp;</span>
                <label>
                  Cycles max:&nbsp;
                  <input
                    type="number"
                    value={cycleMax}
                    onChange={(e) =>
                      setCycleMax(parseFloat(e.target.value))
                    }
                    style={{ width: "140px" }}
                  />
                </label>
              </div>
              <div>
                <label>
                  Max total cycles:&nbsp;
                  <input
                    type="number"
                    value={maxTotalCycles}
                    onChange={(e) =>
                      setMaxTotalCycles(parseFloat(e.target.value))
                    }
                    style={{ width: "180px" }}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <strong>Differential Evolution Settings</strong>
              <div>
                <label>
                  Popsize:&nbsp;
                  <input
                    type="number"
                    value={popsize}
                    min={1}
                    onChange={(e) =>
                      setPopsize(parseInt(e.target.value || "1", 10))
                    }
                    style={{ width: "80px" }}
                  />
                </label>
              </div>
              <div>
                <label>
                  Maxiter:&nbsp;
                  <input
                    type="number"
                    value={maxiter}
                    min={1}
                    onChange={(e) =>
                      setMaxiter(parseInt(e.target.value || "1", 10))
                    }
                    style={{ width: "80px" }}
                  />
                </label>
              </div>
              <div>
                <label>
                  Workers:&nbsp;
                  <input
                    type="number"
                    value={workers}
                    onChange={(e) =>
                      setWorkers(parseInt(e.target.value || "1", 10))
                    }
                    style={{ width: "80px" }}
                  />
                  <span style={{ marginLeft: "6px", fontSize: "0.85em" }}>
                    (1 = no parallel, -1 = all cores)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Run button */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={handleRun} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Optimization"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          Error: {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          <h2>
            {result.label} – Best ITER: {result.best_iter}
          </h2>

          <h3>Rows (Rear, Front, Cycles)</h3>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: "800px",
            }}
          >
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                  Row
                </th>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                  Rear Torque
                </th>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                  Front Torque
                </th>
                <th style={{ border: "1px solid #ccc", padding: "4px" }}>
                  Cycles
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, idx) => (
                <tr key={idx}>
                  <td
                    style={{ border: "1px solid #ccc", padding: "4px" }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{ border: "1px solid #ccc", padding: "4px" }}
                  >
                    {row[0].toFixed(2)}
                  </td>
                  <td
                    style={{ border: "1px solid #ccc", padding: "4px" }}
                  >
                    {row[1].toFixed(2)}
                  </td>
                  <td
                    style={{ border: "1px solid #ccc", padding: "4px" }}
                  >
                    {row[2].toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {renderDamageTable()}
        </div>
      )}
    </div>
  );
};

export default DutyCycleOpt;

import React, { useState } from "react";
//import { API_BASE_URL } from "../apiConfig"; // or replace with 
const API_BASE_URL = "http://localhost:5000";

const DutyCycleOpt = () => {
  const [label, setLabel] = useState("Custom Scenario");
  const [iterMin, setIterMin] = useState(1);
  const [iterMax, setIterMax] = useState(10);

  // dynamic rows: [{exp, total, rear, front}, ...]
  const [rows, setRows] = useState([
    { exp: 3.0, total: "", rear: "", front: "" }, // start with one row (exp pre-filled)
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // add a new exponent row
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
      // basic validation
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
        // you can expose these later if needed:
        // rearBounds: [0, 4000],
        // frontBounds: [0, 5200],
        // cycleBounds: [0, 1e8],
        // maxTotalCycles: 1e9,
      };

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

          <h3>Damage Vector</h3>
          <p style={{ maxWidth: "600px" }}>
            The damage array is ordered as [Total for each exponent, Rear for
            each exponent, Front for each exponent].
          </p>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "10px",
              borderRadius: "4px",
              maxWidth: "800px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(result.damage, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DutyCycleOpt;

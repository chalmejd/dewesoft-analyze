import React, { useState } from "react";
//import { API_BASE_URL } from "../apiConfig"; // if you create this central config
const API_BASE_URL = "http://localhost:5000";

const DutyCycleOpt = () => {
  const [gear, setGear] = useState("High");
  const [iterMin, setIterMin] = useState(1);
  const [iterMax, setIterMax] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch(`${API_BASE_URL}/optimizeDutyCycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gear,
          iterMin,
          iterMax,
          // You can expose bounds or keep defaults here:
          // rearBounds: [0, 4000],
          // frontBounds: [0, 5200],
          // cycleBounds: [0, 1e8],
          // wtExponents: [3, 6.610, 8.738],
        }),
      });

      const data = await resp.json();
      if (!resp.ok || data.status !== "success") {
        throw new Error(data.message || "Optimization failed");
      }
      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="duty-cycle-page">
      <h1>Duty Cycle Optimization</h1>

      <div className="controls">
        <label>
          Gear:
          <select value={gear} onChange={(e) => setGear(e.target.value)}>
            <option value="High">High</option>
            <option value="Low">Low</option>
            <option value="Reverse">Reverse</option>
          </select>
        </label>

        <label>
          ITER range:
          <input
            type="number"
            value={iterMin}
            onChange={(e) => setIterMin(Number(e.target.value))}
            min={1}
          />
          <span> to </span>
          <input
            type="number"
            value={iterMax}
            onChange={(e) => setIterMax(Number(e.target.value))}
            min={iterMin}
          />
        </label>

        {/* Advanced options (bounds, exponents, etc.) can go in a collapsible panel here */}

        <button onClick={handleRun} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Optimization"}
        </button>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="results">
          <h2>{result.gear} Gear – Best ITER: {result.best_iter}</h2>

          <h3>Rows</h3>
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Rear Torque</th>
                <th>Front Torque</th>
                <th>Cycles</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{row[0].toFixed(2)}</td>
                  <td>{row[1].toFixed(2)}</td>
                  <td>{row[2].toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Damage (fraction of design life)</h3>
          <pre>{JSON.stringify(result.damage, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default DutyCycleOpt;

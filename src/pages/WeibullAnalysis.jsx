import React, { useMemo, useState } from "react";

const WeibullAnalysis = () => {
  const [reliabilityPct, setReliabilityPct] = useState(90);  // %
  const [confidencePct, setConfidencePct] = useState(90);    // %
  const [life, setLife] = useState(1);                    // target life
  const [beta, setBeta] = useState(3.0);                     // shape parameter

  // range of sample quantities for the table
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState(20);

  // Precompute rows whenever inputs change
  const rows = useMemo(() => {
    const rows = [];

    const R = reliabilityPct / 100;
    const C = confidencePct / 100;

    if (!(R > 0 && R < 1 && C > 0 && C < 1 && life > 0 && beta > 0)) {
      return rows;
    }

    const lnTerm = Math.log(1 - C); // ln(1 - confidence)
    const lnRel = Math.log(R);      // ln(reliability)

    // guard: both should be negative in typical use, but ratio must be > 0
    for (let qty = Math.max(1, Math.floor(minQty)); qty <= maxQty; qty++) {
      const inner = lnTerm / (qty * lnRel); // ln(1-C) / (qty * ln(R))

      if (!(inner > 0)) continue; // invalid combination → skip

      const duration = life * Math.pow(inner, 1 / beta); // Life * inner^(1/beta)

      if (!Number.isFinite(duration) || duration <= 0) continue;

      rows.push({ qty, duration });
    }

    return rows;
  }, [reliabilityPct, confidencePct, life, beta, minQty, maxQty]);

  const hasInputIssue =
    !(reliabilityPct > 0 && reliabilityPct < 100) ||
    !(confidencePct > 0 && confidencePct < 100) ||
    life <= 0 ||
    beta <= 0;

  return (
    <div>
      <h1>Weibull Analysis</h1>

      <section style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h2>Zero Failure Test Plan</h2>
        <p style={{ maxWidth: "700px" }}>
          This tool computes a simple zero-failure test plan for a Weibull
          life distribution. For each sample quantity, it calculates the
          test duration required to meet the specified reliability and
          confidence targets at a given target life and shape parameter
          (β).
        </p>
      </section>

      {/* Inputs */}
     <section
        style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridRowGap: "20px",
            gridColumnGap: "40px",
            marginBottom: "20px",
            maxWidth: "650px"
        }}
        >

        {/* Row 1, Col 1 */}
        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center"
            }}
        >
            <label style={{ textAlign: "left" }}>Reliability Target (%):</label>
            <input
            type="number"
            value={reliabilityPct}
            onChange={(e) => setReliabilityPct(parseFloat(e.target.value))}
            style={{ width: "100px", textAlign: "right" }}
            />
        </div>

        {/* Row 1, Col 2 */}
        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center"
            }}
        >
            <label style={{ textAlign: "left" }}>Confidence Target (%):</label>
            <input
            type="number"
            value={confidencePct}
            onChange={(e) => setConfidencePct(parseFloat(e.target.value))}
            style={{ width: "100px", textAlign: "right" }}
            />
        </div>

        {/* Row 2, Col 1 */}
        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center"
            }}
        >
            <label style={{ textAlign: "left" }}>Target Life:</label>
            <input
            type="number"
            value={life}
            onChange={(e) => setLife(parseFloat(e.target.value))}
            style={{ width: "100px", textAlign: "right" }}
            />
        </div>

        {/* Row 2, Col 2 */}
        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center"
            }}
        >
            <label style={{ textAlign: "left" }}>Shape (β):</label>
            <input
            type="number"
            step="0.01"
            value={beta}
            onChange={(e) => setBeta(parseFloat(e.target.value))}
            style={{ width: "100px", textAlign: "right" }}
            />
        </div>

        {/* Row 3, Col 1 */}
        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center"
            }}
        >
            <label style={{ textAlign: "left" }}>Min Sample Qty:</label>
            <input
            type="number"
            value={minQty}
            min={1}
            onChange={(e) => setMinQty(parseInt(e.target.value || "1", 10))}
            style={{ width: "100px", textAlign: "right" }}
            />
        </div>

        {/* Row 3, Col 2 */}
        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center"
            }}
        >
            <label style={{ textAlign: "left" }}>Max Sample Qty:</label>
            <input
            type="number"
            value={maxQty}
            min={minQty}
            onChange={(e) => setMaxQty(parseInt(e.target.value || "1", 10))}
            style={{ width: "100px", textAlign: "right" }}
            />
        </div>

        </section>



      {/* Warnings / issues */}
      {hasInputIssue && (
        <div style={{ color: "red", marginBottom: "10px", maxWidth: "600px" }}>
          Please ensure Reliability and Confidence are between 0 and 100,
          and that Life and β are positive.
        </div>
      )}

      {/* Table */}
      <section>
        <h3>Sample Quantity vs Test Duration</h3>
        <p style={{ maxWidth: "600px" }}>
          Durations are in the same units as the Target Life input
          (e.g., hours, cycles). Rows that would produce invalid values
          are automatically skipped.
        </p>

        {rows.length === 0 ? (
          <p>No valid combinations for the current inputs.</p>
        ) : (
          <table
            style={{
                borderCollapse: "collapse",
                width: "100%",
                maxWidth: "650px",
            }}
            >
            <thead>
                <tr>
                <th
                    style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                    textAlign: "center",
                    }}
                >
                    Sample Qty
                </th>
                <th
                    style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                    textAlign: "center",
                    }}
                >
                    Individual Test Duration
                </th>
                <th
                    style={{
                    border: "1px solid #ccc",
                    padding: "6px",
                    textAlign: "center",
                    }}
                >
                    Total Test Duration
                </th>
                </tr>
            </thead>

            <tbody>
                {rows.map((row) => {
                const totalDuration = row.qty * row.duration;

                return (
                    <tr key={row.qty}>
                    {/* Sample Qty */}
                    <td
                        style={{
                        border: "1px solid #ccc",
                        padding: "6px",
                        textAlign: "center",
                        }}
                    >
                        {row.qty}
                    </td>

                    {/* Per-sample Duration */}
                    <td
                        style={{
                        border: "1px solid #ccc",
                        padding: "6px",
                        textAlign: "center",
                        }}
                    >
                        {row.duration.toFixed(2)}
                    </td>

                    {/* NEW: Total Test Duration */}
                    <td
                        style={{
                        border: "1px solid #ccc",
                        padding: "6px",
                        textAlign: "center",
                        }}
                    >
                        {totalDuration.toFixed(2)}
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </table>

        )}
      </section>

      {/* Extra bottom padding so we don't collide with footer */}
      <div style={{ height: "80px" }} />
    </div>
  );
};

export default WeibullAnalysis;

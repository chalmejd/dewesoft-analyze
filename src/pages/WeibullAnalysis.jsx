import React, { useMemo, useState } from "react";

const WeibullAnalysis = () => {
  const [reliabilityPct, setReliabilityPct] = useState(90);  // %
  const [confidencePct, setConfidencePct] = useState(90);    // %
  const [life, setLife] = useState(1);                    // target life
  const [beta, setBeta] = useState(3.0);                     // shape parameter

  // range of sample quantities for the table
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState(10);

  // number of allowed failures
  const [allowedFailures, setAllowedFailures] = useState(0); // c, default 0

  // Precompute rows whenever inputs change
  const rows = useMemo(() => {
    const rows = [];

    const R = reliabilityPct / 100;
    const C = confidencePct / 100;

    if (!(R > 0 && R < 1 && C > 0 && C < 1 && life > 0 && beta > 0)) {
        return rows;
    }

    const betaVal = beta;
    const lifeVal = life;
    const c = Math.max(0, Math.floor(allowedFailures || 0));

    const minQ = Math.max(1, Math.floor(minQty || 1));
    const maxQ = Math.max(minQ, Math.floor(maxQty || minQ));

    // --- CASE 1: c = 0 → use closed-form zero failure formula (original behavior)
    if (c === 0) {
        const ln1C = Math.log(1 - C);      // negative
        const lnR = Math.log(R);           // negative

        for (let qty = minQ; qty <= maxQ; qty++) {
        const inner = ln1C / (qty * lnR);
        if (!(inner > 0)) continue;

        const T = lifeVal * Math.pow(inner, 1 / betaVal);
        if (Number.isFinite(T) && T > 0) {
            rows.push({ qty, duration: T });
        }
        }

        return rows;
    }

    // --- CASE 2: c > 0 → use binomial Weibull numeric solver
    // Weibull scale from reliability target
    const lnRneg = -Math.log(R);
    if (!(lnRneg > 0)) return rows;

    const etaTarget = lifeVal / Math.pow(lnRneg, 1 / betaVal);

    // Weibull CDF
    const F_target = (t) => {
    if (t <= 0) return 0;
    return 1 - Math.exp(-Math.pow(t / etaTarget, betaVal));
    };

    // Binomial PMF sum for ≤ c failures
    const comb = (n, k) => {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let num = 1, den = 1;
    for (let i = 1; i <= k; i++) {
        num *= n - (k - i);
        den *= i;
    }
    return num / den;
    };

    const passProb = (n, c, F) => {
    if (F <= 0) return 1;
    if (F >= 1) return c >= n ? 1 : 0;

    let p = 0;
    for (let k = 0; k <= c; k++) {
        p += comb(n, k) * Math.pow(F, k) * Math.pow(1 - F, n - k);
    }
    return p;
    };

    for (let qty = minQ; qty <= maxQ; qty++) {
    const targetP = 1-C;

    // P_pass(0) = 1, P_pass(T)->0 as T grows
    let low = 0;
    let high = lifeVal;
    let p_low = 1;                      // passProb(qty, c, F(0))
    let p_high = passProb(qty, c, F_target(high));

    // Expand high until P_pass(high) < C
    let expand = 0;
    while (p_high > targetP && expand < 40) {
        high *= 2;
        p_high = passProb(qty, c, F_target(high));
        expand++;
    }

    // If still not below C, no finite T exists
    if (p_high > targetP) continue;

    // Now p_low > C and p_high < C → bisection
    for (let i = 0; i < 60; i++) {
        const mid = 0.5 * (low + high);
        const p_mid = passProb(qty, c, F_target(mid));
        if (p_mid > targetP) {
        low = mid;
        } else {
        high = mid;
        }
    }

    const T = 0.5 * (low + high);
    if (Number.isFinite(T) && T > 0) {
        rows.push({ qty, duration: T });
    }
    }

    return rows;


    }, [
    reliabilityPct,
    confidencePct,
    life,
    beta,
    minQty,
    maxQty,
    allowedFailures,
    ]);



  const hasInputIssue =
    !(reliabilityPct > 0 && reliabilityPct < 100) ||
    !(confidencePct > 0 && confidencePct < 100) ||
    life <= 0 ||
    beta <= 0;

  return (
    <div>
        <h1 style={{fontSize: 40}}>Weibull Analysis</h1>
        <hr></hr>

      <section style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h2>Weibull Test Plan</h2>
        <p style={{ maxWidth: "700px" }}>
          This tool computes a simple test plan for a Weibull
          life distribution. For each sample quantity, it calculates the
          test duration required to meet the specified reliability and
          confidence targets at a given target life, shape parameter
          (β) and number of allowed failures.
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

        <div
            style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            }}
        >
            <label style={{ textAlign: "left" }}>Allowed Failures (c):</label>
            <input
            type="number"
            min={0}
            value={allowedFailures}
            onChange={(e) =>
                setAllowedFailures(Math.max(0, parseInt(e.target.value || "0", 10)))
            }
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

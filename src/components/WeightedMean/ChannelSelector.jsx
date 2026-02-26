import React, { useState } from "react";
import LoadingBars from "../LoadingBars/LoadingBars";

const ChannelSelector = ({ channelNames, files = [] }) => {
  const [selectedChannels, setSelectedChannels] = useState({
    channel1: "",
    channel2: "",
  });
  const [exponents, setExponents] = useState([]);
  const [results, setResults] = useState([]); // changed to array to hold one entry per file
  const [isLoading, setIsLoading] = useState(false);

  const handleChannelChange = (key, value) => {
    setSelectedChannels((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExponentChange = (value) => {
    const parsedExponents = value
      .split(",")
      .map((exponent) => exponent.trim())
      .filter((exponent) => !isNaN(Number(exponent)))
      .map(Number);
    setExponents(parsedExponents);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("No file(s) available for calculation. Please upload a file or folder first.");
      return;
    }

    setIsLoading(true);
    console.log("Selected Channels:", selectedChannels);
    console.log("Exponents:", exponents);
    console.log("Files to process:", files);

    const accumulatedResults = [];

    // process each file sequentially to avoid overwhelming the backend
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("loadChannel", selectedChannels.channel1);
      formData.append("revChannel", selectedChannels.channel2);
      formData.append("exponents", JSON.stringify(exponents));

      try {
        const response = await fetch("http://localhost:5000/run_calcs", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.status === "success") {
          const parsed = JSON.parse(data.results);
          accumulatedResults.push({
            filename: file.name,
            data: parsed,
          });
        } else {
          console.error("Calculation error for", file.name, data.message);
          accumulatedResults.push({
            filename: file.name,
            error: data.message,
          });
        }
      } catch (error) {
        console.error("Error processing", file.name, error);
        accumulatedResults.push({
          filename: file.name,
          error: error.message,
        });
      }
    }

    setResults(accumulatedResults);
    setIsLoading(false);
  };

  // compute aggregated totals when results array changes
  const aggregated = React.useMemo(() => {
    // map exponent -> {cycles: number, damage: number}
    const map = {};
    results.forEach((entry) => {
      if (entry.error) return;
      entry.data.forEach(([exponent, result, revCount]) => {
        const expNum = Number(exponent);
        const resNum = Number(result);
        const cyclesNum = Number(revCount);
        if (!Number.isFinite(expNum) || !Number.isFinite(resNum) || !Number.isFinite(cyclesNum)) {
          return;
        }
        const damage = Math.pow(resNum, expNum) * cyclesNum;
        if (!map[expNum]) {
          map[expNum] = { cycles: 0, damage: 0 };
        }
        map[expNum].cycles += cyclesNum;
        map[expNum].damage += damage;
      });
    });
    return map;
  }, [results]);

  return (
    <div>
      <h2>Select Channels and Set Exponents</h2>

      <div style={{ marginBottom: "10px" }}>
        <label htmlFor="channel1" style={{ marginRight: "10px" }}>
          Select Load Channel:
        </label>
        <select
          id="channel1"
          value={selectedChannels.channel1}
          onChange={(e) => handleChannelChange("channel1", e.target.value)}
          style={{ padding: "5px", width: "200px" }}
        >
          <option value="">-- Select Channel --</option>
          {channelNames.map((channel, index) => (
            <option key={index} value={channel}>
              {channel}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label htmlFor="channel2" style={{ marginRight: "10px" }}>
          Select Counter Channel:
        </label>
        <select
          id="channel2"
          value={selectedChannels.channel2}
          onChange={(e) => handleChannelChange("channel2", e.target.value)}
          style={{ padding: "5px", width: "200px" }}
        >
          <option value="">-- Select Channel --</option>
          {channelNames.map((channel, index) => (
            <option key={index} value={channel}>
              {channel}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label htmlFor="exponent" style={{ marginRight: "10px" }}>
          Enter Exponents (comma-separated):
        </label>
        <input
          id="exponent"
          type="text"
          onChange={(e) => handleExponentChange(e.target.value)}
          placeholder="E.g., 2, 3.5, 7"
          style={{ width: "300px", padding: "5px" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Submit
      </button>
      {isLoading && <LoadingBars />} {/* Show LoadingBar when loading */}

      {results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Calculation Results</h3>
          {results.map((entry, idx) => (
            <div key={idx} style={{ marginBottom: "30px" }}>
              <h4>{entry.filename || `File ${idx + 1}`}</h4>
              {entry.error ? (
                <div style={{ color: 'red' }}>Error: {entry.error}</div>
              ) : (
                <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Exponent</th>
                      <th>Result</th>
                      <th>Cycle Count</th>
                      <th>Damage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.data.map(([exponent, result, revCount], index) => {
                      const expNum = Number(exponent);
                      const resNum = Number(result);
                      const cyclesNum = Number(revCount);

                      let damage = null;
                      if (
                        Number.isFinite(expNum) &&
                        Number.isFinite(resNum) &&
                        Number.isFinite(cyclesNum)
                      ) {
                        damage = Math.pow(resNum, expNum) * cyclesNum;
                      }

                      return (
                        <tr key={index}>
                          <td>{exponent}</td>
                          <td>{result}</td>
                          <td>{revCount}</td>
                          <td>{damage !== null ? damage.toExponential(3) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {/* aggregate display */}
          {Object.keys(aggregated).length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h3>Aggregate Totals</h3>
              <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Exponent</th>
                    <th>Total Cycles</th>
                    <th>Total Damage</th>
                    <th>Back-calculated Result</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(aggregated).map(([exp, {cycles, damage}]) => {
                    const expNum = Number(exp);
                    const back = cycles > 0 && damage >= 0 ? Math.pow(damage / cycles, 1 / expNum) : null;
                    return (
                      <tr key={exp}>
                        <td>{exp}</td>
                        <td>{cycles.toExponential ? cycles.toExponential(3) : cycles}</td>
                        <td>{damage.toExponential ? damage.toExponential(3) : damage}</td>
                        <td>{back !== null ? back.toExponential(3) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelSelector;

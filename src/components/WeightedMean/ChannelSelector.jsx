import React, { useState } from "react";
import LoadingBars from "../LoadingBars/LoadingBars";

const ChannelSelector = ({ channelNames }) => {
  const [selectedChannels, setSelectedChannels] = useState({
    channel1: "",
    channel2: "",
  });
  const [exponents, setExponents] = useState([]);
  const [results, setResults] = useState(null); // State for results
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

  const handleSubmit = () => {
    setIsLoading(true);
    console.log("Selected Channels:", selectedChannels);
    console.log("Exponents:", exponents);
    console.log("Loading State: ", isLoading);
  
    const formData = new FormData();
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    if (file) {
      formData.append("file", file);
    }

    formData.append("loadChannel", selectedChannels.channel1);
    formData.append("revChannel", selectedChannels.channel2);
    formData.append("exponents", JSON.stringify(exponents));

    fetch("http://localhost:5000/run_calcs", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          // Parse the results from the stringified array
          const parsedResults = JSON.parse(data.results);
          setResults(parsedResults); // Update the results state
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

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

      {results && (
        <div style={{ marginTop: "20px" }}>
          <h3>Calculation Results</h3>
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
              {results.map(([exponent, result, revCount], index) => {
                const expNum = Number(exponent);
                const resNum = Number(result);
                const cyclesNum = Number(revCount);

                let damage = null;
                if (
                  Number.isFinite(expNum) &&
                  Number.isFinite(resNum) &&
                  Number.isFinite(cyclesNum)
                ) {
                  // damage = (result^exp) * cycles
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
        </div>
      )}
    </div>
  );
};

export default ChannelSelector;

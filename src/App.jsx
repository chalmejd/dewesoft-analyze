import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Overview from "./pages/Overview";
import WeightedMean from "./pages/WeightedMean";
// import PeakLocator from "./pages/PeakLoacator";
// import Filtering from "./pages/Filtering";
// import CurveFitting from "./pages/CurveFitting";
import DutyCycleOpt from "./pages/DutyCycleOpt";
import Footer from "./components/Footer/Footer";
import './components/Header/Header.css'

function App() {
  return (
    <Router>
      <div style={{ display: "flex", height: "100vh", margin: "0" }}>
        {/* Sidebar */}
        <nav
          style={{
            width: "250px",
            background: "#282c34",
            color: "white",
            padding: "20px",
            position: "fixed",
            top: 0,
            left: 0,
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2 style={{ marginBottom: "20px" }} className="gradient-text">TEAM Testing Toolbox</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "10px" }}>
              <NavLink
                to="/"
                style={({ isActive }) => ({
                  color: isActive ? "#CD4A00" : "white", // Highlight active link with a custom color
                  textDecoration: isActive ? "underline" : "none", // Underline only the active link
                })}
              >
                Overview
              </NavLink>
            </li>
            <li style={{ marginBottom: "10px" }}>
              <NavLink
                to="/weighted-mean"
                style={({ isActive }) => ({
                  color: isActive ? "#CD4A00" : "white",
                  textDecoration: isActive ? "underline" : "none",
                })}
              >
                Damage Calculation
              </NavLink>
            </li>

            <li style={{ marginBottom: "10px" }}>
              <NavLink
                to="/duty-cycle-opt"
                style={({ isActive }) => ({
                  color: isActive ? "#CD4A00" : "white",
                  textDecoration: isActive ? "underline" : "none",
                })}
              >
                Duty Cycle Generation
              </NavLink>
            </li>

            {/* <li style={{ marginBottom: "10px" }}>
              <NavLink
                to="/peak-locator"
                style={({ isActive }) => ({
                  color: isActive ? "#CD4A00" : "white",
                  textDecoration: isActive ? "underline" : "none",
                })}
              >
                Peak Locator
              </NavLink>
            </li>
            <li style={{ marginBottom: "10px" }}>
              <NavLink
                to="/filtering"
                style={({ isActive }) => ({
                  color: isActive ? "#CD4A00" : "white",
                  textDecoration: isActive ? "underline" : "none",
                })}
              >
                Filtering
              </NavLink>
            </li>
            <li style={{ marginBottom: "10px" }}>
              <NavLink
                to="/curve-fitting"
                style={({ isActive }) => ({
                  color: isActive ? "#CD4A00" : "white",
                  textDecoration: isActive ? "underline" : "none",
                })}
              >
                Curve Fitting
              </NavLink>
            </li> */}
          </ul>
        </nav>

        {/* Main Content */}
        <div
          style={{
            marginLeft: "250px",
            flex: 1,
            padding: "20px",
            boxSizing: "border-box",
            width: "calc(100% - 250px)",
          }}
        >
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/weighted-mean" element={<WeightedMean />} />
            <Route path="/duty-cycle-opt" element={<DutyCycleOpt />} />
            {/* <Route path="/peak-locator" element={<PeakLocator />} />
            <Route path="/filtering" element={<Filtering />}/>
            <Route path="/curve-fitting" element={<CurveFitting/>}/> */}
          </Routes>
        </div>
      </div>
      <div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

import React, { useState } from 'react';
import LoadingBars from '../LoadingBars/LoadingBars';

const FileSelector = ({ onUploadComplete }) => {
  // State to store the selected file(s)
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]); // array for bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handles changes to the file input
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (bulkMode) {
      setFiles(selectedFiles);
      if (selectedFiles.length > 0) {
        setFile(selectedFiles[0]);
      }
    } else {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setFiles([]);
    }
  };

  // Handles the file upload and sends the first file to server for channel extraction
  const handleFileUpload = () => {
    const fileToUpload = bulkMode ? file : file;
    if (!fileToUpload) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload); // Attach the first file (for channel list)

    setIsLoading(true);

    fetch("http://localhost:5000/run_python", {
        method: "POST",
        body: formData, // Send as multipart/form-data
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to upload file to the server.");
            }
            return response.json();
        })
        .then((data) => {
          console.log("Server response:", data);
  
          // Extract the channel names from the output
          const rawOutput = data.result?.output;
          if (rawOutput) {
            const channelNames = JSON.parse(rawOutput); // Parse the JSON string
            // Pass the channels and the selected file(s) up
            onUploadComplete({ channels: channelNames, files: bulkMode ? files : [fileToUpload] });
          } else {
            alert("No valid output found in the server response.");
          }
        })
        .catch((error) => {
            console.error("Error uploading file to server:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
};

  return (
    <div style={{fontFamily: 'Arial, sans-serif' }}>
      <h2>File Selection</h2>

      {/* Bulk mode toggle */}
      <div style={{ marginBottom: '10px' }}>
        <label>
          <input
            type="checkbox"
            checked={bulkMode}
            onChange={(e) => setBulkMode(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Bulk upload (select folder)
        </label>
      </div>

      {/* File input section */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="fileInput">
          {bulkMode
            ? 'Select a folder containing .dxd files:'
            : 'Select a file (.dxd):'}
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".dxd"
          onChange={handleFileChange}
          multiple={bulkMode}
          webkitdirectory={bulkMode ? "" : undefined}
          directory={bulkMode ? "" : undefined}
          style={{ display: 'block' }}
        />
      </div>

      {/* Button to upload file(s) for channel information */}
      <button
        onClick={handleFileUpload}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        {bulkMode ? 'Use Selected Folder' : 'Use Selected File'}
      </button>
      {isLoading && < LoadingBars />}

      {/* Display selected files when in bulk mode */}
      {bulkMode && files.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong>Files to process:</strong>
          <ul>
            {files.map((f, idx) => (
              <li key={idx}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileSelector;

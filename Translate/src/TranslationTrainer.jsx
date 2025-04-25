import { useState, useEffect } from "react";
import Papa from "papaparse";

export default function TranslationTrainer() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    fetch("/api/models")
      .then(res => res.json())
      .then(data => {
        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      })
      .catch(err => console.error("Failed to load models:", err));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const englishSentences = results.data.map((row) => row[0]);

        const translatedRows = await Promise.all(
          englishSentences.map(async (englishText) => {
            try {
              const response = await fetch("/api/translate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: englishText, model: selectedModel }),
              });
              const data = await response.json();
              const greek = data.translation || "";
              return { English: englishText, Greek: greek };
            } catch (err) {
              console.error("Translation error:", err);
              return { English: englishText, Greek: "[Error]" };
            }
          })
        );

        setRows(translatedRows);
        setLoading(false);
      },
    });
  };

  const handleEdit = (index, value) => {
    const updated = [...rows];
    updated[index]["Greek"] = value;
    setRows(updated);
  };

  const downloadEditedCSV = () => {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `edited-${fileName}`;
    link.click();
  };

  const trainModel = async () => {
    setTraining(true);
    setTrainingStatus("Starting training...");
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rows),
      });
      const data = await res.json();
      if (data.success) {
        // Polling the training job
        const pollStatus = async () => {
          let status = "queued";
          let model = null;
          setTrainingStatus("Training in progress...");
          while (!["succeeded", "failed"].includes(status)) {
            const statusRes = await fetch(`/api/train-status?id=${data.job_id}`);
            const statusData = await statusRes.json();
            status = statusData.status;
            model = statusData.model;
            if (status === "succeeded") {
              setTrainingStatus(`✅ Trained successfully as ${statusData.version} (${statusData.created})`);
              break;
            } else if (status === "failed") {
              setTrainingStatus("❌ Training failed.");
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10000));
          }
        };
        await pollStatus();
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("Training error:", err);
      setTrainingStatus("❌ Training failed. See console for details.");
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-5xl bg-white p-8 shadow-xl rounded-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          English ➝ Greek Translation Trainer
        </h1>

        <div className="mb-4 text-center">
          <label className="block font-medium mb-1">Choose a model version:</label>
          <select
            className="border px-4 py-2 rounded w-full max-w-xs mx-auto"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.version} ({model.created})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        {loading && <p className="text-center mb-4 text-blue-600">Translating... Please wait ⏳</p>}

        {rows.length > 0 && !loading && (
          <>
            <div className="overflow-x-auto mb-6 max-h-[600px] overflow-y-auto space-y-4">
              {rows.map((row, idx) => (
                <div key={idx} className="bg-gray-50 border rounded p-4 shadow-sm">
                  <p className="mb-2 font-semibold">{row.English}</p>
                  <textarea
                    className="w-full border px-3 py-2 rounded resize-none"
                    rows={2}
                    value={row.Greek || ""}
                    onChange={(e) => handleEdit(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="text-center mt-6 space-x-4">
              <button
                onClick={downloadEditedCSV}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Download Edited CSV
              </button>
              <button
                onClick={trainModel}
                disabled={training}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {training ? "Training..." : "Train Your Translation Model"}
              </button>
            </div>

            {trainingStatus && (
              <p className="text-center mt-4 text-sm text-gray-700">{trainingStatus}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

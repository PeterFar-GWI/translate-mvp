import { useState } from "react";
import Papa from "papaparse";

export default function TranslationTrainer() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 Load from environment variables (as strings from .env.local)
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const model = import.meta.env.VITE_FINE_TUNING_MODEL;

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
              const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model,
                  messages: [
                    { role: "system", content: "You are a translation assistant that translates English to Greek." },
                    { role: "user", content: englishText },
                  ],
                }),
              });
              const data = await response.json();
              const greek = data.choices?.[0]?.message?.content?.trim() || "";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-5xl bg-white p-8 shadow-xl rounded-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          English ➝ Greek Translation Trainer
        </h1>

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

            <div className="text-center mt-6">
              <button
                onClick={downloadEditedCSV}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Download Edited CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

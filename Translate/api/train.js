import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data = req.body;

  if (!Array.isArray(data) || !data.length) {
    return res.status(400).json({ error: "Invalid training data" });
  }

  // Convert to .jsonl format for OpenAI
  const jsonlLines = data.map((row) =>
    JSON.stringify({
      messages: [
        { role: "user", content: row.English },
        { role: "assistant", content: row.Greek },
      ],
    })
  );

  const filePath = path.join(tmpdir(), `training-${Date.now()}.jsonl`);
  fs.writeFileSync(filePath, jsonlLines.join("\n"));

  try {
    // Upload file to OpenAI
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: "fine-tune",
    });

    // Start fine-tuning job
    const job = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: "gpt-4o-mini-2024-07-18",
    });

    const versionLabel = `v${job.id.slice(-4).toUpperCase()}`;
    const createdAt = new Date(job.created_at * 1000).toLocaleString();

    return res.status(200).json({
      success: true,
      job_id: job.id,
      model: job.fine_tuned_model,
      version: versionLabel,
      created: createdAt,
    });
  } catch (err) {
    console.error("Training error:", err);
    return res.status(500).json({ error: "Training failed", details: err.message });
  }
}

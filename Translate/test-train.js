import dotenv from "dotenv";
dotenv.config();
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rows = [
  { English: "Good morning", Greek: "Καλημέρα" },
  { English: "Thank you", Greek: "Ευχαριστώ" },
];

async function run() {
  const jsonl = rows
    .map((row) =>
      JSON.stringify({
        messages: [
          { role: "user", content: row.English },
          { role: "assistant", content: row.Greek },
        ],
      })
    )
    .join("\n");

  const filePath = path.join(tmpdir(), `training-${Date.now()}.jsonl`);
  fs.writeFileSync(filePath, jsonl);

  const file = await openai.files.create({
    file: fs.createReadStream(filePath),
    purpose: "fine-tune",
  });

  const job = await openai.fineTuning.jobs.create({
    training_file: file.id,
    model: "gpt-4o-mini-2024-07-18",
  });

  console.log("Started fine-tuning job:");
  console.log("ID:", job.id);
  console.log("Model:", job.fine_tuned_model);
  console.log("Created:", new Date(job.created_at * 1000).toLocaleString());
}

run().catch(console.error);

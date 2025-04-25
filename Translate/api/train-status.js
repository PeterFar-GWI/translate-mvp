import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const jobId = req.query.id;
  if (!jobId) {
    return res.status(400).json({ error: "Missing job ID" });
  }

  try {
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    const status = job.status;

    const model = job.fine_tuned_model;
    const version = model ? model.split(":").pop().slice(-5) : null;
    const created = new Date(job.created_at * 1000).toLocaleString();

    res.status(200).json({
      status,
      model,
      version,
      created,
    });
  } catch (err) {
    console.error("Failed to check training status:", err);
    res.status(500).json({ error: "Failed to check training status" });
  }
}

import OpenAI from "openai";

const openai = new OpenAI();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const list = await openai.fineTuning.jobs.list({ limit: 20 });
    const filtered = list.data
      .filter(job => job.status === "succeeded" && job.fine_tuned_model)
      .map(job => ({
        id: job.fine_tuned_model,
        version: job.fine_tuned_model.split(":").pop().slice(-5),
        created: new Date(job.created_at * 1000).toLocaleString()
      }))
      .sort((a, b) => b.created.localeCompare(a.created));

    res.status(200).json({ models: filtered });
  } catch (err) {
    console.error("Failed to fetch fine-tuned models:", err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
}
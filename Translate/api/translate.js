import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, model } = req.body;

  if (!text || !model) {
    return res.status(400).json({ error: "Missing text or model ID" });
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Translate the following into Greek." },
        { role: "user", content: text },
      ],
    });

    const translation = response.choices?.[0]?.message?.content?.trim() || "";
    res.status(200).json({ translation });
  } catch (err) {
    console.error("Translation API error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
}

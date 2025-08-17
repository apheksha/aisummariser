import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// --- Helpers ---
function buildGroqPrompt(transcript, customPrompt) {
  const sys = `You are an assistant that produces compact, well-structured meeting summaries. Follow the user's instruction strictly. If no instruction, default to: bullets, key decisions, action items with owners & due dates (if present).`;
  const user = `TRANSCRIPT (verbatim):\n\n${transcript}\n\nINSTRUCTION: ${customPrompt || "Summarize the meeting in concise bullet points. Include action items."}`;
  return { sys, user };
}

// --- Summarize endpoint ---
app.post("/api/summarize", upload.single("file"), async (req, res) => {
  try {
    // Accept either a file upload or raw text
    const fileBuffer = req.file?.buffer;
    const transcriptTextFromFile = fileBuffer ? fileBuffer.toString("utf-8") : "";
    const transcript = (req.body.transcript || "") + (transcriptTextFromFile || "");
    const instruction = req.body.instruction || "";

    if (!transcript.trim()) {
      return res.status(400).json({ error: "No transcript provided" });
    }

    const { sys, user } = buildGroqPrompt(transcript, instruction);

    const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ],
        temperature: 0.2
      })
    });

    if (!groqResp.ok) {
      const t = await groqResp.text();
      return res.status(500).json({ error: `Groq API error: ${t}` });
    }

    const data = await groqResp.json();
    const summary = data?.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});


// --- Email endpoint ---
app.post("/api/email", async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !body) return res.status(400).json({ error: "'to' and 'body' are required" });
  
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE === "true"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
  
      const info = await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to, // can be comma-separated
        subject: subject || "Meeting Summary",
        text: body
      });
  
      res.json({ ok: true, messageId: info.messageId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

// --- Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
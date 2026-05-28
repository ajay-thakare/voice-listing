import OpenAI from "openai";
import { ListingGenerationResult } from "@/types/listing";
import { buildListingPrompt } from "./prompts";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateListing(
  transcript: string,
): Promise<ListingGenerationResult> {
  const prompt = buildListingPrompt(transcript);

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0].message.content;

  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  // Strip markdown code fences if the model wraps JSON in ```json ... ```
  const clean = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim();

  try {
    return JSON.parse(clean) as ListingGenerationResult;
  } catch {
    throw new Error(`Failed to parse Groq response. Raw output: ${text}`);
  }
}

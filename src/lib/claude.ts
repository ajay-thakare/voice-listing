import { ListingGenerationResult } from "@/types/listing";
import { buildListingPrompt } from "./prompts";
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateListing(
  transcript: string,
): Promise<ListingGenerationResult> {
  const prompt = buildListingPrompt(transcript);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const firstBlock = response.content[0];

  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Claude did not return a text response");
  }

  const text = firstBlock.text;

  let parsed: ListingGenerationResult;

  try {
    parsed = JSON.parse(text) as ListingGenerationResult;
  } catch (error) {
    throw new Error(`Failed to parse Claude response. Raw output: ${text}`);
  }

  return parsed;
}

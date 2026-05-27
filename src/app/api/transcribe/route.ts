import { NextResponse } from "next/server";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI();

export async function POST(request: Request) {
  const formData = await request.formData();

  const file = formData.get("audio");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        message: "Audio file is Missing !!!",
      },
      {
        status: 400,
      },
    );
  }

  const languageValue = formData.get("language");
  const language =
    typeof languageValue === "string" && languageValue.length > 0
      ? languageValue
      : "hi";

  const buffer = await file.arrayBuffer();

  const audioFile = new File([buffer], "audio.webm", { type: "audio/webm" });

  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language,
    });

    return NextResponse.json({
      transcript: response.text,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { message: "Audio is invalid, corrupted, or unreadable" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Transcription failed" },
      { status: 500 },
    );
  }
}

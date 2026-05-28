import { NextResponse } from "next/server";
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      : undefined;

  const buffer = await file.arrayBuffer();

  const audioFile = new File([buffer], "audio.webm", { type: "audio/webm" });

  try {
    const response = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      temperature: 0,
      response_format: "verbose_json",
      language,
    });

    return NextResponse.json({
      transcript: response.text,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    if (error instanceof Groq.APIError) {
      return NextResponse.json(
        {
          message: "Whisper API error",
          detail: error.message,
          status: error.status,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Transcription failed" },
      { status: 500 },
    );
  }
}

import { generateListing } from "@/lib/groq";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
  transcript: z.string().min(3, "Transcript too short"),
});

export async function POST(request: Request) {
  // 1. parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  // 2. validate with safeParse → return 400 if invalid
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = z.treeifyError(result.error);
    return NextResponse.json(
      {
        message: "Validation failed",
        errors,
      },
      { status: 400 },
    );
  }

  const data = result.data;
  try {
    // 3. call generateListing → return 500 if it throws
    const listing = await generateListing(data.transcript);

    // 4. return 200 with result
    return NextResponse.json(
      {
        success: true,
        data: listing,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

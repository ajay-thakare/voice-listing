import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import z from "zod";

// schema
const PriceSchema = z.object({
  amount: z.number().nonnegative().nullable(),
  currency: z
    .string()
    .length(3, "Use ISO currency code like USD, INR")
    .uppercase()
    .nullable(),
});

const VariantSchema = z.object({
  color: z.string().trim().nullable(),
  size: z.string().trim().nullable(),
});

const ListingSchema = z.object({
  language: z.string().min(2),
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  hashtags: z
    .array(z.string().regex(/^#?\w+$/, "Invalid hashtag format"))
    .max(30),
  imagePrompts: z
    .array(z.string().trim().min(3))
    .min(1, "At least one image prompt is required"),
  productType: z.string().optional(),
  price: PriceSchema,
  variant: VariantSchema,
  occasion: z.string().trim().nullable(),
});

const InputSchema = z.object({
  rawInput: z.string().trim(),
  listing: ListingSchema,
});

// GET
export async function GET() {
  try {
    const result = await prisma.listing.findMany({
      include: { imagePrompts: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
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

// POST
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const result = InputSchema.safeParse(body);

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

  const { rawInput } = result.data;
  const {
    title,
    language,
    description,
    price,
    variant,
    hashtags,
    imagePrompts,
    occasion,
    productType,
  } = result.data.listing;

  try {
    const savedInDB = await prisma.listing.create({
      data: {
        rawInput,

        title,
        description,
        language,
        productType,
        occasion,
        hashtags,

        imagePrompts: {
          create: imagePrompts.map((prompt) => ({
            prompt,
          })),
        },

        priceAmount: price.amount,
        priceCurrency: price.currency,

        variantColor: variant?.color,
        variantSize: variant?.size,
      },
      include: { imagePrompts: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: savedInDB,
      },
      { status: 201 },
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

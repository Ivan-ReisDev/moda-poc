import { NextRequest, NextResponse } from "next/server";
import { generateClothingImage } from "@/lib/gemini";

export const maxDuration = 60; // Gemini pode demorar

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const clothingImage = formData.get("clothingImage") as File | null;
    const bodyImage = formData.get("bodyImage") as File | null;
    const prompt = formData.get("prompt") as string | null;
    const aspectRatio = (formData.get("aspectRatio") as string) || "3:4";
    const resolution = (formData.get("resolution") as string) || "1K";

    // Medidas
    const measurements = {
      height: (formData.get("height") as string) || undefined,
      weight: (formData.get("weight") as string) || undefined,
      size: (formData.get("size") as string) || undefined,
      bust: (formData.get("bust") as string) || undefined,
      waist: (formData.get("waist") as string) || undefined,
      hips: (formData.get("hips") as string) || undefined,
    };

    // Validações
    if (!clothingImage || !bodyImage) {
      return NextResponse.json(
        { error: "Imagem da roupa e foto do corpo são obrigatórias" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key do Gemini não configurada no servidor" },
        { status: 500 }
      );
    }

    // Converter arquivos para base64
    const clothingBuffer = Buffer.from(await clothingImage.arrayBuffer());
    const bodyBuffer = Buffer.from(await bodyImage.arrayBuffer());

    const clothingBase64 = clothingBuffer.toString("base64");
    const bodyBase64 = bodyBuffer.toString("base64");

    // Gerar imagem
    const result = await generateClothingImage({
      clothingImageBase64: clothingBase64,
      clothingImageMimeType: clothingImage.type || "image/jpeg",
      bodyImageBase64: bodyBase64,
      bodyImageMimeType: bodyImage.type || "image/jpeg",
      measurements,
      prompt: prompt || undefined,
      apiKey,
      aspectRatio,
      resolution,
    });

    // Retornar imagem diretamente
    return new NextResponse(new Uint8Array(result.imageBuffer), {
      headers: {
        "Content-Type": result.mimeType || "image/png",
        "Cache-Control": "no-store",
        "X-Image-Width": String(result.width),
        "X-Image-Height": String(result.height),
      },
    });
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

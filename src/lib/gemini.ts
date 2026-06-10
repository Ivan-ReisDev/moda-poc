import sharp from "sharp";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent";

export interface GenerateImageParams {
  clothingImageBase64: string;
  clothingImageMimeType: string;
  bodyImageBase64: string;
  bodyImageMimeType: string;
  measurements: {
    height?: string;
    weight?: string;
    size?: string;
    bust?: string;
    waist?: string;
    hips?: string;
  };
  prompt?: string;
  apiKey: string;
  aspectRatio?: string;
  resolution?: string;
}

export interface GenerateImageResult {
  imageBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Gera imagem usando Gemini 3.1 Flash Image (Nano Banana 2)
 * A pessoa na foto veste a roupa enviada.
 */
export async function generateClothingImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const {
    clothingImageBase64,
    clothingImageMimeType,
    bodyImageBase64,
    bodyImageMimeType,
    measurements,
    prompt,
    apiKey,
    aspectRatio = "3:4",
    resolution = "1K",
  } = params;

  // Construir prompt em português para moda
  const measurementsText = buildMeasurementsText(measurements);
  const userPrompt = prompt || "Vista esta roupa na pessoa da foto";

  const fullPrompt = `${userPrompt}. ${measurementsText} Mantenha o rosto e corpo da pessoa exatamente como na foto original. Apenas troque/ajuste a roupa para a peça mostrada na imagem da roupa. Resultado fotorealista, iluminação natural, fundo neutro.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: fullPrompt },
          {
            inline_data: {
              mime_type: clothingImageMimeType,
              data: clothingImageBase64,
            },
          },
          {
            inline_data: {
              mime_type: bodyImageMimeType,
              data: bodyImageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      responseFormat: {
        image: {
          aspectRatio: aspectRatio,
          imageSize: resolution,
        },
      },
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extrair imagem da resposta
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Nenhuma parte encontrada na resposta da API");
  }

  let imageBase64: string | null = null;
  let responseMimeType = "image/png";

  for (const part of parts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      responseMimeType = part.inlineData.mimeType || "image/png";
      break;
    }
  }

  if (!imageBase64) {
    throw new Error("Nenhuma imagem encontrada na resposta da API");
  }

  const imageBuffer = Buffer.from(imageBase64, "base64");

  // Aplicar crop centralizado se necessário
  const croppedBuffer = await applyCrop(imageBuffer, aspectRatio);

  const metadata = await sharp(croppedBuffer).metadata();

  return {
    imageBuffer: croppedBuffer,
    mimeType: responseMimeType,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Aplica crop centralizado para garantir o aspect ratio correto
 * Igual ao que é feito no Fawkes
 */
async function applyCrop(
  imageBuffer: Buffer,
  targetAspectRatio: string
): Promise<Buffer> {
  const [w, h] = targetAspectRatio.split(":").map(Number);
  const targetRatio = w / h;

  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 0;
  const imgHeight = metadata.height || 0;

  if (imgWidth === 0 || imgHeight === 0) return imageBuffer;

  const currentRatio = imgWidth / imgHeight;

  // Se já está no ratio correto, retorna como está
  if (Math.abs(currentRatio - targetRatio) < 0.01) {
    return imageBuffer;
  }

  let cropWidth = imgWidth;
  let cropHeight = imgHeight;

  if (currentRatio > targetRatio) {
    // Imagem muito larga — crop horizontal
    cropWidth = Math.round(imgHeight * targetRatio);
  } else {
    // Imagem muito alta — crop vertical
    cropHeight = Math.round(imgWidth / targetRatio);
  }

  const left = Math.round((imgWidth - cropWidth) / 2);
  const top = Math.round((imgHeight - cropHeight) / 2);

  return sharp(imageBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .toBuffer();
}

function buildMeasurementsText(
  measurements: GenerateImageParams["measurements"]
): string {
  const parts: string[] = [];

  if (measurements.height) parts.push(`altura: ${measurements.height}`);
  if (measurements.weight) parts.push(`peso: ${measurements.weight}`);
  if (measurements.size) parts.push(`tamanho: ${measurements.size}`);
  if (measurements.bust) parts.push(`busto: ${measurements.bust}`);
  if (measurements.waist) parts.push(`cintura: ${measurements.waist}`);
  if (measurements.hips) parts.push(`quadril: ${measurements.hips}`);

  if (parts.length === 0) return "";
  return `Medidas da pessoa: ${parts.join(", ")}.`;
}

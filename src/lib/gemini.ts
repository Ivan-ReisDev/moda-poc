import sharp from "sharp";
import type { PersonMeasurements, ClothingMeasurements } from "./types";

const GEMINI_IMAGE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";
const GEMINI_TEXT_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ── Tipos ──────────────────────────────────────────────

export type { PersonMeasurements, ClothingMeasurements } from "./types";

export interface GenerateParams {
  clothingImageBase64: string;
  clothingImageMimeType: string;
  bodyImageBase64: string;
  bodyImageMimeType: string;
  personMeasurements: PersonMeasurements;
  clothingMeasurements: ClothingMeasurements;
  prompt?: string;
  apiKey: string;
  aspectRatio?: string;
  resolution?: string;
}

export interface RecommendationResult {
  text: string;
  recommendedSize: string;
  recommendedImageBase64: string;
  looseImageBase64: string;
  recommendedMimeType: string;
  looseMimeType: string;
}

// ── Medidas pré-preenchidas ────────────────────────────

export const PRESET_MEASUREMENTS = {
  person: {
    height: "1,70m",
    weight: "65kg",
    bust: "92cm",
    waist: "70cm",
    hips: "98cm",
  } as PersonMeasurements,
  clothing: {
    M: {
      size: "M",
      bust: "92cm",
      waist: "72cm",
      hips: "96cm",
      length: "62cm",
      sleeve: "22cm",
      shoulder: "38cm",
    },
    G: {
      size: "G",
      bust: "100cm",
      waist: "80cm",
      hips: "104cm",
      length: "65cm",
      sleeve: "24cm",
      shoulder: "41cm",
    },
  } as Record<string, ClothingMeasurements>,
};

// ── Função principal ───────────────────────────────────

export async function generateRecommendation(
  params: GenerateParams
): Promise<RecommendationResult> {
  const {
    clothingImageBase64,
    clothingImageMimeType,
    bodyImageBase64,
    bodyImageMimeType,
    personMeasurements,
    clothingMeasurements,
    prompt,
    apiKey,
    aspectRatio = "3:4",
    resolution = "1K",
  } = params;

  const personText = buildPersonMeasurementsText(personMeasurements);
  const clothingText = buildClothingMeasurementsText(clothingMeasurements);

  // 1) Recomendação (texto via Gemini Flash)
  const recPrompt = `Você é um consultor de moda especializado em medidas de roupas.

Medidas da pessoa:
${personText}

Medidas da roupa (tamanho ${clothingMeasurements.size}):
${clothingText}

Analise as medidas da pessoa em relação às medidas da roupa e recomende o tamanho ideal (P, M, G, GG, etc). Considere:
- Se a roupa ficará justa, confortável ou folgada
- O tipo de peça baseado na imagem
- Proporções entre busto, cintura e quadril

Responda em português brasileiro, de forma clara e objetiva:
1. Tamanho recomendado
2. Justificativa breve (2-3 frases)
3. Se necessário, sugira um tamanho alternativo mais folgado

Formato: texto puro, sem markdown.`;

  const recText = await callGeminiText(recPrompt, apiKey);
  const recommendedSize = extractRecommendedSize(recText, clothingMeasurements.size || "M");
  const looseSize = getLooserSize(recommendedSize);

  // 2) Foto no tamanho recomendado
  const fitPrompt = prompt
    ? `${prompt}. ${personText} ${clothingText}`
    : `Vista esta roupa na pessoa da foto, ajustando ao corpo de forma natural e justa (tamanho ${recommendedSize}). ${personText} ${clothingText} Mantenha o rosto e corpo da pessoa exatamente como na foto original. Apenas troque/ajuste a roupa para a peça mostrada na imagem da roupa. Resultado fotorealista, iluminação natural, fundo neutro.`;

  const fitImage = await callGeminiImage(
    fitPrompt, clothingImageBase64, clothingImageMimeType,
    bodyImageBase64, bodyImageMimeType, apiKey, aspectRatio, resolution
  );

  // 3) Foto num tamanho mais folgado
  const loosePrompt = `Vista esta roupa na pessoa da foto, de forma mais folgada e confortável (tamanho ${looseSize}). ${personText} ${clothingText} Mantenha o rosto e corpo da pessoa exatamente como na foto original. Apenas troque/ajuste a roupa para a peça mostrada na imagem da roupa. A roupa deve aparecer mais solta no corpo, com tecido sobrando levemente. Resultado fotorealista, iluminação natural, fundo neutro.`;

  const looseImage = await callGeminiImage(
    loosePrompt, clothingImageBase64, clothingImageMimeType,
    bodyImageBase64, bodyImageMimeType, apiKey, aspectRatio, resolution
  );

  return {
    text: recText,
    recommendedSize,
    recommendedImageBase64: fitImage.base64,
    looseImageBase64: looseImage.base64,
    recommendedMimeType: fitImage.mimeType,
    looseMimeType: looseImage.mimeType,
  };
}

// ── Crop centralizado (igual Fawkes) ───────────────────

export async function applyCrop(
  imageBuffer: Buffer,
  targetAspectRatio: string
): Promise<Buffer> {
  const [w, h] = targetAspectRatio.split(":").map(Number);
  const targetRatio = w / h;

  const metadata = await sharp(imageBuffer).metadata();
  const imgW = metadata.width || 0;
  const imgH = metadata.height || 0;
  if (imgW === 0 || imgH === 0) return imageBuffer;

  const currentRatio = imgW / imgH;
  if (Math.abs(currentRatio - targetRatio) < 0.01) return imageBuffer;

  let cropW = imgW;
  let cropH = imgH;
  if (currentRatio > targetRatio) {
    cropW = Math.round(imgH * targetRatio);
  } else {
    cropH = Math.round(imgW / targetRatio);
  }

  const left = Math.round((imgW - cropW) / 2);
  const top = Math.round((imgH - cropH) / 2);

  return sharp(imageBuffer)
    .extract({ left, top, width: cropW, height: cropH })
    .toBuffer();
}

// ── Chamadas à API Gemini ──────────────────────────────

async function callGeminiText(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`${GEMINI_TEXT_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini text error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

interface ImageResult {
  base64: string;
  mimeType: string;
}

async function callGeminiImage(
  prompt: string,
  clothingBase64: string,
  clothingMime: string,
  bodyBase64: string,
  bodyMime: string,
  apiKey: string,
  aspectRatio: string,
  resolution: string
): Promise<ImageResult> {
  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: clothingMime, data: clothingBase64 } },
        { inline_data: { mime_type: bodyMime, data: bodyBase64 } },
      ],
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      responseFormat: { image: { aspectRatio, imageSize: resolution } },
    },
  };

  const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini image error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Sem resposta da API");

  for (const part of parts) {
    if (part.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" };
    }
  }

  throw new Error("Nenhuma imagem na resposta");
}

// ── Helpers ────────────────────────────────────────────

function buildPersonMeasurementsText(m: PersonMeasurements): string {
  const p: string[] = [];
  if (m.height) p.push(`altura ${m.height}`);
  if (m.weight) p.push(`peso ${m.weight}`);
  if (m.bust) p.push(`busto ${m.bust}`);
  if (m.waist) p.push(`cintura ${m.waist}`);
  if (m.hips) p.push(`quadril ${m.hips}`);
  return p.length > 0 ? p.join(", ") : "";
}

function buildClothingMeasurementsText(m: ClothingMeasurements): string {
  const p: string[] = [];
  if (m.bust) p.push(`busto ${m.bust}`);
  if (m.waist) p.push(`cintura ${m.waist}`);
  if (m.hips) p.push(`quadril ${m.hips}`);
  if (m.length) p.push(`comprimento ${m.length}`);
  if (m.sleeve) p.push(`manga ${m.sleeve}`);
  if (m.shoulder) p.push(`ombro ${m.shoulder}`);
  return p.length > 0 ? p.join(", ") : "";
}

function extractRecommendedSize(text: string, fallback: string): string {
  const sizes = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
  const upper = text.toUpperCase();
  for (const s of sizes) {
    if (upper.includes(`TAMANHO ${s}`) || upper.includes(`TAMANHO: ${s}`) || upper.includes(`RECOMENDO ${s}`)) {
      return s;
    }
  }
  return fallback;
}

function getLooserSize(current: string): string {
  const order = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
  const idx = order.indexOf(current.toUpperCase());
  if (idx === -1 || idx >= order.length - 1) return current;
  return order[idx + 1];
}

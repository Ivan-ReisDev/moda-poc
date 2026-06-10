"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  PRESET_MEASUREMENTS,
  type ClothingMeasurements,
  type ClothingSize,
} from "@/lib/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PersonMeasurements {
  height: string;
  weight: string;
  bust: string;
  waist: string;
  hips: string;
}

const ASPECT_RATIOS = [
  { value: "3:4", label: "3:4 (Retrato - Moda)" },
  { value: "9:16", label: "9:16 (Story/Reels)" },
  { value: "1:1", label: "1:1 (Quadrado)" },
  { value: "4:5", label: "4:5 (Instagram)" },
];

const RESOLUTIONS = [
  { value: "512", label: "512 (Rápido)" },
  { value: "1K", label: "1K (Padrão)" },
  { value: "2K", label: "2K (Alta)" },
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Home() {
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [clothingPreview, setClothingPreview] = useState<string | null>(null);
  const [bodyImage, setBodyImage] = useState<File | null>(null);
  const [bodyPreview, setBodyPreview] = useState<string | null>(null);

  const [personMeasurements, setPersonMeasurements] =
    useState<PersonMeasurements>({ ...PRESET_MEASUREMENTS.person });

  const [clothingSize, setClothingSize] = useState<ClothingSize>("M");
  const [clothingMeasurements, setClothingMeasurements] =
    useState<ClothingMeasurements>(PRESET_MEASUREMENTS.clothing.M);

  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [resolution, setResolution] = useState("1K");

  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [recommendedImage, setRecommendedImage] = useState<string | null>(null);
  const [looseImage, setLooseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clothingInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleClothingUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClothingImage(file);
      setClothingPreview(URL.createObjectURL(file));
    }
  };

  const handleBodyUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBodyImage(file);
      setBodyPreview(URL.createObjectURL(file));
    }
  };

  const handlePersonMeasurement = (
    field: keyof PersonMeasurements,
    value: string
  ) => {
    setPersonMeasurements((prev) => ({ ...prev, [field]: value }));
  };

  const handleClothingSizeChange = (size: ClothingSize) => {
    setClothingSize(size);
    setClothingMeasurements(PRESET_MEASUREMENTS.clothing[size]);
  };

  const handleClothingMeasurement = (
    field: keyof ClothingMeasurements,
    value: string
  ) => {
    setClothingMeasurements((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!clothingImage || !bodyImage || !apiKey) {
      setError("Preencha todos os campos obrigatórios (imagens e API Key)");
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendation(null);
    setRecommendedImage(null);
    setLooseImage(null);
    setRecommendedSize(null);

    try {
      setLoadingStep("Analisando medidas e gerando recomendação...");

      const formData = new FormData();
      formData.append("clothingImage", clothingImage);
      formData.append("bodyImage", bodyImage);
      formData.append("apiKey", apiKey);
      formData.append("prompt", prompt);
      formData.append("aspectRatio", aspectRatio);
      formData.append("resolution", resolution);

      Object.entries(personMeasurements).forEach(([key, value]) => {
        if (value) formData.append(`person${capitalize(key)}`, value);
      });

      formData.append("clothingSize", clothingSize);
      Object.entries(clothingMeasurements).forEach(([key, value]) => {
        if (value) formData.append(`clothing${capitalize(key)}`, value);
      });

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      setLoadingStep("Gerando imagens...");

      const data = await response.json();

      setRecommendation(data.recommendation);
      setRecommendedSize(data.recommendedSize);
      setRecommendedImage(
        `data:${data.mimeType};base64,${data.recommendedImage}`
      );
      setLooseImage(`data:${data.mimeType};base64,${data.looseImage}`);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleDownload = (imageSrc: string, filename: string) => {
    if (!imageSrc) return;
    const a = document.createElement("a");
    a.href = imageSrc;
    a.download = filename;
    a.click();
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-provei-gradient flex items-center justify-center text-base sm:text-lg font-bold text-white">
              M
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Moda POC</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Recomendação + Try-on com Gemini
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            POC
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* ── Coluna Esquerda: Inputs ── */}
          <div className="space-y-5">
            {/* API Key */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua Gemini API Key"
                />
              </CardContent>
            </Card>

            {/* Upload de Imagens */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Imagens</CardTitle>
                <CardDescription>
                  Envie a foto da roupa e a foto do corpo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-xs mb-2 block">
                      Imagem da Roupa *
                    </Label>
                    <input
                      ref={clothingInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleClothingUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => clothingInputRef.current?.click()}
                      className={cn(
                        "w-full aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                        clothingPreview
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 bg-muted/20"
                      )}
                    >
                      {clothingPreview ? (
                        <img
                          src={clothingPreview}
                          alt="Roupa"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl">👗</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            Clique para enviar
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">
                      Foto do Corpo *
                    </Label>
                    <input
                      ref={bodyInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBodyUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => bodyInputRef.current?.click()}
                      className={cn(
                        "w-full aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer",
                        bodyPreview
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 bg-muted/20"
                      )}
                    >
                      {bodyPreview ? (
                        <img
                          src={bodyPreview}
                          alt="Corpo"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl">🧍</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            Clique para enviar
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medidas da Pessoa */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Medidas da Pessoa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "height", label: "Altura", ph: "1,70m" },
                      { key: "weight", label: "Peso", ph: "65kg" },
                      { key: "bust", label: "Busto", ph: "92cm" },
                      { key: "waist", label: "Cintura", ph: "70cm" },
                      { key: "hips", label: "Quadril", ph: "98cm" },
                    ] as const
                  ).map(({ key, label, ph }) => (
                    <div key={key}>
                      <Label className="text-xs mb-1 block">{label}</Label>
                      <Input
                        type="text"
                        value={personMeasurements[key]}
                        onChange={(e) =>
                          handlePersonMeasurement(key, e.target.value)
                        }
                        placeholder={ph}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Medidas da Roupa */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Medidas da Roupa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {(["M", "G"] as ClothingSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleClothingSizeChange(size)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                        clothingSize === size
                          ? "bg-provei-gradient text-white shadow-lg shadow-primary/25"
                          : "bg-muted text-muted-foreground border border-border hover:border-muted-foreground/30"
                      )}
                    >
                      Tamanho {size}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-border my-4" />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "bust", label: "Busto" },
                      { key: "waist", label: "Cintura" },
                      { key: "hips", label: "Quadril" },
                      { key: "length", label: "Comprimento" },
                      { key: "sleeve", label: "Manga" },
                      { key: "shoulder", label: "Ombro" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs mb-1 block">{label}</Label>
                      <Input
                        type="text"
                        value={clothingMeasurements[key] || ""}
                        onChange={(e) =>
                          handleClothingMeasurement(key, e.target.value)
                        }
                        placeholder="cm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configurações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((ar) => (
                          <SelectItem key={ar.value} value={ar.value}>
                            {ar.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Resolução</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOLUTIONS.map((res) => (
                          <SelectItem key={res.value} value={res.value}>
                            {res.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prompt */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Prompt (opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva como quer que a roupa apareça..."
                  rows={2}
                />
              </CardContent>
            </Card>

            {/* Botão */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !clothingImage || !bodyImage || !apiKey}
              className="w-full py-6 text-sm font-semibold bg-provei-gradient hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {loadingStep || "Processando..."}
                </span>
              ) : (
                "✨ Analisar e Gerar"
              )}
            </Button>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          {/* ── Coluna Direita: Resultado ── */}
          <div
            ref={resultRef}
            className="lg:sticky lg:top-24 lg:self-start scroll-mt-20 space-y-5"
          >
            {/* Recomendação */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recomendação</CardTitle>
              </CardHeader>
              <CardContent>
                {recommendation ? (
                  <div className="space-y-3">
                    <Badge
                      variant="secondary"
                      className="bg-primary/20 text-primary border-primary/30 font-bold"
                    >
                      Tamanho {recommendedSize}
                    </Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {recommendation}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <span className="text-3xl block mb-2">💡</span>
                    <p className="text-sm">A recomendação aparecerá aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Foto: Tamanho Recomendado */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Tamanho Recomendado ({recommendedSize || "—"})
                  </CardTitle>
                  {recommendedImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary"
                      onClick={() =>
                        handleDownload(
                          recommendedImage,
                          `recomendado-${recommendedSize}.png`
                        )
                      }
                    >
                      Baixar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recommendedImage ? (
                  <div className="rounded-xl overflow-hidden bg-muted/30 border border-border">
                    <img
                      src={recommendedImage}
                      alt="Tamanho recomendado"
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-4xl">🖼️</span>
                    <p className="text-xs">Foto no tamanho ideal</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Foto: Tamanho Folgado */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Tamanho Mais Folgado
                  </CardTitle>
                  {looseImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary"
                      onClick={() =>
                        handleDownload(looseImage, `folgado-${recommendedSize}.png`)
                      }
                    >
                      Baixar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {looseImage ? (
                  <div className="rounded-xl overflow-hidden bg-muted/30 border border-border">
                    <img
                      src={looseImage}
                      alt="Tamanho folgado"
                      className="w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-4xl">🔄</span>
                    <p className="text-xs">Foto no tamanho mais solto</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

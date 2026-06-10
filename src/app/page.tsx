"use client";

import { useState, useRef, ChangeEvent } from "react";
import { PRESET_MEASUREMENTS, type ClothingMeasurements, type ClothingSize } from "@/lib/types";

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

export default function Home() {
  // Imagens
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [clothingPreview, setClothingPreview] = useState<string | null>(null);
  const [bodyImage, setBodyImage] = useState<File | null>(null);
  const [bodyPreview, setBodyPreview] = useState<string | null>(null);

  // Medidas da pessoa
  const [personMeasurements, setPersonMeasurements] = useState<PersonMeasurements>({
    ...PRESET_MEASUREMENTS.person,
  });

  // Medidas da roupa
  const [clothingSize, setClothingSize] = useState<ClothingSize>("M");
  const [clothingMeasurements, setClothingMeasurements] =
    useState<ClothingMeasurements>(PRESET_MEASUREMENTS.clothing.M);

  // Config
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [resolution, setResolution] = useState("1K");

  // Resultado
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

  // Handlers
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

  const handlePersonMeasurement = (field: keyof PersonMeasurements, value: string) => {
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

      // Medidas da pessoa
      Object.entries(personMeasurements).forEach(([key, value]) => {
        if (value) formData.append(`person${capitalize(key)}`, value);
      });

      // Medidas da roupa
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
      setRecommendedImage(`data:${data.mimeType};base64,${data.recommendedImage}`);
      setLooseImage(`data:${data.mimeType};base64,${data.looseImage}`);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-base sm:text-lg font-bold">
              M
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Moda POC</h1>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                Recomendação + Try-on com Gemini
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium border border-violet-500/20">
            POC
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* ── Coluna Esquerda: Inputs ── */}
          <div className="space-y-5">
            {/* API Key */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                🔑 API Key
              </h2>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua Gemini API Key"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
            </section>

            {/* Upload de Imagens */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                📸 Imagens
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-2 block">
                    Imagem da Roupa *
                  </label>
                  <input
                    ref={clothingInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleClothingUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => clothingInputRef.current?.click()}
                    className={`w-full aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                      clothingPreview
                        ? "border-violet-500/50 bg-violet-500/5"
                        : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30"
                    }`}
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
                        <span className="text-[10px] sm:text-xs text-zinc-500">
                          Clique para enviar
                        </span>
                      </>
                    )}
                  </button>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-2 block">
                    Foto do Corpo *
                  </label>
                  <input
                    ref={bodyInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBodyUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => bodyInputRef.current?.click()}
                    className={`w-full aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                      bodyPreview
                        ? "border-fuchsia-500/50 bg-fuchsia-500/5"
                        : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30"
                    }`}
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
                        <span className="text-[10px] sm:text-xs text-zinc-500">
                          Clique para enviar
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Medidas da Pessoa */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                🧍 Medidas da Pessoa
              </h2>
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
                    <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                    <input
                      type="text"
                      value={personMeasurements[key]}
                      onChange={(e) => handlePersonMeasurement(key, e.target.value)}
                      placeholder={ph}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Medidas da Roupa */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                👕 Medidas da Roupa
              </h2>

              {/* Seletor de tamanho */}
              <div className="flex gap-2 mb-4">
                {(["M", "G"] as ClothingSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleClothingSizeChange(size)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      clothingSize === size
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
                        : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    Tamanho {size}
                  </button>
                ))}
              </div>

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
                    <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                    <input
                      type="text"
                      value={clothingMeasurements[key] || ""}
                      onChange={(e) => handleClothingMeasurement(key, e.target.value)}
                      placeholder="cm"
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Configurações */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                ⚙️ Configurações
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-all"
                  >
                    {ASPECT_RATIOS.map((ar) => (
                      <option key={ar.value} value={ar.value}>{ar.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Resolução</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-all"
                  >
                    {RESOLUTIONS.map((res) => (
                      <option key={res.value} value={res.value}>{res.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Prompt */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                ✏️ Prompt (opcional)
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva como quer que a roupa apareça..."
                rows={2}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
              />
            </section>

            {/* Botão */}
            <button
              onClick={handleSubmit}
              disabled={loading || !clothingImage || !bodyImage || !apiKey}
              className={`w-full py-4 rounded-xl font-semibold text-sm transition-all ${
                loading || !clothingImage || !bodyImage || !apiKey
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {loadingStep || "Processando..."}
                </span>
              ) : (
                "✨ Analisar e Gerar"
              )}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}
          </div>

          {/* ── Coluna Direita: Resultado ── */}
          <div ref={resultRef} className="lg:sticky lg:top-24 lg:self-start scroll-mt-20 space-y-5">
            {/* Recomendação */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                💡 Recomendação
              </h2>
              {recommendation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-sm font-bold border border-violet-500/30">
                      Tamanho {recommendedSize}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {recommendation}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-600">
                  <span className="text-3xl block mb-2">💡</span>
                  <p className="text-sm">A recomendação aparecerá aqui</p>
                </div>
              )}
            </section>

            {/* Foto: Tamanho Recomendado */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  ✅ Tamanho Recomendado ({recommendedSize || "—"})
                </h2>
                {recommendedImage && (
                  <button
                    onClick={() => handleDownload(recommendedImage, `recomendado-${recommendedSize}.png`)}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    📥 Baixar
                  </button>
                )}
              </div>
              {recommendedImage ? (
                <div className="rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700">
                  <img src={recommendedImage} alt="Tamanho recomendado" className="w-full h-auto" />
                </div>
              ) : (
                <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-600">
                  <span className="text-4xl">🖼️</span>
                  <p className="text-xs">Foto no tamanho ideal</p>
                </div>
              )}
            </section>

            {/* Foto: Tamanho Folgado */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  🔄 Tamanho Mais Folgado
                </h2>
                {looseImage && (
                  <button
                    onClick={() => handleDownload(looseImage, "folgado.png")}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    📥 Baixar
                  </button>
                )}
              </div>
              {looseImage ? (
                <div className="rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700">
                  <img src={looseImage} alt="Tamanho folgado" className="w-full h-auto" />
                </div>
              ) : (
                <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-600">
                  <span className="text-4xl">🖼️</span>
                  <p className="text-xs">Foto num tamanho mais folgado</p>
                </div>
              )}
            </section>

            {/* Info */}
            <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
              <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-500">Modelo:</strong> gemini-2.5-flash-image (Nano Banana) •{" "}
                <strong className="text-zinc-500">Crop:</strong> centralizado •{" "}
                <strong className="text-zinc-500">Idioma:</strong> pt-BR
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

"use client";

import { useState, useRef, ChangeEvent } from "react";

interface Measurements {
  height: string;
  weight: string;
  size: string;
  bust: string;
  waist: string;
  hips: string;
}

const ASPECT_RATIOS = [
  { value: "3:4", label: "3:4 (Retrato - Moda)" },
  { value: "9:16", label: "9:16 (Story/Reels)" },
  { value: "1:1", label: "1:1 (Quadrado)" },
  { value: "4:5", label: "4:5 (Instagram)" },
  { value: "2:3", label: "2:3 (Retrato)" },
  { value: "16:9", label: "16:9 (Paisagem)" },
];

const RESOLUTIONS = [
  { value: "512", label: "512 (Rápido)" },
  { value: "1K", label: "1K (Padrão)" },
  { value: "2K", label: "2K (Alta)" },
  { value: "4K", label: "4K (Ultra)" },
];

export default function Home() {
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [clothingPreview, setClothingPreview] = useState<string | null>(null);
  const [bodyImage, setBodyImage] = useState<File | null>(null);
  const [bodyPreview, setBodyPreview] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurements>({
    height: "",
    weight: "",
    size: "",
    bust: "",
    waist: "",
    hips: "",
  });
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [resolution, setResolution] = useState("1K");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleMeasurementChange = (field: keyof Measurements, value: string) => {
    setMeasurements((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!clothingImage || !bodyImage) {
      setError("Envie a imagem da roupa e a foto do corpo");
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append("clothingImage", clothingImage);
      formData.append("bodyImage", bodyImage);
      formData.append("prompt", prompt);
      formData.append("aspectRatio", aspectRatio);
      formData.append("resolution", resolution);

      Object.entries(measurements).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setResultImage(imageUrl);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `moda-resultado-${Date.now()}.png`;
    a.click();
  };

  const canGenerate = clothingImage && bodyImage && !loading;

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
              <p className="text-[10px] sm:text-xs text-zinc-500">Gemini 3.1 Flash Image</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium border border-violet-500/20">
              POC
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Coluna Esquerda — Inputs */}
          <div className="space-y-5">
            {/* Upload de Imagens */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                📸 Imagens
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Roupa */}
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

                {/* Corpo */}
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

            {/* Medidas */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                📏 Medidas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "height" as const, label: "Altura", placeholder: "Ex: 1,70m" },
                  { key: "weight" as const, label: "Peso", placeholder: "Ex: 65kg" },
                  { key: "size" as const, label: "Tamanho", placeholder: "Ex: M" },
                  { key: "bust" as const, label: "Busto", placeholder: "Ex: 92cm" },
                  { key: "waist" as const, label: "Cintura", placeholder: "Ex: 70cm" },
                  { key: "hips" as const, label: "Quadril", placeholder: "Ex: 98cm" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-zinc-500 mb-1 block">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={measurements[key]}
                      onChange={(e) =>
                        handleMeasurementChange(key, e.target.value)
                      }
                      placeholder={placeholder}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Configurações */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                ⚙️ Configurações
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-all"
                  >
                    {ASPECT_RATIOS.map((ar) => (
                      <option key={ar.value} value={ar.value}>
                        {ar.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Resolução
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-all"
                  >
                    {RESOLUTIONS.map((res) => (
                      <option key={res.value} value={res.value}>
                        {res.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Prompt */}
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                ✏️ Prompt (opcional)
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva como quer que a roupa apareça. Ex: 'Vista esta roupa na pessoa, ajustando ao corpo de forma natural, iluminação de estúdio, fundo branco neutro'"
                rows={3}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
              />
            </section>

            {/* Botão Gerar */}
            <button
              onClick={handleSubmit}
              disabled={!canGenerate}
              className={`w-full py-4 rounded-xl font-semibold text-sm transition-all ${
                !canGenerate
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              }`}
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
                  Gerando imagem...
                </span>
              ) : (
                "✨ Gerar Imagem"
              )}
            </button>

            {/* Erro */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}
          </div>

          {/* Coluna Direita — Resultado */}
          <div ref={resultRef} className="lg:sticky lg:top-24 lg:self-start scroll-mt-20">
            <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                🖼️ Resultado
              </h2>

              {resultImage ? (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700">
                    <img
                      src={resultImage}
                      alt="Resultado"
                      className="w-full h-auto"
                    />
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-all border border-zinc-700"
                  >
                    📥 Baixar Imagem
                  </button>
                </div>
              ) : (
                <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-3 text-zinc-600">
                  <span className="text-4xl sm:text-5xl">🖼️</span>
                  <p className="text-sm text-center">
                    A imagem gerada aparecerá aqui
                  </p>
                  <p className="text-xs text-zinc-700 text-center max-w-xs">
                    Envie as imagens, preencha as medidas e clique em Gerar
                  </p>
                </div>
              )}
            </section>

            {/* Info */}
            <div className="mt-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-500">Modelo:</strong> gemini-3.1-flash-image
                (Nano Banana 2) • <strong className="text-zinc-500">Crop:</strong>{" "}
                centralizado automático • <strong className="text-zinc-500">Idioma:</strong>{" "}
                pt-BR
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

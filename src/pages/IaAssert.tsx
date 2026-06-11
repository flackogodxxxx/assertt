import { useState, useRef, useEffect } from "react";
import { Brain, Sparkles, UploadCloud, Copy, RefreshCcw, CheckCircle2, AlertTriangle, Instagram, Video, Image as ImageIcon, MessageSquare, Type } from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { callGeminiJson, getDefaultGeminiModel } from "../lib/gemini";
import {
  buildCopyPrompt,
  buildProofreadingPrompt,
  buildTranscriptionPrompt
} from "../lib/ia-prompts";
import { Link, useSearchParams } from "react-router-dom";

type TabMode = 'legenda' | 'copy';
type Platform = 'instagram' | 'tiktok';

interface GeminiResponse {
  transcription?: string;
  hooks?: string[];
  caption?: string;
  hashtags?: string[];
  status?: string;
  extractedText?: string;
  corrections?: Array<
    | string
    | {
        original: string;
        suggestion: string;
        category: string;
        explanation: string;
      }
  >;
  angle?: string;
  warnings?: string[];
  unreadableSegments?: string[];
  uncertainSegments?: string[];
}

export function IaAssert() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const operationalContext = {
    briefing: searchParams.get("briefing") || "",
    client: searchParams.get("client") || "",
    demandId: searchParams.get("demandId") || "",
    title: searchParams.get("title") || "",
    type: searchParams.get("type") || ""
  };
  
  const [activeTab, setActiveTab] = useState<TabMode>('legenda');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [generateHooks, setGenerateHooks] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [result, setResult] = useState<GeminiResponse | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem("assert_ia_last_result");
    if (savedData) {
      try {
        const { data, timestamp } = JSON.parse(savedData);
        if (Date.now() - timestamp < 3600000) {
          setResult(data);
        } else {
          localStorage.removeItem("assert_ia_last_result");
        }
      } catch (e) {
        localStorage.removeItem("assert_ia_last_result");
      }
    }
  }, []);

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-carbon-400">Você precisa estar logado para acessar esta página.</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setError(null);
    setResult(null);

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedFile.size > maxSize) {
      setError("O arquivo é muito grande. O limite máximo é de 20MB para garantir a estabilidade do navegador.");
      return;
    }

    setFile(selectedFile);
    await callIaAutomation(selectedFile);
  };

  const getPromptAndModel = (mimeType: string) => {
    const isImage = mimeType.startsWith("image/");
    const contextBlock = operationalContext.client
      ? `\n\nCONTEXTO OPERACIONAL FORNECIDO PELO CRM:\nCliente: ${operationalContext.client}\nDemanda: ${operationalContext.title || "não informada"}\nTipo: ${operationalContext.type || "não informado"}\nBriefing: ${operationalContext.briefing || "não informado"}\nUse este contexto apenas quando for compatível com o conteúdo real do arquivo.`
      : "";
    
    if (activeTab === 'copy') {
      const prompt = buildCopyPrompt(platform);
      return { ...prompt, prompt: `${prompt.prompt}${contextBlock}`, model: getDefaultGeminiModel() };
    }

    if (isImage) {
      const prompt = buildProofreadingPrompt();
      return { ...prompt, prompt: `${prompt.prompt}${contextBlock}`, model: getDefaultGeminiModel() };
    }

    const prompt = buildTranscriptionPrompt(generateHooks);
    return { ...prompt, prompt: `${prompt.prompt}${contextBlock}`, model: getDefaultGeminiModel() };
  };

  const callIaAutomation = async (targetFile: File) => {
    setIsGenerating(true);
    setError(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(targetFile);
      });

      const { model, systemInstruction, prompt } = getPromptAndModel(targetFile.type);

      const parsedData = await callGeminiJson<GeminiResponse>({
        filePart: {
          data: base64Data,
          mimeType: targetFile.type
        },
        model,
        prompt,
        systemInstruction
      });
      setResult(parsedData);
      localStorage.setItem("assert_ia_last_result", JSON.stringify({ data: parsedData, timestamp: Date.now() }));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao processar o arquivo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const resetAll = () => {
    setFile(null);
    setResult(null);
    localStorage.removeItem("assert_ia_last_result");
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[92rem] flex-col p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col gap-5 border-b border-glass-stroke pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-carbon-500">Estação criativa</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-carbon-50 sm:text-3xl">
            <Brain className="size-7 text-assert-400" />
            IA <span className="text-assert-400">ASSERT</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-carbon-300">
            Transcrição fiel, revisão de português e copys adaptadas à linguagem de cada plataforma.
          </p>
        </div>

        {/* Tab Selector */}
        {!result && !isGenerating && (
          <div aria-label="Modo da IA" className="flex rounded-card border border-glass-stroke bg-carbon-950/55 p-1" role="tablist">
            <button
              aria-selected={activeTab === 'legenda'}
              onClick={() => setActiveTab('legenda')}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded px-4 text-sm font-bold transition-all",
                activeTab === 'legenda' ? "bg-assert-400 text-carbon-950" : "text-carbon-400 hover:text-carbon-200"
              )}
              role="tab"
            >
              <Type className="size-4" /> Legenda & Revisão
            </button>
            <button
              aria-selected={activeTab === 'copy'}
              onClick={() => setActiveTab('copy')}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded px-4 text-sm font-bold transition-all",
                activeTab === 'copy' ? "bg-assert-400 text-carbon-950" : "text-carbon-400 hover:text-carbon-200"
              )}
              role="tab"
            >
              <MessageSquare className="size-4" /> Copywriter
            </button>
          </div>
        )}
      </div>

      {operationalContext.client && (
        <section className="mb-6 border border-accent-300/20 bg-accent-400/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-accent-300">Contexto do CRM</p>
              <p className="mt-1 text-sm font-bold text-carbon-100">
                {operationalContext.client}
                {operationalContext.title ? ` · ${operationalContext.title}` : ""}
              </p>
              {operationalContext.briefing && (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-carbon-400">
                  {operationalContext.briefing}
                </p>
              )}
            </div>
            {operationalContext.demandId && (
              <Link
                className="inline-flex min-h-10 items-center justify-center border border-accent-300/25 px-3 text-xs font-bold text-accent-300"
                to={`/crm/demandas/${operationalContext.demandId}`}
              >
                Voltar à demanda
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="flex-1 overflow-y-auto">
        {!result && !isGenerating && (
          <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
            
            {/* Options based on Tab */}
            {activeTab === 'legenda' && (
              <aside className="flex h-fit items-center justify-between rounded-card border border-glass-stroke bg-carbon-900/45 p-4 lg:block">
                <div>
                  <h3 className="font-bold text-carbon-50">Gerar Hooks de Capa</h3>
                  <p className="mt-1 text-sm leading-5 text-carbon-400">Cinco ângulos honestos e distintos baseados no conteúdo.</p>
                </div>
                <button 
                  aria-label="Gerar hooks de capa"
                  aria-pressed={generateHooks}
                  onClick={() => setGenerateHooks(!generateHooks)}
                  className={cn(
                    "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors lg:mt-5",
                    generateHooks ? "bg-assert-400" : "bg-carbon-800"
                  )}
                >
                  <span className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                    generateHooks ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </aside>
            )}

            {activeTab === 'copy' && (
              <aside className="h-fit rounded-card border border-glass-stroke bg-carbon-900/45 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-carbon-500">Plataforma</p>
                <div className="grid gap-2">
                <button
                  onClick={() => setPlatform('instagram')}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded border px-4 transition-all",
                    platform === 'instagram' ? "border-assert-400 bg-assert-400/10 text-assert-400" : "border-glass-stroke bg-glass text-carbon-400 hover:text-carbon-200"
                  )}
                >
                  <Instagram className="size-6" />
                  <span className="font-bold">Instagram</span>
                </button>
                <button
                  onClick={() => setPlatform('tiktok')}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded border px-4 transition-all",
                    platform === 'tiktok' ? "border-assert-400 bg-assert-400/10 text-assert-400" : "border-glass-stroke bg-glass text-carbon-400 hover:text-carbon-200"
                  )}
                >
                  <Video className="size-6" />
                  <span className="font-bold">TikTok</span>
                </button>
                </div>
                <p className="mt-4 text-xs leading-5 text-carbon-500">
                  A copy usa apenas informações verificáveis na mídia e evita promessas genéricas.
                </p>
              </aside>
            )}

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Enviar arquivo para a IA"
              className={cn(
                "group relative flex min-h-[28rem] cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-8 transition-all duration-300 sm:p-12",
                isDragging 
                  ? "border-assert-400 bg-assert-400/5" 
                  : "border-carbon-800 bg-glass hover:border-carbon-700 hover:bg-carbon-900/50"
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept={activeTab === 'copy' ? "image/*,video/*" : "image/*,video/*,audio/*"}
              />
              
              <div className="mb-6 grid size-16 place-items-center rounded-card border border-assert-300/25 bg-assert-500/10 text-assert-300 transition-transform group-hover:scale-105">
                <UploadCloud className="size-8" />
              </div>

              <h3 className="mb-2 text-center text-xl font-bold text-carbon-50 sm:text-2xl">
                {activeTab === 'legenda' ? "Solte seu arquivo aqui" : "Solte sua arte ou vídeo"}
              </h3>
              <p className="max-w-md text-center text-carbon-400">
                {activeTab === 'legenda' 
                  ? "Arraste um vídeo/áudio para legendar, ou uma imagem para correção ortográfica."
                  : "Arraste o material e deixe a IA criar a copy viral perfeita."}
              </p>
              
              <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs font-medium text-carbon-500">
                <span className="flex items-center gap-1 rounded border border-carbon-800 bg-carbon-900 px-3 py-1"><Video className="size-3" /> MP4/MP3</span>
                <span className="flex items-center gap-1 rounded border border-carbon-800 bg-carbon-900 px-3 py-1"><ImageIcon className="size-3" /> JPG/PNG</span>
                <span className="rounded border border-carbon-800 bg-carbon-900 px-3 py-1">Até 20MB</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-card border border-red-500/20 bg-red-500/10 p-4 text-red-400 lg:col-start-2" role="status">
                <AlertTriangle className="size-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="flex h-64 flex-col items-center justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-assert-400/20" />
              <Brain className="size-12 animate-pulse text-assert-400" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-carbon-50">A IA está pensando...</h3>
            <p className="mt-2 text-carbon-400">Isso leva apenas alguns segundos.</p>
          </div>
        )}

        {result && !isGenerating && (
          <div className="mx-auto max-w-4xl animate-in slide-in-from-bottom-4">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-carbon-50">Resultado Gerado</h2>
              <button
                onClick={resetAll}
                className="flex items-center gap-2 rounded-full border border-glass-stroke bg-carbon-900 px-5 py-2.5 text-sm font-bold text-carbon-300 transition-all hover:bg-carbon-800 hover:text-carbon-50"
              >
                <RefreshCcw className="size-4" /> Novo Arquivo
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
              
              {/* Hooks (If any) */}
              {result.hooks && result.hooks.length > 0 && (
                <div className="md:col-span-12 flex flex-col gap-4 rounded-card border border-glass-stroke bg-glass p-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-6 text-assert-400" />
                    <h3 className="text-xl font-bold text-carbon-50">Hooks Virais Recomendados</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3 mt-2">
                    {result.hooks.map((hook, i) => (
                      <div key={i} className="group relative flex flex-col justify-between rounded-card bg-carbon-900/50 p-5 border border-carbon-800">
                        <p className="text-lg font-medium text-carbon-100">{hook}</p>
                        <button
                          onClick={() => handleCopy(hook, `hook-${i}`)}
                          className="mt-4 self-end text-carbon-400 hover:text-assert-400 transition-colors"
                        >
                          {copiedStates[`hook-${i}`] ? <CheckCircle2 className="size-5 text-assert-400" /> : <Copy className="size-5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcription */}
              {result.transcription && (
                <div className="md:col-span-12 flex flex-col rounded-card border border-glass-stroke bg-glass">
                  <div className="flex items-center justify-between border-b border-glass-stroke p-6">
                    <div className="flex items-center gap-3">
                      <Type className="size-6 text-assert-400" />
                      <h3 className="text-xl font-bold text-carbon-50">Legenda Fatiada</h3>
                    </div>
                    <button
                      onClick={() => handleCopy(result.transcription!, 'transcription')}
                      className="flex items-center gap-2 rounded-lg bg-carbon-800 px-4 py-2 text-sm font-bold text-carbon-200 hover:bg-carbon-700"
                    >
                      {copiedStates['transcription'] ? (
                        <><CheckCircle2 className="size-4 text-assert-400" /> Copiado</>
                      ) : (
                        <><Copy className="size-4" /> Copiar Tudo</>
                      )}
                    </button>
                  </div>
                  <div className="p-8">
                    <pre className="whitespace-pre-wrap font-sans text-lg font-medium leading-relaxed text-carbon-200">
                      {result.transcription}
                    </pre>
                  </div>
                </div>
              )}

              {/* Copy & Hashtags */}
              {result.caption && (
                <div className="md:col-span-8 flex flex-col rounded-card border border-glass-stroke bg-glass">
                  <div className="flex items-center justify-between border-b border-glass-stroke p-6">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="size-6 text-assert-400" />
                      <h3 className="text-xl font-bold text-carbon-50">Copy do Post</h3>
                    </div>
                    <button
                      onClick={() => handleCopy(result.caption!, 'caption')}
                      className="flex items-center gap-2 rounded-lg bg-carbon-800 px-4 py-2 text-sm font-bold text-carbon-200 hover:bg-carbon-700"
                    >
                      {copiedStates['caption'] ? <CheckCircle2 className="size-4 text-assert-400" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                  <div className="p-8">
                    <pre className="whitespace-pre-wrap font-sans text-lg font-medium leading-relaxed text-carbon-200">
                      {result.caption}
                    </pre>
                  </div>
                </div>
              )}

              {result.hashtags && (
                <div className="md:col-span-4 flex flex-col rounded-card border border-glass-stroke bg-glass">
                  <div className="flex items-center justify-between border-b border-glass-stroke p-6">
                    <h3 className="text-lg font-bold text-carbon-50">Hashtags</h3>
                    <button
                      onClick={() => handleCopy(result.hashtags!.join(' '), 'hashtags')}
                      className="text-carbon-400 hover:text-assert-400"
                    >
                      {copiedStates['hashtags'] ? <CheckCircle2 className="size-5 text-assert-400" /> : <Copy className="size-5" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-6">
                    {result.hashtags.map((tag, i) => (
                      <span key={i} className="rounded-full bg-assert-400/10 px-3 py-1 text-sm font-medium text-assert-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(result.angle || result.warnings?.length || result.uncertainSegments?.length) && (
                <div className="md:col-span-12 grid gap-4 rounded-card border border-glass-stroke bg-carbon-950/35 p-5 md:grid-cols-2">
                  {result.angle && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-carbon-500">Ângulo estratégico</p>
                      <p className="mt-2 text-sm leading-6 text-carbon-200">{result.angle}</p>
                    </div>
                  )}
                  {(result.warnings?.length || result.uncertainSegments?.length) && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-carbon-500">Pontos de atenção</p>
                      <ul className="mt-2 space-y-2 text-sm text-carbon-300">
                        {[...(result.warnings || []), ...(result.uncertainSegments || [])].map((warning, index) => (
                          <li className="flex gap-2" key={`${warning}-${index}`}>
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Spelling Corrections (Image) */}
              {(result.extractedText || result.corrections || result.unreadableSegments) && (
                <div className="md:col-span-12 flex flex-col rounded-card border border-glass-stroke bg-glass">
                  <div className="flex items-center justify-between border-b border-glass-stroke p-6">
                    <div className="flex items-center gap-3">
                      {result.status === "APPROVED" ? (
                        <CheckCircle2 className="size-6 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="size-6 text-amber-400" />
                      )}
                      <h3 className="text-xl font-bold text-carbon-50">Revisão Ortográfica</h3>
                    </div>
                  </div>
                  <div className="p-8">
                    {result.status === "APPROVED" ? (
                      <p className="text-lg text-emerald-400 font-medium">Arte aprovada. Nenhum erro de português encontrado.</p>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-lg text-amber-400 font-medium">Erros encontrados:</p>
                        <ul className="list-inside list-disc space-y-2 text-carbon-200">
                          {result.corrections?.map((correction, i) => (
                            <li key={i}>
                              {typeof correction === "string" ? (
                                correction
                              ) : (
                                <span>
                                  <strong className="text-carbon-50">{correction.original}</strong>
                                  {" → "}
                                  <strong className="text-signal-300">{correction.suggestion}</strong>
                                  <span className="ml-2 text-carbon-400">
                                    ({correction.category}) {correction.explanation}
                                  </span>
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.extractedText && (
                      <div className="mt-8 rounded-xl bg-carbon-900/50 p-6 border border-carbon-800">
                        <p className="text-sm font-bold text-carbon-400 mb-2">Texto Extraído da Imagem:</p>
                        <p className="text-carbon-300 text-sm leading-relaxed">{result.extractedText}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

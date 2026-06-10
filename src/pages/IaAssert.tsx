import { useState, useRef, useEffect } from "react";
import { Brain, Sparkles, UploadCloud, Copy, RefreshCcw, CheckCircle2, AlertTriangle, Instagram, Video, Image as ImageIcon, MessageSquare, Type } from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { callGeminiJson, getDefaultGeminiModel } from "../lib/gemini";

type TabMode = 'legenda' | 'copy';
type Platform = 'instagram' | 'tiktok';

interface GeminiResponse {
  transcription?: string;
  hooks?: string[];
  caption?: string;
  hashtags?: string[];
  status?: string;
  extractedText?: string;
  corrections?: string[];
}

export function IaAssert() {
  const { user } = useAuth();
  
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

  if (!user || (user.role !== "Video Maker" && user.role !== "Admin")) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-carbon-400">Você não tem permissão para acessar esta página.</p>
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
    
    if (activeTab === 'copy') {
      return {
        model: getDefaultGeminiModel(),
        systemInstruction: "I want you to act as a viral Social Media Manager for a high-end agency.",
        prompt: `Analyze the provided media. Write a caption for ${platform.toUpperCase()}.\n\nIF PLATFORM = TIKTOK:\n- Very short, punchy, curiosity-driven.\n- Max 2 paragraphs.\n- 3 highly targeted hashtags.\n\nIF PLATFORM = INSTAGRAM:\n- Engaging storytelling format.\n- Use bullet points if applicable.\n- Strong Call to Action (CTA).\n- 5 targeted hashtags.\n\n[CONSTRAINTS]\nDo not write explanations. Reply ONLY with valid JSON exactly in this format:\n{\n  "caption": "The full copy text with emojis",\n  "hashtags": ["#tag1", "#tag2"]\n}`
      };
    }

    if (isImage) {
      return {
        model: getDefaultGeminiModel(),
        systemInstruction: "I want you to act as a strict Portuguese Language Proofreader (Revisor Ortográfico).",
        prompt: "Step 1: Read all text visible in the image.\nStep 2: Analyze the text strictly for spelling, grammar, and agreement errors (ortografia e concordância) in Brazilian Portuguese.\nStep 3: If errors are found, list exactly where they are and how to fix them.\n\n[CONSTRAINTS]\nDo not write explanations about the design. Focus ONLY on the text correctness. Output strictly in JSON:\n{\n  \"status\": \"APPROVED\" | \"ERRORS_FOUND\",\n  \"extractedText\": \"...\",\n  \"corrections\": [\"Erro X -> Correto Y\"]\n}"
      };
    }

    // Default Audio/Video Legenda
    const model = getDefaultGeminiModel();
    const hookInstruction = generateHooks ? "4. Generate 3 highly viral, click-bait (but honest) Hook titles based on the content." : "Do NOT generate hooks.";
    const jsonExample = generateHooks ? `{\n  "transcription": "line1\\n\\nline2",\n  "hooks": ["hook1", "hook2", "hook3"]\n}` : `{\n  "transcription": "line1\\n\\nline2"\n}`;

    return {
      model,
      systemInstruction: "I want you to act as an elite Video Editor and viral Copywriter. Your sole purpose is to transcribe audio verbatim and optionally write high-converting hooks.",
      prompt: `1. Transcribe the provided audio precisely.\n2. Break the transcription into extremely short blocks (max 5-7 words per line) like TikTok/CapCut captions. Leave a blank line between blocks.\n3. Correct grammar without changing the meaning. Fix slangs ONLY for 'pra', 'cê', 'tá', 'tô'. Remove pure hesitation sounds ('uh', 'ah').\n${hookInstruction}\n\n[CONSTRAINTS]\nDo not write explanations. Output ONLY valid JSON in the exact format:\n${jsonExample}`
    };
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
    <div className="flex h-full flex-col p-6 lg:p-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-carbon-50">
            <Brain className="size-8 text-assert-400" />
            IA <span className="text-assert-400">ASSERT</span>
          </h1>
          <p className="mt-2 text-carbon-300">
            O cérebro criativo da agência. Legendas, copys e revisão impulsionados por IA.
          </p>
        </div>

        {/* Tab Selector */}
        {!result && !isGenerating && (
          <div className="flex rounded-full border border-glass-stroke bg-carbon-900/50 p-1">
            <button
              onClick={() => setActiveTab('legenda')}
              className={cn(
                "flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all",
                activeTab === 'legenda' ? "bg-assert-400 text-carbon-950" : "text-carbon-400 hover:text-carbon-200"
              )}
            >
              <Type className="size-4" /> Legenda & Revisão
            </button>
            <button
              onClick={() => setActiveTab('copy')}
              className={cn(
                "flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all",
                activeTab === 'copy' ? "bg-assert-400 text-carbon-950" : "text-carbon-400 hover:text-carbon-200"
              )}
            >
              <MessageSquare className="size-4" /> Copywriter
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {!result && !isGenerating && (
          <div className="mx-auto max-w-3xl space-y-6">
            
            {/* Options based on Tab */}
            {activeTab === 'legenda' && (
              <div className="flex items-center justify-between rounded-2xl border border-glass-stroke bg-glass px-6 py-4">
                <div>
                  <h3 className="font-bold text-carbon-50">Gerar Hooks de Capa</h3>
                  <p className="text-sm text-carbon-400">A IA vai sugerir 3 títulos virais além da legenda.</p>
                </div>
                <button 
                  onClick={() => setGenerateHooks(!generateHooks)}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                    generateHooks ? "bg-assert-400" : "bg-carbon-800"
                  )}
                >
                  <span className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                    generateHooks ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>
            )}

            {activeTab === 'copy' && (
              <div className="flex gap-4">
                <button
                  onClick={() => setPlatform('instagram')}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-3 rounded-2xl border p-4 transition-all",
                    platform === 'instagram' ? "border-assert-400 bg-assert-400/10 text-assert-400" : "border-glass-stroke bg-glass text-carbon-400 hover:text-carbon-200"
                  )}
                >
                  <Instagram className="size-6" />
                  <span className="font-bold">Instagram</span>
                </button>
                <button
                  onClick={() => setPlatform('tiktok')}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-3 rounded-2xl border p-4 transition-all",
                    platform === 'tiktok' ? "border-assert-400 bg-assert-400/10 text-assert-400" : "border-glass-stroke bg-glass text-carbon-400 hover:text-carbon-200"
                  )}
                >
                  <Video className="size-6" />
                  <span className="font-bold">TikTok</span>
                </button>
              </div>
            )}

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-16 transition-all duration-300",
                isDragging 
                  ? "border-assert-400 bg-assert-400/5" 
                  : "border-carbon-800 bg-glass hover:border-carbon-700 hover:bg-carbon-900/50"
              )}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept={activeTab === 'copy' ? "image/*,video/*" : "image/*,video/*,audio/*"}
              />
              
              <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-carbon-900 shadow-xl transition-transform group-hover:scale-110">
                <div className="absolute inset-0 rounded-full bg-assert-400/20 blur-xl" />
                {activeTab === 'legenda' ? <Type className="size-10 text-assert-400" /> : <MessageSquare className="size-10 text-assert-400" />}
              </div>

              <h3 className="mb-2 text-2xl font-bold text-carbon-50">
                {activeTab === 'legenda' ? "Solte seu arquivo aqui" : "Solte sua arte ou vídeo"}
              </h3>
              <p className="max-w-md text-center text-carbon-400">
                {activeTab === 'legenda' 
                  ? "Arraste um vídeo/áudio para legendar, ou uma imagem para correção ortográfica."
                  : "Arraste o material e deixe a IA criar a copy viral perfeita."}
              </p>
              
              <div className="mt-8 flex gap-4 text-xs font-medium text-carbon-500">
                <span className="flex items-center gap-1 rounded-full bg-carbon-900 px-3 py-1"><Video className="size-3" /> MP4/MP3</span>
                <span className="flex items-center gap-1 rounded-full bg-carbon-900 px-3 py-1"><ImageIcon className="size-3" /> JPG/PNG</span>
                <span className="flex items-center gap-1 rounded-full bg-carbon-900 px-3 py-1">Até 20MB</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
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
                <div className="md:col-span-12 flex flex-col gap-4 rounded-3xl border border-glass-stroke bg-glass p-8">
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-6 text-assert-400" />
                    <h3 className="text-xl font-bold text-carbon-50">Hooks Virais Recomendados</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3 mt-2">
                    {result.hooks.map((hook, i) => (
                      <div key={i} className="group relative flex flex-col justify-between rounded-2xl bg-carbon-900/50 p-5 border border-carbon-800">
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
                <div className="md:col-span-12 flex flex-col rounded-3xl border border-glass-stroke bg-glass">
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
                <div className="md:col-span-8 flex flex-col rounded-3xl border border-glass-stroke bg-glass">
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
                <div className="md:col-span-4 flex flex-col rounded-3xl border border-glass-stroke bg-glass">
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

              {/* Spelling Corrections (Image) */}
              {result.status && (
                <div className="md:col-span-12 flex flex-col rounded-3xl border border-glass-stroke bg-glass">
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
                          {result.corrections?.map((c, i) => (
                            <li key={i}>{c}</li>
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

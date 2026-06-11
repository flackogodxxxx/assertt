import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  ImagePlus,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipBack,
  SkipForward,
  X
} from "lucide-react";
import type { Comment, ReferenceImage } from "../contexts/DemandContext";
import { USERS_DB, getGlobalAvatar } from "../contexts/AuthContext";
import {
  clampMediaTime,
  createCorrectionRange,
  formatMediaTime,
  parseMediaTime
} from "../lib/media-review";
import {
  createReferenceSignedUrl,
  uploadReferenceImages,
  validateReferenceImage
} from "../lib/qc-reference-storage";

interface VideoReviewPlayerProps {
  comments: Comment[];
  demandId: string;
  onAddComment: (
    text: string,
    timestamp: string,
    endTimestamp?: string,
    referenceImages?: ReferenceImage[]
  ) => void;
  onSendCorrections?: () => void;
  showSubmitAction?: boolean;
  videoUrl: string;
}

function ReferenceGallery({ images }: { images: ReferenceImage[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    Promise.all(
      images.map(async (image) => [
        image.id,
        image.signedUrl || await createReferenceSignedUrl(image.path)
      ] as const)
    ).then((entries) => {
      if (active) setUrls(Object.fromEntries(entries));
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [images]);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((image) => (
        <a
          className="group overflow-hidden rounded-card border border-carbon-800 bg-carbon-950/70"
          href={urls[image.id]}
          key={image.id}
          rel="noreferrer"
          target="_blank"
          title={`Abrir referência ${image.name}`}
        >
          {urls[image.id] ? (
            <img alt={image.name} className="aspect-video w-full object-cover transition group-hover:scale-105" src={urls[image.id]} />
          ) : (
            <span className="grid aspect-video place-items-center text-xs text-carbon-500">Carregando</span>
          )}
          <span className="block truncate px-2 py-1.5 text-[0.65rem] font-semibold text-carbon-400">{image.name}</span>
        </a>
      ))}
    </div>
  );
}

export function VideoReviewPlayer({
  comments,
  demandId,
  onAddComment,
  onSendCorrections,
  showSubmitAction = true,
  videoUrl
}: VideoReviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [newComment, setNewComment] = useState("");
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const previews = useMemo(
    () => referenceFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [referenceFiles]
  );

  useEffect(() => () => {
    previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [previews]);

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = clampMediaTime(time, video.duration || duration);
    video.pause();
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).matches("input, textarea, select, button")) return;
    if (event.code === "Space") {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekTo(currentTime - (event.shiftKey ? 1 / 30 : 5));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seekTo(currentTime + (event.shiftKey ? 1 / 30 : 5));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setUploadError("");
    const nextFiles = Array.from(files).slice(0, 6);
    const invalid = nextFiles.map(validateReferenceImage).find(Boolean);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setReferenceFiles((current) => [...current, ...nextFiles].slice(0, 6));
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsUploading(true);
    setUploadError("");

    try {
      const commentId = `cmt-${Date.now()}`;
      const range = createCorrectionRange(inPoint ?? currentTime, outPoint ?? undefined);
      const images = referenceFiles.length
        ? await uploadReferenceImages(demandId, commentId, referenceFiles)
        : [];
      onAddComment(newComment.trim(), range.timestamp, range.endTimestamp, images);
      setNewComment("");
      setInPoint(null);
      setOutPoint(null);
      setReferenceFiles([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível anexar as referências.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      aria-label="Revisor de vídeo"
      className="grid w-full gap-5 outline-none lg:grid-cols-[minmax(18rem,0.85fr)_minmax(22rem,1.15fr)]"
      onKeyDown={handleKeyboard}
      tabIndex={0}
    >
      <div className="min-w-0">
        <div className="group relative mx-auto aspect-[9/16] max-h-[56vh] w-full max-w-[20rem] overflow-hidden rounded-card border border-carbon-800 bg-black shadow-panel">
          <video
            className="size-full object-contain"
            onClick={() => void togglePlay()}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (video) setDuration(video.duration);
            }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            ref={videoRef}
            src={videoUrl}
          />
          <button
            aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
            className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full border border-white/15 bg-black/55 text-white opacity-0 backdrop-blur transition hover:scale-105 focus:opacity-100 group-hover:opacity-100"
            onClick={() => void togglePlay()}
            type="button"
          >
            {isPlaying ? <Pause className="size-6" /> : <Play className="ml-1 size-6" />}
          </button>
        </div>

        <div className="mt-4 rounded-card border border-carbon-800 bg-carbon-950/65 p-3">
          <input
            aria-label="Posição do vídeo"
            className="w-full accent-[var(--color-assert-400)]"
            max={duration || 0}
            min={0}
            onChange={(event) => seekTo(Number(event.target.value))}
            step={0.001}
            type="range"
            value={currentTime}
          />
          <div className="mt-2 flex items-center justify-between font-mono text-xs text-carbon-400">
            <span>{formatMediaTime(currentTime)}</span>
            <span>{formatMediaTime(duration)}</span>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            <button aria-label="Voltar 5 segundos" className="grid min-h-10 place-items-center rounded border border-carbon-800 bg-carbon-900 text-carbon-200 hover:border-assert-300/40 hover:text-assert-300" onClick={() => seekTo(currentTime - 5)} title="Voltar 5 segundos" type="button">
              <SkipBack className="size-4" />
            </button>
            <button aria-label="Voltar um quadro" className="grid min-h-10 place-items-center rounded border border-carbon-800 bg-carbon-900 text-carbon-200 hover:border-assert-300/40 hover:text-assert-300" onClick={() => seekTo(currentTime - 1 / 30)} title="Voltar um quadro" type="button">
              <ChevronLeft className="size-4" />
            </button>
            <button aria-label={isPlaying ? "Pausar" : "Reproduzir"} className="grid min-h-10 place-items-center rounded border border-carbon-800 bg-carbon-900 text-carbon-200 hover:border-assert-300/40 hover:text-assert-300" onClick={() => void togglePlay()} type="button">
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button aria-label="Avançar um quadro" className="grid min-h-10 place-items-center rounded border border-carbon-800 bg-carbon-900 text-carbon-200 hover:border-assert-300/40 hover:text-assert-300" onClick={() => seekTo(currentTime + 1 / 30)} title="Avançar um quadro" type="button">
              <ChevronRight className="size-4" />
            </button>
            <button aria-label="Avançar 5 segundos" className="grid min-h-10 place-items-center rounded border border-carbon-800 bg-carbon-900 text-carbon-200 hover:border-assert-300/40 hover:text-assert-300" onClick={() => seekTo(currentTime + 5)} title="Avançar 5 segundos" type="button">
              <SkipForward className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Gauge className="size-4 text-carbon-500" />
            <label className="text-xs font-bold text-carbon-300" htmlFor="qc-playback-rate">Velocidade</label>
            <select
              className="ml-auto rounded border border-carbon-800 bg-carbon-900 px-2 py-1 text-xs text-carbon-200"
              id="qc-playback-rate"
              onChange={(event) => {
                const rate = Number(event.target.value);
                setPlaybackRate(rate);
                if (videoRef.current) videoRef.current.playbackRate = rate;
              }}
              value={playbackRate}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <section className="rounded-card border border-carbon-800 bg-carbon-950/55 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="size-4 text-assert-300" />
            <strong className="text-sm text-carbon-100">Trecho da correção</strong>
            <button className="ml-auto text-xs font-bold text-carbon-400 hover:text-carbon-100" onClick={() => { setInPoint(null); setOutPoint(null); }} type="button">
              Limpar
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="flex min-h-16 flex-col items-start justify-center rounded-card border border-carbon-800 bg-carbon-900/70 px-3 text-left text-xs text-carbon-400 hover:border-assert-300/40" onClick={() => { seekTo(currentTime); setInPoint(currentTime); }} type="button">
              <span>Marcar início</span>
              <strong>{formatMediaTime(inPoint ?? currentTime)}</strong>
            </button>
            <button className="flex min-h-16 flex-col items-start justify-center rounded-card border border-carbon-800 bg-carbon-900/70 px-3 text-left text-xs text-carbon-400 hover:border-assert-300/40" onClick={() => { seekTo(currentTime); setOutPoint(currentTime); }} type="button">
              <span>Marcar fim</span>
              <strong>{outPoint === null ? "--:--.---" : formatMediaTime(outPoint)}</strong>
            </button>
          </div>
        </section>

        <section className="rounded-card border border-carbon-800 bg-carbon-950/55 p-4">
          <label className="text-sm font-bold text-carbon-200" htmlFor="qc-comment">Anotação extra</label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-card border border-carbon-800 bg-carbon-950 px-3 py-3 text-sm text-carbon-50 outline-none focus:border-assert-300"
            id="qc-comment"
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Descreva exatamente o que deve mudar neste ponto ou trecho."
            value={newComment}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-card border border-accent-300/30 bg-accent-400/10 px-3 text-xs font-bold text-accent-300 hover:bg-accent-400/15">
              <ImagePlus className="size-4" />
              Vincular imagens
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" multiple onChange={(event) => handleFiles(event.target.files)} type="file" />
            </label>
            <span className="text-xs text-carbon-500">Até 6 imagens, 8 MB cada.</span>
          </div>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {previews.map(({ file, url }, index) => (
                <div className="relative overflow-hidden rounded-card border border-carbon-800" key={`${file.name}-${index}`}>
                  <img alt={file.name} className="aspect-video w-full object-cover" src={url} />
                  <button
                    aria-label={`Remover ${file.name}`}
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded bg-black/70 text-white"
                    onClick={() => setReferenceFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))}
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploadError && <p className="mt-3 text-xs font-semibold text-red-300">{uploadError}</p>}
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-card bg-assert-400 px-4 text-sm font-bold text-carbon-950 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!newComment.trim() || isUploading}
            onClick={() => void handleAddComment()}
            type="button"
          >
            <Send className="size-4" />
            {isUploading ? "Enviando referências..." : "Adicionar correção"}
          </button>
        </section>

        <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
          {comments.length ? comments.map((comment) => {
            const author = USERS_DB.find((candidate) => candidate.id === comment.authorId);
            const avatar = author ? getGlobalAvatar(author.id) : null;
            return (
              <article className="rounded-card border border-carbon-800 bg-carbon-950/45 p-4" key={comment.id}>
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-carbon-800 text-xs font-bold text-carbon-200">
                    {avatar ? <img alt={author?.name || "Equipe"} className="size-full object-cover" src={avatar} /> : author?.name?.charAt(0) || "E"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-carbon-200">{author?.name || "Equipe"}</p>
                    <button
                      className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-assert-300 hover:underline"
                      onClick={() => seekTo(parseMediaTime(comment.timestamp || "0"))}
                      type="button"
                    >
                      <Play className="size-3" />
                      {comment.timestamp || "00:00.000"}
                      {comment.endTimestamp ? ` → ${comment.endTimestamp}` : ""}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-carbon-300">{comment.text}</p>
                {comment.referenceImages?.length ? <ReferenceGallery images={comment.referenceImages} /> : null}
              </article>
            );
          }) : (
            <div className="rounded-card border border-dashed border-carbon-800 p-6 text-center text-sm text-carbon-500">
              Use a timeline para registrar a primeira correção.
            </div>
          )}
        </div>

        {showSubmitAction && onSendCorrections && (
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card border border-assert-300/30 bg-assert-500/10 font-bold text-assert-300" onClick={onSendCorrections} type="button">
            <RotateCcw className="size-4" />
            Enviar correções
          </button>
        )}
      </div>
    </div>
  );
}

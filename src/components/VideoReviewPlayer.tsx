import { useRef, useState } from "react";
import { Play, Pause, Send, Clock } from "lucide-react";
import { cn } from "../lib/cn";
import { type Comment } from "../contexts/DemandContext";
import { USERS_DB, getGlobalAvatar } from "../contexts/AuthContext";

interface VideoReviewPlayerProps {
  videoUrl: string;
  comments: Comment[];
  onAddComment: (text: string, timestamp: string) => void;
  onSendCorrections: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function VideoReviewPlayer({ videoUrl, comments, onAddComment, onSendCorrections }: VideoReviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [capturedTimestamp, setCapturedTimestamp] = useState<string | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleFocusInput = () => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    if (!capturedTimestamp && videoRef.current) {
      setCapturedTimestamp(formatTime(videoRef.current.currentTime));
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const time = capturedTimestamp || formatTime(currentTime);
    onAddComment(newComment, time);
    setNewComment("");
    setCapturedTimestamp(null);
  };

  const jumpToTime = (timestamp: string) => {
    if (videoRef.current) {
      const [m, s] = timestamp.split(":").map(Number);
      videoRef.current.currentTime = m * 60 + s;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 w-full">
      
      {/* Player de Vídeo Vertical (Reels) */}
      <div className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-3xl border border-carbon-800/60 bg-carbon-950 shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-assert-400/10 group aspect-[9/16] max-h-[50vh] shrink-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-assert-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10" />
        <video
          ref={videoRef}
          src={videoUrl}
          className="size-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onClick={togglePlay}
        />
        
        {/* Premium Controls overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-carbon-950/60 backdrop-blur-md border-t border-white/5 p-4 flex items-center gap-4 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            onClick={togglePlay} 
            className="flex shrink-0 items-center justify-center size-10 rounded-full bg-white/10 text-white hover:bg-assert-400 hover:text-carbon-950 hover:scale-105 transition-all shadow-sm"
          >
            {isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4 ml-1" fill="currentColor" />}
          </button>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group/bar">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-assert-500 to-assert-300 rounded-full shadow-[0_0_10px_rgba(var(--assert-400),0.5)] transition-all duration-100" 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Controles e Interações */}
      <div className="flex flex-col gap-4 w-full">

      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-carbon-800/40 bg-gradient-to-b from-carbon-900/40 to-carbon-950/40 backdrop-blur-xl p-5 shadow-inner">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-assert-400 animate-pulse shadow-[0_0_8px_rgba(var(--assert-400),0.8)]" />
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-carbon-300">Nova Correção</span>
          </div>
          {capturedTimestamp && (
            <span className="flex items-center gap-1.5 rounded-full bg-assert-500/10 px-2.5 py-0.5 text-xs font-mono text-assert-300 border border-assert-400/20 shadow-sm animate-in fade-in slide-in-from-left-2">
              <Clock className="size-3" /> {capturedTimestamp}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 h-12 rounded-xl border border-carbon-700/50 bg-carbon-950/80 px-4 text-sm text-carbon-50 shadow-inner outline-none transition-all focus:border-assert-400/50 focus:bg-carbon-950 focus:ring-2 focus:ring-assert-400/20 placeholder:text-carbon-600"
            placeholder="Comece a digitar para pausar e gravar o minuto..."
            value={newComment}
            onFocus={handleFocusInput}
            onChange={(e) => {
              setNewComment(e.target.value);
              if (!capturedTimestamp) handleFocusInput();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddComment();
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="group flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-assert-400 to-assert-500 text-carbon-950 shadow-[0_4px_14px_rgba(var(--assert-500),0.25)] transition-all hover:scale-105 hover:shadow-[0_6px_20px_rgba(var(--assert-500),0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            <Send className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
        {comments.length > 0 ? (
          comments.map((comment) => {
            const author = USERS_DB.find((u) => u.id === comment.authorId);
            const avatar = author ? getGlobalAvatar(author.id) : null;
            return (
              <div key={comment.id} className="group flex gap-4 rounded-[1.2rem] border border-carbon-800/30 bg-carbon-900/20 p-4 transition-all hover:bg-carbon-900/40 hover:border-carbon-800/60">
                <div className="size-9 shrink-0 rounded-full bg-gradient-to-br from-carbon-700 to-carbon-800 overflow-hidden border border-carbon-700 shadow-inner">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-xs font-bold text-carbon-300">
                      {author?.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1 gap-1.5 pt-0.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-carbon-100">{author?.name || "Equipe"}</span>
                    {comment.timestamp && (
                      <button 
                        onClick={() => jumpToTime(comment.timestamp!)}
                        className="flex items-center gap-1.5 rounded-full bg-carbon-950 border border-carbon-800 px-2.5 py-0.5 text-[0.65rem] font-mono font-medium text-carbon-400 transition-all hover:border-assert-500/30 hover:text-assert-300 hover:bg-assert-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-400/50"
                        title="Pular para este momento no vídeo"
                      >
                        <Play className="size-2.5" fill="currentColor" /> {comment.timestamp}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-carbon-300 break-words leading-relaxed">{comment.text}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 border border-dashed border-carbon-800/50 rounded-2xl bg-carbon-900/10">
            <div className="size-12 rounded-full bg-carbon-900 flex items-center justify-center mb-3">
              <Play className="size-5 text-carbon-600" />
            </div>
            <p className="text-sm text-carbon-400">Assista ao vídeo e digite para pausar e adicionar correções na exata minutagem.</p>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={onSendCorrections}
          className="group relative w-full overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-assert-500 to-assert-400 p-[1px] shadow-[0_0_30px_rgba(var(--assert-500),0.15)] transition-all hover:shadow-[0_0_40px_rgba(var(--assert-500),0.3)] active:scale-[0.98]"
        >
          <div className="relative flex h-14 w-full items-center justify-center gap-2 rounded-[calc(1.2rem-1px)] bg-gradient-to-r from-assert-400 to-assert-500 font-bold uppercase tracking-wider text-carbon-950 transition-all">
            <Send className="size-4 transition-transform group-hover:translate-x-1" />
            Enviar Correções
          </div>
        </button>
      </div>
    </div>
    </div>
  );
}

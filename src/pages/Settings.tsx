import { useState, FormEvent, useRef } from "react";
import { LogOut, User as UserIcon, Save, CheckCircle2, Camera } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Settings() {
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return null;
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate network delay for realism
    setTimeout(() => {
      updateProfile({ name, avatar });
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const hasChanges = name !== user.name || avatar !== user.avatar;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="mb-6">
        <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-carbon-400">
          sua conta
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-carbon-50">
          Configurações
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,1.5fr)] items-start">
        <div className="rounded-[1.2rem] border border-glass-stroke bg-carbon-900/42 p-6 shadow-panel backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative group">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-assert-300/30 bg-assert-500/10 text-assert-300 transition-all group-hover:border-assert-300/60">
                {avatar ? (
                  <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="size-10" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full border-2 border-carbon-950 bg-carbon-800 text-carbon-200 transition-all hover:scale-110 hover:bg-assert-500 hover:text-carbon-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300 shadow-panel"
                title="Mudar foto de perfil"
              >
                <Camera className="size-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-carbon-50">{user.name}</h3>
              <p className="text-sm font-semibold text-carbon-300 mt-1">{user.email}</p>
              <span className="mt-3 inline-block rounded-full border border-glass-stroke bg-carbon-950 px-3 py-1 text-xs font-bold uppercase tracking-widest text-carbon-400">
                {user.role}
              </span>
            </div>
          </div>

          <hr className="my-6 border-carbon-800" />

          <button
            onClick={logout}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-card border border-signal-300/30 bg-signal-400/10 px-6 font-bold text-signal-300 transition-all hover:bg-signal-400/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300"
          >
            <LogOut className="size-5" />
            Encerrar sessão
          </button>
        </div>

        <form onSubmit={handleSave} className="rounded-[1.2rem] border border-glass-stroke bg-carbon-900/42 p-6 shadow-panel backdrop-blur-2xl sm:p-8">
          <h3 className="text-xl font-bold text-carbon-50 mb-6">Dados do Perfil</h3>
          
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-carbon-200">Nome de exibição</span>
              <input
                type="text"
                className="min-h-12 w-full rounded-card border border-glass-stroke bg-carbon-950/66 px-4 text-carbon-50 shadow-inner outline-none transition-all duration-300 focus:border-assert-300 focus:ring-2 focus:ring-assert-300/42"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-carbon-200">Email</span>
              <input
                type="email"
                className="min-h-12 w-full rounded-card border border-carbon-800 bg-carbon-950/30 px-4 text-carbon-400 cursor-not-allowed outline-none"
                value={user.email}
                disabled
              />
              <p className="text-xs text-carbon-400">O email não pode ser alterado no momento.</p>
            </label>
            
            <div className="mt-4 flex items-center justify-end gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm font-bold text-assert-300 animate-in fade-in slide-in-from-right-4">
                  <CheckCircle2 className="size-4" />
                  Salvo!
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving || !hasChanges}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card bg-assert-500 px-6 font-bold text-carbon-50 transition-all hover:bg-assert-400 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950"
              >
                <Save className="size-5" />
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type Role = "Admin" | "Organizador" | "Video Maker" | "Designer";
export type UserStatus = "ONLINE" | "EM REUNIAO" | "ALMOÇANDO" | "EM GRAVAÇÃO" | "OFFLINE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  status?: UserStatus;
}

// Emails simulados para o login real
export const USERS_DB: User[] = [
  { id: "admin-1", name: "Bianca", email: "bianca@agencia.com", role: "Admin" },
  { id: "org-1", name: "Gui", email: "gui.org@agencia.com", role: "Organizador" },
  { id: "org-2", name: "Bruna", email: "bruna@agencia.com", role: "Organizador" },
  { id: "org-3", name: "Mel", email: "mel@agencia.com", role: "Organizador" },
  { id: "des-1", name: "Marcelo", email: "marcelo@agencia.com", role: "Designer" },
  { id: "des-2", name: "Luan", email: "luan@agencia.com", role: "Designer" },
  { id: "des-3", name: "Nicoly", email: "nicoly@agencia.com", role: "Designer" },
  { id: "des-4", name: "Matheus", email: "matheus@agencia.com", role: "Designer" },
  { id: "des-5", name: "Gui", email: "gui.des@agencia.com", role: "Designer" }, 
  { id: "vid-1", name: "Felipe", email: "felipe@agencia.com", role: "Video Maker" },
  { id: "vid-2", name: "Mari", email: "mari@agencia.com", role: "Video Maker" },
  { id: "vid-3", name: "Dani", email: "dani@agencia.com", role: "Video Maker" },
];

interface AuthContextType {
  user: User | null;
  login: (email: string) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  getAvatar: (identifier: string) => string | undefined;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getGlobalAvatar(identifier: string): string | undefined {
  if (!identifier) return undefined;
  try {
    const avatars = JSON.parse(localStorage.getItem("crm_avatars") || "{}");
    const foundUser = USERS_DB.find(u => u.email.toLowerCase() === identifier.toLowerCase() || u.name.toLowerCase() === identifier.toLowerCase());
    if (foundUser && avatars[foundUser.email]) {
      return avatars[foundUser.email];
    }
  } catch (e) {}
  return undefined;
}

export function saveGlobalAvatar(email: string, avatarBase64: string) {
  try {
    const avatars = JSON.parse(localStorage.getItem("crm_avatars") || "{}");
    avatars[email] = avatarBase64;
    localStorage.setItem("crm_avatars", JSON.stringify(avatars));
    window.dispatchEvent(new Event("crm-avatar-updated"));
  } catch (e) {}
}

export function getGlobalStatus(id: string): UserStatus | undefined {
  if (!id) return undefined;
  try {
    const statuses = JSON.parse(localStorage.getItem("crm_statuses") || "{}");
    return statuses[id];
  } catch (e) {}
  return undefined;
}

export function saveGlobalStatus(id: string, status: UserStatus) {
  try {
    const statuses = JSON.parse(localStorage.getItem("crm_statuses") || "{}");
    statuses[id] = status;
    localStorage.setItem("crm_statuses", JSON.stringify(statuses));
    window.dispatchEvent(new Event("crm-status-updated"));
  } catch (e) {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restaurar sessão
    const savedUser = localStorage.getItem("crm_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  const login = (email: string): boolean => {
    const foundUser = USERS_DB.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      // Checar se já existe um avatar salvo para este email na store global
      let savedAvatar = getGlobalAvatar(foundUser.email);
      const userToSave = savedAvatar ? { ...foundUser, avatar: savedAvatar } : foundUser;
      
      setUser(userToSave);
      localStorage.setItem("crm_user", JSON.stringify(userToSave));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("crm_user");
  };

  const updateProfile = (updates: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const newUser = { ...prevUser, ...updates };
      localStorage.setItem("crm_user", JSON.stringify(newUser));
      
      if (updates.avatar) {
        saveGlobalAvatar(newUser.email, updates.avatar);
      }
      
      // Emit event so other tabs sync user profile if needed
      window.dispatchEvent(new Event("crm-user-updated"));
      
      return newUser;
    });
  };

  // Sync profile changes across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "crm_user" && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === "crm_avatars") {
        window.dispatchEvent(new Event("crm-avatar-updated"));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen to custom events for local same-tab updates
    const handleAvatarUpdate = () => {
      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        const freshAvatar = getGlobalAvatar(prevUser.email);
        if (freshAvatar && freshAvatar !== prevUser.avatar) {
          const updated = { ...prevUser, avatar: freshAvatar };
          localStorage.setItem("crm_user", JSON.stringify(updated));
          return updated;
        }
        return prevUser;
      });
    };
    window.addEventListener("crm-avatar-updated", handleAvatarUpdate);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("crm-avatar-updated", handleAvatarUpdate);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, getAvatar: getGlobalAvatar, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

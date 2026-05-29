import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { USERS_DB, type User, useAuth } from "./AuthContext";
import { appendNotificationEvent, type NotificationEvent, useNotification } from "./NotificationContext";

export type DemandStatus = "A Fazer" | "Em Andamento" | "Em Revisão" | "Concluído";
export type DemandType = "Arte" | "Vídeo" | "Ambos";

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Demand {
  id: string;
  title: string;
  description: string;
  client: string;
  type: DemandType;
  status: DemandStatus;
  assigneeIds: string[];
  authorId: string;
  createdAt: string;
  deadline?: string;
  deliveryLink?: string;
  dropboxLink?: string;
  planningLink?: string;
  comments?: Comment[];
  statusUpdatedAt?: string;
}

interface DemandContextType {
  demands: Demand[];
  visibleDemands: Demand[];
  addDemand: (demand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt">) => void;
  updateDemandStatus: (id: string, status: DemandStatus, link?: string) => void;
  updateDemand: (id: string, updates: Partial<Demand>) => void;
  deleteDemand: (id: string) => void;
  addComment: (demandId: string, text: string) => void;
}

const DEMANDS_STORAGE_KEY = "crm_demands";
const DemandContext = createContext<DemandContextType | undefined>(undefined);

export function canUserSeeDemand(demand: Demand, user: User | null) {
  if (!user) {
    return false;
  }

  return user.role === "Admin" || user.role === "Organizador" || demand.assigneeIds.includes(user.id);
}

function getInitialDemands(): Demand[] {
  const saved = localStorage.getItem(DEMANDS_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as Demand[];
  } catch {
    return [];
  }
}

function persistDemands(demands: Demand[]) {
  localStorage.setItem(DEMANDS_STORAGE_KEY, JSON.stringify(demands));
}

function publishAssignmentNotifications(demand: Demand) {
  if (!demand.assigneeIds.length) {
    return;
  }

  const author = USERS_DB.find((user) => user.id === demand.authorId)?.name || "Equipe Assert";
  const event: NotificationEvent = {
    id: `ntf-${demand.id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    deliveredTo: [],
    demandId: demand.id,
    message: `${author} atribuiu ${demand.type.toLowerCase()} para ${demand.client}. A demanda já inclui Dropbox e planejamento.`,
    seenBy: [],
    targetUserIds: demand.assigneeIds,
    title: "Nova demanda atribuída",
    type: "info"
  };

  appendNotificationEvent(event);
}

export function DemandProvider({ children }: { children: ReactNode }) {
  const [demands, setDemands] = useState<Demand[]>(getInitialDemands);
  const { showNotification } = useNotification();
  const { user } = useAuth();

  const visibleDemands = useMemo(
    () => demands.filter((demand) => canUserSeeDemand(demand, user)),
    [demands, user]
  );

  useEffect(() => {
    const syncDemands = (incomingDemands: Demand[]) => {
      setDemands((previousDemands) => {
        incomingDemands.forEach((newDemand) => {
          const previousDemand = previousDemands.find((demand) => demand.id === newDemand.id);

          if (!previousDemand || previousDemand.status === newDemand.status) {
            return;
          }

          if (user?.role === "Admin" && newDemand.status === "Em Revisão") {
            const assigneeName =
              USERS_DB.find((assignee) => assignee.id === newDemand.assigneeIds[0])?.name || "Responsável";
            showNotification(
              "Entrega para revisão",
              `${assigneeName} enviou o material de ${newDemand.client} para aprovação.`,
              "success"
            );
          }
        });

        return incomingDemands;
      });
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== DEMANDS_STORAGE_KEY || !event.newValue) {
        return;
      }

      try {
        syncDemands(JSON.parse(event.newValue) as Demand[]);
      } catch {
        return;
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [showNotification, user]);

  const addDemand = (newDemand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt">) => {
    const demand: Demand = {
      ...newDemand,
      id: `dem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "A Fazer",
      statusUpdatedAt: new Date().toISOString(),
      comments: []
    };

    setDemands((previousDemands) => {
      const updatedDemands = [demand, ...previousDemands];
      persistDemands(updatedDemands);
      return updatedDemands;
    });

    publishAssignmentNotifications(demand);
    showNotification("Demanda enviada", "O responsável recebeu a notificação e o admin já pode acompanhar.", "success");
  };

  const updateDemandStatus = (id: string, status: DemandStatus, link?: string) => {
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => {
        if (demand.id !== id) {
          return demand;
        }

        return { 
          ...demand, 
          status, 
          statusUpdatedAt: new Date().toISOString(),
          ...(link ? { deliveryLink: link } : {}) 
        };
      });

      persistDemands(updatedDemands);
      return updatedDemands;
    });
  };

  const updateDemand = (id: string, updates: Partial<Demand>) => {
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => 
        demand.id === id ? { ...demand, ...updates } : demand
      );
      persistDemands(updatedDemands);
      return updatedDemands;
    });
  };

  const deleteDemand = (id: string) => {
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.filter((demand) => demand.id !== id);
      persistDemands(updatedDemands);
      return updatedDemands;
    });
  };

  const addComment = (demandId: string, text: string) => {
    if (!user) return;
    
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => {
        if (demand.id !== demandId) return demand;
        
        const newComment: Comment = {
          id: `cmt-${Date.now()}`,
          authorId: user.id,
          text,
          createdAt: new Date().toISOString()
        };
        
        return { ...demand, comments: [...(demand.comments || []), newComment] };
      });
      
      persistDemands(updatedDemands);
      return updatedDemands;
    });
  };

  return (
    <DemandContext.Provider value={{ demands, visibleDemands, addDemand, updateDemandStatus, updateDemand, deleteDemand, addComment }}>
      {children}
    </DemandContext.Provider>
  );
}

export function useDemands() {
  const context = useContext(DemandContext);

  if (context === undefined) {
    throw new Error("useDemands must be used within a DemandProvider");
  }

  return context;
}

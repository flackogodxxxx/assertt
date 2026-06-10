import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { USERS_DB, type User, useAuth } from "./AuthContext";
import { appendNotificationEvent, type NotificationEvent, useNotification } from "./NotificationContext";
import { getAllClients } from "../data/clients";
import { mapDemandToTaskInserts, mapTaskRowToDemand, statusToTaskStatus } from "../lib/crm-mappers";
import { supabase } from "../lib/supabase";
import type { ProductionTaskRow } from "../lib/supabase-types";

const db = supabase as any;

export type DemandStatus = "A Fazer" | "Em Andamento" | "Em Revisão" | "Concluído";
export type DemandType = "Arte" | "Vídeo" | "Ambos";

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  timestamp?: string; // e.g. "01:24" for video revisions
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
  caption?: string;
  statusUpdatedAt?: string;
  videoUrl?: string; // used for QC review
}

interface DemandContextType {
  demands: Demand[];
  visibleDemands: Demand[];
  addDemand: (demand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt">) => void;
  updateDemandStatus: (id: string, status: DemandStatus, link?: string) => void;
  updateDemand: (id: string, updates: Partial<Demand>) => void;
  deleteDemand: (id: string) => void;
  addComment: (demandId: string, text: string, timestamp?: string) => void;
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

function slugifyClientId(name: string) {
  return `cli-${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)}`;
}

async function hasRemoteSession() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

async function ensureRemoteClientId(clientName: string, ownerId: string) {
  const existing = await db
    .from("clients")
    .select("id")
    .eq("name", clientName)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const catalogClient = getAllClients().find((client) => client.name === clientName);
  const id = slugifyClientId(clientName);
  const { data, error } = await db
    .from("clients")
    .insert({
      active_demands: 0,
      approval_time: "",
      id,
      monthly_deliveries: 0,
      name: clientName,
      owner_id: ownerId,
      segment: (catalogClient as any)?.segment || (catalogClient as any)?.industry || "Conteudo",
      tier: "Fixo"
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function fetchRemoteDemands() {
  const { data, error } = await db
    .from("production_tasks")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as Array<ProductionTaskRow & { clients?: { name?: string } | null }>).map((row) =>
    mapTaskRowToDemand(row, row.clients?.name || "Cliente sem nome")
  );
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
  const [remoteEnabled, setRemoteEnabled] = useState(false);

  const visibleDemands = useMemo(
    () => demands.filter((demand) => canUserSeeDemand(demand, user)),
    [demands, user]
  );

  useEffect(() => {
    let isMounted = true;

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

        persistDemands(incomingDemands);
        return incomingDemands;
      });
    };

  useEffect(() => {
    let isMounted = true;

    async function loadRemote() {
      if (!user || !(await hasRemoteSession())) {
        setRemoteEnabled(false);
        return;
      }

      try {
        const remoteDemands = await fetchRemoteDemands();
        if (isMounted) {
          setRemoteEnabled(true);
          syncDemands(remoteDemands);
        }
      } catch {
        if (isMounted) {
          setRemoteEnabled(false);
        }
      }
    }

    loadRemote();

    const handleStorageChange = (event: StorageEvent) => {
      if (remoteEnabled) {
        return;
      }

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
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [remoteEnabled, user]);

  useEffect(() => {
    if (!user) return;

    const channelName = `crm-production-tasks-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_tasks" },
        async () => {
          if (!(await hasRemoteSession())) {
            return;
          }

          const remoteDemands = await fetchRemoteDemands();
          setDemands((previousDemands) => {
            remoteDemands.forEach((newDemand) => {
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

            persistDemands(remoteDemands);
            return remoteDemands;
          });
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification]);

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

    if (remoteEnabled) {
      ensureRemoteClientId(newDemand.client, newDemand.assigneeIds[0] || user?.id || "admin-1")
        .then((clientId) => {
          const inserts = mapDemandToTaskInserts(newDemand, clientId);
          return db.from("production_tasks").insert(inserts).select("id, assignee_id");
        })
        .then(({ data, error }) => {
          if (error) {
            throw error;
          }

          const notifications = (data || []).map((task: any) => ({
            body: `Nova demanda atribuida: ${newDemand.title}`,
            task_id: task.id,
            target_user_id: task.assignee_id,
            title: "Nova demanda atribuida",
            type: "info"
          }));

          if (notifications.length) {
            return db.from("notifications").insert(notifications);
          }

          return undefined;
        })
        .catch((error) => {
          showNotification("Supabase indisponivel", error instanceof Error ? error.message : "A demanda ficou salva localmente.", "warning");
        });
    }
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

    if (remoteEnabled) {
      db
        .from("production_tasks")
        .update({
          ...(link ? { deliverable: link } : {}),
          status: statusToTaskStatus(status),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .then(({ error }: { error: Error | null }) => {
          if (error) {
            showNotification("Supabase indisponivel", error.message, "warning");
          }
        });
    }
  };

  const updateDemand = (id: string, updates: Partial<Demand>) => {
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => 
        demand.id === id ? { ...demand, ...updates } : demand
      );
      persistDemands(updatedDemands);
      return updatedDemands;
    });

    if (remoteEnabled) {
      const currentDemand = demands.find((demand) => demand.id === id);
      db
        .from("production_tasks")
        .update({
          checklist: {
            caption: updates.caption ?? currentDemand?.caption,
            comments: updates.comments ?? currentDemand?.comments,
            description: updates.description ?? currentDemand?.description,
            dropboxLink: updates.dropboxLink ?? currentDemand?.dropboxLink,
            planningLink: updates.planningLink ?? currentDemand?.planningLink,
            videoUrl: updates.videoUrl ?? currentDemand?.videoUrl
          },
          ...(updates.deliveryLink ? { deliverable: updates.deliveryLink } : {}),
          ...(updates.deadline ? { due_date: updates.deadline.slice(0, 10) } : {}),
          ...(updates.description ? { stage_note: updates.description } : {}),
          ...(updates.title ? { title: updates.title } : {}),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .then(({ error }: { error: Error | null }) => {
          if (error) {
            showNotification("Supabase indisponivel", error.message, "warning");
          }
        });
    }
  };

  const deleteDemand = (id: string) => {
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.filter((demand) => demand.id !== id);
      persistDemands(updatedDemands);
      return updatedDemands;
    });

    if (remoteEnabled) {
      db
        .from("production_tasks")
        .delete()
        .eq("id", id)
        .then(({ error }: { error: Error | null }) => {
          if (error) {
            showNotification("Supabase indisponivel", error.message, "warning");
          }
        });
    }
  };

  const addComment = (demandId: string, text: string, timestamp?: string) => {
    if (!user) return;
    
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => {
        if (demand.id !== demandId) return demand;
        
        const newComment: Comment = {
          id: `cmt-${Date.now()}`,
          authorId: user.id,
          text,
          createdAt: new Date().toISOString(),
          timestamp
        };
        
        return { ...demand, comments: [...(demand.comments || []), newComment] };
      });
      
      persistDemands(updatedDemands);
      return updatedDemands;
    });

    if (remoteEnabled) {
      const demand = demands.find((candidate) => candidate.id === demandId);
      const newComment: Comment = {
        id: `cmt-${Date.now()}`,
        authorId: user.id,
        text,
        createdAt: new Date().toISOString(),
        timestamp
      };

      db
        .from("production_tasks")
        .update({
          checklist: {
            caption: demand?.caption,
            comments: [...(demand?.comments || []), newComment],
            description: demand?.description,
            dropboxLink: demand?.dropboxLink,
            planningLink: demand?.planningLink,
            videoUrl: demand?.videoUrl
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", demandId)
        .then(({ error }: { error: Error | null }) => {
          if (error) {
            showNotification("Supabase indisponivel", error.message, "warning");
          }
        });
    }
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

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { USERS_DB, type User, useAuth } from "./AuthContext";
import { appendNotificationEvent, type NotificationEvent, useNotification } from "./NotificationContext";
import { getAllClients } from "../data/clients";
import { mapDemandToTaskInserts, mapTaskRowToDemand, statusToTaskStatus } from "../lib/crm-mappers";
import {
  canPermanentlyDeleteDemand,
  getArchivedDemands,
  getOperationalDemands
} from "../lib/demand-lifecycle";
import { formatDemandScope } from "../lib/demand-scope";
import { supabase } from "../lib/supabase";
import type { ProductionTaskRow } from "../lib/supabase-types";

const db = supabase as any;

export type DemandStatus = "A Fazer" | "Em Andamento" | "Em Revisão" | "Concluído";
export type DemandType = "Arte" | "Vídeo" | "Ambos";

export interface DeliveryItem {
  id: string;
  url: string; // Keep as fallback/general link
  pieceLinks?: Record<number, string>; // Specific link for each piece
  description: string;
  pieces?: number[];
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  timestamp?: string; // e.g. "01:24" for video revisions
  endTimestamp?: string;
  referenceImages?: ReferenceImage[];
  pieceIndex?: number;
}

export interface ReferenceImage {
  id: string;
  mimeType: string;
  name: string;
  path: string;
  signedUrl?: string;
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
  pieceCount?: number;
  pieceInstructions?: string[];
  comments?: Comment[];
  caption?: string;
  statusUpdatedAt?: string;
  videoUrl?: string; // used for QC review
  deliveries?: DeliveryItem[];
  approvedPieces?: number[];
}

interface DemandContextType {
  demands: Demand[];
  visibleDemands: Demand[];
  operationalDemands: Demand[];
  archivedDemands: Demand[];
  addDemand: (demand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt" | "deliveries">) => void;
  updateDemandStatus: (id: string, status: DemandStatus, delivery?: Omit<DeliveryItem, "id" | "createdAt">) => void;
  updateDemand: (id: string, updates: Partial<Demand>) => void;
  deleteDemand: (id: string) => Promise<boolean>;
  deleteDemandPermanently: (id: string) => Promise<boolean>;
  addComment: (
    demandId: string,
    text: string,
    timestamp?: string,
    endTimestamp?: string,
    referenceImages?: ReferenceImage[],
    pieceIndex?: number
  ) => void;
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
    message: `${author} atribuiu ${formatDemandScope(demand.pieceCount || 1, demand.type)} para ${demand.client}. A demanda já inclui Dropbox e planejamento.`,
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

  const operationalDemands = useMemo(() => getOperationalDemands(demands), [demands]);
  const archivedDemands = useMemo(() => getArchivedDemands(demands), [demands]);
  const visibleDemands = useMemo(
    () => operationalDemands.filter((demand) => canUserSeeDemand(demand, user)),
    [operationalDemands, user]
  );

  const syncDemands = useCallback((incomingDemands: Demand[]) => {
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
            "👀 Material pronto para revisão",
            `${assigneeName} acabou de entregar arquivos de ${newDemand.client}.`,
            "success"
          );
        }
      });

      persistDemands(incomingDemands);
      return incomingDemands;
    });
  }, [user, showNotification]);

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
  }, [remoteEnabled, user, syncDemands]);

  const syncDemandsRef = useRef(syncDemands);
  useEffect(() => {
    syncDemandsRef.current = syncDemands;
  }, [syncDemands]);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `crm-production-tasks`;
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
          syncDemandsRef.current(remoteDemands);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const addDemand = (newDemand: Omit<Demand, "id" | "createdAt" | "status" | "comments" | "statusUpdatedAt" | "deliveries">) => {
    const demand: Demand = {
      ...newDemand,
      id: `dem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "A Fazer",
      statusUpdatedAt: new Date().toISOString(),
      comments: [],
      deliveries: []
    };

    setDemands((previousDemands) => {
      const updatedDemands = [demand, ...previousDemands];
      persistDemands(updatedDemands);
      return updatedDemands;
    });

    if (!remoteEnabled) {
      publishAssignmentNotifications(demand);
    }
    showNotification("🚀 Nova missão na operação", "A demanda foi enviada para o responsável e já está no seu radar.", "success");

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
            body: `[${newDemand.client}] ${newDemand.title} acaba de cair na sua mesa. (${formatDemandScope(newDemand.pieceCount || 1, newDemand.type)})`,
            task_id: task.id,
            target_user_id: task.assignee_id,
            title: "🚀 Nova missão na operação",
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

  const updateDemandStatus = (id: string, status: DemandStatus, delivery?: Omit<DeliveryItem, "id" | "createdAt">) => {
    let newDeliveryItem: DeliveryItem | undefined;
    if (delivery) {
      newDeliveryItem = {
        ...delivery,
        id: `dlv-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
    }

    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => {
        if (demand.id !== id) {
          return demand;
        }

        const newDeliveries = newDeliveryItem 
          ? [...(demand.deliveries || []), newDeliveryItem] 
          : demand.deliveries;

        return { 
          ...demand, 
          status, 
          statusUpdatedAt: new Date().toISOString(),
          ...(newDeliveryItem ? { deliveryLink: newDeliveryItem.url } : {}), // legacy fallback
          deliveries: newDeliveries
        };
      });

      persistDemands(updatedDemands);
      return updatedDemands;
    });

    if (remoteEnabled) {
      const currentDemand = demands.find(d => d.id === id);
      const newDeliveries = newDeliveryItem 
        ? [...(currentDemand?.deliveries || []), newDeliveryItem] 
        : currentDemand?.deliveries;

      db
        .from("production_tasks")
        .update({
          ...(delivery ? { deliverable: delivery.url } : {}),
          status: statusToTaskStatus(status),
          checklist: {
            caption: currentDemand?.caption,
            comments: currentDemand?.comments,
            description: currentDemand?.description,
            dropboxLink: currentDemand?.dropboxLink,
            pieceCount: currentDemand?.pieceCount ?? 1,
            pieceInstructions: currentDemand?.pieceInstructions ?? [],
            planningLink: currentDemand?.planningLink,
            videoUrl: currentDemand?.videoUrl,
            deliveries: newDeliveries,
            approvedPieces: currentDemand?.approvedPieces
          },
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
            pieceCount: updates.pieceCount ?? currentDemand?.pieceCount ?? 1,
            pieceInstructions: updates.pieceInstructions ?? currentDemand?.pieceInstructions ?? [],
            planningLink: updates.planningLink ?? currentDemand?.planningLink,
            videoUrl: updates.videoUrl ?? currentDemand?.videoUrl,
            deliveries: updates.deliveries ?? currentDemand?.deliveries,
            approvedPieces: updates.approvedPieces ?? currentDemand?.approvedPieces
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

  const deleteDemandPermanently = async (id: string) => {
    const demand = demands.find((candidate) => candidate.id === id);

    if (!demand || !canPermanentlyDeleteDemand(user, demand)) {
      showNotification(
        "Exclusao bloqueada",
        "Somente administradores podem excluir demandas arquivadas.",
        "warning"
      );
      return false;
    }

    if (remoteEnabled) {
      const { error } = await db.rpc("delete_archived_demand", { demand_id: id });

      if (error) {
        showNotification("Nao foi possivel excluir", error.message, "warning");
        return false;
      }
    }

    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.filter((candidate) => candidate.id !== id);
      persistDemands(updatedDemands);
      return updatedDemands;
    });
    showNotification("Demanda excluida", "O item arquivado foi removido definitivamente.", "success");
    return true;
  };

  const deleteDemand = deleteDemandPermanently;

  const addComment = (
    demandId: string,
    text: string,
    timestamp?: string,
    endTimestamp?: string,
    referenceImages?: ReferenceImage[],
    pieceIndex?: number
  ) => {
    if (!user) return;
    
    setDemands((previousDemands) => {
      const updatedDemands = previousDemands.map((demand) => {
        if (demand.id !== demandId) return demand;
        
        const newComment: Comment = {
          id: `cmt-${Date.now()}`,
          authorId: user.id,
          text,
          createdAt: new Date().toISOString(),
          timestamp,
          endTimestamp,
          referenceImages,
          pieceIndex
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
        timestamp,
        endTimestamp,
        referenceImages,
        pieceIndex
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
            pieceCount: demand?.pieceCount,
            pieceInstructions: demand?.pieceInstructions,
            videoUrl: demand?.videoUrl,
            deliveries: demand?.deliveries,
            approvedPieces: demand?.approvedPieces
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
    <DemandContext.Provider
      value={{
        addComment,
        addDemand,
        archivedDemands,
        deleteDemand,
        deleteDemandPermanently,
        demands,
        operationalDemands,
        updateDemand,
        updateDemandStatus,
        visibleDemands
      }}
    >
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

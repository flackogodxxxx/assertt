import type { User } from "../contexts/AuthContext";
import type { Demand } from "../contexts/DemandContext";

export function isArchivedDemand(demand: Demand) {
  return demand.status === "Concluído";
}

export function getOperationalDemands(demands: Demand[]) {
  return demands.filter((demand) => !isArchivedDemand(demand));
}

export function getArchivedDemands(demands: Demand[]) {
  return demands.filter(isArchivedDemand);
}

export function canPermanentlyDeleteDemand(user: User | null, demand: Demand) {
  return user?.role === "Admin" && isArchivedDemand(demand);
}

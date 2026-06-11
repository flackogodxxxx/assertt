export type CommandClient = { name: string };
export type CommandDemand = {
  archived: boolean;
  client: string;
  id: string;
  title: string;
};

export type CommandResult = {
  description: string;
  href: string;
  id: string;
  kind: "client" | "demand" | "archived-demand";
  label: string;
};

export function buildCommandResults({
  clients,
  demands,
  query
}: {
  clients: CommandClient[];
  demands: CommandDemand[];
  query: string;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedQuery) return [] as CommandResult[];

  const clientResults: CommandResult[] = clients
    .filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    .map((client) => ({
      description: "Cliente",
      href: `/crm/clientes/${encodeURIComponent(client.name)}`,
      id: `client:${client.name}`,
      kind: "client",
      label: client.name
    }));

  const demandResults: CommandResult[] = demands
    .filter((demand) =>
      `${demand.title} ${demand.client}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
    )
    .map((demand) => ({
      description: `${demand.client}${demand.archived ? " · Arquivada" : ""}`,
      href: `/crm/demandas/${demand.id}`,
      id: demand.id,
      kind: demand.archived ? "archived-demand" : "demand",
      label: demand.title
    }));

  return [...clientResults, ...demandResults].slice(0, 12);
}

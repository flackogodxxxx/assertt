export interface Employee {
  name: string;
  role: "Designer" | "Video Maker";
  clients: string[];
}

export const TEAM: Employee[] = [
  // DESIGNERS
  {
    name: "Marcelo",
    role: "Designer",
    clients: ["Facta Promotora", "Facta Financeira", "Pegatroco", "Facta RH", "Santo Insumo", "Facta em Foco"],
  },
  {
    name: "Luan",
    role: "Designer",
    clients: ["Camila", "JRV", "Point Our.", "Fashion West", "Provence", "Point Sta.", "L&S"],
  },
  {
    name: "Nicoly",
    role: "Designer",
    clients: ["Dr. Lucas", "Didi", "Iate Maria", "Ponto do Aço", "Facta Sta. Cruz", "Ibis", "Instituto Tosi", "Donnalinha", "Naji", "Luiz Augusto", "Lais Loiola", "Mayra Mendes"],
  },
  {
    name: "Matheus",
    role: "Designer",
    clients: ["Beatriz Saad", "Matheus Perino", "Isa Fernandes", "Viva", "Monte Sião", "SuperGrana", "Consultec", "Sempre Mais", "Santo Agro", "Star", "Sta Lacrima"],
  },
  {
    name: "Gui",
    role: "Designer",
    clients: ["Special Vet", "One Fit", "Aliara", "Tesouro", "2R Motos"],
  },
  // VIDEO MAKERS
  {
    name: "Felipe",
    role: "Video Maker",
    clients: ["Iate Maria", "Special Vet", "NOVH", "João Corban", "Consultec", "Donnalinha", "JRV", "Aliara", "Didi", "Beatriz Saad", "Santo Agro", "One Fit", "Fashion West", "Mayra Mendes"],
  },
  {
    name: "Mari",
    role: "Video Maker",
    clients: ["Point Sta.", "PNO", "Dra. Mayara", "Ibis", "Naji", "Monte Sião", "Lais Loiola", "Point Our.", "Ponto do Aço", "Camila", "Vivá"],
  },
  {
    name: "Dani",
    role: "Video Maker",
    clients: ["Instituto Tosi", "Dr. Lucas", "Monalisa", "Luvara", "Provence", "Santo Insumo", "Isa Fernandes", "Star", "Matheus Perino", "Luiz Augusto"],
  }
];

// Helper to list all unique clients with their assigned teams
export interface Client {
  name: string;
  designer?: string;
  videoMaker?: string;
}

export function getAllClients(): Client[] {
  const clientsMap = new Map<string, Client>();

  TEAM.forEach((employee) => {
    employee.clients.forEach((clientName) => {
      // Normalize name slightly if needed, though they seem reasonably spelled
      // We will assume exact matches from the list provided.
      const name = clientName.trim();
      
      if (!clientsMap.has(name)) {
        clientsMap.set(name, { name });
      }
      
      const client = clientsMap.get(name)!;
      if (employee.role === "Designer") {
        client.designer = employee.name;
      } else {
        client.videoMaker = employee.name;
      }
    });
  });

  return Array.from(clientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

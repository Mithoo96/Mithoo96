import { clients, seedDocuments } from "./clients";
export const documents = clients.flatMap(seedDocuments);

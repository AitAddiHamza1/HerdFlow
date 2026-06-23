import { Timestamp } from 'firebase/firestore';

export interface Insemination {
  id: string;
  userId: string;     // Owner ID for security verification
  cowId: string;
  date: Timestamp;    // Insemination date
  bullName: string;   // Name/ID of the bull
  heatType: string;   // e.g. "Natural", "Induced"
  cost: number;       // Direct cost of the procedure
  createdAt: Timestamp;
}

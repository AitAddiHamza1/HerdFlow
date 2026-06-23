import { Timestamp } from 'firebase/firestore';

export interface Cow {
  id: string;
  userId: string;
  number: string;     // Unique cow number (required)
  name?: string;      // Optional name
  breed?: string;     // Optional breed
  notes?: string;     // Optional notes
  createdAt: Timestamp;
}

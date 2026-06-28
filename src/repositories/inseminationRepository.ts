import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Insemination } from '../types/insemination';
import { cowsRepository } from './cowsRepository';

const COWS_COLLECTION = 'cows';
const INSEMINATIONS_SUBCOLLECTION = 'inseminations';

const compareInseminationsDesc = (a: Insemination, b: Insemination) => {
  const timeA = a.date?.seconds ? a.date.seconds * 1000 : (a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date as unknown as string).getTime());
  const timeB = b.date?.seconds ? b.date.seconds * 1000 : (b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date as unknown as string).getTime());
  return timeB - timeA;
};

export const inseminationRepository = {
  /**
   * Fetch all inseminations for a specific cow, sorted by date descending
   */
  async getAllForCow(userId: string, cowId: string): Promise<Insemination[]> {
    // Verify cow ownership first
    const cow = await cowsRepository.getById(userId, cowId);
    if (!cow) {
      throw new Error("Cow not found or unauthorized access.");
    }

    const q = query(
      collection(db, COWS_COLLECTION, cowId, INSEMINATIONS_SUBCOLLECTION),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const records: Insemination[] = [];
    querySnapshot.forEach((docSnap) => {
      records.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Insemination);
    });
    return records.sort(compareInseminationsDesc);
  },

  /**
   * Fetch all inseminations for a user across all their cows.
   * Runs queries in parallel based on the cows owned by the user
   * to avoid requiring complex Firestore Collection Group Indexes.
   */
  async getAllForUser(userId: string): Promise<Insemination[]> {
    const cows = await cowsRepository.getAll(userId);
    if (cows.length === 0) return [];

    const fetchPromises = cows.map(async (cow) => {
      const q = query(
        collection(db, COWS_COLLECTION, cow.id, INSEMINATIONS_SUBCOLLECTION),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const records: Insemination[] = [];
      querySnapshot.forEach((docSnap) => {
        records.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Insemination);
      });
      return records;
    });

    const results = await Promise.all(fetchPromises);
    // Combine and sort all records by date descending
    return results.flat().sort(compareInseminationsDesc);
  },

  /**
   * Create a new insemination record under a specific cow
   */
  async create(
    userId: string, 
    cowId: string, 
    data: Omit<Insemination, 'id' | 'userId' | 'cowId' | 'createdAt'>
  ): Promise<Insemination> {
    // Validation: Cost must not be negative
    if (data.cost < 0) {
      throw new Error("Cost cannot be negative.");
    }

    // Verify cow ownership first
    const cow = await cowsRepository.getById(userId, cowId);
    if (!cow) {
      throw new Error("Cow not found or unauthorized access.");
    }

    const docRef = doc(collection(db, COWS_COLLECTION, cowId, INSEMINATIONS_SUBCOLLECTION));
    const newInsemination: Insemination = {
      id: docRef.id,
      userId,
      cowId,
      date: data.date,
      bullName: data.bullName.trim(),
      heatType: data.heatType,
      cost: data.cost,
      createdAt: Timestamp.now()
    };

    await setDoc(docRef, {
      ...newInsemination,
      createdAt: serverTimestamp() // Set on Firestore side
    });

    return newInsemination;
  },

  /**
   * Update an existing insemination record
   */
  async update(
    userId: string,
    cowId: string, 
    inseminationId: string, 
    data: Omit<Insemination, 'id' | 'userId' | 'cowId' | 'createdAt'>
  ): Promise<void> {
    // Validation: Cost must not be negative
    if (data.cost < 0) {
      throw new Error("Cost cannot be negative.");
    }

    // Verify cow ownership first
    const cow = await cowsRepository.getById(userId, cowId);
    if (!cow) {
      throw new Error("Cow not found or unauthorized access.");
    }

    const docRef = doc(db, COWS_COLLECTION, cowId, INSEMINATIONS_SUBCOLLECTION, inseminationId);
    await updateDoc(docRef, {
      date: data.date,
      bullName: data.bullName.trim(),
      heatType: data.heatType,
      cost: data.cost
    });
  },

  /**
   * Delete an insemination record
   */
  async delete(userId: string, cowId: string, inseminationId: string): Promise<void> {
    // Verify cow ownership first
    const cow = await cowsRepository.getById(userId, cowId);
    if (!cow) {
      throw new Error("Cow not found or unauthorized access.");
    }

    const docRef = doc(db, COWS_COLLECTION, cowId, INSEMINATIONS_SUBCOLLECTION, inseminationId);
    await deleteDoc(docRef);
  }
};

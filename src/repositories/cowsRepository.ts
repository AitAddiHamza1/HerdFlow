import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Cow } from '../types/cow';

const COWS_COLLECTION = 'cows';

export const cowsRepository = {
  /**
   * Fetch all cows owned by the authenticated breeder, ordered by creation date descending
   */
  async getAll(userId: string): Promise<Cow[]> {
    const q = query(
      collection(db, COWS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const cows: Cow[] = [];
    querySnapshot.forEach((docSnap) => {
      cows.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Cow);
    });
    
    // Sort client-side by createdAt descending to avoid index requirement
    return cows.sort((a, b) => {
      const t1 = a.createdAt?.seconds || 0;
      const t2 = b.createdAt?.seconds || 0;
      return t2 - t1;
    });
  },

  /**
   * Fetch a single cow document by ID
   */
  async getById(userId: string, cowId: string): Promise<Cow | null> {
    const docRef = doc(db, COWS_COLLECTION, cowId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const cowData = docSnap.data();
      if (cowData.userId !== userId) {
        throw new Error("Unauthorized access to this cow record.");
      }
      return {
        ...cowData,
        id: docSnap.id
      } as Cow;
    }
    return null;
  },

  /**
   * Add a new cow to the user's cattle list
   * Throws an error if the cow number is already registered by the same breeder
   */
  async create(userId: string, cowData: Omit<Cow, 'id' | 'userId' | 'createdAt'>): Promise<Cow> {
    // 1. Uniqueness check
    const numberQuery = query(
      collection(db, COWS_COLLECTION),
      where('userId', '==', userId),
      where('number', '==', cowData.number)
    );
    const querySnapshot = await getDocs(numberQuery);
    if (!querySnapshot.empty) {
      throw new Error(`Cow number "${cowData.number}" is already registered on your farm.`);
    }

    // 2. Generate new document reference
    const docRef = doc(collection(db, COWS_COLLECTION));
    const newCow: Cow = {
      id: docRef.id,
      userId,
      number: cowData.number.trim(),
      name: cowData.name?.trim() || '',
      breed: cowData.breed?.trim() || '',
      notes: cowData.notes?.trim() || '',
      createdAt: Timestamp.now()
    };

    // 3. Save to Firestore
    await setDoc(docRef, {
      ...newCow,
      createdAt: serverTimestamp() // Resolves to Firestore Timestamp on the server
    });

    return newCow;
  },

  /**
   * Edit cow metadata
   * Throws an error if the breeder is trying to change the cow number to another registered cow number
   */
  async update(userId: string, cowId: string, cowData: Omit<Cow, 'id' | 'userId' | 'createdAt'>): Promise<void> {
    // 1. If modifying cow number, verify uniqueness
    const currentCow = await this.getById(userId, cowId);
    if (!currentCow) {
      throw new Error("Cow not found.");
    }

    if (currentCow.number !== cowData.number) {
      const numberQuery = query(
        collection(db, COWS_COLLECTION),
        where('userId', '==', userId),
        where('number', '==', cowData.number)
      );
      const querySnapshot = await getDocs(numberQuery);
      if (!querySnapshot.empty) {
        throw new Error(`Cow number "${cowData.number}" is already registered by another cow on your farm.`);
      }
    }

    // 2. Update doc
    const docRef = doc(db, COWS_COLLECTION, cowId);
    await updateDoc(docRef, {
      number: cowData.number.trim(),
      name: cowData.name?.trim() || '',
      breed: cowData.breed?.trim() || '',
      notes: cowData.notes?.trim() || ''
    });
  },

  /**
   * Delete a cow document.
   * Note: In production we'd also delete the inseminations subcollection.
   * For this client-side client, we trigger deletion of the main cow document.
   */
  async delete(userId: string, cowId: string): Promise<void> {
    // Verify ownership first
    const currentCow = await this.getById(userId, cowId);
    if (!currentCow) {
      throw new Error("Cow not found.");
    }

    // First delete subcollection documents if they exist. We can do that by fetching all inseminations and deleting.
    const inseminationsRef = collection(db, COWS_COLLECTION, cowId, 'inseminations');
    const snap = await getDocs(inseminationsRef);
    const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, COWS_COLLECTION, cowId, 'inseminations', docSnap.id)));
    await Promise.all(deletePromises);
    
    // Delete cow document
    const docRef = doc(db, COWS_COLLECTION, cowId);
    await deleteDoc(docRef);
  }
};

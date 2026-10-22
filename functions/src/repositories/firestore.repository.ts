import type { DocumentData, Query } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";

export class FirestoreRepository<T extends DocumentData> {
  constructor(private readonly collectionName: string) {}
  ref(id: string) { return db.collection(this.collectionName).doc(id); }
  async get(id: string): Promise<(T & { id: string }) | null> {
    const snap = await this.ref(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as T & { id: string }) : null;
  }
  async findOne(field: string, value: unknown): Promise<(T & { id: string }) | null> {
    const snap = await db.collection(this.collectionName).where(field, "==", value).limit(1).get();
    const doc = snap.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as T & { id: string }) : null;
  }
  query(): Query { return db.collection(this.collectionName); }
}


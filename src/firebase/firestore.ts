import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Group, Record as GameRecord } from '../types';
import { generateInviteCode } from '../utils/settlement';

// Groups
export const createGroup = async (groupName: string, userId: string, displayName: string) => {
  const inviteCode = generateInviteCode();
  const groupRef = await addDoc(collection(db, 'groups'), {
    groupName,
    ownerId: userId,
    members: [{ userId, displayName, role: 'owner' }],
    inviteCode,
    createdAt: serverTimestamp(),
    planType: 'free',
  });
  return { groupId: groupRef.id, inviteCode };
};

export const joinGroupByCode = async (inviteCode: string, userId: string, displayName: string) => {
  const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('招待コードが見つかりません');
  const groupDoc = snap.docs[0];
  const groupData = groupDoc.data();
  const already = groupData.members.some((m: any) => m.userId === userId);
  if (already) throw new Error('すでに参加済みです');
  await updateDoc(doc(db, 'groups', groupDoc.id), {
    members: [...groupData.members, { userId, displayName, role: 'member' }],
  });
  return groupDoc.id;
};

export const subscribeUserGroups = (
  userId: string,
  callback: (groups: Group[]) => void,
) => {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains-any', [{ userId, role: 'owner' }]),
  );
  return onSnapshot(collection(db, 'groups'), (snap) => {
    const groups: Group[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.members?.some((m: any) => m.userId === userId)) {
        groups.push({
          groupId: d.id,
          groupName: data.groupName,
          ownerId: data.ownerId,
          members: data.members,
          inviteCode: data.inviteCode,
          createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
          planType: data.planType ?? 'free',
        });
      }
    });
    callback(groups);
  });
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const newMembers = data.members.filter((m: any) => m.userId !== userId);
  await updateDoc(groupRef, { members: newMembers });
};

// Records
export const addRecord = async (record: Omit<GameRecord, 'recordId' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, 'records'), {
    ...record,
    date: Timestamp.fromDate(record.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateRecord = async (recordId: string, data: Partial<GameRecord>) => {
  await updateDoc(doc(db, 'records', recordId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeGroupRecords = (
  groupId: string,
  callback: (records: GameRecord[]) => void,
) => {
  const q = query(
    collection(db, 'records'),
    where('groupId', '==', groupId),
    orderBy('date', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const records: GameRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        recordId: d.id,
        date: (data.date as Timestamp)?.toDate() ?? new Date(),
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
      } as GameRecord;
    });
    callback(records);
  });
};

export const subscribePendingRecords = (
  groupId: string,
  callback: (records: GameRecord[]) => void,
) => {
  const q = query(
    collection(db, 'records'),
    where('groupId', '==', groupId),
    where('pending', '==', true),
    orderBy('date', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const records: GameRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        recordId: d.id,
        date: (data.date as Timestamp)?.toDate() ?? new Date(),
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
      } as GameRecord;
    });
    callback(records);
  });
};

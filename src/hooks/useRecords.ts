import { useState, useEffect } from 'react';
import { Record as GameRecord } from '../types';
import { subscribeGroupRecords, subscribePendingRecords } from '../firebase/firestore';

export const useGroupRecords = (groupId: string | undefined) => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeGroupRecords(groupId, (rs) => {
      setRecords(rs);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  return { records, loading };
};

export const usePendingRecords = (groupId: string | undefined) => {
  const [pending, setPending] = useState<GameRecord[]>([]);

  useEffect(() => {
    if (!groupId) {
      setPending([]);
      return;
    }
    const unsub = subscribePendingRecords(groupId, setPending);
    return unsub;
  }, [groupId]);

  return { pending };
};

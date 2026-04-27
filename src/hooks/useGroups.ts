import { useState, useEffect } from 'react';
import { Group } from '../types';
import { subscribeUserGroups } from '../firebase/firestore';

export const useGroups = (userId: string | undefined) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeUserGroups(userId, (gs) => {
      setGroups(gs);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { groups, loading };
};

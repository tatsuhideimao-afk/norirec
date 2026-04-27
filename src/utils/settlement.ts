import { Record as GameRecord, Transaction, MemberStats } from '../types';
import { Member, MEMBERS } from '../constants/venues';

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const calcNoriShare = (record: GameRecord): Map<Member, { invest: number; recover: number }> => {
  const map = new Map<Member, { invest: number; recover: number }>();
  if (record.buyType !== 'ノリ' || record.noriMembers.length === 0) return map;
  const n = record.noriMembers.length;
  const investPer = Math.floor(record.invest / n);
  const recoverPer = Math.floor(record.recover / n);
  record.noriMembers.forEach((m) => map.set(m, { invest: investPer, recover: recoverPer }));
  return map;
};

export const calcMemberStats = (records: GameRecord[], member: Member, buyType?: 'ノリ' | '単騎'): MemberStats => {
  let invest = 0;
  let recover = 0;
  let hitCount = 0;
  let totalCount = 0;

  records.forEach((r) => {
    if (r.pending) return;
    if (buyType && r.buyType !== buyType) return;

    if (r.buyType === 'ノリ' && r.noriMembers.includes(member)) {
      const n = r.noriMembers.length;
      invest += Math.floor(r.invest / n);
      recover += Math.floor(r.recover / n);
      totalCount++;
      if (r.recover > 0) hitCount++;
    } else if (r.buyType === '単騎' && r.member === member) {
      invest += r.invest;
      recover += r.recover;
      totalCount++;
      if (r.recover > 0) hitCount++;
    }
  });

  const profit = recover - invest;
  const roi = invest > 0 ? (recover / invest) * 100 : 0;
  const hitRate = totalCount > 0 ? (hitCount / totalCount) * 100 : 0;

  return { member, invest, recover, profit, roi, hitCount, totalCount, hitRate };
};

export const calcSettlement = (records: GameRecord[]): Transaction[] => {
  const balances: Record<string, number> = {};
  MEMBERS.forEach((m) => { balances[m] = 0; });

  records.forEach((r) => {
    if (r.pending || r.buyType !== 'ノリ') return;
    const n = r.noriMembers.length;
    const investPer = Math.floor(r.invest / n);
    const recoverPer = Math.floor(r.recover / n);
    MEMBERS.forEach((m) => {
      if (r.noriMembers.includes(m)) {
        balances[m] += recoverPer - investPer;
      }
    });
  });

  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([name, amount]) => ({ name, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0, j = 0;
  const d = debtors.map((x) => ({ ...x }));
  const c = creditors.map((x) => ({ ...x }));

  while (i < d.length && j < c.length) {
    const amount = Math.min(d[i].amount, c[j].amount);
    transactions.push({ from: d[i].name, to: c[j].name, amount });
    d[i].amount -= amount;
    c[j].amount -= amount;
    if (d[i].amount === 0) i++;
    if (c[j].amount === 0) j++;
  }

  return transactions;
};

export const formatCurrency = (amount: number): string =>
  `¥${Math.abs(amount).toLocaleString()}`;

export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

export const formatROI = (roi: number): string => `${roi.toFixed(1)}%`;

export const recordsToCsv = (records: GameRecord[]): string => {
  const header = 'ID,グループID,日付,種別,競技,場,レース,掛金,払戻,種類,ノリメンバー,メンバー,予想者,コメント,未確定\n';
  const rows = records.map((r) =>
    [
      r.recordId,
      r.groupId,
      formatDate(r.date),
      r.buyType,
      r.sport,
      r.venue,
      r.race,
      r.invest,
      r.recover,
      r.buyType,
      r.noriMembers.join('|'),
      r.member,
      r.predictor ?? '',
      r.victoryComment ?? '',
      r.pending ? '1' : '0',
    ].join(','),
  );
  return header + rows.join('\n');
};

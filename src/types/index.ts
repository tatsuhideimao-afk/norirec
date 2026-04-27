import { Sport, Member } from '../constants/venues';

export type BuyType = 'ノリ' | '単騎';

export interface GroupMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
}

export interface Group {
  groupId: string;
  groupName: string;
  ownerId: string;
  members: GroupMember[];
  inviteCode: string;
  createdAt: Date;
  planType: 'free' | 'plus';
}

export interface Record {
  recordId: string;
  groupId: string;
  date: Date;
  sport: Sport;
  venue: string;
  race: string;
  invest: number;
  recover: number;
  buyType: BuyType;
  noriMembers: Member[];
  member: Member;
  predictor?: Member;
  victoryComment?: string;
  memo?: string;
  pending: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface Settlement {
  settlementId: string;
  groupId: string;
  settledAt: Date;
  transactions: Transaction[];
}

export interface MemberStats {
  member: Member;
  invest: number;
  recover: number;
  profit: number;
  roi: number;
  hitCount: number;
  totalCount: number;
  hitRate: number;
}

export interface InputFormData {
  step: number;
  buyType: BuyType;
  noriMembers: Member[];
  sport: Sport | null;
  venue: string;
  race: string;
  date: Date;
  invest: string;
  machineName: string;
  predictor?: Member;
}

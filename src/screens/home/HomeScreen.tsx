import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useGroupRecords, usePendingRecords } from '../../hooks/useRecords';
import { COLORS } from '../../constants/colors';
import { OrangeButton } from '../../components/common/OrangeButton';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { createGroup, joinGroupByCode } from '../../firebase/firestore';
import { formatCurrency, calcSettlement } from '../../utils/settlement';
import { Group } from '../../types';
import * as Sharing from 'expo-sharing';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const MONTH_START = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

const GroupCard: React.FC<{ group: Group; userId: string }> = ({ group, userId }) => {
  const { records } = useGroupRecords(group.groupId);
  const { pending } = usePendingRecords(group.groupId);

  const todayRecords = records.filter((r) => {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === TODAY.getTime() && !r.pending;
  });
  const monthRecords = records.filter((r) => r.date >= MONTH_START && !r.pending);

  const todayProfit = todayRecords.reduce((s, r) => s + r.recover - r.invest, 0);
  const monthProfit = monthRecords.reduce((s, r) => s + r.recover - r.invest, 0);

  const handleSettle = async () => {
    const txs = calcSettlement(records);
    if (txs.length === 0) {
      Alert.alert('精算', '精算不要です（収支ゼロ）');
      return;
    }
    const text = txs.map((t) => `${t.from}→${t.to} ${formatCurrency(t.amount)}`).join('\n');
    const msg = `【ノリレク精算】\n${group.groupName}\n\n${text}`;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      Alert.alert('精算内容', msg, [
        { text: 'キャンセル' },
        {
          text: 'LINE共有',
          onPress: async () => {
            const tmp = require('expo-file-system').cacheDirectory + 'settle.txt';
            await require('expo-file-system').writeAsStringAsync(tmp, msg);
            await Sharing.shareAsync(tmp);
          },
        },
      ]);
    } else {
      Alert.alert('精算内容', msg);
    }
  };

  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{group.groupName}</Text>
        {pending.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length}</Text>
          </View>
        )}
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>今日</Text>
          <Text style={[styles.statValue, { color: todayProfit >= 0 ? COLORS.success : COLORS.danger }]}>
            {todayProfit >= 0 ? '+' : ''}{formatCurrency(todayProfit)}
          </Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>今月</Text>
          <Text style={[styles.statValue, { color: monthProfit >= 0 ? COLORS.success : COLORS.danger }]}>
            {monthProfit >= 0 ? '+' : ''}{formatCurrency(monthProfit)}
          </Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>結果待ち</Text>
          <Text style={[styles.statValue, { color: pending.length > 0 ? COLORS.primary : COLORS.textMuted }]}>
            {pending.length}件
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.settleBtn} onPress={handleSettle}>
        <Text style={styles.settleBtnText}>今すぐ精算 →</Text>
      </TouchableOpacity>
    </Card>
  );
};

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { groups, loading } = useGroups(user?.uid);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const handleCreate = async () => {
    if (!newGroupName.trim() || !user) return;
    setModalLoading(true);
    try {
      const result = await createGroup(newGroupName.trim(), user.uid, user.displayName ?? user.email ?? '');
      Alert.alert('グループ作成完了', `招待コード: ${result.inviteCode}\nメンバーに共有してください`);
      setNewGroupName('');
      setShowCreate(false);
    } catch {
      Alert.alert('エラー', 'グループの作成に失敗しました');
    } finally {
      setModalLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !user) return;
    setModalLoading(true);
    try {
      await joinGroupByCode(inviteCode.trim().toUpperCase(), user.uid, user.displayName ?? user.email ?? '');
      Alert.alert('参加しました');
      setInviteCode('');
      setShowJoin(false);
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ノリレク</Text>
        <Text style={styles.headerSub}>{user?.displayName ?? user?.email}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} />}
      >
        {groups.length === 0 && !loading ? (
          <EmptyState
            icon="🏟️"
            message="グループがありません"
            sub="グループを作成するか招待コードで参加してください"
          />
        ) : (
          groups.map((g) => (
            <GroupCard key={g.groupId} group={g} userId={user?.uid ?? ''} />
          ))
        )}
      </ScrollView>

      <View style={styles.actions}>
        <OrangeButton
          title="＋ グループ作成"
          onPress={() => setShowCreate(true)}
          style={styles.actionBtn}
        />
        <OrangeButton
          title="招待コードで参加"
          onPress={() => setShowJoin(true)}
          variant="outline"
          style={styles.actionBtn}
        />
      </View>

      {/* Create Group Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>グループ作成</Text>
          <Text style={styles.label}>グループ名</Text>
          <TextInput
            style={styles.input}
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="例：競馬仲間"
          />
          <OrangeButton title="作成する" onPress={handleCreate} loading={modalLoading} style={styles.modalBtn} />
          <OrangeButton title="キャンセル" onPress={() => setShowCreate(false)} variant="ghost" />
        </SafeAreaView>
      </Modal>

      {/* Join Group Modal */}
      <Modal visible={showJoin} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>招待コードで参加</Text>
          <Text style={styles.label}>招待コード（6文字）</Text>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="ABC123"
            autoCapitalize="characters"
            maxLength={6}
          />
          <OrangeButton title="参加する" onPress={handleJoin} loading={modalLoading} style={styles.modalBtn} />
          <OrangeButton title="キャンセル" onPress={() => setShowJoin(false)} variant="ghost" />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    padding: 12,
    paddingBottom: 80,
  },
  groupCard: {
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  dividerV: {
    width: 0.5,
    backgroundColor: COLORS.border,
  },
  settleBtn: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  settleBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
  },
  modal: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.background,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  modalBtn: {
    marginBottom: 8,
  },
});

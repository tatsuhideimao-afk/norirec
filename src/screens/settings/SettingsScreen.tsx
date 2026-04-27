import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { OrangeButton } from '../../components/common/OrangeButton';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useGroupRecords } from '../../hooks/useRecords';
import { signOut } from '../../firebase/auth';
import { leaveGroup } from '../../firebase/firestore';
import { recordsToCsv } from '../../utils/settlement';
import { VENUES, SPORTS } from '../../constants/venues';

const APP_VERSION = '1.0.0';

const SettingRow: React.FC<{
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}> = ({ label, value, onPress, rightElement, destructive }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.6 : 1}
  >
    <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
    {rightElement ?? (
      value !== undefined
        ? <Text style={styles.rowValue}>{value}</Text>
        : onPress ? <Text style={styles.rowChevron}>›</Text> : null
    )}
  </TouchableOpacity>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

export const SettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const { groups } = useGroups(user?.uid);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const activeGroupId = selectedGroupId || groups[0]?.groupId;
  const { records } = useGroupRecords(activeGroupId);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueEnabled, setVenueEnabled] = useState<Record<string, Record<string, boolean>>>({});

  const handleExportCsv = async () => {
    if (records.length === 0) {
      Alert.alert('エラー', 'エクスポートするデータがありません');
      return;
    }
    try {
      const csv = recordsToCsv(records);
      const path = FileSystem.cacheDirectory + 'norirec_export.csv';
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch {
      Alert.alert('エラー', 'エクスポートに失敗しました');
    }
  };

  const handleDataReset = () => {
    Alert.alert(
      'データ初期化',
      'すべてのデータを削除します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: () => Alert.alert('未実装', 'この機能は今後対応予定です') },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleLeaveGroup = (groupId: string, groupName: string) => {
    Alert.alert(`「${groupName}」から退出`, '退出するとデータにアクセスできなくなります。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '退出する',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(groupId, user!.uid);
            Alert.alert('退出しました');
          } catch {
            Alert.alert('エラー', '退出に失敗しました');
          }
        },
      },
    ]);
  };

  const calcIncomeTax = () => {
    const totalProfit = records.reduce((s, r) => (!r.pending ? s + r.recover - r.invest : s), 0);
    if (totalProfit <= 500000) {
      Alert.alert(
        '一時所得の試算',
        `収益合計: ¥${totalProfit.toLocaleString()}\n\n特別控除(50万円)以内のため課税なし`,
      );
    } else {
      const taxableIncome = Math.floor((totalProfit - 500000) / 2);
      Alert.alert(
        '一時所得の試算',
        `収益合計: ¥${totalProfit.toLocaleString()}\n一時所得: ¥${taxableIncome.toLocaleString()}\n\n※実際の税額は所得税率・住民税率により異なります。税理士にご相談ください。`,
      );
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {/* User Info */}
        <Card style={styles.userCard}>
          <Text style={styles.userName}>{user?.displayName ?? 'ユーザー'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </Card>

        {/* Function Section */}
        <SectionTitle title="機能" />
        <Card style={styles.cardSection}>
          <SettingRow label="グループ管理" onPress={() => setShowGroupModal(true)} />
          <SettingRow label="場名ON/OFF" onPress={() => setShowVenueModal(true)} />
          <SettingRow label="一時所得の試算" onPress={calcIncomeTax} />
        </Card>

        {/* Data Section */}
        <SectionTitle title="データ" />
        <Card style={styles.cardSection}>
          <SettingRow label="CSVエクスポート" onPress={handleExportCsv} />
          <SettingRow
            label="CSVインポート"
            onPress={() => Alert.alert('未実装', 'この機能は今後対応予定です')}
          />
          <SettingRow label="データ初期化" onPress={handleDataReset} destructive />
        </Card>

        {/* Info Section */}
        <SectionTitle title="インフォメーション" />
        <Card style={styles.cardSection}>
          <SettingRow
            label="利用規約"
            onPress={() => Alert.alert('利用規約', 'このアプリは個人利用を目的としています。')}
          />
          <SettingRow
            label="プライバシーポリシー"
            onPress={() => Alert.alert('プライバシーポリシー', '収集した情報はアプリの機能提供のみに使用します。')}
          />
          <SettingRow label="バージョン" value={APP_VERSION} />
        </Card>

        {/* Logout */}
        <Card style={styles.cardSection}>
          <SettingRow label="ログアウト" onPress={handleSignOut} destructive />
        </Card>
      </ScrollView>

      {/* Group Management Modal */}
      <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>グループ管理</Text>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <Text style={styles.modalClose}>閉じる</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {groups.length === 0 ? (
              <Text style={styles.emptyText}>グループがありません</Text>
            ) : (
              groups.map((g) => (
                <Card key={g.groupId}>
                  <Text style={styles.groupName}>{g.groupName}</Text>
                  <Text style={styles.groupMeta}>
                    招待コード: {g.inviteCode} ・ メンバー: {g.members.length}人
                  </Text>
                  <Text style={styles.groupMeta}>
                    役割: {g.ownerId === user?.uid ? 'オーナー' : 'メンバー'}
                  </Text>
                  {g.ownerId !== user?.uid && (
                    <TouchableOpacity
                      style={styles.leaveBtn}
                      onPress={() => handleLeaveGroup(g.groupId, g.groupName)}
                    >
                      <Text style={styles.leaveBtnText}>退出する</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Venue Toggle Modal */}
      <Modal visible={showVenueModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>場名ON/OFF</Text>
            <TouchableOpacity onPress={() => setShowVenueModal(false)}>
              <Text style={styles.modalClose}>閉じる</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {SPORTS.filter((s) => VENUES[s]?.length > 0).map((sport) => (
              <View key={sport}>
                <Text style={styles.venueSportTitle}>{sport}</Text>
                {VENUES[sport].map((venue) => {
                  const key = `${sport}-${venue}`;
                  const enabled = venueEnabled[sport]?.[venue] !== false;
                  return (
                    <View key={key} style={styles.venueRow}>
                      <Text style={styles.venueLabel}>{venue}</Text>
                      <Switch
                        value={enabled}
                        onValueChange={(v) =>
                          setVenueEnabled((prev) => ({
                            ...prev,
                            [sport]: { ...prev[sport], [venue]: v },
                          }))
                        }
                        trackColor={{ true: COLORS.primary, false: COLORS.border }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  content: { padding: 12, paddingBottom: 32 },
  userCard: {
    marginBottom: 20,
    padding: 16,
  },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 4,
  },
  cardSection: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  rowValue: { fontSize: 14, color: COLORS.textSecondary },
  rowChevron: { fontSize: 18, color: COLORS.textMuted },
  destructive: { color: COLORS.danger },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalClose: { fontSize: 15, color: COLORS.primary },
  modalContent: { padding: 12, paddingBottom: 32 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 32 },
  groupName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  groupMeta: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  leaveBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  leaveBtnText: { fontSize: 14, color: COLORS.danger, fontWeight: '600' },
  venueSportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 0,
    marginTop: 8,
    borderRadius: 4,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  venueLabel: { flex: 1, fontSize: 14, color: COLORS.text },
});

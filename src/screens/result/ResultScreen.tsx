import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { OrangeButton } from '../../components/common/OrangeButton';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { MEMBERS, Member } from '../../constants/venues';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { usePendingRecords } from '../../hooks/useRecords';
import { updateRecord } from '../../firebase/firestore';
import { formatDate, formatCurrency } from '../../utils/settlement';
import { Record as GameRecord } from '../../types';

const RecordRow: React.FC<{ record: GameRecord; onPress: () => void }> = ({ record, onPress }) => (
  <TouchableOpacity style={styles.recordRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.recordLeft}>
      <Text style={styles.recordSport}>{record.sport}</Text>
      <Text style={styles.recordVenue}>{record.venue} {record.race}</Text>
      <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
    </View>
    <View style={styles.recordRight}>
      <Text style={styles.recordInvest}>{formatCurrency(record.invest)}</Text>
      <Text style={styles.recordMembers}>
        {record.buyType === 'ノリ' ? record.noriMembers.join('・') : record.member}
      </Text>
      <View style={styles.pendingBadge}>
        <Text style={styles.pendingBadgeText}>結果待ち</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const ResultModal: React.FC<{
  record: GameRecord | null;
  onClose: () => void;
}> = ({ record, onClose }) => {
  const [recover, setRecover] = useState('');
  const [predictor, setPredictor] = useState<Member | undefined>(undefined);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!record) return null;

  const isHit = parseInt(recover || '0', 10) > 0;

  const handleSave = async () => {
    const recoverAmt = parseInt(recover || '0', 10);
    setLoading(true);
    try {
      await updateRecord(record.recordId, {
        recover: recoverAmt,
        pending: false,
        predictor: isHit ? predictor : undefined,
        victoryComment: isHit ? comment : undefined,
      });
      Alert.alert(recoverAmt > 0 ? '的中！🎉' : '残念...', '結果を登録しました');
      onClose();
    } catch {
      Alert.alert('エラー', '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modal}>
        <Text style={styles.modalTitle}>払戻金入力</Text>
        <Card>
          <Text style={styles.modalInfo}>
            {record.sport} / {record.venue} {record.race}
          </Text>
          <Text style={styles.modalInfo}>
            掛け金: {formatCurrency(record.invest)}
          </Text>
          <Text style={styles.modalInfo}>
            {record.buyType === 'ノリ' ? `ノリ: ${record.noriMembers.join('・')}` : `単騎: ${record.member}`}
          </Text>
        </Card>

        <Text style={styles.fieldLabel}>払戻金（外れの場合は0）</Text>
        <TextInput
          style={styles.input}
          value={recover}
          onChangeText={(v) => setRecover(v.replace(/[^0-9]/g, ''))}
          placeholder="0"
          keyboardType="number-pad"
          autoFocus
        />

        {isHit && (
          <>
            <Text style={styles.fieldLabel}>予想者（任意）</Text>
            <View style={styles.chipRow}>
              {MEMBERS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, predictor === m && styles.chipSelected]}
                  onPress={() => setPredictor(predictor === m ? undefined : m)}
                >
                  <Text style={[styles.chipText, predictor === m && styles.chipTextSelected]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>勝利コメント（任意）</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={comment}
              onChangeText={setComment}
              placeholder="一言コメント"
              multiline
              numberOfLines={3}
            />
          </>
        )}

        <OrangeButton title="登録する" onPress={handleSave} loading={loading} style={styles.modalBtn} />
        <OrangeButton title="キャンセル" onPress={onClose} variant="outline" />
      </SafeAreaView>
    </Modal>
  );
};

export const ResultScreen: React.FC = () => {
  const { user } = useAuth();
  const { groups } = useGroups(user?.uid);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null);

  const activeGroupId = selectedGroup || groups[0]?.groupId;
  const { pending } = usePendingRecords(activeGroupId);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>結果入力</Text>
        {pending.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabs}>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.groupId}
              style={[styles.groupTab, activeGroupId === g.groupId && styles.groupTabActive]}
              onPress={() => setSelectedGroup(g.groupId)}
            >
              <Text style={[styles.groupTabText, activeGroupId === g.groupId && styles.groupTabTextActive]}>
                {g.groupName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {pending.length === 0 ? (
        <EmptyState icon="✅" message="結果待ちのレースはありません" sub="入力タブから新しいレースを登録してください" />
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>結果待ち {pending.length}件</Text>
          {pending.map((r) => (
            <RecordRow key={r.recordId} record={r} onPress={() => setSelectedRecord(r)} />
          ))}
        </ScrollView>
      )}

      <ResultModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, flex: 1 },
  headerBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  groupTabs: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  groupTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  groupTabActive: { borderBottomColor: COLORS.primary },
  groupTabText: { fontSize: 14, color: COLORS.textSecondary },
  groupTabTextActive: { color: COLORS.primary, fontWeight: '600' },
  content: { padding: 12, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  recordLeft: { flex: 1 },
  recordRight: { alignItems: 'flex-end' },
  recordSport: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  recordVenue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  recordDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  recordInvest: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  recordMembers: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pendingBadge: {
    marginTop: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: { fontSize: 10, color: COLORS.primaryDark, fontWeight: '600' },
  modal: { flex: 1, padding: 24, backgroundColor: COLORS.background },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInfo: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextSelected: { color: COLORS.white, fontWeight: '600' },
  modalBtn: { marginTop: 24, marginBottom: 8 },
});

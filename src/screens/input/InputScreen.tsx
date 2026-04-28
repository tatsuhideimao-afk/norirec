import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { OrangeButton } from '../../components/common/OrangeButton';
import { Card } from '../../components/common/Card';
import { MEMBERS, SPORTS, VENUES, RACE_NUMBERS, Member, Sport } from '../../constants/venues';
import { InputFormData, BuyType } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { addRecord } from '../../firebase/firestore';
import { formatDate } from '../../utils/settlement';

const initialForm: InputFormData = {
  step: 1,
  buyType: 'ノリ',
  noriMembers: [...MEMBERS],
  sport: null,
  venue: '',
  race: '',
  date: new Date(),
  invest: '',
  machineName: '',
};

const StepIndicator: React.FC<{ step: number }> = ({ step }) => (
  <View style={styles.stepRow}>
    {[1, 2, 3, 4].map((s) => (
      <React.Fragment key={s}>
        <View style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]}>
          <Text style={[styles.stepNum, (s === step || s < step) && styles.stepNumActive]}>{s}</Text>
        </View>
        {s < 4 && <View style={[styles.stepLine, s < step && styles.stepLineDone]} />}
      </React.Fragment>
    ))}
  </View>
);

export const InputScreen: React.FC = () => {
  const { user } = useAuth();
  const { groups } = useGroups(user?.uid);
  const [form, setForm] = useState<InputFormData>(initialForm);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const update = (patch: Partial<InputFormData>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    if (!selectedGroup) { Alert.alert('エラー', 'グループを選択してください'); return; }
    if (!form.sport) { Alert.alert('エラー', '競技を選択してください'); return; }
    if (!form.race) { Alert.alert('エラー', 'レースを選択してください'); return; }
    if (!form.invest) { Alert.alert('エラー', '掛け金を入力してください'); return; }
    if (form.buyType === 'ノリ' && form.noriMembers.length < 2) {
      Alert.alert('エラー', 'ノリは2人以上選択してください');
      return;
    }

    setLoading(true);
    try {
      await addRecord({
        groupId: selectedGroup,
        date: form.date,
        sport: form.sport,
        venue: form.sport === 'パチンコスロット' ? form.machineName : form.venue,
        race: form.sport === 'パチンコスロット' ? form.machineName : form.race,
        invest: parseInt(form.invest, 10),
        recover: 0,
        buyType: form.buyType,
        noriMembers: form.buyType === 'ノリ' ? form.noriMembers : [],
        member: form.buyType === '単騎' ? (form.noriMembers[0] ?? MEMBERS[0]) : MEMBERS[0],
        pending: true,
        createdBy: user?.uid ?? '',
      });
      Alert.alert('登録完了', 'レコードを登録しました', [
        { text: 'OK', onPress: () => setForm({ ...initialForm, date: form.date }) },
      ]);
    } catch {
      Alert.alert('エラー', '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Step 1
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>種別を選択</Text>

      {groups.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>グループ</Text>
          <View style={styles.chipRow}>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.groupId}
                style={[styles.chip, selectedGroup === g.groupId && styles.chipSelected]}
                onPress={() => setSelectedGroup(g.groupId)}
              >
                <Text style={[styles.chipText, selectedGroup === g.groupId && styles.chipTextSelected]}>
                  {g.groupName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.fieldLabel}>種別</Text>
      <View style={styles.typeRow}>
        {(['ノリ', '単騎'] as BuyType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, form.buyType === t && styles.typeBtnSelected]}
            onPress={() => update({ buyType: t, noriMembers: t === 'ノリ' ? [...MEMBERS] : [MEMBERS[0]] })}
          >
            <Text style={[styles.typeBtnText, form.buyType === t && styles.typeBtnTextSelected]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>
        {form.buyType === 'ノリ' ? 'メンバー（複数選択）' : 'メンバー（1人選択）'}
      </Text>

      {form.buyType === 'ノリ' && (
        <TouchableOpacity
          style={[styles.chip, form.noriMembers.length === MEMBERS.length && styles.chipSelected]}
          onPress={() =>
            update({ noriMembers: form.noriMembers.length === MEMBERS.length ? [] : [...MEMBERS] })
          }
        >
          <Text style={[styles.chipText, form.noriMembers.length === MEMBERS.length && styles.chipTextSelected]}>
            全員
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.chipRow}>
        {MEMBERS.map((m) => {
          const sel = form.buyType === 'ノリ'
            ? form.noriMembers.includes(m)
            : form.noriMembers[0] === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.chip, sel && styles.chipSelected]}
              onPress={() => {
                if (form.buyType === 'ノリ') {
                  update({
                    noriMembers: sel
                      ? form.noriMembers.filter((x) => x !== m)
                      : [...form.noriMembers, m],
                  });
                } else {
                  update({ noriMembers: [m] });
                }
              }}
            >
              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Step 2
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>競技・場を選択</Text>
      <Text style={styles.fieldLabel}>競技</Text>
      <View style={styles.chipRow}>
        {SPORTS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, form.sport === s && styles.chipSelected]}
            onPress={() => update({ sport: s as Sport, venue: '' })}
          >
            <Text style={[styles.chipText, form.sport === s && styles.chipTextSelected]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {form.sport && form.sport !== 'その他' && form.sport !== 'パチンコスロット' && (
        <>
          <Text style={styles.fieldLabel}>場</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {VENUES[form.sport]?.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, form.venue === v && styles.chipSelected]}
                  onPress={() => update({ venue: v })}
                >
                  <Text style={[styles.chipText, form.venue === v && styles.chipTextSelected]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {form.sport === 'パチンコスロット' && (
        <>
          <Text style={styles.fieldLabel}>店舗名</Text>
          <TextInput
            style={styles.textInput}
            value={form.venue}
            onChangeText={(v) => update({ venue: v })}
            placeholder="店舗名を入力"
          />
        </>
      )}
    </View>
  );

  // Step 3
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>日付・レース・金額</Text>

      <Text style={styles.fieldLabel}>日付</Text>
      <TouchableOpacity style={styles.textInput} onPress={() => setShowDate(true)}>
        <Text style={{ fontSize: 16, color: COLORS.text }}>{formatDate(form.date)}</Text>
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={form.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDate(false); if (d) update({ date: d }); }}
        />
      )}

      {form.sport !== 'パチンコスロット' && (
        <>
          <Text style={styles.fieldLabel}>レース</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {RACE_NUMBERS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, form.race === r && styles.chipSelected]}
                  onPress={() => update({ race: r })}
                >
                  <Text style={[styles.chipText, form.race === r && styles.chipTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {form.sport === 'パチンコスロット' && (
        <>
          <Text style={styles.fieldLabel}>機種名</Text>
          <TextInput
            style={styles.textInput}
            value={form.machineName}
            onChangeText={(v) => update({ machineName: v })}
            placeholder="機種名を入力"
          />
        </>
      )}

      <Text style={styles.fieldLabel}>掛け金（円）</Text>
      <TextInput
        style={styles.textInput}
        value={form.invest}
        onChangeText={(v) => update({ invest: v.replace(/[^0-9]/g, '') })}
        placeholder="1000"
        keyboardType="number-pad"
      />
    </View>
  );

  // Step 4: Confirm
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>確認</Text>
      <Card>
        {[
          ['種別', form.buyType],
          ['メンバー', form.buyType === 'ノリ' ? form.noriMembers.join('・') : form.noriMembers[0]],
          ['グループ', groups.find((g) => g.groupId === selectedGroup)?.groupName ?? '-'],
          ['競技', form.sport ?? '-'],
          ['場', form.venue || '-'],
          ['レース', form.race || '-'],
          ['日付', formatDate(form.date)],
          ['掛け金', `¥${parseInt(form.invest || '0').toLocaleString()}`],
        ].map(([label, value]) => (
          <View key={label} style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>{label}</Text>
            <Text style={styles.confirmValue}>{value}</Text>
          </View>
        ))}
      </Card>
    </View>
  );

  const canNext = () => {
    if (form.step === 1) return !!selectedGroup && form.noriMembers.length > 0;
    if (form.step === 2) return !!form.sport && (form.sport === 'その他' || !!form.venue || form.sport === 'パチンコスロット');
    if (form.step === 3) return !!form.invest && (form.sport === 'パチンコスロット' || !!form.race);
    return true;
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>入力</Text>
      </View>
      <StepIndicator step={form.step} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {form.step === 1 && renderStep1()}
        {form.step === 2 && renderStep2()}
        {form.step === 3 && renderStep3()}
        {form.step === 4 && renderStep4()}
      </ScrollView>
      <View style={styles.navBtns}>
        {form.step > 1 && (
          <OrangeButton
            title="戻る"
            variant="outline"
            onPress={() => update({ step: form.step - 1 })}
            style={styles.navBtn}
          />
        )}
        {form.step < 4 ? (
          <OrangeButton
            title="次へ"
            onPress={() => update({ step: form.step + 1 })}
            disabled={!canNext()}
            style={[styles.navBtn, form.step === 1 && styles.fullBtn]}
          />
        ) : (
          <OrangeButton
            title="登録する"
            onPress={handleSubmit}
            loading={loading}
            style={styles.navBtn}
          />
        )}
      </View>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  stepDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  stepDotDone: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.primaryLight,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  stepNumActive: {
    color: COLORS.white,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: COLORS.primaryLight,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  stepContent: { gap: 4 },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeBtnTextSelected: {
    color: COLORS.white,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  confirmLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  confirmValue: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  navBtns: {
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
  navBtn: { flex: 1 },
  fullBtn: { flex: 1 },
});

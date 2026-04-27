import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { MEMBERS, SPORTS, Member, Sport } from '../../constants/venues';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useGroupRecords } from '../../hooks/useRecords';
import { calcMemberStats, formatCurrency, formatROI } from '../../utils/settlement';
import { Record as GameRecord, MemberStats } from '../../types';

type TopTab = 'ノリ' | '個人' | '全体';
type PeriodFilter = '今日' | '今月' | '全期間';

const RANK_ICONS = ['🥇', '🥈', '🥉', '💀'];

const KpiRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.kpiRow}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, color ? { color } : {}]}>{value}</Text>
  </View>
);

const MemberStatsCard: React.FC<{ stats: MemberStats; rank?: number }> = ({ stats, rank }) => {
  const roiColor = stats.roi >= 100 ? COLORS.success : COLORS.danger;
  return (
    <Card style={styles.statsCard}>
      <View style={styles.statsHeader}>
        {rank !== undefined && <Text style={styles.rankIcon}>{RANK_ICONS[rank] ?? '💀'}</Text>}
        <Text style={styles.memberName}>{stats.member}</Text>
        <Text style={[styles.profitBig, { color: stats.profit >= 0 ? COLORS.success : COLORS.danger }]}>
          {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
        </Text>
      </View>
      <View style={styles.kpiGrid}>
        <KpiRow label="投入" value={formatCurrency(stats.invest)} />
        <KpiRow label="回収" value={formatCurrency(stats.recover)} />
        <KpiRow label="ROI" value={formatROI(stats.roi)} color={roiColor} />
        <KpiRow label="的中率" value={`${stats.hitRate.toFixed(1)}%`} />
        <KpiRow label="的中/本数" value={`${stats.hitCount}/${stats.totalCount}`} />
      </View>
    </Card>
  );
};

const RoiBar: React.FC<{ label: string; roi: number; maxRoi: number }> = ({ label, roi, maxRoi }) => {
  const width = maxRoi > 0 ? (roi / maxRoi) * 100 : 0;
  const color = roi >= 100 ? COLORS.success : COLORS.danger;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(width, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{formatROI(roi)}</Text>
    </View>
  );
};

// Period filter helper
const filterByPeriod = (records: GameRecord[], period: PeriodFilter): GameRecord[] => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return records.filter((r) => {
    if (r.pending) return false;
    if (period === '今日') return r.date >= todayStart;
    if (period === '今月') return r.date >= monthStart;
    return true;
  });
};

// --- Nori Tab ---
const NoriTab: React.FC<{ records: GameRecord[] }> = ({ records }) => {
  const [subTab, setSubTab] = useState<'貢献度' | Member>('貢献度');
  const noriRecords = records.filter((r) => r.buyType === 'ノリ');

  const contributionStats = useMemo(() => {
    const map: Record<string, { wins: number; recover: number }> = {};
    MEMBERS.forEach((m) => { map[m] = { wins: 0, recover: 0 }; });
    noriRecords.forEach((r) => {
      if (r.predictor) {
        map[r.predictor].wins += 1;
        map[r.predictor].recover += r.recover;
      }
    });
    return MEMBERS.map((m) => ({ member: m, ...map[m] }))
      .sort((a, b) => b.recover - a.recover);
  }, [noriRecords]);

  const subTabs: ('貢献度' | Member)[] = ['貢献度', ...MEMBERS];

  return (
    <View style={styles.flex}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabBar}>
        {subTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, subTab === t && styles.subTabActive]}
            onPress={() => setSubTab(t)}
          >
            <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.tabContent}>
        {subTab === '貢献度' ? (
          contributionStats.length === 0 ? (
            <EmptyState icon="📊" message="データがありません" />
          ) : (
            contributionStats.map((s, i) => (
              <Card key={s.member} style={styles.statsCard}>
                <View style={styles.statsHeader}>
                  <Text style={styles.rankIcon}>{RANK_ICONS[i] ?? '💀'}</Text>
                  <Text style={styles.memberName}>{s.member}</Text>
                  <Text style={styles.profitBig}>{formatCurrency(s.recover)}</Text>
                </View>
                <KpiRow label="予想的中数" value={`${s.wins}回`} />
              </Card>
            ))
          )
        ) : (
          (() => {
            const stats = calcMemberStats(noriRecords, subTab as Member, 'ノリ');
            return stats.totalCount === 0
              ? <EmptyState icon="📊" message="データがありません" />
              : <MemberStatsCard stats={stats} />;
          })()
        )}
      </ScrollView>
    </View>
  );
};

// --- Individual Tab ---
const IndividualTab: React.FC<{ records: GameRecord[] }> = ({ records }) => {
  const [subTab, setSubTab] = useState<'ランキング' | Member>('ランキング');
  const soloRecords = records.filter((r) => r.buyType === '単騎');
  const subTabs: ('ランキング' | Member)[] = ['ランキング', ...MEMBERS];

  const ranking = useMemo(
    () =>
      MEMBERS.map((m) => calcMemberStats(soloRecords, m, '単騎'))
        .sort((a, b) => b.profit - a.profit),
    [soloRecords],
  );

  return (
    <View style={styles.flex}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabBar}>
        {subTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, subTab === t && styles.subTabActive]}
            onPress={() => setSubTab(t)}
          >
            <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.tabContent}>
        {subTab === 'ランキング' ? (
          ranking.length === 0 ? (
            <EmptyState icon="📊" message="データがありません" />
          ) : (
            ranking.map((s, i) => <MemberStatsCard key={s.member} stats={s} rank={i} />)
          )
        ) : (
          (() => {
            const stats = calcMemberStats(soloRecords, subTab as Member, '単騎');
            return stats.totalCount === 0
              ? <EmptyState icon="📊" message="データがありません" />
              : <MemberStatsCard stats={stats} />;
          })()
        )}
      </ScrollView>
    </View>
  );
};

// --- Overall Tab ---
const OverallTab: React.FC<{ records: GameRecord[] }> = ({ records }) => {
  const [subTab, setSubTab] = useState<'全競技' | Sport>('全競技');
  const subTabs: ('全競技' | Sport)[] = ['全競技', ...SPORTS];

  const sportStats = useMemo(
    () =>
      SPORTS.map((sport) => {
        const rs = records.filter((r) => r.sport === sport);
        const invest = rs.reduce((s, r) => s + r.invest, 0);
        const recover = rs.reduce((s, r) => s + r.recover, 0);
        const roi = invest > 0 ? (recover / invest) * 100 : 0;
        return { sport, invest, recover, roi, count: rs.length };
      }).filter((s) => s.count > 0),
    [records],
  );

  const maxRoi = Math.max(...sportStats.map((s) => s.roi), 200);

  const venueStats = useMemo(() => {
    if (subTab === '全競技') return [];
    const rs = records.filter((r) => r.sport === subTab);
    const venueMap: Record<string, { invest: number; recover: number }> = {};
    rs.forEach((r) => {
      if (!venueMap[r.venue]) venueMap[r.venue] = { invest: 0, recover: 0 };
      venueMap[r.venue].invest += r.invest;
      venueMap[r.venue].recover += r.recover;
    });
    return Object.entries(venueMap)
      .map(([venue, { invest, recover }]) => ({
        venue,
        invest,
        recover,
        roi: invest > 0 ? (recover / invest) * 100 : 0,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [records, subTab]);

  const currentRecords = subTab === '全競技' ? records : records.filter((r) => r.sport === subTab);
  const totalInvest = currentRecords.reduce((s, r) => s + r.invest, 0);
  const totalRecover = currentRecords.reduce((s, r) => s + r.recover, 0);
  const totalRoi = totalInvest > 0 ? (totalRecover / totalInvest) * 100 : 0;

  return (
    <View style={styles.flex}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabBar}>
        {subTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, subTab === t && styles.subTabActive]}
            onPress={() => setSubTab(t as '全競技' | Sport)}
          >
            <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.tabContent}>
        {currentRecords.length === 0 ? (
          <EmptyState icon="📊" message="データがありません" />
        ) : (
          <>
            <Card>
              <KpiRow label="総投入" value={formatCurrency(totalInvest)} />
              <KpiRow label="総回収" value={formatCurrency(totalRecover)} />
              <KpiRow
                label="収支"
                value={`${totalRecover - totalInvest >= 0 ? '+' : ''}${formatCurrency(totalRecover - totalInvest)}`}
                color={totalRecover - totalInvest >= 0 ? COLORS.success : COLORS.danger}
              />
              <KpiRow label="ROI" value={formatROI(totalRoi)} color={totalRoi >= 100 ? COLORS.success : COLORS.danger} />
              <KpiRow label="レース数" value={`${currentRecords.length}件`} />
            </Card>

            {subTab === '全競技' && sportStats.length > 0 && (
              <>
                <Text style={styles.chartTitle}>競技別ROI</Text>
                <Card>
                  {sportStats.map((s) => (
                    <RoiBar key={s.sport} label={s.sport} roi={s.roi} maxRoi={maxRoi} />
                  ))}
                </Card>
              </>
            )}

            {subTab !== '全競技' && venueStats.length > 0 && (
              <>
                <Text style={styles.chartTitle}>場別ROI</Text>
                <Card>
                  {venueStats.map((s) => (
                    <RoiBar
                      key={s.venue}
                      label={s.venue}
                      roi={s.roi}
                      maxRoi={Math.max(...venueStats.map((x) => x.roi), 200)}
                    />
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// --- Main SummaryScreen ---
export const SummaryScreen: React.FC = () => {
  const { user } = useAuth();
  const { groups } = useGroups(user?.uid);
  const [topTab, setTopTab] = useState<TopTab>('ノリ');
  const [period, setPeriod] = useState<PeriodFilter>('今月');
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const activeGroupId = selectedGroup || groups[0]?.groupId;
  const { records, loading } = useGroupRecords(activeGroupId);
  const filtered = useMemo(() => filterByPeriod(records, period), [records, period]);

  const topTabs: TopTab[] = ['ノリ', '個人', '全体'];
  const periods: PeriodFilter[] = ['今日', '今月', '全期間'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>集計</Text>
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

      {/* Period Filter */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Tabs */}
      <View style={styles.topTabBar}>
        {topTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.topTab, topTab === t && styles.topTabActive]}
            onPress={() => setTopTab(t)}
          >
            <Text style={[styles.topTabText, topTab === t && styles.topTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.flex}>
        {loading ? (
          <EmptyState icon="⏳" message="読み込み中..." />
        ) : groups.length === 0 ? (
          <EmptyState icon="🏟️" message="グループがありません" sub="ホームタブからグループを作成してください" />
        ) : topTab === 'ノリ' ? (
          <NoriTab records={filtered} />
        ) : topTab === '個人' ? (
          <IndividualTab records={filtered} />
        ) : (
          <OverallTab records={filtered} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
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
  periodRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  periodBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  periodBtnText: { fontSize: 13, color: COLORS.textSecondary },
  periodBtnTextActive: { color: COLORS.primaryDark, fontWeight: '600' },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  topTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabActive: { borderBottomColor: COLORS.primary },
  topTabText: { fontSize: 14, color: COLORS.textSecondary },
  topTabTextActive: { color: COLORS.primary, fontWeight: '700' },
  subTabBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  subTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: COLORS.primary },
  subTabText: { fontSize: 13, color: COLORS.textSecondary },
  subTabTextActive: { color: COLORS.primary, fontWeight: '600' },
  tabContent: { padding: 12, paddingBottom: 32 },
  statsCard: { marginBottom: 10 },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  rankIcon: { fontSize: 20 },
  memberName: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  profitBig: { fontSize: 16, fontWeight: '700' },
  kpiGrid: { gap: 4 },
  kpiRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  kpiLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  kpiValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 6,
  },
  barLabel: { width: 64, fontSize: 11, color: COLORS.text },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 52, fontSize: 11, fontWeight: '600', textAlign: 'right' },
});

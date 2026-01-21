import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function InsightsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Insights</ThemedText>
        <TouchableOpacity style={styles.periodSelector}>
          <ThemedText style={styles.periodText}>This Month</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={colors.text} style={{ transform: [{ rotate: '90deg'}] }} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Main Stats Card */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#16202C' }]}>
            <View style={styles.statIconContainer}>
               <IconSymbol name="house.fill" size={20} color="#1D8CF8" />
            </View>
            <ThemedText style={styles.statValue}>124</ThemedText>
            <ThemedText style={styles.statLabel}>Total Views</ThemedText>
            <View style={styles.trendRow}>
               <ThemedText style={styles.trendUp}>+12.5%</ThemedText>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#16202C' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
               <IconSymbol name="person.fill" size={20} color="#22C55E" />
            </View>
            <ThemedText style={styles.statValue}>48</ThemedText>
            <ThemedText style={styles.statLabel}>Active Leads</ThemedText>
            <View style={styles.trendRow}>
               <ThemedText style={styles.trendUp}>+5.2%</ThemedText>
            </View>
          </View>
        </View>

        {/* Chart Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Viewer Engagement</ThemedText>
            <TouchableOpacity>
               <ThemedText style={styles.seeAll}>Details</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.chartContainer}>
            {/* Mock Chart Visualization */}
            <View style={styles.mockChart}>
              {[50, 80, 45, 90, 70, 100, 60].map((h, i) => (
                <View key={i} style={styles.chartBarGroup}>
                  <View style={[styles.chartBar, { height: h, backgroundColor: i === 5 ? '#1D8CF8' : '#334155' }]} />
                  <ThemedText style={styles.chartLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Performing VR Tours */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Top Performing Tours</ThemedText>
          
          <View style={styles.tourItem}>
            <View style={styles.tourRank}>
               <ThemedText style={styles.rankNum}>#1</ThemedText>
            </View>
            <View style={styles.tourInfo}>
              <ThemedText style={styles.tourName}>Luxury Villa Overlook</ThemedText>
              <ThemedText style={styles.tourDetails}>32.5k views • 89 leads</ThemedText>
            </View>
            <View style={styles.tourTrend}>
               <IconSymbol name="chart.bar.fill" size={24} color="#1D8CF8" />
            </View>
          </View>

          <View style={styles.tourItem}>
            <View style={styles.tourRank}>
               <ThemedText style={styles.rankNum}>#2</ThemedText>
            </View>
            <View style={styles.tourInfo}>
              <ThemedText style={styles.tourName}>Downtown Loft Penthouse</ThemedText>
              <ThemedText style={styles.tourDetails}>28.1k views • 64 leads</ThemedText>
            </View>
            <View style={styles.tourTrend}>
               <IconSymbol name="chart.bar.fill" size={24} color="#334155" />
            </View>
          </View>
        </View>

        {/* AI Suggestions */}
        <View style={[styles.aiCard, { borderColor: '#1D8CF8' }]}>
          <View style={styles.aiHeader}>
             <IconSymbol name="plus.circle.fill" size={20} color="#1D8CF8" />
             <ThemedText style={styles.aiTitle}>AI Insights</ThemedText>
          </View>
          <ThemedText style={styles.aiText}>
            Your "Luxury Villa" tour has 40% higher engagement on weekends. Consider running ads between 6pm and 9pm on Saturdays.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16202C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  periodText: { fontSize: 12, fontWeight: '600', color: '#1D8CF8' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  statCard: { flex: 1, borderRadius: 20, padding: 16 },
  statIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(29, 140, 248, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#94A3B8' },
  trendRow: { marginTop: 8 },
  trendUp: { fontSize: 11, color: '#22C55E', fontWeight: 'bold' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAll: { fontSize: 13, color: '#1D8CF8', fontWeight: 'bold' },
  sectionTitle: { marginBottom: 16 },
  chartContainer: { backgroundColor: '#16202C', borderRadius: 24, padding: 20, height: 200, justifyContent: 'flex-end' },
  mockChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  chartBarGroup: { alignItems: 'center', gap: 10 },
  chartBar: { width: 14, borderRadius: 7 },
  chartLabel: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
  tourItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16202C', borderRadius: 16, padding: 12, marginBottom: 12 },
  tourRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankNum: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8' },
  tourInfo: { flex: 1 },
  tourName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  tourDetails: { fontSize: 11, color: '#64748B' },
  tourTrend: { padding: 4 },
  aiCard: { backgroundColor: '#16202C', borderRadius: 20, padding: 20, borderWidth: 1, borderStyle: 'dashed' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiTitle: { fontSize: 14, fontWeight: 'bold', color: '#1D8CF8' },
  aiText: { fontSize: 13, color: '#94A3B8', lineHeight: 20 }
});

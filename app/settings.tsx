import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.right" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg'}] }} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.sectionTitle}>CAPTURE</ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Default Quality</ThemedText>
            </View>
            <View style={styles.rowRight}>
              <ThemedText style={styles.rowValue}>High (4K)</ThemedText>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </View>
          </TouchableOpacity>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Grid lines</ThemedText>
            </View>
            <Switch value={true} />
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>STORAGE</ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="paperplane.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Auto-cloud sync</ThemedText>
            </View>
            <Switch value={false} />
          </View>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Clear cache</ThemedText>
            </View>
            <ThemedText style={styles.rowValue}>1.2 GB</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.sectionTitle}>GENERAL</ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Notifications</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.icon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Language</ThemedText>
            </View>
            <View style={styles.rowRight}>
              <ThemedText style={styles.rowValue}>English</ThemedText>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </View>
          </TouchableOpacity>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <ThemedText style={styles.rowLabel}>Dark Mode</ThemedText>
            </View>
            <Switch value={true} />
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.version}>Version 2.4.0 (Build 108)</ThemedText>
          <View style={styles.footerLinks}>
            <TouchableOpacity><ThemedText style={styles.footerLink}>Terms of Service</ThemedText></TouchableOpacity>
            <ThemedText style={styles.bullet}>•</ThemedText>
            <TouchableOpacity><ThemedText style={styles.footerLink}>Privacy Policy</ThemedText></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scroll: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 25,
    marginTop: 25,
    marginBottom: 10,
    letterSpacing: 1,
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    color: '#94A3B8',
  },
  footer: {
    marginTop: 50,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: '#64748B',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  footerLink: {
    fontSize: 12,
    color: '#1D8CF8',
  },
  bullet: {
    color: '#334155',
  }
});

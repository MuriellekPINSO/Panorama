import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle">My Profile</ThemedText>
        <TouchableOpacity>
          <IconSymbol name="chevron.right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileInfo}>
        <View style={styles.avatarContainer}>
           {/* Placeholder for avatar */}
           <View style={[styles.avatar, { backgroundColor: colors.border }]} />
           <View style={styles.proBadge}>
             <ThemedText style={styles.proText}>PRO</ThemedText>
           </View>
        </View>
        <ThemedText type="title" style={styles.name}>Jonathan Miller</ThemedText>
        <ThemedText style={styles.role}>Real Estate Photographer</ThemedText>
        <ThemedText style={styles.location}>📍 New York, NY</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">124</ThemedText>
          <ThemedText style={styles.statLabel}>TOTAL PANORAMAS</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">12.5k</ThemedText>
          <ThemedText style={styles.statLabel}>TOTAL VIEWS</ThemedText>
        </View>
      </View>

      <View style={[styles.storageCard, { backgroundColor: colors.card }]}>
        <View style={styles.storageHeader}>
          <View style={styles.storageIconText}>
            <IconSymbol name="rectangle.stack.fill" size={20} color={colors.tint} />
            <ThemedText style={{ marginLeft: 8 }}>Cloud Storage</ThemedText>
          </View>
          <ThemedText style={styles.storageValue}>7.5GB / 10GB</ThemedText>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '75%', backgroundColor: colors.tint }]} />
        </View>
        <ThemedText style={styles.storageNote}>75% of your professional plan used</ThemedText>
      </View>

      <View style={styles.menu}>
        {[
          { icon: 'rectangle.stack.fill', label: 'Subscription Plan', subLabel: 'Premium Tier' },
          { icon: 'plus.circle.fill', label: 'App Settings', subLabel: 'Preferences & Security' },
          { icon: 'paperplane.fill', label: 'Help Center', subLabel: 'Tutorials & Support' },
        ].map((item, index) => (
          <TouchableOpacity key={index} style={[styles.menuItem, { backgroundColor: colors.card }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name={item.icon as any} size={20} color={colors.tint} />
              <View style={{ marginLeft: 12 }}>
                <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
                <ThemedText style={styles.menuSubLabel}>{item.subLabel}</ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
         <ThemedText style={styles.logoutText}>Log Out</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  proBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#1D8CF8',
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  proText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  role: {
    color: '#94A3B8',
    marginTop: 4,
  },
  location: {
    color: '#94A3B8',
    marginTop: 4,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 30,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 5,
  },
  storageCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storageIconText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageValue: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  storageNote: {
    marginTop: 10,
    fontSize: 12,
    color: '#94A3B8',
  },
  menu: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuSubLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  logoutBtn: {
    marginTop: 30,
    marginBottom: 100,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
});

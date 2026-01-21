import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Panorama {
  id: string;
  title: string;
  photos: string[];
  thumbnail: string;
  createdAt: number;
  photoCount: number;
}

// Fonction pour calculer le temps écoulé
const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return minutes === 0 ? 'À l\'instant' : `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(timestamp).toLocaleDateString('fr-FR');
};

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [panoramas, setPanoramas] = useState<Panorama[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPanoramas = async () => {
    try {
      const data = await AsyncStorage.getItem('panoramas');
      if (data) {
        setPanoramas(JSON.parse(data));
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadPanoramas();
  }, []);

  // Recharger quand l'écran devient actif
  useFocusEffect(
    React.useCallback(() => {
      loadPanoramas();
    }, [])
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">Panorama Library</ThemedText>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.card }]}>
          <IconSymbol name="plus.circle.fill" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <IconSymbol name="plus.circle.fill" size={18} color="#94A3B8" />
        <TextInput 
          placeholder="Search properties..." 
          placeholderTextColor="#94A3B8"
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {['All', 'Recent', 'Favorites', 'Shared'].map((chip, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[
              styles.chip, 
              idx === 0 ? styles.activeChip : { backgroundColor: colors.card }
            ]}
          >
            <ThemedText style={idx === 0 ? styles.activeChipText : styles.chipText}>
              {chip}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Recent Captures</ThemedText>
        <TouchableOpacity onPress={loadPanoramas}>
          <ThemedText style={styles.viewAll}>{panoramas.length} total</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D8CF8" />
        </View>
      ) : panoramas.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ThemedText style={{ color: '#94A3B8', textAlign: 'center' }}>
            Aucune photo 360° pour le moment.{"\n"}Commencez par créer votre premier panorama !
          </ThemedText>
        </View>
      ) : (
        <View style={styles.grid}>
          {panoramas.map((item) => {
            const timeAgo = getTimeAgo(item.createdAt);
            return (
              <TouchableOpacity 
                key={item.id} 
                style={styles.card}
                onPress={() => {
                  router.push({
                    pathname: '/panorama-viewer',
                    params: { data: JSON.stringify(item) }
                  });
                }}
              >
                <View style={[styles.cardImage, { backgroundColor: colors.card }]}>
                  <Image 
                    source={{ uri: item.thumbnail }} 
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  <View style={styles.cardOverlay}>
                    <IconSymbol name="rectangle.stack.fill" size={14} color="white" />
                    <ThemedText style={styles.photoCountBadge}>{item.photoCount}</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.cardTitle} numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText style={styles.cardTime}>{timeAgo}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={[styles.newCaptureCard, { backgroundColor: colors.card }]}>
         <View style={styles.newCaptureIcon}>
           <IconSymbol name="plus.circle.fill" size={40} color="#94A3B8" />
         </View>
         <ThemedText type="subtitle" style={styles.newCaptureTitle}>New Property Capture?</ThemedText>
         <ThemedText style={styles.newCaptureSub}>Capture immersive 360° views and add{"\n"}them to your portfolio instantly.</ThemedText>
         <TouchableOpacity style={styles.captureBtn}>
           <ThemedText style={styles.captureBtnText}>Start Capturing</ThemedText>
         </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  photoCountBadge: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    marginHorizontal: 20,
    marginTop: 20,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
  },
  chipsRow: {
    marginTop: 20,
    paddingLeft: 20,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  activeChip: {
    backgroundColor: '#1D8CF8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  activeChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chipText: {
    color: '#94A3B8',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 30,
    alignItems: 'center',
  },
  viewAll: {
    color: '#1D8CF8',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 20,
  },
  cardImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  cardTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  newCaptureCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  newCaptureIcon: {
    width: '100%',
    height: 120,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  newCaptureTitle: {
    textAlign: 'center',
  },
  newCaptureSub: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  captureBtn: {
    backgroundColor: '#1D8CF8',
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
  },
  captureBtnText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

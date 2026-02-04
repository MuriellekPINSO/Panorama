import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

// Interface pour les panoramas sauvegardés
interface PanoramaItem {
  id: string;
  title: string;
  stitched: boolean;
  panoramaUri?: string;    // Si assemblé
  photos?: string[];       // Si non assemblé (fallback)
  photoCount: number;
  createdAt: number;
  aspectRatio: number;
}

// Données de démonstration (utilisées si pas de panoramas sauvegardés)
const DEMO_DATA: PanoramaItem[] = [
  { id: 'demo1', title: 'Modern Living Room', stitched: true, panoramaUri: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80', photoCount: 8, createdAt: Date.now() - 2*24*60*60*1000, aspectRatio: 2 },
  { id: 'demo2', title: 'Ocean View Balcony', stitched: true, panoramaUri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80', photoCount: 8, createdAt: Date.now() - 5*24*60*60*1000, aspectRatio: 2 },
];

export default function GalleryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  
  const [panoramas, setPanoramas] = useState<PanoramaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les panoramas depuis AsyncStorage
  const loadPanoramas = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('panoramas');
      if (data) {
        const savedPanoramas = JSON.parse(data) as PanoramaItem[];
        console.log(`📂 Loaded ${savedPanoramas.length} panoramas from storage`);
        setPanoramas(savedPanoramas);
      } else {
        console.log('📂 No saved panoramas, showing demo data');
        setPanoramas(DEMO_DATA);
      }
    } catch (error) {
      console.error('Error loading panoramas:', error);
      setPanoramas(DEMO_DATA);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recharger quand l'écran devient actif
  useFocusEffect(
    useCallback(() => {
      loadPanoramas();
    }, [loadPanoramas])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPanoramas();
  }, [loadPanoramas]);

  // Formater la date relative
  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine(s)`;
    return `Il y a ${Math.floor(days / 30)} mois`;
  };

  // Obtenir l'image de prévisualisation
  const getPreviewImage = (item: PanoramaItem) => {
    if (item.stitched && item.panoramaUri) {
      return item.panoramaUri;
    }
    if (item.photos && item.photos.length > 0) {
      return item.photos[0]; // Première photo comme aperçu
    }
    return 'https://via.placeholder.com/400x400?text=No+Preview';
  };

  // Supprimer un panorama
  const deletePanorama = async (id: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce panorama ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPanoramas = panoramas.filter(p => p.id !== id);
              await AsyncStorage.setItem('panoramas', JSON.stringify(updatedPanoramas));
              setPanoramas(updatedPanoramas);
            } catch (error) {
              console.error('Error deleting panorama:', error);
            }
          }
        }
      ]
    );
  };

  // Ouvrir le viewer 360
  const openViewer = (item: PanoramaItem) => {
    if (item.stitched && item.panoramaUri) {
      router.push({
        pathname: '/panorama-viewer',
        params: { uri: item.panoramaUri, title: item.title }
      });
    } else if (item.photos && item.photos.length > 0) {
      Alert.alert(
        'Panorama non assemblé',
        'Ce panorama n\'a pas été assemblé. Les photos individuelles sont disponibles.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderItem = ({ item }: { item: PanoramaItem }) => (
    <TouchableOpacity 
      style={styles.gridItem}
      onPress={() => openViewer(item)}
      onLongPress={() => deletePanorama(item.id)}
    >
      <Image source={{ uri: getPreviewImage(item) }} style={styles.gridImage} />
      <View style={styles.gridOverlay}>
        <View style={[styles.typeBadge, !item.stitched && styles.typeBadgeWarning]}>
          <IconSymbol 
            name={item.stitched ? "rectangle.stack.fill" : "photo.stack"} 
            size={10} 
            color="white" 
          />
          <ThemedText style={styles.typeText}>
            {item.stitched ? '360°' : `${item.photoCount} photos`}
          </ThemedText>
        </View>
      </View>
      <View style={styles.gridInfo}>
        <ThemedText style={styles.gridTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={styles.gridDate}>{formatDate(item.createdAt)}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="photo.on.rectangle.angled" size={64} color="#64748B" />
      <ThemedText style={styles.emptyTitle}>Aucun panorama</ThemedText>
      <ThemedText style={styles.emptyText}>
        Créez votre premier panorama 360° en utilisant l'onglet "Créer"
      </ThemedText>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => router.push('/(tabs)/create')}
      >
        <ThemedText style={styles.createButtonText}>Créer un panorama</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Galerie</ThemedText>
        <View style={styles.headerRight}>
          <ThemedText style={styles.countText}>{panoramas.length} panoramas</ThemedText>
          <TouchableOpacity style={styles.filterBtn} onPress={() => router.push('/(tabs)/create')}>
            <IconSymbol name="plus.circle.fill" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={panoramas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={[styles.listContent, panoramas.length === 0 && styles.listContentEmpty]}
        columnWrapperStyle={panoramas.length > 0 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countText: { fontSize: 12, color: '#64748B' },
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16202C', justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  listContentEmpty: { flex: 1 },
  columnWrapper: { justifyContent: 'space-between' },
  gridItem: { width: COLUMN_WIDTH, marginBottom: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: '#16202C' },
  gridImage: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.2 },
  gridOverlay: { position: 'absolute', top: 10, left: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(29, 140, 248, 0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeWarning: { backgroundColor: 'rgba(245, 158, 11, 0.8)' },
  typeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  gridInfo: { padding: 12 },
  gridTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  gridDate: { fontSize: 11, color: '#64748B' },
  
  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  createButton: { backgroundColor: '#1D8CF8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createButtonText: { color: 'white', fontWeight: 'bold' },
});

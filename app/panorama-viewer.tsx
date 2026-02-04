import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gyroscope } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const PHOTO_WIDTH = width; // Chaque photo prend la largeur de l'écran

interface Panorama {
  id: string;
  title: string;
  stitched: boolean;
  panoramaUri?: string;    // Si assemblé (une seule image)
  photos?: string[];       // Si non assemblé (8 photos)
  thumbnail?: string;
  createdAt: number;
  photoCount: number;
}

export default function PanoramaViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Support pour les deux formats de données
  const [panorama, setPanorama] = useState<Panorama | null>(() => {
    // Format 1: URI directe passée en paramètre
    if (params.uri) {
      return {
        id: 'temp',
        title: (params.title as string) || 'Panorama 360°',
        stitched: true,
        panoramaUri: params.uri as string,
        createdAt: Date.now(),
        photoCount: 8
      };
    }
    // Format 2: Objet complet passé en JSON
    if (params.data) {
      return JSON.parse(params.data as string);
    }
    return null;
  });
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [is360Mode, setIs360Mode] = useState(false);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const gyroRotation = useRef(0);

  // Pour les panoramas assemblés, activer automatiquement le mode 360
  useEffect(() => {
    if (panorama?.stitched) {
      setIs360Mode(true);
    }
  }, [panorama]);

  // Gyroscope pour rotation panoramique continue
  useEffect(() => {
    if (!is360Mode || !gyroEnabled) return;

    Gyroscope.setUpdateInterval(16); // 60fps
    
    const subscription = Gyroscope.addListener(({ z }) => {
      // Accumuler la rotation (plus fluide)
      gyroRotation.current += z * 20;
      
      if (panorama?.stitched && panorama.panoramaUri) {
        // Pour un panorama assemblé: scroll horizontal sur l'image
        const maxScroll = width * 3; // Image équirectangulaire est environ 3x plus large
        let scrollPosition = (gyroRotation.current % maxScroll);
        if (scrollPosition < 0) scrollPosition += maxScroll;
        scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
      } else if (panorama?.photos) {
        // Pour des photos individuelles
        const baseOffset = PHOTO_WIDTH * 8;
        const totalWidth = PHOTO_WIDTH * 8;
        let scrollPosition = baseOffset + (gyroRotation.current % totalWidth);
        if (scrollPosition < 0) scrollPosition += totalWidth * 3;
        if (scrollPosition > totalWidth * 3) scrollPosition -= totalWidth * 3;
        scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
      }
    });

    return () => subscription.remove();
  }, [is360Mode, gyroEnabled, panorama]);

  // Activer le gyroscope
  useEffect(() => {
    if (is360Mode) {
      Gyroscope.isAvailableAsync().then(available => {
        setGyroEnabled(available);
        if (!available) {
          Alert.alert('Info', 'Gyroscope non disponible. Swipez pour naviguer.');
        }
      });
    }
  }, [is360Mode]);

  // Détecter le scroll pour mettre à jour l'index de la photo
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        if (panorama?.stitched) {
          // Pour un panorama assemblé, calculer l'angle approximatif
          const angle = Math.round((offsetX / (width * 3)) * 360) % 360;
          setCurrentPhotoIndex(Math.floor(angle / 45));
        } else {
          const index = Math.round(offsetX / PHOTO_WIDTH) % 8;
          setCurrentPhotoIndex(index);
        }
      }
    }
  );

  // Obtenir les photos à afficher
  const getPhotos = (): string[] => {
    if (panorama?.stitched && panorama.panoramaUri) {
      return [panorama.panoramaUri];
    }
    return panorama?.photos || [];
  };

  if (!panorama) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.right" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg'}] }} />
          </TouchableOpacity>
          <ThemedText type="subtitle">Erreur</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ThemedText>Panorama introuvable</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le panorama ?',
      'Cette action est irréversible',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await AsyncStorage.getItem('panoramas');
              if (data) {
                const panoramas: Panorama[] = JSON.parse(data);
                const filtered = panoramas.filter(p => p.id !== panorama.id);
                await AsyncStorage.setItem('panoramas', JSON.stringify(filtered));
                router.back();
              }
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le panorama');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.right" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg'}] }} />
        </TouchableOpacity>
        <ThemedText type="subtitle" numberOfLines={1} style={{ flex: 1, marginHorizontal: 15 }}>
          {panorama.title}
        </ThemedText>
        <TouchableOpacity 
          onPress={() => setIs360Mode(!is360Mode)}
          style={[styles.mode360Btn, is360Mode && styles.mode360BtnActive]}
        >
          <ThemedText style={[styles.mode360Text, is360Mode && styles.mode360TextActive]}>
            {is360Mode ? '360° ON' : '360°'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <IconSymbol name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {is360Mode ? (
        // Mode Panorama 360° - Vue immersive
        <View style={styles.panoramaContainer}>
          <View style={styles.mode360Overlay}>
            <View style={styles.mode360Badge}>
              <IconSymbol name="globe" size={16} color="white" />
              <ThemedText style={styles.mode360BadgeText}>
                {gyroEnabled ? '📱 Tournez-vous pour explorer' : '👆 Glissez pour explorer'}
              </ThemedText>
            </View>
          </View>
          
          {/* Vue panoramique immersive */}
          <View style={styles.panoramaWrapper}>
            <Animated.ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleScroll}
              decelerationRate="normal"
              scrollEnabled={!gyroEnabled}
              style={styles.panoramaScroll}
              contentContainerStyle={styles.panoramaContent}
              bounces={false}
            >
              {panorama.stitched && panorama.panoramaUri ? (
                // Panorama assemblé: une seule image large
                <>
                  <Image
                    source={{ uri: panorama.panoramaUri }}
                    style={styles.stitchedPanorama}
                    resizeMode="cover"
                  />
                  {/* Répéter pour boucle infinie */}
                  <Image
                    source={{ uri: panorama.panoramaUri }}
                    style={styles.stitchedPanorama}
                    resizeMode="cover"
                  />
                </>
              ) : (
                // Photos individuelles: répétées 3 fois pour boucle
                [...getPhotos(), ...getPhotos(), ...getPhotos()].map((photo, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: photo }}
                    style={styles.panoramaPhoto}
                    resizeMode="cover"
                  />
                ))
              )}
            </Animated.ScrollView>
          </View>

          <View style={styles.panoramaInfo}>
            <View style={styles.compassContainer}>
              <IconSymbol name="location.circle.fill" size={20} color="#1D8CF8" />
              <ThemedText style={styles.compassText}>
                {['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'][currentPhotoIndex % 8]}
              </ThemedText>
            </View>
            <View style={styles.photoCounter}>
              <ThemedText style={styles.counterText}>
                {Math.round((currentPhotoIndex * 45) % 360)}°
              </ThemedText>
            </View>
          </View>
        </View>
      ) : (
        // Mode galerie normal
        <ScrollView style={styles.content}>
          <View style={styles.mainPhotoContainer}>
            <Image 
              source={{ uri: getPhotos()[currentPhotoIndex] || getPhotos()[0] }} 
              style={styles.mainPhoto}
              resizeMode="cover"
            />
            <View style={styles.photoCounter}>
              <ThemedText style={styles.counterText}>
                {panorama.stitched ? 'Assemblé' : `${currentPhotoIndex + 1} / ${panorama.photoCount}`}
              </ThemedText>
            </View>
          </View>

          {/* Navigation entre les photos (seulement si non assemblé) */}
          {!panorama.stitched && getPhotos().length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScroll}
              contentContainerStyle={styles.thumbnailContainer}
            >
              {getPhotos().map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentPhotoIndex(index)}
                  style={[
                    styles.thumbnail,
                    index === currentPhotoIndex && styles.thumbnailActive
                  ]}
                >
                  <Image 
                    source={{ uri: photo }} 
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {index === currentPhotoIndex && (
                    <View style={styles.thumbnailOverlay}>
                      <View style={styles.activeDot} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Informations */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <IconSymbol name="photo" size={20} color="#1D8CF8" />
              <View style={styles.infoTextContainer}>
                <ThemedText style={styles.infoLabel}>
                  {panorama.stitched ? 'Panorama assemblé' : 'Photos capturées'}
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {panorama.stitched ? 'Image équirectangulaire 360°' : `${panorama.photoCount} images`}
                </ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="calendar" size={20} color="#1D8CF8" />
              <View style={styles.infoTextContainer}>
                <ThemedText style={styles.infoLabel}>Date de création</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {new Date(panorama.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="globe" size={20} color="#1D8CF8" />
              <View style={styles.infoTextContainer}>
                <ThemedText style={styles.infoLabel}>Type</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {panorama.stitched ? 'Panorama 360° assemblé' : 'Panorama 360° (8 points)'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  mode360Btn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mode360BtnActive: {
    backgroundColor: '#1D8CF8',
    borderColor: '#1D8CF8',
  },
  mode360Text: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mode360TextActive: {
    color: 'white',
  },
  mode360Overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 15,
    alignItems: 'center',
  },
  mode360Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(29, 140, 248, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mode360BadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  panoramaContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  panoramaWrapper: {
    flex: 1,
  },
  panoramaScroll: {
    flex: 1,
  },
  panoramaContent: {
    flexDirection: 'row',
  },
  panoramaPhoto: {
    width: PHOTO_WIDTH,
    height: height - 180,
  },
  stitchedPanorama: {
    width: width * 3,  // Image équirectangulaire (ratio 2:1, affichée large pour scroll)
    height: height - 180,
  },
  panoramaInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  compassText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  panoramaInstructions: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  mainPhotoContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#000',
    position: 'relative',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  photoCounter: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbnailScroll: {
    marginTop: 20,
  },
  thumbnailContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#1D8CF8',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29, 140, 248, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1D8CF8',
  },
  infoCard: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

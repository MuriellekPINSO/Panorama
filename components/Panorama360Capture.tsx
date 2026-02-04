/**
 * Composant de Capture Panorama 360° Teleport
 * Pour React Native / Expo
 */

import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PanoramaService from '../services/panorama-teleport';

// ============================================
// TYPES
// ============================================

interface SelectedImage {
  uri: string;
  fileName: string;
}

interface CaptureState {
  selectedImages: SelectedImage[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  metadata: any;
  result: any;
  error: string | null;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const Panorama360Capture: React.FC = () => {
  const [state, setState] = useState<CaptureState>({
    selectedImages: [],
    loading: false,
    uploading: false,
    uploadProgress: 0,
    metadata: null,
    result: null,
    error: null,
  });

  const scrollRef = useRef<ScrollView>(null);

  // ============================================
  // HANDLERS
  // ============================================

  const handlePickImages = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const images = await PanoramaService.pickImages(3);
      
      if (images) {
        const selectedImages = images.map((img, idx) => ({
          uri: img.uri,
          fileName: img.fileName || `Image ${idx + 1}`,
        }));

        setState(prev => ({
          ...prev,
          selectedImages,
          loading: false,
        }));

        // Récupérer métadonnées GPS
        const metadata = await PanoramaService.getGeospatialMetadata();
        setState(prev => ({
          ...prev,
          metadata,
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur de sélection images',
      }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setState(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.filter((_, i) => i !== index),
    }));
  };

  const handleCreatePanorama = async () => {
    try {
      if (state.selectedImages.length < 3) {
        Alert.alert('Erreur', 'Sélectionnez au least 3 images');
        return;
      }

      setState(prev => ({
        ...prev,
        uploading: true,
        uploadProgress: 0,
        error: null,
      }));

      const result = await PanoramaService.createPanorama(
        state.selectedImages.map(img => ({
          uri: img.uri,
          type: 'image/jpeg',
          fileName: img.fileName,
        })),
        state.metadata,
        (progress) => {
          setState(prev => ({
            ...prev,
            uploadProgress: progress.percent,
          }));
        }
      );

      setState(prev => ({
        ...prev,
        uploading: false,
        result,
        selectedImages: [],
      }));

      // Scroll vers le résultat
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 300);

      Alert.alert('✅ Succès!', `Panorama créé: ${result.panoramaId}`);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message || 'Erreur création panorama',
      }));

      Alert.alert('❌ Erreur', error.message || 'Erreur lors de la création');
    }
  };

  const handleViewPanorama = () => {
    if (state.result) {
      // TODO: Naviguer vers PanoramaViewer avec l'ID
      console.log('View panorama:', state.result.panoramaId);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const { selectedImages, loading, uploading, uploadProgress, metadata, result, error } = state;
  const canCreate = selectedImages.length >= 3;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="panorama" size={40} color="#007AFF" />
          <Text style={styles.title}>Teleport 360°</Text>
          <Text style={styles.subtitle}>Créez des panoramas immersifs</Text>
        </View>

        {/* ERROR MESSAGE */}
        {error && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* METADATA DISPLAY */}
        {metadata && !result && (
          <View style={styles.metadataBox}>
            <Text style={styles.metadataTitle}>📍 Localisation</Text>
            <Text style={styles.metadataText}>{metadata.location_name}</Text>
            <Text style={styles.metadataCoords}>
              {metadata.gps.lat.toFixed(4)}° · {metadata.gps.lon.toFixed(4)}°
              {metadata.gps.alt > 0 && ` · ${metadata.gps.alt}m`}
            </Text>
          </View>
        )}

        {/* SELECTED IMAGES */}
        {selectedImages.length > 0 && !result && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Images sélectionnées ({selectedImages.length}/12)
              </Text>
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>{selectedImages.length}</Text>
              </View>
            </View>

            <FlatList
              scrollEnabled={false}
              data={selectedImages}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.imageItem}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.imageThumbnail}
                  />
                  <View style={styles.imageInfo}>
                    <Text style={styles.imageIndex}>Image {index + 1}</Text>
                    <Text style={styles.imageName}>{item.fileName}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(index)}
                    style={styles.removeButton}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
            />

            {selectedImages.length < 12 && (
              <TouchableOpacity
                style={[styles.button, styles.addMoreButton]}
                onPress={handlePickImages}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#007AFF" />
                <Text style={styles.addMoreText}>Ajouter plus d'images</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* UPLOAD PROGRESS */}
        {uploading && (
          <View style={styles.progressBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.progressText}>Création panorama...</Text>
            <Text style={styles.progressPercent}>{uploadProgress}%</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${uploadProgress}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* RESULT */}
        {result && (
          <View style={styles.resultBox}>
            <MaterialCommunityIcons name="check-circle" size={40} color="#34C759" />
            <Text style={styles.resultTitle}>Panorama créé!</Text>
            
            <View style={styles.resultDetail}>
              <Text style={styles.resultLabel}>ID</Text>
              <Text style={styles.resultValue}>{result.panoramaId}</Text>
            </View>

            <View style={styles.resultDetail}>
              <Text style={styles.resultLabel}>Résolution</Text>
              <Text style={styles.resultValue}>{result.resolution}</Text>
            </View>

            <View style={styles.resultDetail}>
              <Text style={styles.resultLabel}>Taille</Text>
              <Text style={styles.resultValue}>
                {(result.fileSize / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>

            {result.location && (
              <View style={styles.resultDetail}>
                <Text style={styles.resultLabel}>Lieu</Text>
                <Text style={styles.resultValue}>{result.location}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.viewButton]}
              onPress={handleViewPanorama}
            >
              <MaterialCommunityIcons name="eye" size={20} color="white" />
              <Text style={styles.viewButtonText}>Visualiser</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.newButton]}
              onPress={() =>
                setState(prev => ({
                  ...prev,
                  result: null,
                  selectedImages: [],
                }))
              }
            >
              <MaterialCommunityIcons name="plus" size={20} color="#007AFF" />
              <Text style={styles.newButtonText}>Créer nouveau</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTION BUTTONS */}
        {!result && (
          <View style={styles.buttonContainer}>
            {selectedImages.length === 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handlePickImages}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="image-multiple"
                        size={20}
                        color="white"
                      />
                      <Text style={styles.buttonText}>Sélectionner images</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => alert('Capture caméra - À implémenter')}
                >
                  <MaterialCommunityIcons
                    name="camera-burst"
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.secondaryButtonText}>Capturer (mode 360°)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.createButton,
                    { opacity: canCreate ? 1 : 0.5 },
                  ]}
                  onPress={handleCreatePanorama}
                  disabled={!canCreate || uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="panorama"
                        size={20}
                        color="white"
                      />
                      <Text style={styles.buttonText}>Créer panorama 360°</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() =>
                    setState(prev => ({
                      ...prev,
                      selectedImages: [],
                    }))
                  }
                  disabled={uploading}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 10,
    color: '#FF3B30',
    flex: 1,
    fontSize: 14,
  },
  metadataBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#E5F3FF',
    borderRadius: 12,
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  metadataText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  metadataCoords: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  imageCountBadge: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  imageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
  },
  imageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  imageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  imageIndex: {
    fontSize: 12,
    color: '#666',
  },
  imageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  addMoreButton: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  addMoreText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  progressPercent: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#EEE',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  resultBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
  },
  resultTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  resultDetail: {
    width: '100%',
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  resultValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  viewButton: {
    backgroundColor: '#007AFF',
    marginTop: 12,
  },
  newButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  newButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Panorama360Capture;

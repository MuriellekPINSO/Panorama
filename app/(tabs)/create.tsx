import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
// import { assemblePanorama } from '@/services/panorama-cloud-service';

const { width, height } = Dimensions.get('window');

// Mode simple : 8 photos à 45° d'intervalle
const TOTAL_PHOTOS = 8;
const ANGLE_INCREMENT = 45;

export default function CreateScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'scanning' | 'processing'>('scanning');
  const [capturedCount, setCapturedCount] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Utiliser useRef pour la caméra pour éviter les démontages
  const cameraRef = React.useRef<any>(null);
  const isMountedRef = React.useRef(true);
  
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  // Suivre le montage du composant
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sauvegarde du panorama dans le stockage local
  const savePanorama = async () => {
    try {
      // Créer le dossier des panoramas si nécessaire
      const panoramaDir = `${FileSystem.documentDirectory}panoramas/`;
      const dirInfo = await FileSystem.getInfoAsync(panoramaDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(panoramaDir, { intermediates: true });
      }

      const timestamp = Date.now();
      const panoramaId = `panorama_${timestamp}`;
      const savedPhotos: string[] = [];

      // Copier chaque photo dans le dossier permanent
      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];
        const newPath = `${panoramaDir}${panoramaId}_${i}.jpg`;
        await FileSystem.copyAsync({
          from: photoUri,
          to: newPath
        });
        savedPhotos.push(newPath);
      }

      // Créer l'objet panorama
      const panorama = {
        id: panoramaId,
        title: `Photo 360° ${new Date().toLocaleDateString('fr-FR')}`,
        photos: savedPhotos,
        thumbnail: savedPhotos[0],
        createdAt: timestamp,
        photoCount: photos.length
      };

      // Récupérer la liste existante
      const existingData = await AsyncStorage.getItem('panoramas');
      const panoramas = existingData ? JSON.parse(existingData) : [];
      
      // Ajouter le nouveau panorama au début
      panoramas.unshift(panorama);
      
      // Sauvegarder
      await AsyncStorage.setItem('panoramas', JSON.stringify(panoramas));
      
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return false;
    }
  };

  // Simulation de l'assemblage 360° avec sauvegarde
  useEffect(() => {
    if (status === 'processing') {
      let progress = 0;
      const interval = setInterval(async () => {
        progress += 10;
        setProcessingProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Sauvegarder le panorama
          const saved = await savePanorama();
          
          // Redirection vers la galerie après assemblage
          setTimeout(() => {
            Alert.alert(
              saved ? '✅ Panorama Créé !' : '⚠️ Panorama Créé',
              saved 
                ? 'Votre photo 360° est maintenant disponible dans la galerie'
                : 'Le panorama a été créé mais la sauvegarde a échoué',
              [
                {
                  text: 'Voir la Galerie',
                  onPress: () => {
                    resetCapture();
                    router.push('/(tabs)/');
                  }
                },
                {
                  text: 'Nouvelle Capture',
                  onPress: () => resetCapture()
                }
              ]
            );
          }, 500);
        }
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [status, photos]);

  const capturePhoto = async () => {
    // Empêcher les captures multiples simultanées
    if (isCapturing) {
      console.log('⏳ Capture déjà en cours...');
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Erreur', 'Caméra non prête');
      return;
    }

    if (capturedCount >= TOTAL_PHOTOS) {
      Alert.alert('Terminé', 'Vous avez déjà capturé les 8 photos');
      return;
    }

    if (!isMountedRef.current) {
      console.log('❌ Composant démonté, annulation');
      return;
    }

    setIsCapturing(true);
    
    // Petit délai pour stabiliser la caméra
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Vérifier que la caméra est toujours disponible
      if (!cameraRef.current || !isMountedRef.current) {
        throw new Error('Caméra non disponible');
      }

      console.log(`📸 Capture photo ${capturedCount + 1}/8...`);

      // Prendre la photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });

      // Vérifier encore une fois avant de continuer
      if (!isMountedRef.current) {
        console.log('❌ Composant démonté pendant la capture');
        return;
      }

      console.log('✅ Photo capturée:', photo.uri);

      // Ajouter la photo à la liste
      setPhotos(prev => [...prev, photo.uri]);
      setCapturedCount(prev => prev + 1);

      // Si c'est la dernière photo, passer au traitement
      if (capturedCount + 1 === TOTAL_PHOTOS) {
        console.log('🎉 Toutes les photos capturées !');
        setTimeout(() => {
          if (isMountedRef.current) {
            setStatus('processing');
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('❌ Erreur capture:', error);
      
      // Ne pas afficher d'alerte si c'est juste un unmount
      if (!error.message?.includes('unmounted')) {
        Alert.alert('Erreur', 'Impossible de prendre la photo. Réessayez.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const resetCapture = () => {
    console.log('🔄 Reset de la capture');
    setCapturedCount(0);
    setPhotos([]);
    setStatus('scanning');
    setProcessingProgress(0);
    setIsCapturing(false);
  };



  if (!permission) return <View style={{ flex: 1, backgroundColor: 'black' }} />;
  
  if (permission.status === 'undetermined') {
    return (
      <ThemedView style={styles.center}>
        <IconSymbol name="plus.circle.fill" size={64} color="#1D8CF8" />
        <ThemedText type="subtitle" style={{ marginTop: 20, textAlign: 'center' }}>
          Caméra requise pour les photos 360°
        </ThemedText>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <ThemedText style={styles.permissionText}>Autoriser</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Accès caméra refusé</ThemedText>
      </ThemedView>
    );
  }

  if (status === 'processing') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.procHeader}>
          <TouchableOpacity onPress={resetCapture}>
             <IconSymbol name="chevron.right" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg'}] }} />
          </TouchableOpacity>
          <ThemedText style={styles.procTitle}>Assemblage 360°</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.procContent}>
           <View style={styles.circularProgress}>
              <ThemedText type="title" style={styles.procPercent}>{processingProgress}%</ThemedText>
           </View>

           <View style={styles.procStatusCard}>
              <View style={styles.procStatusRow}>
                <ThemedText style={styles.procStatusLabel}>Création du panorama...</ThemedText>
                <ThemedText style={styles.procStatusValue}>8 photos</ThemedText>
              </View>
              <View style={styles.procProgressBarBg}>
                <View style={[styles.procProgressBarFill, { width: `${processingProgress}%`, backgroundColor: '#1D8CF8' }]} />
              </View>

              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                   <View style={[styles.checkbox, styles.checked]}>
                     <ThemedText style={styles.checkIcon}>✓</ThemedText>
                   </View>
                   <ThemedText style={styles.checkText}>Photos capturées</ThemedText>
                </View>
                <View style={styles.checkItem}>
                   <View style={[styles.checkbox, processingProgress >= 50 ? styles.checked : styles.current]}>
                     {processingProgress >= 50 ? (
                       <ThemedText style={styles.checkIcon}>✓</ThemedText>
                     ) : (
                       <View style={styles.currentDot} />
                     )}
                   </View>
                   <ThemedText style={styles.checkText}>Assemblage panoramique</ThemedText>
                </View>
                <View style={styles.checkItem}>
                   <View style={[styles.checkbox, processingProgress >= 100 ? styles.checked : (processingProgress >= 50 ? styles.current : {})]}>
                     {processingProgress >= 100 ? (
                       <ThemedText style={styles.checkIcon}>✓</ThemedText>
                     ) : processingProgress >= 50 ? (
                       <View style={styles.currentDot} />
                     ) : null}
                   </View>
                   <ThemedText style={[styles.checkText, processingProgress < 50 && { color: '#64748B' }]}>
                     Finalisation
                   </ThemedText>
                </View>
              </View>
           </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.scanContainer}>
      <CameraView 
        style={StyleSheet.absoluteFill} 
        ref={cameraRef}
        facing="back"
      />
      
      <View style={styles.cameraOverlay}>
        <View style={styles.scanHeader}>
          <TouchableOpacity style={styles.iconCircle} onPress={resetCapture}>
            <ThemedText style={{ color: 'white' }}>✕</ThemedText>
          </TouchableOpacity>
          <View style={styles.scanHeaderTitle}>
            <ThemedText style={styles.roomName}>PHOTO 360°</ThemedText>
            <ThemedText style={styles.unitName}>Capturez 8 photos en tournant</ThemedText>
          </View>
          <View style={styles.scanHeaderRight}>
            <View style={styles.photoBadge}>
              <ThemedText style={styles.photoCount}>{capturedCount}/8</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.scanGuide}>
           <View style={styles.guideTextContainer}>
              <ThemedText style={styles.guideText}>
                {capturedCount === 0 
                  ? "Appuyez pour capturer la 1ère photo" 
                  : capturedCount < TOTAL_PHOTOS
                  ? `Tournez de 45° vers la droite puis capturez`
                  : "✓ Toutes les photos capturées !"}
              </ThemedText>
           </View>

           {/* Indicateur circulaire de progression */}
           <View style={styles.progressCircle}>
             {Array.from({ length: TOTAL_PHOTOS }).map((_, idx) => {
               const angle = (idx * 360) / TOTAL_PHOTOS;
               const isCaptured = idx < capturedCount;
               return (
                 <View 
                   key={idx}
                   style={[
                     styles.progressDot,
                     {
                       transform: [
                         { rotate: `${angle}deg` }, 
                         { translateY: -80 }
                       ],
                     }
                   ]}
                 >
                   <View style={[
                     styles.dot,
                     isCaptured && styles.dotCaptured,
                     idx === capturedCount && styles.dotNext,
                   ]}>
                     <ThemedText style={styles.dotLabel}>{idx + 1}</ThemedText>
                   </View>
                 </View>
               );
             })}
             
             {/* Centre avec icône */}
             <View style={styles.centerIndicator}>
                <IconSymbol name="plus.circle.fill" size={48} color="#1D8CF8" />
             </View>
           </View>
        </View>

        <View style={styles.scanFooter}>
          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill, 
              { width: `${(capturedCount / TOTAL_PHOTOS) * 100}%`, backgroundColor: '#1D8CF8' }
            ]} />
          </View>

          <View style={styles.scanControls}>
             <TouchableOpacity 
               style={[
                 styles.captureButton,
                 (capturedCount >= TOTAL_PHOTOS || isCapturing) && styles.captureButtonDisabled
               ]}
               onPress={capturePhoto}
               disabled={capturedCount >= TOTAL_PHOTOS || isCapturing}
             >
                <View style={[
                  styles.captureButtonInner,
                  isCapturing && styles.captureButtonCapturing
                ]} />
             </TouchableOpacity>
          </View>

          <ThemedText style={styles.instruction}>
            {isCapturing 
              ? '📸 Capture en cours...'
              : capturedCount < TOTAL_PHOTOS 
              ? `Photo ${capturedCount + 1}/${TOTAL_PHOTOS} • Tournez progressivement`
              : 'Traitement en cours...'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  permissionBtn: { backgroundColor: '#1D8CF8', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12, marginTop: 30 },
  permissionText: { color: 'white', fontWeight: 'bold' },
  
  procHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  procTitle: { fontSize: 18, fontWeight: 'bold' },
  procContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  circularProgress: { width: 150, height: 150, borderRadius: 75, borderWidth: 8, borderColor: '#1D8CF8', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  procPercent: { fontSize: 32, fontWeight: 'bold' },
  procStatusCard: { width: '100%', backgroundColor: '#16202C', borderRadius: 20, padding: 20 },
  procStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  procStatusLabel: { fontSize: 13, color: '#F8FAFC' },
  procStatusValue: { fontSize: 13, color: '#1D8CF8', fontWeight: 'bold' },
  procProgressBarBg: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginBottom: 25 },
  procProgressBarFill: { height: '100%', borderRadius: 3 },
  checklist: { gap: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#334155' },
  checked: { backgroundColor: '#1D8CF8', borderColor: '#1D8CF8', justifyContent: 'center', alignItems: 'center' },
  checkIcon: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  current: { borderColor: '#1D8CF8', justifyContent: 'center', alignItems: 'center' },
  currentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1D8CF8' },
  checkText: { fontSize: 13, color: '#F8FAFC' },
  
  scanContainer: { flex: 1, backgroundColor: 'black' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  
  scanHeader: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'space-between' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanHeaderTitle: { alignItems: 'center' },
  roomName: { color: 'white', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  unitName: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  scanHeaderRight: { width: 60 },
  photoBadge: { backgroundColor: '#1D8CF8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  photoCount: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  
  scanGuide: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  guideTextContainer: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, position: 'absolute', top: 20, maxWidth: '90%' },
  guideText: { color: 'white', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  
  // Cercle de progression avec 8 points
  progressCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  progressDot: { position: 'absolute' },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  dotCaptured: { backgroundColor: '#22C55E', borderColor: '#10B981' },
  dotNext: { backgroundColor: '#1D8CF8', borderColor: '#1D8CF8', width: 32, height: 32, borderRadius: 16 },
  dotLabel: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  centerIndicator: { justifyContent: 'center', alignItems: 'center' },
  
  scanFooter: { paddingHorizontal: 20, alignItems: 'center' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 25 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  scanControls: { marginBottom: 20 },
  captureButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  captureButtonDisabled: { opacity: 0.5 },
  captureButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' },
  captureButtonCapturing: { backgroundColor: '#1D8CF8' },
  
  instruction: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', textAlign: 'center' }
});


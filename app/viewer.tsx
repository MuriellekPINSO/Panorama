import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

export default function ViewerScreen() {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportSettings, setShowExportSettings] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (showExportSettings) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowExportSettings(false)}>
            <IconSymbol name="chevron.right" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg'}] }} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Export Settings</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.exportScroll}>
          <View style={[styles.exportPreview, { backgroundColor: colors.card }]}>
             {/* Thumbnail placeholder */}
             <ThemedText style={styles.previewTag}>PROJECT: OAKWOOD HEIGHTS ESTATE</ThemedText>
          </View>

          <View style={styles.exportSection}>
            <ThemedText style={styles.sectionLabel}>RESOLUTION</ThemedText>
            <View style={styles.pickerRow}>
               {['2K', '4K', '8K'].map(res => (
                 <TouchableOpacity key={res} style={[styles.pickerBtn, res === '4K' ? styles.pickerBtnActive : { backgroundColor: colors.card }]}>
                    <ThemedText style={res === '4K' ? styles.pickerBtnActiveText : styles.pickerBtnText}>{res}</ThemedText>
                 </TouchableOpacity>
               ))}
            </View>
            <ThemedText style={styles.sectionNote}>8K export will take approximately 2-4 minutes.</ThemedText>
          </View>

          <View style={styles.exportSection}>
            <ThemedText style={styles.sectionLabel}>FILE FORMAT</ThemedText>
            <View style={styles.pickerRow}>
               {['JPG', 'PNG', 'WEBP'].map(fmt => (
                 <TouchableOpacity key={fmt} style={[styles.pickerBtn, fmt === 'JPG' ? styles.pickerBtnActive : { backgroundColor: colors.card }]}>
                    <ThemedText style={fmt === 'JPG' ? styles.pickerBtnActiveText : styles.pickerBtnText}>{fmt}</ThemedText>
                 </TouchableOpacity>
               ))}
            </View>
          </View>

          <View style={styles.exportSection}>
            <ThemedText style={styles.sectionLabel}>ADVANCED OPTIONS</ThemedText>
            <View style={[styles.optionCard, { backgroundColor: colors.card }]}>
               <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <IconSymbol name="plus.circle.fill" size={16} color={colors.icon} />
                    <View style={{ marginLeft: 10 }}>
                      <ThemedText style={styles.optionTitle}>Include GPS Data</ThemedText>
                      <ThemedText style={styles.optionSub}>Embed location in metadata</ThemedText>
                    </View>
                  </View>
                  <Switch value={true} />
               </View>

               <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <IconSymbol name="plus.circle.fill" size={16} color={colors.icon} />
                    <View style={{ marginLeft: 10 }}>
                      <ThemedText style={styles.optionTitle}>Include Camera Info</ThemedText>
                      <ThemedText style={styles.optionSub}>Lens, aperture, and sensor data</ThemedText>
                    </View>
                  </View>
                  <Switch value={true} />
               </View>

               <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <IconSymbol name="plus.circle.fill" size={16} color={colors.icon} />
                    <View style={{ marginLeft: 10 }}>
                      <ThemedText style={styles.optionTitle}>Apply Watermark</ThemedText>
                      <ThemedText style={styles.optionSub}>Add company logo to bottom right</ThemedText>
                    </View>
                  </View>
                  <Switch value={false} />
               </View>

               <TouchableOpacity style={styles.linkRow}>
                  <ThemedText style={styles.linkText}>Edit Watermark Assets</ThemedText>
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
               </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fileSizeInfo}>
             <IconSymbol name="rectangle.stack.fill" size={14} color={colors.icon} />
             <ThemedText style={styles.fileSizeLabel}>ESTIMATED FILE SIZE</ThemedText>
          </View>
          <ThemedText style={styles.fileSizeValue}>~24.8 MB</ThemedText>

          <TouchableOpacity style={styles.confirmBtn}>
            <IconSymbol name="plus.circle.fill" size={20} color="white" />
            <ThemedText style={styles.confirmBtnText}>Confirm Export</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.disclaimer}>ALL ASSETS ARE PROCESSED LOCALLY FOR PRIVACY</ThemedText>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <View style={styles.viewerContainer}>
      {/* 360 View Placeholder */}
      <View style={styles.panoramaView}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
             <IconSymbol name="chevron.right" size={24} color="white" style={{ transform: [{ rotate: '180deg'}] }} />
          </TouchableOpacity>
          <View style={styles.viewerTitleGroup}>
             <ThemedText style={styles.viewerTitle}>Luxury Penthouse - Living Room</ThemedText>
             <ThemedText style={styles.viewerSub}>360° VIEW</ThemedText>
          </View>
          <TouchableOpacity style={styles.infoBtn}>
             <IconSymbol name="plus.circle.fill" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.sideTools}>
           <TouchableOpacity style={styles.toolBtn}><IconSymbol name="plus.circle.fill" size={20} color="white" /></TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn}><IconSymbol name="plus.circle.fill" size={20} color="white" /></TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn}><IconSymbol name="plus.circle.fill" size={20} color="white" /></TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn}><IconSymbol name="plus.circle.fill" size={20} color="white" /></TouchableOpacity>
        </View>

        <View style={styles.viewerFooter}>
           <ScrollView horizontal style={styles.thumbnailRow} showsHorizontalScrollIndicator={false}>
              {[1,2,3].map(i => (
                <View key={i} style={[styles.thumb, i === 1 ? styles.thumbActive : null]}>
                   <View style={styles.thumbInner} />
                </View>
              ))}
           </ScrollView>
           <TouchableOpacity style={styles.shareFab} onPress={() => setShowShareModal(true)}>
              <IconSymbol name="plus.circle.fill" size={24} color="white" />
           </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showShareModal} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
               <View style={styles.sheetHeader}>
                  <View style={styles.handle} />
               </View>
               <View style={styles.sheetTitleRow}>
                  <ThemedText type="subtitle">Share & Export</ThemedText>
                  <TouchableOpacity onPress={() => setShowShareModal(false)}>
                    <ThemedText style={{ color: '#94A3B8' }}>✕</ThemedText>
                  </TouchableOpacity>
               </View>

               <View style={styles.sheetContent}>
                  {[
                    { icon: 'plus.circle.fill', title: 'Copy Share Link', sub: 'Share interactive tour via URL' },
                    { icon: 'plus.circle.fill', title: 'Download as JPEG/EQUIR', sub: 'High-quality flat export for listings', action: () => { setShowShareModal(false); setShowExportSettings(true); } },
                    { icon: 'plus.circle.fill', title: 'Generate QR Code', sub: 'For physical signage or print brochures' },
                    { icon: 'plus.circle.fill', title: 'Embed Code', sub: 'Add tour directly to your website' },
                  ].map((item, idx) => (
                    <TouchableOpacity key={idx} style={styles.sheetItem} onPress={item.action}>
                       <View style={styles.sheetItemIcon}>
                          <IconSymbol name={item.icon as any} size={20} color={colors.tint} />
                       </View>
                       <View style={styles.sheetItemText}>
                          <ThemedText style={styles.sheetItemTitle}>{item.title}</ThemedText>
                          <ThemedText style={styles.sheetItemSub}>{item.sub}</ThemedText>
                       </View>
                       <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                    </TouchableOpacity>
                  ))}
               </View>

               <TouchableOpacity style={styles.doneBtn} onPress={() => setShowShareModal(false)}>
                  <ThemedText style={styles.doneBtnText}>Done</ThemedText>
               </TouchableOpacity>

               <ThemedText style={styles.terms}>
                 By sharing this tour, you agree to our professional{"\n"}hosting terms of service and privacy policy.
               </ThemedText>
            </View>
         </View>
      </Modal>
    </View>
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  exportScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  exportPreview: {
    height: 180,
    borderRadius: 15,
    justifyContent: 'flex-end',
    padding: 15,
    marginBottom: 30,
  },
  previewTag: {
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  exportSection: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 15,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBtnActive: {
    backgroundColor: 'rgba(29, 140, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#1D8CF8',
  },
  pickerBtnText: {
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  pickerBtnActiveText: {
    color: '#1D8CF8',
    fontWeight: 'bold',
  },
  sectionNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
  },
  optionCard: {
    borderRadius: 15,
    paddingVertical: 10,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 13,
    color: '#F8FAFC',
  },
  fileSizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  fileSizeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  fileSizeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D8CF8',
    textAlign: 'center',
    marginVertical: 10,
  },
  confirmBtn: {
    backgroundColor: '#1D8CF8',
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  confirmBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 20,
  },

  // Viewer Styles
  viewerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  panoramaView: {
    flex: 1,
  },
  viewerHeader: {
    flexDirection: 'row',
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTitleGroup: {
    alignItems: 'center',
  },
  viewerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  },
  infoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideTools: {
    position: 'absolute',
    right: 20,
    top: '30%',
    gap: 15,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  thumbnailRow: {
    flex: 1,
    marginRight: 20,
  },
  thumb: {
    width: 60,
    height: 45,
    borderRadius: 6,
    backgroundColor: '#334155',
    marginRight: 10,
    overflow: 'hidden',
  },
  thumbActive: {
    borderWidth: 2,
    borderColor: '#1D8CF8',
  },
  thumbInner: {
    flex: 1,
  },
  shareFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1D8CF8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D8CF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  sheetContent: {
    paddingHorizontal: 20,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  sheetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 140, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sheetItemText: {
    flex: 1,
  },
  sheetItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  sheetItemSub: {
    fontSize: 12,
    color: '#64748B',
  },
  doneBtn: {
    margin: 20,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  terms: {
    textAlign: 'center',
    fontSize: 11,
    color: '#475569',
    marginTop: 10,
    lineHeight: 16,
  }
});

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

const GALLERY_DATA = [
  { id: '1', title: 'Modern Living Room', date: '2 days ago', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80' },
  { id: '2', title: 'Ocean View Balcony', date: '5 days ago', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80' },
  { id: '3', title: 'Minimalist Bedroom', date: '1 week ago', image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=400&q=80' },
  { id: '4', title: 'State Art Kitchen', date: '2 weeks ago', image: 'https://images.unsplash.com/photo-1556911220-e15224bbafb0?auto=format&fit=crop&w=400&q=80' },
  { id: '5', title: 'Garden Patio', date: '3 weeks ago', image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=400&q=80' },
  { id: '6', title: 'Cozy Study', date: '1 month ago', image: 'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=400&q=80' },
];

export default function GalleryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const renderItem = ({ item }: { item: typeof GALLERY_DATA[0] }) => (
    <TouchableOpacity style={styles.gridItem}>
      <Image source={{ uri: item.image }} style={styles.gridImage} />
      <View style={styles.gridOverlay}>
        <View style={styles.typeBadge}>
           <IconSymbol name="rectangle.stack.fill" size={10} color="white" />
           <ThemedText style={styles.typeText}>360°</ThemedText>
        </View>
      </View>
      <View style={styles.gridInfo}>
        <ThemedText style={styles.gridTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={styles.gridDate}>{item.date}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Gallery</ThemedText>
        <TouchableOpacity style={styles.filterBtn}>
           <IconSymbol name="plus.circle.fill" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={GALLERY_DATA}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
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
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16202C', justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  gridItem: { width: COLUMN_WIDTH, marginBottom: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: '#16202C' },
  gridImage: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.2 },
  gridOverlay: { position: 'absolute', top: 10, left: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  gridInfo: { padding: 12 },
  gridTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  gridDate: { fontSize: 11, color: '#64748B' }
});

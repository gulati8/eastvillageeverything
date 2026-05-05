import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../theme/tokens';

const CHIP_WIDTHS = [80, 90, 70, 84];
const ROW_COUNT = 4;

function SkeletonRow() {
  return (
    <View style={styles.row}>
      {/* Thumbnail */}
      <Skeleton width={96} height={124} borderRadius={14} />
      {/* Text column */}
      <View style={styles.rowContent}>
        <Skeleton width={140} height={20} borderRadius={4} />
        <Skeleton width={180} height={10} borderRadius={4} style={styles.rowBar} />
        <Skeleton width={150} height={20} borderRadius={4} style={styles.rowBar} />
        <Skeleton width="92%" height={11} borderRadius={4} style={styles.rowBar} />
        <Skeleton width="70%" height={11} borderRadius={4} style={styles.rowBar} />
      </View>
    </View>
  );
}

export function EveListSkeleton() {
  const { spacing: sp } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: sp.screenPadding }]}>
      {/* Masthead */}
      <View style={styles.masthead}>
        <Skeleton width={140} height={10} borderRadius={4} />
        <Skeleton width={240} height={28} borderRadius={4} style={styles.mastheadSecond} />
      </View>

      {/* Search bar row */}
      <View style={styles.searchRow}>
        <Skeleton width="78%" height={40} borderRadius={999} />
        <Skeleton width={40} height={40} borderRadius={999} />
      </View>

      {/* Chip rail */}
      <View style={styles.chipRail}>
        {CHIP_WIDTHS.map((w, i) => (
          <Skeleton key={i} width={w} height={32} borderRadius={999} style={i > 0 ? styles.chipGap : undefined} />
        ))}
      </View>

      {/* Card rows */}
      {Array.from({ length: ROW_COUNT }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  masthead: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  mastheadSecond: {
    // rendered via gap above
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  chipRail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chipGap: {
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rowContent: {
    flex: 1,
    paddingTop: 4,
  },
  rowBar: {
    marginTop: 8,
  },
});

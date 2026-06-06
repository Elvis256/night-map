import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Filters, useApp } from "@/context/AppContext";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
}

const DISTANCE_OPTIONS = [
  { label: "Any", value: 50 },
  { label: "< 1 km", value: 1 },
  { label: "< 2 km", value: 2 },
  { label: "< 5 km", value: 5 },
  { label: "< 10 km", value: 10 },
];

const RATING_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "4.0+", value: 4.0 },
  { label: "4.5+", value: 4.5 },
  { label: "5.0 only", value: 5.0 },
];

const STATUS_OPTIONS: { label: string; value: Filters["status"] }[] = [
  { label: "All", value: "all" },
  { label: "Available Now", value: "now" },
  { label: "Tonight", value: "tonight" },
];

const RATE_OPTIONS = [
  { label: "Any", value: 500000 },
  { label: "< 100k", value: 100000 },
  { label: "< 150k", value: 150000 },
  { label: "< 200k", value: 200000 },
];

export function FilterModal({ visible, onClose }: FilterModalProps) {
  const colors = useColors();
  const { filters, updateFilters, resetFilters } = useApp();

  const activeCount = [
    filters.maxDistance < 50,
    filters.minRating > 0,
    filters.verifiedOnly,
    filters.status !== "all",
    filters.maxRate < 500000,
  ].filter(Boolean).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filters</Text>
            {activeCount > 0 && (
              <TouchableOpacity onPress={resetFilters}>
                <Text style={[styles.resetBtn, { color: colors.primary }]}>Reset all</Text>
              </TouchableOpacity>
            )}
          </View>

          <Section label="Distance" colors={colors}>
            <ChipRow
              options={DISTANCE_OPTIONS}
              selected={filters.maxDistance}
              onSelect={(v) => updateFilters({ maxDistance: v })}
              colors={colors}
            />
          </Section>

          <Section label="Min Rating" colors={colors}>
            <ChipRow
              options={RATING_OPTIONS}
              selected={filters.minRating}
              onSelect={(v) => updateFilters({ minRating: v })}
              colors={colors}
            />
          </Section>

          <Section label="Availability" colors={colors}>
            <ChipRow
              options={STATUS_OPTIONS}
              selected={filters.status}
              onSelect={(v) => updateFilters({ status: v as Filters["status"] })}
              colors={colors}
            />
          </Section>

          <Section label="Max Rate / Hour" colors={colors}>
            <ChipRow
              options={RATE_OPTIONS}
              selected={filters.maxRate}
              onSelect={(v) => updateFilters({ maxRate: v })}
              colors={colors}
            />
          </Section>

          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
              <View>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Verified Only</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>ID + video confirmed</Text>
              </View>
            </View>
            <Switch
              value={filters.verifiedOnly}
              onValueChange={(v) => updateFilters({ verifiedOnly: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.applyBtnText}>
              Show results{activeCount > 0 ? ` · ${activeCount} filter${activeCount > 1 ? "s" : ""} active` : ""}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ label, children, colors }: { label: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow<T extends string | number>({ options, selected, onSelect, colors }: {
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt.value)}
          style={[
            styles.chip,
            {
              backgroundColor: selected === opt.value ? "rgba(255,45,126,0.15)" : colors.muted,
              borderColor: selected === opt.value ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, { color: selected === opt.value ? colors.primary : colors.mutedForeground }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  resetBtn: { fontFamily: "Inter_500Medium", fontSize: 14 },
  section: { gap: 8 },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  toggleDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  applyBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  applyBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});

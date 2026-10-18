import { colors, radii, touchTarget } from '@score-masterz/tokens';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Bottom sheet used for the scorer's pickers. `onClose` undefined = must choose (no dismiss). */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose ?? (() => {})}>
      <View style={styles.backdrop}>
        {onClose && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />}
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {onClose && (
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.close}>
                <Text style={styles.closeText}>Cancel</Text>
              </Pressable>
            )}
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function SheetLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** A row of selectable chips. */
export function Choices<T extends string | number>({
  options,
  value,
  onChange,
  wrap = true,
}: {
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  value: T | undefined;
  onChange: (value: T) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.choices, wrap && styles.wrap]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityLabel={o.hint ? `${o.label}, ${o.hint}` : o.label}
            accessibilityState={{ selected: on, disabled: o.disabled }}
            style={[styles.chip, on && styles.chipOn, o.disabled && styles.chipDisabled]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
            {o.hint && <Text style={[styles.chipHint, on && styles.chipTextOn]}>{o.hint}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.primary, (disabled || pressed) && styles.dim]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,41,28,0.55)' },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.ink },
  close: { minHeight: touchTarget, paddingHorizontal: 8, justifyContent: 'center' },
  closeText: { color: colors.pitch, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, marginTop: 6, letterSpacing: 0.3 },
  choices: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  chip: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.pitch, borderColor: colors.pitch },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontWeight: '700', color: colors.ink },
  chipTextOn: { color: colors.surface },
  chipHint: { fontSize: 11, color: colors.muted },
  primary: { minHeight: 52, borderRadius: radii.md, backgroundColor: colors.pitch, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  dim: { opacity: 0.5 },
});

import { colors, radii, touchTarget } from '@score-masterz/tokens';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { BottomTabInset } from '@/constants/theme';

/** Dark header with the logo and a two-line headline, then a raised card (as in the mobile auth designs). */
export function AuthScreen({
  title,
  accent,
  subtitle,
  children,
}: {
  title: string;
  accent: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <Logo />
          <Text style={styles.brand}>SCORE MASTERZ</Text>
        </View>
        <Text style={styles.headline} accessibilityRole="header">
          {title.toUpperCase()}
          {'\n'}
          <Text style={styles.accent}>{accent.toUpperCase()}</Text>
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

function Logo() {
  // Gold ball with two seams, drawn with views so no SVG library is needed.
  return (
    <View style={styles.ball} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.seam, { left: 5 }]} />
      <View style={[styles.seam, { right: 5 }]} />
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={styles.input} />;
}

export function PasswordField(props: Omit<TextInputProps, 'secureTextEntry'>) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <TextInput placeholderTextColor={colors.muted} {...props} secureTextEntry={!show} style={[styles.input, styles.passwordInput]} />
      <Pressable
        onPress={() => setShow((s) => !s)}
        accessibilityRole="button"
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
        style={styles.showBtn}>
        <Text style={styles.showText}>{show ? 'Hide' : 'Show'}</Text>
      </Pressable>
    </View>
  );
}

/** Six boxes over one real input: typing, pasting and screen readers all work. */
export function CodeBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View style={styles.codeRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.codeBox, focused && i === Math.min(value.length, 5) && styles.codeBoxActive]}>
            <Text style={styles.codeDigit}>{value[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        accessibilityLabel="6-digit code"
        style={styles.codeInput}
      />
    </View>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['Details', 'Verify', 'Password'];
  return (
    <View style={styles.steps} accessibilityLabel={`Step ${current} of 3`}>
      {labels.map((l, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <View key={l} style={styles.step}>
            <View style={[styles.stepBar, state === 'done' && styles.stepDone, state === 'current' && styles.stepCurrent]} />
            <Text style={[styles.stepText, state === 'todo' && styles.stepTodo]}>
              {state === 'done' ? '✓ ' : `${n}. `}
              {l}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'outline' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        tone === 'outline' && styles.btnOutline,
        tone === 'danger' && styles.btnDanger,
        disabled && styles.btnDisabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.btnText, tone !== 'primary' && styles.btnTextAlt, tone === 'danger' && styles.btnTextDanger, disabled && styles.btnTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextLink({ label, onPress, disabled, align }: { label: string; onPress: () => void; disabled?: boolean; align?: 'end' }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[styles.link, align === 'end' && { alignSelf: 'flex-end' }, disabled && { opacity: 0.5 }]}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

export function Hint({ tone, children }: { tone: 'gold' | 'green'; children: ReactNode }) {
  return (
    <View style={[styles.hint, tone === 'green' ? styles.hintGreen : styles.hintGold]}>
      <Text style={[styles.hintText, tone === 'green' ? styles.hintTextGreen : styles.hintTextGold]}>{children}</Text>
    </View>
  );
}

export const authText = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  center: { textAlign: 'center' },
  strong: { fontWeight: '700', color: colors.ink },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  scroll: { paddingBottom: BottomTabInset + 24 },
  hero: { backgroundColor: colors.scoreboard, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 84, gap: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ball: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, overflow: 'hidden' },
  seam: { position: 'absolute', top: 6, bottom: 6, width: 8, borderRadius: 8, borderWidth: 2, borderColor: colors.scoreboard },
  brand: { color: colors.surface, fontWeight: '700', fontSize: 20, letterSpacing: 0.5 },
  headline: { color: colors.surface, fontWeight: '700', fontSize: 40, lineHeight: 40 },
  accent: { color: colors.gold },
  subtitle: { color: colors.onScoreboardSoft, fontSize: 15, marginTop: -8 },
  body: { marginTop: -60, paddingHorizontal: 16, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 14,
    shadowColor: colors.scoreboard,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, marginBottom: -8 },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  passwordInput: { paddingRight: 64 },
  showBtn: { position: 'absolute', right: 4, top: 3, height: touchTarget, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
  showText: { color: colors.pitch, fontWeight: '700', fontSize: 13 },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeBox: {
    flex: 1,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderWidth: 2, borderColor: colors.pitch },
  codeDigit: { fontSize: 26, fontWeight: '700', color: colors.ink },
  codeInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' },
  steps: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, gap: 6 },
  stepBar: { height: 5, borderRadius: radii.pill, backgroundColor: colors.line },
  stepDone: { backgroundColor: colors.pitch },
  stepCurrent: { backgroundColor: colors.gold },
  stepText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  stepTodo: { color: colors.muted },
  btn: { minHeight: 52, borderRadius: 14, backgroundColor: colors.pitch, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.pitch },
  btnDanger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.wicket },
  btnDisabled: { backgroundColor: colors.line, borderColor: colors.line },
  pressed: { opacity: 0.8 },
  btnText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  btnTextAlt: { color: colors.pitch },
  btnTextDanger: { color: colors.wicket },
  btnTextDisabled: { color: colors.muted },
  link: { minHeight: touchTarget, justifyContent: 'center' },
  linkText: { color: colors.pitch, fontWeight: '700', fontSize: 14 },
  hint: { borderRadius: 14, padding: 14 },
  hintGold: { backgroundColor: colors.goldTint },
  hintGreen: { backgroundColor: colors.pitchTint },
  hintText: { fontSize: 13, lineHeight: 19 },
  hintTextGold: { color: colors.goldInk },
  hintTextGreen: { color: colors.pitch },
});

import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { colors } from '@score-masterz/tokens';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import { Pressable, type PressableProps, View, StyleSheet, useWindowDimensions } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="score" href="/score" asChild>
            <TabButton icon="sports_cricket">Score</TabButton>
          </TabTrigger>
          <TabTrigger name="teams" href="/teams" asChild>
            <TabButton icon="groups">Teams</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton icon="account_circle">Account</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

/** Tab with a Material Symbols icon above its label, matching the native Android tabs. */
export function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: AndroidSymbol }) {
  const tint = isFocused ? colors.pitch : colors.muted;
  return (
    // TabTriggerSlotProps types its ref for View; Pressable forwards it the same way.
    <Pressable {...(props as PressableProps)} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonOn]}>
        <SymbolView name={{ web: icon }} size={22} tintColor={tint} />
        <ThemedText type="small" style={[styles.tabLabel, { color: tint }, isFocused && styles.tabLabelOn]}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  // On phone-width screens the four tabs need the whole bar.
  const narrow = useWindowDimensions().width < 480;
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        {!narrow && (
          <ThemedText type="smallBold" style={[styles.brandText, { color: colors.ink }]}>
            Score Masterz
          </ThemedText>
        )}

        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom bar, matching the native tabs.
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    justifyContent: 'space-between',
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    // Same white bar as the native tabs, whatever the device's colour scheme.
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.scoreboard,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: { flex: 1, minWidth: 64 },
  tabButtonView: {
    minHeight: 52,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabButtonOn: { backgroundColor: colors.pitchTint },
  tabLabel: { fontSize: 12, lineHeight: 16 },
  tabLabelOn: { fontWeight: '700' },
});

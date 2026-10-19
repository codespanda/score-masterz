import { colors } from '@score-masterz/tokens';
import { NativeTabs } from 'expo-router/native-tabs';

/** Bottom tabs. Icons are platform-native: SF Symbols on iOS, Material Symbols on Android. */
export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.pitchTint}
      labelStyle={{ selected: { color: colors.pitch } }}
      iconColor={{ selected: colors.pitch }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="score">
        <NativeTabs.Trigger.Label>Score</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.cricket" md="sports_cricket" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="teams">
        <NativeTabs.Trigger.Label>Teams</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} md="groups" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

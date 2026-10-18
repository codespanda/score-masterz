import { colors, radii } from '@score-masterz/tokens';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset } from '@/constants/theme';
import { demoMatch } from '@/lib/demo-match';

const upcoming = [
  { id: 'm15', teams: 'Eastgate Strikers vs Hillcrest Lions', when: 'Today · 4:30 PM · Ground 2' },
  { id: 'm16', teams: 'Northfield CC vs Bayview Warriors', when: 'Sat 24 Oct · 10:00 AM · Greenfield Oval' },
];

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Text style={styles.brand}>SCORE MASTERZ</Text>
        <Text style={styles.heroTitle}>MATCH DAY</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/score" asChild>
          <Pressable style={styles.liveCard} accessibilityRole="link">
            <View style={styles.rowBetween}>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>LIVE</Text>
              </View>
              <Text style={styles.mutedSmall}>T20 · Match 14</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.mutedTeam}>{demoMatch.bowlingTeam}</Text>
              <Text style={styles.mutedScore}>
                {demoMatch.firstInningsRuns}/{demoMatch.firstInningsWickets} (20)
              </Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.team}>{demoMatch.battingTeam}</Text>
              <Text style={styles.tapHint}>Tap to score →</Text>
            </View>
          </Pressable>
        </Link>

        <Text style={styles.sectionTitle}>UPCOMING</Text>
        {upcoming.map((m) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.cardTitle}>{m.teams}</Text>
            <Text style={styles.mutedSmall}>{m.when}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  hero: { backgroundColor: colors.scoreboard, paddingHorizontal: 20, paddingBottom: 56, gap: 4 },
  brand: { color: colors.gold, fontWeight: '700', letterSpacing: 1, paddingTop: 12 },
  heroTitle: { color: colors.surface, fontWeight: '700', fontSize: 32 },
  content: { padding: 16, marginTop: -44, gap: 12, paddingBottom: BottomTabInset + 24 },
  liveCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 18,
    gap: 12,
    shadowColor: colors.scoreboard,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveTag: { backgroundColor: colors.live, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  liveTagText: { color: colors.surface, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  mutedSmall: { color: colors.muted, fontSize: 13 },
  mutedTeam: { color: colors.muted, fontWeight: '500' },
  mutedScore: { color: colors.muted, fontWeight: '600', fontSize: 18 },
  team: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  tapHint: { color: colors.pitch, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontWeight: '700', fontSize: 18, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 2 },
  cardTitle: { color: colors.ink, fontWeight: '700' },
});

import { colors, radii } from '@score-masterz/tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionState } from '@/hooks/use-session';

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: string }) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.box, tone === 'error' ? styles.error : styles.info]}>
      <Text style={[styles.text, tone === 'error' ? styles.errorText : styles.infoText]}>{children}</Text>
    </View>
  );
}

/** Message for a session that is not ready, or null when it is. */
export function SessionNotice({ session }: { session: SessionState }) {
  if (session.status === 'unconfigured') {
    return (
      <Notice>
        Supabase is not configured. Copy apps/mobile/.env.example to apps/mobile/.env, add your project URL and anon key,
        then restart Expo.
      </Notice>
    );
  }
  if (session.status === 'loading') return <Notice>Signing in…</Notice>;
  if (session.status === 'error') return <Notice tone="error">{session.message}</Notice>;
  return null;
}

const styles = StyleSheet.create({
  box: { borderRadius: radii.md, padding: 14, borderWidth: 1 },
  info: { backgroundColor: colors.goldTint, borderColor: 'rgba(242,183,5,0.5)' },
  error: { backgroundColor: '#FDECEA', borderColor: 'rgba(180,35,24,0.4)' },
  text: { fontSize: 14, lineHeight: 20 },
  infoText: { color: colors.goldInk },
  errorText: { color: colors.wicket, fontWeight: '500' },
});

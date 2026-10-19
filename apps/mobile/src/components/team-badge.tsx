import { colors } from '@score-masterz/tokens';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

/** Team logo if there is one, otherwise the short code on the team colour. */
export function TeamBadge({
  code,
  color,
  logoUrl,
  size = 40,
}: {
  code: string;
  color: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.28) };
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={[box, styles.logo]} contentFit="contain" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[box, styles.code, { backgroundColor: color }]}>
      <Text style={[styles.codeText, { fontSize: Math.round(size * 0.4) }]}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { backgroundColor: colors.surface },
  code: { alignItems: 'center', justifyContent: 'center' },
  codeText: { color: colors.surface, fontWeight: '700' },
});

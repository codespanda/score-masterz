import {
  MIN_PASSWORD_LENGTH,
  logIn,
  logOut,
  sendPasswordReset,
  setPassword,
  startSignup,
  verifySignupCode,
} from '@score-masterz/data';
import { colors, radii, touchTarget } from '@score-masterz/tokens';
import { createURL } from 'expo-linking';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice, SessionNotice } from '@/components/notice';
import { BottomTabInset } from '@/constants/theme';
import { useAccount } from '@/hooks/use-account';

type Mode = 'signup' | 'login';

export default function AccountScreen() {
  const { session, client, account, refresh } = useAccount();
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const backTo = createURL('/account');
  const pending = sentTo ?? account?.pendingEmail ?? null;

  let body: React.ReactNode;
  if (!client) {
    body = <SessionNotice session={session} />;
  } else if (account === undefined) {
    body = <Text style={styles.muted}>Loading…</Text>;
  } else if (account && !account.isGuest) {
    // Signed in (possibly still choosing a password after verifying the email).
    body = (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{account.name ?? 'Your account'}</Text>
          <Text style={styles.value}>{account.email}</Text>
          {account.needsPassword && <Notice>Choose a password to finish setting up your account.</Notice>}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{account.needsPassword ? 'Choose a password' : 'Change password'}</Text>
          <Field value={password} onChangeText={setPw} placeholder={`Password (${MIN_PASSWORD_LENGTH}+ characters)`} secureTextEntry autoComplete="new-password" accessibilityLabel="New password" />
          <Field value={confirm} onChangeText={setConfirm} placeholder="Confirm password" secureTextEntry autoComplete="new-password" accessibilityLabel="Confirm password" />
          <Button
            label="Save password"
            disabled={busy}
            onPress={() =>
              run(async () => {
                await setPassword(client, password, confirm);
                await refresh();
                setPw('');
                setConfirm('');
                setInfo('Password saved.');
              })
            }
          />
        </View>
        <Button label="Log out" tone="danger" disabled={busy} onPress={() => run(() => logOut(client))} />
      </>
    );
  } else if (pending) {
    // Sign-up step 2: verify the email.
    body = (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Check your email</Text>
        <Text style={styles.muted}>
          We sent a verification email to {pending}. Tap the link in it, or enter the 6-digit code if the email shows one.
        </Text>
        <Field
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          accessibilityLabel="Verification code"
        />
        <Button
          label="Verify"
          disabled={busy || code.length !== 6}
          onPress={() =>
            run(async () => {
              await verifySignupCode(client, pending, code);
              await refresh();
            })
          }
        />
        <View style={styles.row}>
          <LinkButton
            label="Resend email"
            disabled={busy}
            onPress={() =>
              run(async () => {
                await startSignup(client, { name: account?.name ?? (name || 'Player'), email: pending }, backTo);
                setInfo('Sent again.');
              })
            }
          />
          <LinkButton label="Different email" onPress={() => setSentTo(null)} />
        </View>
      </View>
    );
  } else {
    // Guest: sign up (keeps this device's data) or log in.
    body = (
      <>
        <Notice>
          You&apos;re using a guest account. Guest data only lives on this device, so sign up to keep your teams and matches safe.
        </Notice>
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['signup', 'login'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              style={[styles.tab, mode === m && styles.tabOn]}>
              <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'signup' ? 'Sign up' : 'Log in'}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'signup' ? (
          <View style={styles.card}>
            <Field value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" accessibilityLabel="Your name" />
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email"
            />
            <Button
              label="Send verification email"
              disabled={busy}
              onPress={() => run(async () => setSentTo(await startSignup(client, { name, email }, backTo)))}
            />
            <Text style={styles.muted}>Everything you&apos;ve created on this device comes with you.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel="Email"
            />
            <Field value={password} onChangeText={setPw} placeholder="Password" secureTextEntry autoComplete="current-password" accessibilityLabel="Password" />
            <Button
              label="Log in"
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await logIn(client, email, password);
                  setPw('');
                })
              }
            />
            <LinkButton
              label="Forgot password?"
              disabled={busy || !email}
              onPress={() =>
                run(async () => {
                  await sendPasswordReset(client, email, backTo);
                  setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
                })
              }
            />
            <Text style={styles.muted}>Logging in switches to your saved account. Anything created as a guest stays with the guest.</Text>
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          ACCOUNT
        </Text>
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice>{info}</Notice>}
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={styles.input} />;
}

function Button({ label, onPress, disabled, tone }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'danger' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, tone === 'danger' && styles.btnDanger, (disabled || pressed) && styles.dim]}>
      <Text style={[styles.btnText, tone === 'danger' && styles.btnDangerText]}>{label}</Text>
    </Pressable>
  );
}

function LinkButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[styles.link, disabled && styles.dim]}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 16, gap: 14, paddingBottom: BottomTabInset + 24 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  value: { fontSize: 15, color: colors.inkSoft },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  btn: { minHeight: 50, borderRadius: radii.md, backgroundColor: colors.pitch, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  btnDanger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.wicket },
  btnDangerText: { color: colors.wicket },
  dim: { opacity: 0.55 },
  row: { flexDirection: 'row', gap: 16 },
  link: { minHeight: touchTarget, justifyContent: 'center' },
  linkText: { color: colors.pitch, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: 4 },
  tab: { flex: 1, minHeight: touchTarget, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.pitch },
  tabText: { fontWeight: '700', color: colors.inkSoft },
  tabTextOn: { color: colors.surface },
});

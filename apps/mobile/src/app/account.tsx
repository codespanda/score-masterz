import {
  MIN_PASSWORD_LENGTH,
  logIn,
  logOut,
  sendPasswordReset,
  setPassword,
  startSignup,
  verifySignupCode,
} from '@score-masterz/data';
import { createURL } from 'expo-linking';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthScreen,
  Button,
  Card,
  CodeBoxes,
  Field,
  Hint,
  Label,
  PasswordField,
  Steps,
  TextLink,
  authText,
} from '@/components/auth-ui';
import { Notice, SessionNotice } from '@/components/notice';
import { useAccount } from '@/hooks/use-account';

export default function AccountScreen() {
  const { session, client, account, refresh } = useAccount();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
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

  const messages = (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice>{info}</Notice>}
    </>
  );

  if (!client || account === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        {client ? <Text style={authText.muted}>Loading…</Text> : <SessionNotice session={session} />}
      </SafeAreaView>
    );
  }

  const backTo = createURL('/account');
  const pending = sentTo ?? account?.pendingEmail ?? null;

  // Signed in (with a password).
  if (account && !account.isGuest && !account.needsPassword) {
    return (
      <AuthScreen title="Hi," accent={account.name?.split(' ')[0] ?? 'there'} subtitle={account.email ?? ''}>
        {messages}
        <Card>
          <Text style={authText.strong}>Change password</Text>
          <Label>New password</Label>
          <PasswordField value={password} onChangeText={setPw} autoComplete="new-password" />
          <Label>Confirm new password</Label>
          <PasswordField value={confirm} onChangeText={setConfirm} autoComplete="new-password" />
          <Button
            label="Save password"
            disabled={busy}
            onPress={() =>
              run(async () => {
                await setPassword(client, password, confirm);
                setPw('');
                setConfirm('');
                setInfo('Password saved.');
              })
            }
          />
        </Card>
        <Button label="Log out" tone="danger" disabled={busy} onPress={() => run(() => logOut(client))} />
      </AuthScreen>
    );
  }

  // Sign-up step 3: email verified, choose a password.
  if (account && !account.isGuest && account.needsPassword) {
    return (
      <AuthScreen title="Almost" accent="there" subtitle={`✓ ${account.email} verified`}>
        {messages}
        <Card>
          <Steps current={3} />
          <Label>{`Password (${MIN_PASSWORD_LENGTH}+ characters)`}</Label>
          <PasswordField value={password} onChangeText={setPw} autoComplete="new-password" />
          <Label>Confirm password</Label>
          <PasswordField value={confirm} onChangeText={setConfirm} autoComplete="new-password" />
          <Button
            label="Finish sign-up"
            disabled={busy}
            onPress={() =>
              run(async () => {
                await setPassword(client, password, confirm);
                await refresh();
                setPw('');
                setConfirm('');
              })
            }
          />
        </Card>
      </AuthScreen>
    );
  }

  // Sign-up step 2: verify the email.
  if (pending) {
    return (
      <AuthScreen title="Check your" accent="email" subtitle={`Sent to ${pending}`}>
        {messages}
        <Card>
          <Steps current={2} />
          <Text style={authText.muted}>Enter the 6-digit code from the email, or tap the link in it.</Text>
          <CodeBoxes value={code} onChange={setCode} />
          <Button
            label={code.length === 6 ? 'Verify and continue' : 'Enter all 6 digits'}
            disabled={busy || code.length !== 6}
            onPress={() =>
              run(async () => {
                await verifySignupCode(client, pending, code);
                await refresh();
              })
            }
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextLink
              label="Resend email"
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await startSignup(client, { name: account?.name ?? (name || 'Player'), email: pending }, backTo);
                  setInfo('Sent again.');
                })
              }
            />
            <TextLink label="Different email" onPress={() => setSentTo(null)} />
          </View>
        </Card>
      </AuthScreen>
    );
  }

  // Guest: log in.
  if (mode === 'login') {
    return (
      <AuthScreen title="Welcome" accent="back" subtitle="Log in to score and manage your teams.">
        {messages}
        <Card>
          <Label>Email</Label>
          <Field value={email} onChangeText={setEmail} placeholder="you@club.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Email" />
          <Label>Password</Label>
          <PasswordField value={password} onChangeText={setPw} autoComplete="current-password" accessibilityLabel="Password" />
          <TextLink
            label="Forgot password?"
            align="end"
            disabled={busy}
            onPress={() =>
              email.trim()
                ? run(async () => {
                    await sendPasswordReset(client, email, backTo);
                    setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
                  })
                : setError('Enter your email first.')
            }
          />
          <Button
            label={busy ? 'Logging in…' : 'Log in'}
            disabled={busy}
            onPress={() =>
              run(async () => {
                await logIn(client, email, password);
                setPw('');
              })
            }
          />
        </Card>
        <Button label="Create an account" tone="outline" onPress={() => setMode('signup')} />
        <Hint tone="gold">
          On a guest account? <Text style={{ fontWeight: '700' }}>Sign up instead</Text> to keep the teams you&apos;ve made on this phone.
        </Hint>
      </AuthScreen>
    );
  }

  // Guest: sign up (step 1).
  return (
    <AuthScreen title="Your club," accent="saved" subtitle="Free account. Use it on any device.">
      {messages}
      <Card>
        <Steps current={1} />
        <Label>Your name</Label>
        <Field value={name} onChangeText={setName} autoComplete="name" accessibilityLabel="Your name" />
        <Label>Email</Label>
        <Field value={email} onChangeText={setEmail} placeholder="you@club.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Email" />
        <Button
          label={busy ? 'Sending…' : 'Send verification email'}
          disabled={busy}
          onPress={() => run(async () => setSentTo(await startSignup(client, { name, email }, backTo)))}
        />
      </Card>
      <Hint tone="green">
        <Text style={{ fontWeight: '700' }}>Nothing gets lost.</Text> Teams and matches you made as a guest move into your account.
      </Hint>
      <Text style={[authText.muted, authText.center]}>Already have an account?</Text>
      <Button label="Log in" tone="outline" onPress={() => setMode('login')} />
    </AuthScreen>
  );
}

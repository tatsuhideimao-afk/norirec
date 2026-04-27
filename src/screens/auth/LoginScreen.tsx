import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert, TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { OrangeButton } from '../../components/common/OrangeButton';
import { signIn } from '../../firebase/auth';

interface Props {
  onNavigateRegister: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onNavigateRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert('ログイン失敗', 'メールアドレスまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>🐎🚴{'\n'}🚤🏍️</Text>
          <Text style={styles.appName}>ノリレク</Text>
          <Text style={styles.tagline}>乗り打ち収支管理</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="パスワード"
            secureTextEntry
          />

          <OrangeButton title="ログイン" onPress={handleLogin} loading={loading} style={styles.btn} />

          <TouchableOpacity onPress={onNavigateRegister} style={styles.linkBtn}>
            <Text style={styles.link}>アカウント登録はこちら</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 40,
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
  },
  btn: {
    marginTop: 24,
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  link: {
    color: COLORS.primary,
    fontSize: 14,
  },
});

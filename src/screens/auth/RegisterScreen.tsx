import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert, TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { OrangeButton } from '../../components/common/OrangeButton';
import { signUp } from '../../firebase/auth';

interface Props {
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<Props> = ({ onNavigateLogin }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirm) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }
    if (password !== confirm) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }
    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch (e: any) {
      Alert.alert('登録失敗', e.message ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>アカウント登録</Text>

        <View style={styles.form}>
          <Text style={styles.label}>表示名</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="大迫 / 今伊 など"
          />

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
            placeholder="6文字以上"
            secureTextEntry
          />

          <Text style={styles.label}>パスワード確認</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="もう一度入力"
            secureTextEntry
          />

          <OrangeButton title="登録する" onPress={handleRegister} loading={loading} style={styles.btn} />

          <TouchableOpacity onPress={onNavigateLogin} style={styles.linkBtn}>
            <Text style={styles.link}>ログインはこちら</Text>
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
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  form: { gap: 4 },
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
  btn: { marginTop: 24 },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  link: { color: COLORS.primary, fontSize: 14 },
});

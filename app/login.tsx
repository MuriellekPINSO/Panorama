import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
             <ThemedText style={styles.logoIcon}>🌐</ThemedText>
          </View>
          <ThemedText type="title" style={styles.appName}>Panorama Pro</ThemedText>
          <ThemedText style={styles.tagline}>Professional 360° Management</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email Address</ThemedText>
            <TextInput 
              placeholder="name@agency.com"
              placeholderTextColor="#94A3B8"
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
              <TextInput 
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                style={[styles.inputFlex, { color: colors.text }]}
              />
              {/* Eye icon placeholder */}
            </View>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInBtn} onPress={() => router.replace('/(tabs)')}>
            <ThemedText style={styles.signInText}>Sign In</ThemedText>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <ThemedText style={styles.dividerText}>OR CONTINUE WITH</ThemedText>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <ThemedText>Google</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: 'black' }]}>
              <ThemedText style={{ color: 'white' }}>Apple</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.signUpText}>Sign Up</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 60,
    height: 60,
    backgroundColor: '#1D8CF8',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1D8CF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoIcon: {
    fontSize: 30,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tagline: {
    color: '#94A3B8',
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#94A3B8',
  },
  input: {
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  inputContainer: {
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  inputFlex: {
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotText: {
    color: '#1D8CF8',
    fontSize: 12,
  },
  signInBtn: {
    backgroundColor: '#1D8CF8',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D8CF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  signInText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 15,
  },
  socialBtn: {
    flex: 1,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#94A3B8',
  },
  signUpText: {
    color: '#1D8CF8',
    fontWeight: 'bold',
  },
});

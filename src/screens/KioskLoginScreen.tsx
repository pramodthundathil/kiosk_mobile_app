import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lock,
  Cpu,
  Server,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  MonitorCheck,
  ShieldCheck,
} from 'lucide-react-native';
import { kioskColors, kioskShadows, minTouchTarget } from '../theme/kioskTheme';
import { useKioskResponsive } from '../hooks/useKioskResponsive';
import { getDeviceMacAddress } from '../utils/deviceInfo';
import { loginKioskDevice, getSavedServerUrl, DEFAULT_SERVER_URL } from '../services/api';


interface KioskLoginScreenProps {
  onLoginSuccess: (kioskData: any) => void;
}

const isTV = Platform.isTV;

export const KioskLoginScreen: React.FC<KioskLoginScreenProps> = ({ onLoginSuccess }) => {
  const responsiveMetrics = useKioskResponsive();
  const { isLandscape, scaleFont, scaleSpacing } = responsiveMetrics;

  const [macAddress, setMacAddress] = useState<string>('Detecting MAC...');
  const [deviceSecret, setDeviceSecret] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_SERVER_URL);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showFullMac, setShowFullMac] = useState<boolean>(false);
  const [showServerConfig, setShowServerConfig] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Auto detect MAC Address on mount
    const initDevice = async () => {
      const mac = await getDeviceMacAddress();
      setMacAddress(mac);

      const savedUrl = await getSavedServerUrl();
      setServerUrl(savedUrl);
    };
    initDevice();
  }, []);

  // Format MAC Address with security masking (e.g. 12:34:**:**:**:BC)
  const getDisplayMacAddress = (fullMac: string) => {
    if (!fullMac || fullMac.includes('Detecting')) return fullMac;
    if (showFullMac) return fullMac;

    const parts = fullMac.split(':');
    if (parts.length === 6) {
      return `${parts[0]}:${parts[1]}:**:**:**:${parts[5]}`;
    }
    if (fullMac.length >= 8) {
      return `${fullMac.slice(0, 5)}:**:**:${fullMac.slice(-2)}`;
    }
    return fullMac;
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!deviceSecret.trim()) {
      setErrorMessage('Please enter the Kiosk Device Secret password.');
      return;
    }

    setIsLoading(true);

    // Send the actual full MAC address to backend for authentication
    const result = await loginKioskDevice(macAddress, deviceSecret, serverUrl);

    setIsLoading(false);

    if (result.success && result.data) {
      onLoginSuccess(result.data);
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check device secret.');
    }
  };

  // ─── Standard Multi-Device Layout (Mobile, Tablet, Kiosk, Android TV) ─────


  // ─── Touch Screen Layout ────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.rootContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.cardContainer,
            kioskShadows.card,
            {
              width: isLandscape ? '85%' : '90%',
              maxWidth: isLandscape ? 840 : 520,
              padding: isLandscape ? scaleSpacing(20) : scaleSpacing(28),
            },
          ]}
        >
          {isLandscape ? (
            /* Landscape 2-Column Split Layout - Fits 100% on screen without scrolling */
            <View style={styles.landscapeRow}>
              {/* Left Column: Branding Logo & Stylized Tagline */}
              <View style={styles.landscapeLeftCol}>
                <Image
                  source={require('../../assets/excel logo_blue.png')}
                  style={styles.landscapeLogoImg}
                  resizeMode="contain"
                />
                <View style={styles.taglineWrapper}>
                  <Text style={[styles.taglineCursiveText, { fontSize: scaleFont(15) }]}>
                    Hardware Authentication & Terminal Registration Station
                  </Text>
                </View>

                <View style={styles.securityBadge}>
                  <ShieldCheck size={14} color={kioskColors.lightningGold} />
                  <Text style={styles.securityBadgeText}>ISO 9001:2015 CERTIFIED TERMINAL</Text>
                </View>
              </View>

              {/* Right Column: Inputs & Submit Button */}
              <View style={styles.landscapeRightCol}>
                {errorMessage && (
                  <View style={styles.errorBoxCompact}>
                    <AlertTriangle size={14} color={kioskColors.brandRed} />
                    <Text style={styles.errorTextCompact}>{errorMessage}</Text>
                  </View>
                )}

                {/* Field 1: MAC Address (Partially Masked for Security) */}
                <View style={styles.fieldGroupCompact}>
                  <View style={styles.labelRow}>
                    <Cpu size={13} color={kioskColors.accentBlue} />
                    <Text style={[styles.fieldLabel, { fontSize: scaleFont(11) }]}>
                      HARDWARE MAC ADDRESS (USERNAME)
                    </Text>
                  </View>
                  <View style={styles.readOnlyInputCompact}>
                    <Text style={[styles.macText, { fontSize: scaleFont(14) }]}>
                      {getDisplayMacAddress(macAddress)}
                    </Text>

                    <View style={styles.macControlsRow}>
                      <TouchableOpacity
                        onPress={() => setShowFullMac(!showFullMac)}
                        style={styles.macToggleBtn}
                      >
                        {showFullMac ? (
                          <EyeOff size={14} color={kioskColors.textSecondary} />
                        ) : (
                          <Eye size={14} color={kioskColors.textSecondary} />
                        )}
                      </TouchableOpacity>

                      <View style={styles.autoDetectedBadge}>
                        <MonitorCheck size={11} color={kioskColors.success} />
                        <Text style={styles.autoDetectedText}>AUTO</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Field 2: Password */}
                <View style={styles.fieldGroupCompact}>
                  <View style={styles.labelRow}>
                    <Lock size={13} color={kioskColors.accentBlue} />
                    <Text style={[styles.fieldLabel, { fontSize: scaleFont(11) }]}>
                      DEVICE SECRET (PASSWORD)
                    </Text>
                  </View>

                  <View style={styles.inputContainerCompact}>
                    <TextInput
                      value={deviceSecret}
                      onChangeText={setDeviceSecret}
                      placeholder="Enter kiosk secret password..."
                      placeholderTextColor={kioskColors.textMuted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                      focusable={true}
                      accessible={true}
                      accessibilityLabel="Device Secret Password"
                      style={[styles.textInput, { fontSize: scaleFont(14) }]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      focusable={true}
                      accessible={true}
                      accessibilityLabel="Toggle password visibility"
                      style={styles.eyeBtnCompact}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={kioskColors.textSecondary} />
                      ) : (
                        <Eye size={18} color={kioskColors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Optional Server Config */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowServerConfig(!showServerConfig)}
                  focusable={true}
                  accessible={true}
                  accessibilityLabel="Toggle backend server endpoint settings"
                  style={styles.serverToggleCompact}
                >
                  <Server size={12} color={kioskColors.textMuted} />
                  <Text style={styles.serverToggleTextCompact}>
                    Backend Endpoint: {serverUrl}
                  </Text>
                </TouchableOpacity>

                {showServerConfig && (
                  <View style={styles.serverConfigContainerCompact}>
                    <Text style={styles.serverLabel}>Django Backend Endpoint URL</Text>
                    <TextInput
                      value={serverUrl}
                      onChangeText={setServerUrl}
                      placeholder="https://excel.byteboot.in"
                      placeholderTextColor={kioskColors.textMuted}
                      autoCapitalize="none"
                      focusable={true}
                      accessible={true}
                      accessibilityLabel="Backend Endpoint URL"
                      style={styles.serverInputCompact}
                    />
                  </View>
                )}

                {/* Submit Action Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleLogin}
                  disabled={isLoading}
                  focusable={true}
                  hasTVPreferredFocus={isTV}
                  accessible={true}
                  accessibilityLabel="Register and Open Kiosk"
                  style={[styles.submitButton, kioskShadows.glowBlue]}
                >
                  <LinearGradient
                    colors={[kioskColors.surfaceLight, kioskColors.surfaceMedium]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitGradientCompact}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={[styles.submitText, { fontSize: scaleFont(15) }]}>
                          REGISTER & OPEN KIOSK
                        </Text>
                        <ArrowRight size={scaleFont(18)} color={kioskColors.lightningGold} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

          ) : (
            /* Portrait Stacked Layout */
            <View style={styles.portraitCol}>
              {/* Header Branding with Transparent Official Logo */}
              <View style={styles.brandHeader}>
                <Image
                  source={require('../../assets/excel logo_blue.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />

                <View style={styles.taglineWrapper}>
                  <Text style={[styles.taglineCursiveText, { fontSize: scaleFont(17) }]}>
                    Hardware Authentication & Terminal Registration Station
                  </Text>
                </View>
              </View>

              {/* Error Alert Box */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <AlertTriangle size={18} color={kioskColors.brandRed} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Field 1: Hardware MAC Address (Partially Masked) */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Cpu size={14} color={kioskColors.accentBlue} />
                  <Text style={[styles.fieldLabel, { fontSize: scaleFont(13) }]}>
                    HARDWARE MAC ADDRESS (USERNAME)
                  </Text>
                </View>
                <View style={styles.readOnlyInput}>
                  <Text style={[styles.macText, { fontSize: scaleFont(16) }]}>
                    {getDisplayMacAddress(macAddress)}
                  </Text>

                  <View style={styles.macControlsRow}>
                    <TouchableOpacity
                      onPress={() => setShowFullMac(!showFullMac)}
                      style={styles.macToggleBtn}
                    >
                      {showFullMac ? (
                        <EyeOff size={16} color={kioskColors.textSecondary} />
                      ) : (
                        <Eye size={16} color={kioskColors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.autoDetectedBadge}>
                      <MonitorCheck size={12} color={kioskColors.success} />
                      <Text style={styles.autoDetectedText}>AUTO DETECTED</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Field 2: Password */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Lock size={14} color={kioskColors.accentBlue} />
                  <Text style={[styles.fieldLabel, { fontSize: scaleFont(13) }]}>
                    DEVICE SECRET (PASSWORD)
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    value={deviceSecret}
                    onChangeText={setDeviceSecret}
                    placeholder="Enter kiosk secret password..."
                    placeholderTextColor={kioskColors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    focusable={true}
                    accessible={true}
                    accessibilityLabel="Device Secret Password"
                    style={[styles.textInput, { fontSize: scaleFont(16) }]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    focusable={true}
                    accessible={true}
                    accessibilityLabel="Toggle password visibility"
                    style={styles.eyeBtn}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={kioskColors.textSecondary} />
                    ) : (
                      <Eye size={20} color={kioskColors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Optional Server Configuration */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowServerConfig(!showServerConfig)}
                focusable={true}
                accessible={true}
                accessibilityLabel="Toggle backend server endpoint settings"
                style={styles.serverToggle}
              >
                <Server size={14} color={kioskColors.textMuted} />
                <Text style={styles.serverToggleText}>
                  Backend Endpoint: {serverUrl}
                </Text>
              </TouchableOpacity>

              {showServerConfig && (
                <View style={styles.serverConfigContainer}>
                  <Text style={styles.serverLabel}>Django Backend Endpoint URL</Text>
                  <TextInput
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholder="https://excel.byteboot.in"
                    placeholderTextColor={kioskColors.textMuted}
                    autoCapitalize="none"
                    focusable={true}
                    accessible={true}
                    accessibilityLabel="Backend Endpoint URL"
                    style={styles.serverInput}
                  />
                </View>
              )}

              {/* Submit Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={isLoading}
                focusable={true}
                accessible={true}
                accessibilityLabel="Register and Open Kiosk"
                style={[styles.submitButton, kioskShadows.glowBlue]}
              >
                <LinearGradient
                  colors={[kioskColors.surfaceLight, kioskColors.surfaceMedium]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={[styles.submitText, { fontSize: scaleFont(17) }]}>
                        REGISTER & OPEN KIOSK
                      </Text>
                      <ArrowRight size={scaleFont(20)} color={kioskColors.lightningGold} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  localStorageBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  localStorageBtnTextCompact: {
    color: '#0D60AE',
    fontSize: 12,
    fontWeight: '700',
  },
  localStorageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  localStorageBtnText: {
    color: '#0D60AE',
    fontSize: 13,
    fontWeight: '700',
  },
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'stretch',
  },
  /* Landscape Layout Specific Styles */
  landscapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  landscapeLeftCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  landscapeLogoImg: {
    width: 250,
    height: 70,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  securityBadgeText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  landscapeRightCol: {
    flex: 1.2,
    justifyContent: 'center',
  },
  fieldGroupCompact: {
    marginBottom: 12,
  },
  readOnlyInputCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  macControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macToggleBtn: {
    padding: 4,
  },
  inputContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  eyeBtnCompact: {
    padding: 6,
  },
  serverToggleCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  serverToggleTextCompact: {
    color: '#64748B',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  serverConfigContainerCompact: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverInputCompact: {
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  submitGradientCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: 12,
  },
  errorBoxCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorTextCompact: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 11,
    flex: 1,
  },

  /* Portrait Layout Specific Styles */
  portraitCol: {
    alignItems: 'stretch',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImg: {
    width: 260,
    height: 70,
  },
  taglineWrapper: {
    marginTop: 8,
    alignItems: 'center',
  },
  taglineCursiveText: {
    fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#1E2B58',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '700',
    flex: 1,
    fontSize: 13,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Montserrat',
    color: '#475569',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: minTouchTarget - 10,
  },
  macText: {
    color: '#D97706',
    fontWeight: '800',
    letterSpacing: 1,
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoDetectedText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: minTouchTarget - 10,
  },
  textInput: {
    flex: 1,
    color: '#0F172A',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 8,
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 14,
  },
  serverToggleText: {
    color: '#64748B',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  serverConfigContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  serverInput: {
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    backgroundColor: '#1E2B58',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: minTouchTarget,
  },
  submitText: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Montserrat',
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
  },
});

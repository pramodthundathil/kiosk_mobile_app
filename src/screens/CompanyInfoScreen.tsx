import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  Award,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  Cpu,
  Edit3,
} from 'lucide-react-native';
import { kioskColors, kioskIcons, kioskRadii } from '../theme/kioskTheme';
import { KioskResponsiveMetrics } from '../types/kiosk';
import { KioskBackButton } from '../components/KioskBackButton';
import { WhiteboardModal } from '../components/WhiteboardModal';
import { useAppVersion } from '../hooks/useAppVersion';

interface CompanyInfoScreenProps {
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
}

export const CompanyInfoScreen: React.FC<CompanyInfoScreenProps> = ({
  metrics,
  onBack,
}) => {
  const { isLandscape, scaleFont, scaleSpacing, crispTextProps } = metrics;
  const appVersion = useAppVersion();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  return (
    <View style={styles.rootContainer}>
      {/* Subtle modern background gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#F0F6FF', '#E8EFF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Interactive Digital Whiteboard Modal */}
      <WhiteboardModal visible={isWhiteboardOpen} onClose={() => setIsWhiteboardOpen(false)} />

      {/* Top Earth Header Background in Portrait Mode */}
      {!isLandscape && (
        <ImageBackground
          source={require('../../assets/portrait_earth_header.png')}
          style={[styles.portraitHeaderBg, { minHeight: scaleSpacing(110) }]}
          imageStyle={styles.portraitHeaderBgImage}
          resizeMode="cover"
        >
          <View style={styles.portraitHeaderTopRow}>
            <Image
              source={require('../../assets/excel_logo_white.png')}
              style={styles.portraitLogoImg}
              resizeMode="contain"
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsWhiteboardOpen(true)}
              style={styles.portraitHeaderWhiteboardBtn}
            >
              <Edit3 size={scaleFont(14)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.portraitHeaderWhiteboardBtnText, { fontSize: scaleFont(12) }]}>Whiteboard</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      )}

      {/* Top Page Header Bar */}
      <View style={styles.headerBar}>
        <KioskBackButton onPress={onBack} label="Back to Catalog" />

        <View style={styles.headerTitleBox}>
          <View style={styles.headerCategoryPill}>
            <Text style={styles.headerCategoryText}>CORPORATE OVERVIEW</Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.headerTitleText, { fontSize: scaleFont(13.5) }]}
          >
            Excel Earthings Private Limited
          </Text>
        </View>

        <View style={styles.isoBadge}>
          <ShieldCheck size={13} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
          <Text style={styles.isoBadgeText}>ISO 9001:2015</Text>
        </View>
      </View>

      {/* Full Page Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[
          styles.scrollBody,
          { padding: scaleSpacing(20) },
        ]}
      >
        {/* Main Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerLogoRow}>
            <Image
              source={require('../../assets/excel logo_blue.png')}
              style={styles.brandLogoImg}
              resizeMode="contain"
            />
            <View style={styles.bannerTaglineBox}>
              <Text style={[styles.taglineHeading, { fontSize: scaleFont(18) }]}>
                Premier Earthing & Lightning Protection Systems Manufacturer
              </Text>
              <Text style={[styles.taglineSub, { fontSize: scaleFont(12.5) }]}>
                Specializing in Copper Bonded Electrodes, ESE Lightning Arresters & Earth Enhancement Compounds
              </Text>
            </View>
          </View>
        </View>

        {/* Company Pillars Grid */}
        <View style={[styles.pillarsGrid, { flexDirection: isLandscape ? 'row' : 'column' }]}>
          {/* Card 1: Excellence & Certifications */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Award size={scaleFont(20)} color={kioskColors.lightningGold} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.cardTitle, { fontSize: scaleFont(15) }]}>
                Quality & Standards
              </Text>
            </View>
            <Text style={[styles.cardText, { fontSize: scaleFont(12.5) }]}>
              Excel Earthings Private Limited is an ISO 9001:2015 certified manufacturer. All products strictly adhere to international engineering standards including IEC 62561-2, IEEE 80, UL 467, and NBC 2016.
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <CheckCircle2 size={15} color={kioskColors.success} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={styles.bulletText}>250+ Micron Molecular Copper Bonding</Text>
              </View>
              <View style={styles.bulletItem}>
                <CheckCircle2 size={15} color={kioskColors.success} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={styles.bulletText}>CPRI & NABL Accredited Laboratory Tested</Text>
              </View>
              <View style={styles.bulletItem}>
                <CheckCircle2 size={15} color={kioskColors.success} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={styles.bulletText}>30+ Years Corrosion Service Lifetime</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Manufacturing Facilities */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Building2 size={scaleFont(20)} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <Text style={[styles.cardTitle, { fontSize: scaleFont(15) }]}>
                Manufacturing Infrastructure
              </Text>
            </View>
            <Text style={[styles.cardText, { fontSize: scaleFont(12.5) }]}>
              State-of-the-art automated copper molecular bonding plants with high-precision electro-plating units, continuous quality monitoring, and automated hydraulic rod processing.
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Cpu size={15} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={styles.bulletText}>Automated Electro-Plating Lines</Text>
              </View>
              <View style={styles.bulletItem}>
                <Cpu size={15} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={styles.bulletText}>High Conductivity Low-Resistivity Compounds</Text>
              </View>
              <View style={styles.bulletItem}>
                <Cpu size={15} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
                <Text style={styles.bulletText}>ESE High-Voltage Trigger Testing Station</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact & Global Presence Card */}
        <View style={styles.contactCard}>
          <Text style={[styles.contactCardTitle, { fontSize: scaleFont(14) }]}>
            Corporate Contact & Headquarters
          </Text>

          <View style={[styles.contactItemsRow, { flexDirection: isLandscape ? 'row' : 'column' }]}>
            <View style={styles.contactItem}>
              <Globe size={18} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <View>
                <Text style={styles.contactItemLabel}>Official Website</Text>
                <Text style={styles.contactItemVal}>www.excelearthings.com</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Mail size={18} color={kioskColors.accentBlue} strokeWidth={kioskIcons.strokeWidth} />
              <View>
                <Text style={styles.contactItemLabel}>Corporate Email</Text>
                <Text style={styles.contactItemVal}>info@excelearthings.com</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Phone size={18} color={kioskColors.success} strokeWidth={kioskIcons.strokeWidth} />
              <View>
                <Text style={styles.contactItemLabel}>Customer Support Hotline</Text>
                <Text style={styles.contactItemVal}>+91 98460 00000</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Ad Banner in Portrait Mode */}
      {!isLandscape && (
        <>
          <View style={styles.portraitVersionBar}>
            <Text style={[styles.portraitVersionText, { fontSize: scaleFont(11.5) }]} {...crispTextProps}>
              v{appVersion}
            </Text>
          </View>
          <View style={styles.fixedBottomAdWrapper}>
            <Image
              source={require('../../assets/portrait_nature_footer.png')}
              style={[styles.fixedBottomAdImg, { height: Math.max(68, scaleSpacing(72)) }]}
              resizeMode="cover"
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  portraitHeaderBg: {
    width: '100%',
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#020D22',
  },
  portraitHeaderBgImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  portraitHeaderTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  portraitLogoImg: {
    width: 175,
    height: 48,
  },
  portraitHeaderWhiteboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: kioskRadii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  portraitHeaderWhiteboardBtnText: {
    color: kioskColors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  fixedBottomAdWrapper: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  fixedBottomAdImg: {
    width: '100%',
    height: 68,
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCategoryPill: {
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  headerCategoryText: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  headerTitleText: {
    color: kioskColors.textPrimary,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  isoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: kioskColors.badgeBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: kioskRadii.xs,
    borderWidth: 1,
    borderColor: kioskColors.badgeBorder,
  },
  isoBadgeText: {
    color: kioskColors.accentBlue,
    fontWeight: '800',
    fontSize: 12,
    includeFontPadding: false,
  },
  scrollBody: {
    flexGrow: 1,
    gap: 18,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  brandLogoImg: {
    width: 200,
    height: 56,
  },
  bannerTaglineBox: {
    flex: 1,
    minWidth: 260,
  },
  taglineHeading: {
    fontWeight: '900',
    color: kioskColors.textPrimary,
    letterSpacing: -0.2,
  },
  taglineSub: {
    color: kioskColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  pillarsGrid: {
    gap: 18,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontWeight: '800',
    color: kioskColors.textPrimary,
  },
  cardText: {
    color: kioskColors.textSecondary,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 4,
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletText: {
    color: kioskColors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: kioskRadii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  contactCardTitle: {
    fontWeight: '800',
    color: kioskColors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  contactItemsRow: {
    gap: 14,
    justifyContent: 'space-between',
  },
  contactItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: kioskRadii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactItemLabel: {
    color: kioskColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  contactItemVal: {
    color: kioskColors.textPrimary,
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 2,
  },
  portraitVersionBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  portraitVersionText: {
    color: kioskColors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
});

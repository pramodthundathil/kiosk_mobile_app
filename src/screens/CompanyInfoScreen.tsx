import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  Building2,
  Award,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Cpu,
} from 'lucide-react-native';
import { kioskColors, kioskShadows } from '../theme/kioskTheme';
import { KioskResponsiveMetrics } from '../types/kiosk';

interface CompanyInfoScreenProps {
  metrics: KioskResponsiveMetrics;
  onBack: () => void;
}

export const CompanyInfoScreen: React.FC<CompanyInfoScreenProps> = ({
  metrics,
  onBack,
}) => {
  const { isLandscape, scaleFont, scaleSpacing } = metrics;

  return (
    <View style={styles.rootContainer}>
      {/* Top Page Header Bar with Back Navigation */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.backButton}
        >
          <ArrowLeft size={scaleFont(20)} color="#FFFFFF" />
          <Text style={[styles.backButtonText, { fontSize: scaleFont(14) }]}>
            Back to Catalog
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerCategoryText, { fontSize: scaleFont(11) }]}>
            CORPORATE OVERVIEW & MANUFACTURING
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.headerTitleText, { fontSize: scaleFont(18) }]}
          >
            EXCEL EARTHINGS PRIVATE LIMITED
          </Text>
        </View>

        <View style={styles.isoBadge}>
          <ShieldCheck size={14} color="#FDE047" />
          <Text style={styles.isoBadgeText}>ISO 9001:2015</Text>
        </View>
      </View>

      {/* Full Page Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[
          styles.scrollBody,
          { padding: scaleSpacing(24) },
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
              <Text style={[styles.taglineSub, { fontSize: scaleFont(13) }]}>
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
              <Award size={scaleFont(20)} color={kioskColors.lightningGold} />
              <Text style={[styles.cardTitle, { fontSize: scaleFont(15) }]}>
                Quality & Standards
              </Text>
            </View>
            <Text style={[styles.cardText, { fontSize: scaleFont(13) }]}>
              Excel Earthings Private Limited is an ISO 9001:2015 certified manufacturer. All products strictly adhere to international engineering standards including IEC 62561-2, IEEE 80, UL 467, and NBC 2016.
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <CheckCircle2 size={15} color={kioskColors.success} />
                <Text style={styles.bulletText}>250+ Micron Molecular Copper Bonding</Text>
              </View>
              <View style={styles.bulletItem}>
                <CheckCircle2 size={15} color={kioskColors.success} />
                <Text style={styles.bulletText}>CPRI & NABL Accredited Laboratory Tested</Text>
              </View>
              <View style={styles.bulletItem}>
                <CheckCircle2 size={15} color={kioskColors.success} />
                <Text style={styles.bulletText}>30+ Years Corrosion Service Lifetime</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Manufacturing Facilities */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Building2 size={scaleFont(20)} color={kioskColors.accentBlue} />
              <Text style={[styles.cardTitle, { fontSize: scaleFont(15) }]}>
                Manufacturing Infrastructure
              </Text>
            </View>
            <Text style={[styles.cardText, { fontSize: scaleFont(13) }]}>
              State-of-the-art automated copper molecular bonding plants with high-precision electro-plating units, continuous quality monitoring, and automated hydraulic rod processing.
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Cpu size={15} color={kioskColors.accentBlue} />
                <Text style={styles.bulletText}>Automated Electro-Plating Lines</Text>
              </View>
              <View style={styles.bulletItem}>
                <Cpu size={15} color={kioskColors.accentBlue} />
                <Text style={styles.bulletText}>High Conductivity Low-Resistivity Compounds</Text>
              </View>
              <View style={styles.bulletItem}>
                <Cpu size={15} color={kioskColors.accentBlue} />
                <Text style={styles.bulletText}>ESE High-Voltage Trigger Testing Station</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact & Global Presence Card */}
        <View style={styles.contactCard}>
          <Text style={[styles.contactCardTitle, { fontSize: scaleFont(16) }]}>
            Corporate Contact & Headquarters
          </Text>

          <View style={[styles.contactItemsRow, { flexDirection: isLandscape ? 'row' : 'column' }]}>
            <View style={styles.contactItem}>
              <Globe size={18} color={kioskColors.accentBlue} />
              <View>
                <Text style={styles.contactItemLabel}>Official Website</Text>
                <Text style={styles.contactItemVal}>www.excelearthings.com</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Mail size={18} color={kioskColors.accentBlue} />
              <View>
                <Text style={styles.contactItemLabel}>Corporate Email</Text>
                <Text style={styles.contactItemVal}>info@excelearthings.com</Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <Phone size={18} color={kioskColors.success} />
              <View>
                <Text style={styles.contactItemLabel}>Customer Support Hotline</Text>
                <Text style={styles.contactItemVal}>+91 98460 00000</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    backgroundColor: '#1E2B58',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#0D60AE',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D60AE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  headerCategoryText: {
    color: '#FEF08A',
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 2,
  },
  isoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  isoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  scrollBody: {
    flexGrow: 1,
    gap: 20,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  brandLogoImg: {
    width: 220,
    height: 60,
  },
  bannerTaglineBox: {
    flex: 1,
    minWidth: 260,
  },
  taglineHeading: {
    fontWeight: '900',
    color: '#0F172A',
  },
  taglineSub: {
    color: '#475569',
    marginTop: 4,
    lineHeight: 20,
  },
  pillarsGrid: {
    gap: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontWeight: '800',
    color: '#0F172A',
  },
  cardText: {
    color: '#475569',
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 6,
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  contactCardTitle: {
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactItemsRow: {
    gap: 16,
    justifyContent: 'space-between',
  },
  contactItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactItemLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  contactItemVal: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});

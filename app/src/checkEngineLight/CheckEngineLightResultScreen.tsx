import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EngineLightCause } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from '../garage/useVehicles';
import { useDecisionDraft } from '../decision/DecisionDraftContext';
import { openRepairFacilitySearch } from '../garage/researchRepairFacility';
import { saveCheckEngineCheck } from './checkEngineLightHistory';

type Props = NativeStackScreenProps<AppStackParamList, 'CheckEngineLightResult'>;

const LIKELIHOOD_COLOR: Record<EngineLightCause['likelihood'], string> = {
  high: '#b8860b',
  medium: '#666',
  low: '#999',
};

const DIFFICULTY_LABEL: Record<EngineLightCause['diyDifficulty'], string> = {
  easy: 'Easy DIY',
  moderate: 'Moderate DIY',
  difficult: 'Difficult DIY',
  professional_only: 'Professional only',
};

export default function CheckEngineLightResultScreen({ route, navigation }: Props) {
  const { vehicleId, dtcCodes, isFlashing, symptomNotes, possibleCauses, urgentSafetyNote } = route.params;
  const { data: vehicle } = useVehicle(vehicleId);
  const { startDraft } = useDecisionDraft();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist() {
    await saveCheckEngineCheck(vehicleId, dtcCodes, isFlashing, symptomNotes, possibleCauses, urgentSafetyNote);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await persist();
      navigation.navigate('VehicleDetail', { vehicleId });
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Could not save this check.');
    }
  }

  async function handleContinueToRepairFlow() {
    if (!vehicle) return;
    setIsSaving(true);
    setError(null);
    try {
      await persist();
      startDraft(vehicleId, vehicle.year, vehicle.currentMileage);
      navigation.navigate('MileageCheck');
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Could not save this check.');
    }
  }

  function handleYouTube() {
    const topCause = possibleCauses[0]?.cause ?? '';
    const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '';
    const query = [vehicleLabel, dtcCodes.join(' '), topCause].filter(Boolean).join(' ');
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  }

  function handleFindShop() {
    openRepairFacilitySearch('auto repair shop near me');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isFlashing && (
        <View style={styles.flashingBanner}>
          <Text style={styles.flashingBannerText}>
            ⚠️ Your check engine light is flashing. This usually means stop driving as soon as it's safe to do
            so -- continuing to drive can cause expensive damage (for example, to the catalytic converter). Have
            it looked at right away.
          </Text>
        </View>
      )}

      <Text style={styles.codesLabel}>YOUR CODES</Text>
      <Text style={styles.codesText}>{dtcCodes.join(', ')}</Text>

      {urgentSafetyNote && (
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyBannerText}>⚠️ {urgentSafetyNote}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Possible Causes</Text>
      {possibleCauses.map((issue, index) => (
        <View key={index} style={styles.issueCard}>
          <View style={styles.issueHeader}>
            <Text style={styles.issueCause}>{issue.cause}</Text>
            <Text style={[styles.likelihood, { color: LIKELIHOOD_COLOR[issue.likelihood] }]}>
              {issue.likelihood.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.difficultyTag}>{DIFFICULTY_LABEL[issue.diyDifficulty]}</Text>
          {issue.isSafetyIssue && <Text style={styles.safetyTag}>⚠️ Safety-related</Text>}
          <Text style={styles.issueExplanation}>{issue.explanation}</Text>
        </View>
      ))}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These are possibilities only, not a diagnosis. A code indicates a detected condition, not necessarily a
          failed part -- a qualified mechanic needs to test and confirm the actual cause before any part is
          replaced.
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.secondaryButton} onPress={handleYouTube}>
        <Text style={styles.secondaryButtonText}>RESEARCH ON YOUTUBE</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleFindShop}>
        <Text style={styles.secondaryButtonText}>FIND A REPAIR SHOP</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleContinueToRepairFlow} disabled={isSaving || !vehicle}>
        <Text style={styles.secondaryButtonText}>ANALYZE MY REPAIR ESTIMATE</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>SAVE</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  flashingBanner: {
    backgroundColor: '#fdecea',
    borderWidth: 2,
    borderColor: '#c62828',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  flashingBannerText: { color: '#c62828', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  codesLabel: { fontSize: 12, fontWeight: '700', color: '#999' },
  codesText: { fontSize: 15, color: '#333', marginTop: 4, marginBottom: 16, fontWeight: '700' },
  safetyBanner: {
    backgroundColor: '#fdecea',
    borderWidth: 1,
    borderColor: '#c62828',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  safetyBannerText: { color: '#c62828', fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8 },
  issueCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  issueCause: { fontSize: 15, fontWeight: '700', flexShrink: 1, marginRight: 8 },
  likelihood: { fontSize: 12, fontWeight: '800' },
  difficultyTag: { fontSize: 12, color: '#555', fontWeight: '600', marginTop: 4 },
  safetyTag: { fontSize: 12, color: '#c62828', fontWeight: '700', marginTop: 4 },
  issueExplanation: { fontSize: 14, color: '#555', marginTop: 6, lineHeight: 20 },
  disclaimer: { marginTop: 8, marginBottom: 8 },
  disclaimerText: { fontSize: 12, color: '#999', lineHeight: 17, textAlign: 'center' },
  error: { color: '#c62828', marginTop: 8, textAlign: 'center' },
  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#111', fontSize: 14, fontWeight: '700' },
  primaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

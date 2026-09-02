import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PossibleIssue } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from '../garage/useVehicles';
import { useDecisionDraft } from '../decision/DecisionDraftContext';
import { saveSymptomCheck } from './symptomCheckHistory';

type Props = NativeStackScreenProps<AppStackParamList, 'SymptomResult'>;

const LIKELIHOOD_COLOR: Record<PossibleIssue['likelihood'], string> = {
  high: '#b8860b',
  medium: '#666',
  low: '#999',
};

export default function SymptomResultScreen({ route, navigation }: Props) {
  const { vehicleId, symptomDescription, possibleIssues, urgentSafetyNote } = route.params;
  const { data: vehicle } = useVehicle(vehicleId);
  const { startDraft } = useDecisionDraft();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist() {
    await saveSymptomCheck(vehicleId, symptomDescription, possibleIssues, urgentSafetyNote);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await persist();
      navigation.navigate('VehicleDetail', { vehicleId });
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Could not save this symptom check.');
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
      setError(err instanceof Error ? err.message : 'Could not save this symptom check.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.symptomLabel}>YOU DESCRIBED</Text>
      <Text style={styles.symptomText}>{symptomDescription}</Text>

      {urgentSafetyNote && (
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyBannerText}>⚠️ {urgentSafetyNote}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Possible Causes</Text>
      {possibleIssues.map((issue, index) => (
        <View key={index} style={styles.issueCard}>
          <View style={styles.issueHeader}>
            <Text style={styles.issueCause}>{issue.cause}</Text>
            <Text style={[styles.likelihood, { color: LIKELIHOOD_COLOR[issue.likelihood] }]}>
              {issue.likelihood.toUpperCase()}
            </Text>
          </View>
          {issue.isSafetyIssue && <Text style={styles.safetyTag}>⚠️ Safety-related</Text>}
          <Text style={styles.issueExplanation}>{issue.explanation}</Text>
        </View>
      ))}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These are possibilities only, not a diagnosis. A qualified mechanic needs to inspect the vehicle to
          confirm the actual cause before any repair.
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.secondaryButton} onPress={handleContinueToRepairFlow} disabled={isSaving || !vehicle}>
        <Text style={styles.secondaryButtonText}>GOT A QUOTE FOR ONE OF THESE?</Text>
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
  symptomLabel: { fontSize: 12, fontWeight: '700', color: '#999' },
  symptomText: { fontSize: 15, color: '#333', marginTop: 4, marginBottom: 16 },
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
  safetyTag: { fontSize: 12, color: '#c62828', fontWeight: '700', marginTop: 4 },
  issueExplanation: { fontSize: 14, color: '#555', marginTop: 6, lineHeight: 20 },
  disclaimer: { marginTop: 8, marginBottom: 8 },
  disclaimerText: { fontSize: 12, color: '#999', lineHeight: 17, textAlign: 'center' },
  error: { color: '#c62828', marginTop: 8, textAlign: 'center' },
  secondaryButton: {
    marginTop: 16,
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

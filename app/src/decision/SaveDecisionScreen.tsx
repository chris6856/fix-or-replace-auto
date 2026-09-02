import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useVehicle } from '../garage/useVehicles';
import RecommendationBadge from './RecommendationBadge';
import { formatCurrency } from './explainResult';
import { saveDecision } from './saveDecision';
import { emailReport } from './emailReport';

type Props = NativeStackScreenProps<AppStackParamList, 'SaveDecision'>;

export default function SaveDecisionScreen({ route, navigation }: Props) {
  const { result, explanation } = route.params;
  const { input, output } = result;
  const { draft, clearDraft } = useDecisionDraft();
  // Captured once, before clearDraft() wipes the context on save --
  // still needed to look up the vehicle for the post-save screen.
  const [vehicleId] = useState(() => draft?.vehicleId ?? null);
  const { data: vehicle } = useVehicle(vehicleId ?? '');
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDecisionId, setSavedDecisionId] = useState<string | null>(null);
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!draft && !savedDecisionId) return null;

  async function handleSave() {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    try {
      const { decisionId } = await saveDecision(draft, input, output, explanation || null);
      queryClient.invalidateQueries({ queryKey: ['decisions', draft.vehicleId] });
      clearDraft();
      setSavedDecisionId(decisionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this decision.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEmailReport() {
    if (!savedDecisionId) return;
    setIsEmailing(true);
    setEmailError(null);
    try {
      const { sentTo } = await emailReport(savedDecisionId);
      setEmailSentTo(sentTo);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Could not email this report right now.');
    } finally {
      setIsEmailing(false);
    }
  }

  function handleDone() {
    // Clears the whole repair-vs-replace stack rather than just
    // navigating -- Garage is the home screen and must never show a
    // back arrow once you're back on it.
    navigation.reset({ index: 0, routes: [{ name: 'Garage' }] });
  }

  if (savedDecisionId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>DECISION SAVED</Text>

        <View style={styles.card}>
          <Text style={styles.vehicleName}>
            {vehicle?.nickname ?? (vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '')}
          </Text>
          <RecommendationBadge recommendation={output.recommendation} />
        </View>

        {emailSentTo ? (
          <Text style={styles.emailSentText}>Report sent to {emailSentTo}.</Text>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={handleEmailReport} disabled={isEmailing}>
            {isEmailing ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.secondaryButtonText}>EMAIL ME A PDF REPORT</Text>
            )}
          </Pressable>
        )}
        {emailError && <Text style={styles.error}>{emailError}</Text>}

        <Pressable style={[styles.primaryButton, styles.doneButton]} onPress={handleDone}>
          <Text style={styles.primaryButtonText}>DONE</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SAVE THIS DECISION?</Text>

      <View style={styles.card}>
        <Text style={styles.vehicleName}>
          {vehicle?.nickname ?? (vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '')}
        </Text>
        <Text style={styles.repairCategory}>{draft?.repairCategory ?? 'General Repair'}</Text>
        <Text style={styles.repairCost}>{formatCurrency(input.keep.currentRepairCost)}</Text>
        <RecommendationBadge recommendation={output.recommendation} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>SAVE</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  vehicleName: { fontSize: 18, fontWeight: '800' },
  repairCategory: { fontSize: 15, color: '#555', marginTop: 8 },
  repairCost: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  error: { color: '#c62828', textAlign: 'center', marginTop: 16 },
  emailSentText: { color: '#2e7d32', textAlign: 'center', marginTop: 28, fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#111', fontSize: 14, fontWeight: '700' },
  primaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: { marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

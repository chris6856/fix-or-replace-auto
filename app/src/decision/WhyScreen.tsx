import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useVehicle } from '../garage/useVehicles';
import { buildExplainPayload, fetchAiExplanation } from './aiExplain';
import { explainResult } from './explainResult';
import type { Recommendation } from '@fixorreplace/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Why'>;

const WHY_TITLE: Record<Recommendation, string> = {
  fix: 'WHY FIX?',
  get_quote: 'WHY GET ANOTHER QUOTE?',
  replace: 'WHY REPLACE?',
  too_close: 'WHY IS THIS TOO CLOSE TO CALL?',
};

export default function WhyScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { input, output } = result;
  const { draft } = useDecisionDraft();
  const { data: vehicle } = useVehicle(draft?.vehicleId ?? '');

  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!vehicle || !draft) {
        setExplanation(explainResult(input, output));
        setIsLoading(false);
        return;
      }

      const vehicleDescription = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      const payload = buildExplainPayload(vehicleDescription, draft.repairCategory ?? 'General Repair', input, output);
      const aiExplanation = await fetchAiExplanation(payload);

      if (cancelled) return;
      setExplanation(aiExplanation ?? explainResult(input, output));
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{WHY_TITLE[output.recommendation]}</Text>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <Text style={styles.explanation}>{explanation}</Text>
      )}

      <Text style={styles.footnote}>AI explains. Your algorithm decides.</Text>

      <Pressable
        style={styles.primaryButton}
        disabled={isLoading || !explanation}
        onPress={() => navigation.navigate('Questions', { result, explanation: explanation ?? '' })}
      >
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  loading: { paddingVertical: 40 },
  explanation: { fontSize: 16, color: '#333', lineHeight: 24, textAlign: 'center' },
  footnote: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  primaryButton: {
    marginTop: 32,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

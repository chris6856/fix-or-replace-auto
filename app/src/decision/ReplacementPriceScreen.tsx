import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft, type DecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'ReplacementPrice'>;
type TradeDecision = NonNullable<DecisionDraft['tradeDecision']>;

const TRADE_OPTIONS: { value: TradeDecision; label: string }[] = [
  { value: 'trade', label: 'Trade It' },
  { value: 'sell', label: 'Sell It' },
  { value: 'keep', label: 'Keep It' },
  { value: 'not_sure', label: 'Not Sure' },
];

export default function ReplacementPriceScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [price, setPrice] = useState(draft?.replacementPrice ? String(draft.replacementPrice) : '');
  const [tradeDecision, setTradeDecision] = useState<TradeDecision | null>(draft?.tradeDecision ?? null);
  const [asIsValue, setAsIsValue] = useState(
    draft?.currentVehicleTradeValue
      ? String(draft.currentVehicleTradeValue)
      : draft?.currentVehicleValueWorking
        ? String(draft.currentVehicleValueWorking)
        : '',
  );
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;

  const needsAsIsValue = tradeDecision === 'trade' || tradeDecision === 'sell' || tradeDecision === 'not_sure';

  function handleContinue() {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Enter the expected purchase price.');
      return;
    }
    if (!tradeDecision) {
      setError('Choose what you plan to do with your current vehicle.');
      return;
    }

    const tradeValue = tradeDecision === 'keep' ? 0 : Number(asIsValue) || 0;

    setError(null);
    updateDraft({ replacementPrice: parsedPrice, tradeDecision, currentVehicleTradeValue: tradeValue });
    navigation.navigate('ReplacementCosts');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>REPLACEMENT VEHICLE</Text>

      <Text style={styles.sectionLabel}>Expected Purchase Price</Text>
      <TextInput style={styles.input} placeholder="$ 0" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />

      <Text style={styles.sectionLabel}>Trade or sell current vehicle?</Text>
      <View style={styles.optionsGrid}>
        {TRADE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.optionChip, tradeDecision === option.value && styles.optionChipSelected]}
            onPress={() => setTradeDecision(option.value)}
          >
            <Text style={[styles.optionChipText, tradeDecision === option.value && styles.optionChipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {needsAsIsValue && (
        <>
          <Text style={styles.sectionLabel}>Estimated current as-is value</Text>
          <TextInput
            style={styles.input}
            placeholder="$ 0"
            keyboardType="decimal-pad"
            value={asIsValue}
            onChangeText={setAsIsValue}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optionChipSelected: { backgroundColor: '#111', borderColor: '#111' },
  optionChipText: { fontSize: 13, color: '#333' },
  optionChipTextSelected: { color: '#fff', fontWeight: '700' },
  error: { color: '#c62828', marginTop: 16, textAlign: 'center' },
  primaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'TradeIn'>;

export default function TradeInScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [tradeValue, setTradeValue] = useState(
    draft?.currentVehicleTradeValue ? String(draft.currentVehicleTradeValue) : '0',
  );

  if (!draft) return null;

  const parsedTradeValue = Number(tradeValue) || 0;
  const outTheDoorPrice =
    draft.replacementPrice + draft.salesTax + draft.titleRegistration + draft.docFee + draft.delivery + draft.otherFees;
  const netValueAvailable = parsedTradeValue - draft.loanPayoff;
  const netReplacementCost = outTheDoorPrice - netValueAvailable;

  function handleContinue() {
    updateDraft({ currentVehicleTradeValue: parsedTradeValue });
    navigation.navigate('Financing');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>YOUR CURRENT VEHICLE</Text>
      <Text style={styles.subtitle}>Now account for the current car.</Text>

      <Text style={styles.sectionLabel}>Estimated as-is value</Text>
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={tradeValue}
        onChangeText={setTradeValue}
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Loan payoff</Text>
        <Text style={styles.rowValue}>${draft.loanPayoff.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Net value available</Text>
        <Text style={styles.rowValue}>${netValueAvailable.toLocaleString()}</Text>
      </View>

      <View style={[styles.row, styles.rowSpaced]}>
        <Text style={styles.rowLabel}>Replacement out-the-door</Text>
        <Text style={styles.rowValue}>${outTheDoorPrice.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Less current vehicle</Text>
        <Text style={styles.rowValue}>-${netValueAvailable.toLocaleString()}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>NET REPLACEMENT COST</Text>
        <Text style={styles.summaryValue}>${netReplacementCost.toLocaleString()}</Text>
        <Text style={styles.summaryHelper}>That's the economically relevant number.</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowSpaced: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  rowLabel: { fontSize: 14, color: '#555' },
  rowValue: { fontSize: 14, fontWeight: '700' },
  summaryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  summaryLabel: { fontSize: 13, fontWeight: '700', color: '#666' },
  summaryValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  summaryHelper: { fontSize: 12, color: '#888', marginTop: 6 },
  primaryButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

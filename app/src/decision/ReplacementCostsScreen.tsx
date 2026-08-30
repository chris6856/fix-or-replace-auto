import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'ReplacementCosts'>;

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ReplacementCostsScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [salesTax, setSalesTax] = useState(draft?.salesTax ? String(draft.salesTax) : '');
  const [titleRegistration, setTitleRegistration] = useState(
    draft?.titleRegistration ? String(draft.titleRegistration) : '',
  );
  const [docFee, setDocFee] = useState(draft?.docFee ? String(draft.docFee) : '');
  const [delivery, setDelivery] = useState(draft?.delivery ? String(draft.delivery) : '');
  const [otherFees, setOtherFees] = useState(draft?.otherFees ? String(draft.otherFees) : '');

  if (!draft) return null;

  const outTheDoorPrice =
    draft.replacementPrice +
    toNumber(salesTax) +
    toNumber(titleRegistration) +
    toNumber(docFee) +
    toNumber(delivery) +
    toNumber(otherFees);

  function handleContinue() {
    updateDraft({
      salesTax: toNumber(salesTax),
      titleRegistration: toNumber(titleRegistration),
      docFee: toNumber(docFee),
      delivery: toNumber(delivery),
      otherFees: toNumber(otherFees),
    });
    navigation.navigate('TradeIn');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>REAL COST TO REPLACE</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Purchase Price</Text>
        <Text style={styles.rowValue}>${draft.replacementPrice.toLocaleString()}</Text>
      </View>

      <Text style={styles.sectionLabel}>Sales Tax</Text>
      <TextInput style={styles.input} placeholder="$ 0" keyboardType="decimal-pad" value={salesTax} onChangeText={setSalesTax} />

      <Text style={styles.sectionLabel}>Title / Registration</Text>
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={titleRegistration}
        onChangeText={setTitleRegistration}
      />

      <Text style={styles.sectionLabel}>Dealer Documentation Fee</Text>
      <TextInput style={styles.input} placeholder="$ 0" keyboardType="decimal-pad" value={docFee} onChangeText={setDocFee} />

      <Text style={styles.sectionLabel}>Delivery / Transportation</Text>
      <TextInput style={styles.input} placeholder="$ 0" keyboardType="decimal-pad" value={delivery} onChangeText={setDelivery} />

      <Text style={styles.sectionLabel}>Other Dealer Fees</Text>
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={otherFees}
        onChangeText={setOtherFees}
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>OUT-THE-DOOR PRICE</Text>
        <Text style={styles.summaryValue}>${outTheDoorPrice.toLocaleString()}</Text>
        <Text style={styles.summaryHelper}>This is the number we compare -- not the sticker price.</Text>
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
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowLabel: { fontSize: 15, color: '#333' },
  rowValue: { fontSize: 15, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  summaryCard: {
    marginTop: 24,
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

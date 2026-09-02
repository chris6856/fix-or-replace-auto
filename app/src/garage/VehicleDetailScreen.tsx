import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from './useVehicles';
import { useDecisionDraft } from '../decision/DecisionDraftContext';
import { useDecisionHistory, type DecisionHistoryItem } from '../decision/decisionHistory';
import { recommendationLabel } from '../decision/RecommendationBadge';
import { formatCurrency } from '../decision/explainResult';
import { emailReport } from '../decision/emailReport';
import { useSymptomChecks, type SymptomCheckItem } from '../symptomCheck/symptomCheckHistory';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const { data: vehicle, isLoading, error } = useVehicle(vehicleId);
  const { data: history } = useDecisionHistory(vehicleId);
  const { data: symptomChecks } = useSymptomChecks(vehicleId);
  const { startDraft } = useDecisionDraft();
  const queryClient = useQueryClient();

  function handleDeleteDecision(decisionId: string) {
    Alert.alert('Delete this estimate?', 'This will permanently remove this saved decision.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await supabase.from('decisions').delete().eq('id', decisionId);
          if (deleteError) {
            Alert.alert("Couldn't delete", deleteError.message);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ['decisions', vehicleId] });
        },
      },
    ]);
  }

  function handleDeleteSymptomCheck(symptomCheckId: string) {
    Alert.alert('Delete this symptom check?', 'This will permanently remove this saved check.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await supabase.from('symptom_checks').delete().eq('id', symptomCheckId);
          if (deleteError) {
            Alert.alert("Couldn't delete", deleteError.message);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ['symptomChecks', vehicleId] });
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !vehicle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Couldn't load this vehicle.</Text>
      </View>
    );
  }

  const { year: vehicleYear, currentMileage } = vehicle;
  function handleStartRepairIntake() {
    startDraft(vehicleId, vehicleYear, currentMileage);
    navigation.navigate('MileageCheck');
  }

  function handleCheckSymptom() {
    navigation.navigate('SymptomCheck', { vehicleId });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}</Text>
      <Text style={styles.subtitle}>
        {vehicle.year} {vehicle.make} {vehicle.model}
        {vehicle.trim ? ` ${vehicle.trim}` : ''}
      </Text>
      <Text style={styles.mileage}>{vehicle.currentMileage.toLocaleString()} miles</Text>

      <Pressable style={styles.primaryButton} onPress={handleStartRepairIntake}>
        <Text style={styles.primaryButtonText}>I HAVE A REPAIR ESTIMATE</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleCheckSymptom}>
        <Text style={styles.secondaryButtonText}>SOMETHING'S GOING ON WITH THE CAR</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Previous Decisions</Text>
      {!history || history.length === 0 ? (
        <Text style={styles.emptyText}>None yet.</Text>
      ) : (
        <View>
          {history.map((item) => (
            <DecisionRow key={item.id} item={item} onDelete={handleDeleteDecision} />
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>Symptom Checks</Text>
      {!symptomChecks || symptomChecks.length === 0 ? (
        <Text style={styles.emptyText}>None yet.</Text>
      ) : (
        <View>
          {symptomChecks.map((item) => (
            <SymptomCheckRow key={item.id} item={item} onDelete={handleDeleteSymptomCheck} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function DecisionRow({ item, onDelete }: { item: DecisionHistoryItem; onDelete: (id: string) => void }) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  async function handleEmail() {
    setIsEmailing(true);
    setEmailStatus(null);
    try {
      const { sentTo } = await emailReport(item.id);
      setEmailStatus(`Sent to ${sentTo}`);
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : 'Could not email this report.');
    } finally {
      setIsEmailing(false);
    }
  }

  return (
    <View style={styles.decisionRow}>
      <View style={styles.decisionRowHeader}>
        <Text style={styles.decisionDate}>{date}</Text>
        <View style={styles.decisionRowActions}>
          <Pressable onPress={handleEmail} disabled={isEmailing} hitSlop={10}>
            {isEmailing ? <ActivityIndicator size="small" /> : <Text style={styles.emailText}>Email</Text>}
          </Pressable>
          <Pressable onPress={() => onDelete(item.id)} hitSlop={10}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.decisionCategory}>{item.category}</Text>
      <View style={styles.decisionFooter}>
        <Text style={styles.decisionCost}>{formatCurrency(item.cost)}</Text>
        <Text style={styles.decisionRecommendation}>{recommendationLabel(item.recommendation)}</Text>
      </View>
      {emailStatus && <Text style={styles.emailStatusText}>{emailStatus}</Text>}
    </View>
  );
}

function SymptomCheckRow({ item, onDelete }: { item: SymptomCheckItem; onDelete: (id: string) => void }) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const topCause = item.possibleIssues[0]?.cause ?? 'Symptom check';
  return (
    <View style={styles.decisionRow}>
      <View style={styles.decisionRowHeader}>
        <Text style={styles.decisionDate}>{date}</Text>
        <Pressable onPress={() => onDelete(item.id)} hitSlop={10}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <Text style={styles.decisionCategory} numberOfLines={1}>
        {item.symptomDescription}
      </Text>
      <Text style={styles.symptomTopCause}>
        Most likely: {topCause}
        {item.urgentSafetyNote ? '  ⚠️' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#c62828' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 15, color: '#555', marginTop: 4 },
  mileage: { fontSize: 15, color: '#555', marginTop: 2, marginBottom: 24 },
  primaryButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '700', color: '#111' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999' },
  decisionRow: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  decisionRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  decisionRowActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  decisionDate: { fontSize: 12, color: '#999' },
  emailText: { fontSize: 13, color: '#111', fontWeight: '600' },
  emailStatusText: { fontSize: 12, color: '#2e7d32', marginTop: 6 },
  deleteText: { fontSize: 13, color: '#c62828', fontWeight: '600' },
  decisionCategory: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  decisionFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  decisionCost: { fontSize: 14, color: '#333' },
  decisionRecommendation: { fontSize: 13, fontWeight: '700' },
  symptomTopCause: { fontSize: 13, color: '#555', marginTop: 6 },
});

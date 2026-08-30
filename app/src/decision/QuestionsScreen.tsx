import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { buildMechanicQuestions } from './mechanicQuestions';

type Props = NativeStackScreenProps<AppStackParamList, 'Questions'>;

export default function QuestionsScreen({ route, navigation }: Props) {
  const { result, explanation } = route.params;
  const { draft } = useDecisionDraft();
  const [copied, setCopied] = useState(false);

  const questions = buildMechanicQuestions(draft?.repairCategory ?? 'General Repair', result.input.keep.currentRepairCost);

  async function handleCopy() {
    await Clipboard.setStringAsync(questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BEFORE YOU SAY YES</Text>
      <Text style={styles.subtitle}>Questions to Ask Your Mechanic</Text>

      <View style={styles.list}>
        {questions.map((question, index) => (
          <Text key={question} style={styles.question}>
            {index + 1}. {question}
          </Text>
        ))}
      </View>

      <Pressable style={styles.secondaryButton} onPress={handleCopy}>
        <Text style={styles.secondaryButtonText}>{copied ? 'COPIED!' : 'COPY QUESTIONS'}</Text>
      </Pressable>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.navigate('SaveDecision', { result, explanation })}
      >
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  list: { marginBottom: 8 },
  question: { fontSize: 15, color: '#333', lineHeight: 24, marginBottom: 8 },
  secondaryButton: {
    marginTop: 16,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
  primaryButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

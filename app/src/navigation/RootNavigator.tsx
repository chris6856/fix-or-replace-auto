import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import SignInScreen from '../auth/SignInScreen';
import WelcomeScreen from '../onboarding/WelcomeScreen';
import WalkthroughScreen from '../onboarding/WalkthroughScreen';
import GarageScreen from '../garage/GarageScreen';
import AddVehicleScreen from '../garage/AddVehicleScreen';
import ScanVinScreen from '../garage/ScanVinScreen';
import ConfirmVehicleScreen from '../garage/ConfirmVehicleScreen';
import VehicleProfileScreen from '../garage/VehicleProfileScreen';
import VehicleDetailScreen from '../garage/VehicleDetailScreen';
import type { DecodedVehicle } from '../garage/vinDecode';
import MileageCheckScreen from '../decision/MileageCheckScreen';
import RepairEstimateScreen from '../decision/RepairEstimateScreen';
import ConfirmRepairScreen from '../decision/ConfirmRepairScreen';
import VehicleHistoryScreen from '../decision/VehicleHistoryScreen';
import FinancialsScreen from '../decision/FinancialsScreen';
import CurrentValueScreen from '../decision/CurrentValueScreen';
import ReplacementQuestionScreen from '../decision/ReplacementQuestionScreen';
import ReplacementPriceScreen from '../decision/ReplacementPriceScreen';
import ReplacementCostsScreen from '../decision/ReplacementCostsScreen';
import TradeInScreen from '../decision/TradeInScreen';
import FinancingScreen from '../decision/FinancingScreen';
import AnalysisScreen from '../decision/AnalysisScreen';
import PaywallScreen from '../decision/PaywallScreen';
import ResultScreen from '../decision/ResultScreen';
import SideBySideScreen from '../decision/SideBySideScreen';
import OutlookScreen from '../decision/OutlookScreen';
import ThresholdScreen from '../decision/ThresholdScreen';
import WhatIfScreen from '../decision/WhatIfScreen';
import WhyScreen from '../decision/WhyScreen';
import QuestionsScreen from '../decision/QuestionsScreen';
import SaveDecisionScreen from '../decision/SaveDecisionScreen';
import { useDecisionDraft } from '../decision/DecisionDraftContext';
import type { AnalysisResult } from '../decision/buildCalcInput';
import SymptomCheckScreen from '../symptomCheck/SymptomCheckScreen';
import SymptomResultScreen from '../symptomCheck/SymptomResultScreen';
import type { PossibleIssue } from '@fixorreplace/types';

export type AuthStackParamList = {
  Welcome: undefined;
  Walkthrough: undefined;
  SignIn: undefined;
};

export type VehicleDraft = {
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
};

/** 'free' = the user's first-ever decision (no paywall). 'decision' =
 *  paid $0.99, sees only the Result screen. 'full' = paid $1.99, sees
 *  everything (breakdown, outlook, threshold, why, questions, save,
 *  email). See PaywallScreen. */
export type UnlockedTier = 'free' | 'decision' | 'full';

export type AppStackParamList = {
  Garage: undefined;
  AddVehicle: { prefill?: VehicleDraft } | undefined;
  ScanVin: undefined;
  ConfirmVehicle: { decoded: DecodedVehicle };
  VehicleProfile: { draft: VehicleDraft };
  VehicleDetail: { vehicleId: string };
  SymptomCheck: { vehicleId: string };
  SymptomResult: {
    vehicleId: string;
    symptomDescription: string;
    possibleIssues: PossibleIssue[];
    urgentSafetyNote: string | null;
  };
  MileageCheck: undefined;
  RepairEstimate: undefined;
  ConfirmRepair: undefined;
  VehicleHistory: undefined;
  Financials: undefined;
  CurrentValue: undefined;
  ReplacementQuestion: undefined;
  ReplacementPrice: undefined;
  ReplacementCosts: undefined;
  TradeIn: undefined;
  Financing: undefined;
  Analysis: undefined;
  Paywall: { result: AnalysisResult; upgradeOnly?: boolean };
  Result: { result: AnalysisResult; unlockedTier?: UnlockedTier };
  SideBySide: { result: AnalysisResult };
  Outlook: { result: AnalysisResult };
  Threshold: { result: AnalysisResult };
  WhatIf: { result: AnalysisResult };
  Why: { result: AnalysisResult };
  Questions: { result: AnalysisResult; explanation: string };
  SaveDecision: { result: AnalysisResult; explanation?: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

/**
 * Header action on the Garage (home) screen -- was a plain text link at
 * the very bottom of the screen, easy to miss below a long vehicle list.
 * A sign-out has no undo-able state to lose, so unlike Cancel this skips
 * a confirmation.
 */
function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} hitSlop={12} style={styles.cancelButton}>
      <Text style={styles.signOutButtonText}>Sign Out</Text>
    </Pressable>
  );
}

/**
 * Apple requires a discoverable in-app way to delete the account for any
 * app that supports account creation (Guideline 5.1.1(v)). Calling the
 * delete-account Edge Function directly -- rather than sending everyone to
 * the delete-account.html page, which only supports email/password
 * re-entry -- is what makes this actually work for Apple/Google sign-in,
 * since those accounts have no password to re-enter on a bare web page.
 */
function DeleteAccountButton() {
  const { signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  async function performDelete() {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
        'delete-account',
        { body: {} },
      );
      if (error || !data?.success) {
        Alert.alert("Couldn't delete account", data?.error ?? error?.message ?? 'Please try again.');
        return;
      }
      await signOut();
    } catch {
      Alert.alert("Couldn't delete account", 'Please check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  function handlePress() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all its data -- your vehicles, decisions, and symptom checks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: performDelete },
      ],
    );
  }

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.cancelButton} disabled={isDeleting}>
      {isDeleting ? (
        <ActivityIndicator size="small" color="#c62828" />
      ) : (
        <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
      )}
    </Pressable>
  );
}

/**
 * Shown in the header of every screen in the repair-vs-replace decision
 * flow (Screens 9-28) so the user is never stuck having to tap back
 * through a dozen-plus screens to get out. Confirms first since it
 * discards everything typed so far -- nothing is persisted until Save.
 * Always returns to the Garage (home) screen, never mid-flow.
 */
function CancelDecisionButton() {
  const { clearDraft } = useDecisionDraft();

  function handlePress() {
    Alert.alert('Cancel this decision?', 'Your progress on this repair-vs-replace decision will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Cancel Decision',
        style: 'destructive',
        onPress: () => {
          clearDraft();
          // Clears the whole decision-flow stack -- Garage is the home
          // screen and must never show a back arrow once you're on it.
          rootNavigationRef?.reset({ index: 0, routes: [{ name: 'Garage' }] });
        },
      },
    ]);
  }

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.cancelButton}>
      <Text style={styles.cancelButtonText}>Cancel</Text>
    </Pressable>
  );
}

/**
 * The $0.99 "decision only" tier never had anything to save, so unlike
 * CancelDecisionButton this needs no "your progress will be lost" warning
 * -- there's no progress left to lose, just a plain way back to the Garage.
 */
function DoneButton() {
  const { clearDraft } = useDecisionDraft();

  function handlePress() {
    clearDraft();
    rootNavigationRef?.reset({ index: 0, routes: [{ name: 'Garage' }] });
  }

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={styles.saveButton}>
      <Text style={styles.saveButtonText}>Done</Text>
    </Pressable>
  );
}

/**
 * Once the analysis has actually run (Screens 21-27, from the result
 * onward), the user shouldn't have to click through Why/Questions just to
 * save -- Save sits next to Cancel from here on, going to the same
 * confirm-and-save screen the end-of-flow Save button already uses.
 */
function SaveAndCancelButtons({ result, explanation }: { result: AnalysisResult; explanation?: string }) {
  return (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => rootNavigationRef?.navigate('SaveDecision', { result, explanation })}
        hitSlop={12}
        style={styles.saveButton}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
      <CancelDecisionButton />
    </View>
  );
}

/** Set once NavigationContainer mounts -- see the ref wiring below. */
let rootNavigationRef: {
  navigate: (name: 'SaveDecision', params: { result: AnalysisResult; explanation?: string }) => void;
  reset: (state: { index: number; routes: { name: 'Garage' }[] }) => void;
} | null = null;

// The repair intake + replacement flow (MileageCheck through Financing) is
// the long stretch of blind input screens before Analysis produces any
// output -- testers asked for a sense of how many steps remain here.
const TOTAL_INPUT_STEPS = 11;

function DecisionStepHeaderTitle({ title, step }: { title: string; step: number }) {
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.stepHeaderTitle}>{title}</Text>
      <Text style={styles.stepHeaderProgress}>
        Step {step} of {TOTAL_INPUT_STEPS}
      </Text>
      <View style={styles.stepHeaderTrack}>
        <View style={[styles.stepHeaderFill, { width: `${(step / TOTAL_INPUT_STEPS) * 100}%` }]} />
      </View>
    </View>
  );
}

function decisionScreenOptions(title: string, step?: number): NativeStackNavigationOptions {
  return {
    title,
    headerRight: () => <CancelDecisionButton />,
    ...(step != null ? { headerTitle: () => <DecisionStepHeaderTitle title={title} step={step} /> } : {}),
  };
}

/**
 * Same as decisionScreenOptions, plus the Save shortcut described above --
 * except on the $0.99 "just the decision" tier, which never gets a Save
 * (or the deeper screens it would lead to at all).
 */
function decisionScreenOptionsWithSave(
  title: string,
): (props: {
  route: { params?: { result?: AnalysisResult; explanation?: string; unlockedTier?: UnlockedTier } };
}) => NativeStackNavigationOptions {
  return ({ route }) => ({
    title,
    headerRight: () =>
      route.params?.result && route.params.unlockedTier !== 'decision' ? (
        <SaveAndCancelButtons result={route.params.result} explanation={route.params.explanation} />
      ) : route.params?.unlockedTier === 'decision' ? (
        <DoneButton />
      ) : (
        <CancelDecisionButton />
      ),
  });
}

export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={(instance) => {
        rootNavigationRef = instance as typeof rootNavigationRef;
      }}
    >
      {session ? (
        <AppStack.Navigator>
          <AppStack.Screen
            name="Garage"
            component={GarageScreen}
            options={{
              title: 'Fix or Replace Auto',
              headerRight: () => (
                <View style={styles.headerActions}>
                  <DeleteAccountButton />
                  <SignOutButton />
                </View>
              ),
            }}
          />
          <AppStack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add a Vehicle' }} />
          <AppStack.Screen name="ScanVin" component={ScanVinScreen} options={{ title: 'Scan VIN' }} />
          <AppStack.Screen
            name="ConfirmVehicle"
            component={ConfirmVehicleScreen}
            options={{ title: 'Confirm Vehicle' }}
          />
          <AppStack.Screen
            name="VehicleProfile"
            component={VehicleProfileScreen}
            options={{ title: 'Vehicle Profile' }}
          />
          <AppStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle' }} />
          <AppStack.Screen
            name="SymptomCheck"
            component={SymptomCheckScreen}
            options={{ title: "Something's Going On" }}
          />
          <AppStack.Screen
            name="SymptomResult"
            component={SymptomResultScreen}
            options={{ title: 'Possible Causes' }}
          />
          <AppStack.Screen
            name="MileageCheck"
            component={MileageCheckScreen}
            options={decisionScreenOptions('Current Mileage', 1)}
          />
          <AppStack.Screen
            name="RepairEstimate"
            component={RepairEstimateScreen}
            options={decisionScreenOptions('What Did the Shop Say?', 2)}
          />
          <AppStack.Screen
            name="ConfirmRepair"
            component={ConfirmRepairScreen}
            options={decisionScreenOptions("Here's What We Heard", 3)}
          />
          <AppStack.Screen
            name="VehicleHistory"
            component={VehicleHistoryScreen}
            options={decisionScreenOptions('Vehicle History', 4)}
          />
          <AppStack.Screen
            name="Financials"
            component={FinancialsScreen}
            options={decisionScreenOptions('Financials', 5)}
          />
          <AppStack.Screen
            name="CurrentValue"
            component={CurrentValueScreen}
            options={decisionScreenOptions('Vehicle Value', 6)}
          />
          <AppStack.Screen
            name="ReplacementQuestion"
            component={ReplacementQuestionScreen}
            options={decisionScreenOptions('If You Replace It', 7)}
          />
          <AppStack.Screen
            name="ReplacementPrice"
            component={ReplacementPriceScreen}
            options={decisionScreenOptions('Replacement Vehicle', 8)}
          />
          <AppStack.Screen
            name="ReplacementCosts"
            component={ReplacementCostsScreen}
            options={decisionScreenOptions('Real Cost to Replace', 9)}
          />
          <AppStack.Screen
            name="TradeIn"
            component={TradeInScreen}
            options={decisionScreenOptions('Your Current Vehicle', 10)}
          />
          <AppStack.Screen
            name="Financing"
            component={FinancingScreen}
            options={decisionScreenOptions('Financing', 11)}
          />
          <AppStack.Screen name="Analysis" component={AnalysisScreen} options={{ title: '', headerShown: false }} />
          <AppStack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={decisionScreenOptions('Your Analysis Is Ready')}
          />
          <AppStack.Screen
            name="Result"
            component={ResultScreen}
            options={decisionScreenOptionsWithSave('Fix or Replace?')}
          />
          <AppStack.Screen
            name="SideBySide"
            component={SideBySideScreen}
            options={decisionScreenOptionsWithSave('Your Two Options')}
          />
          <AppStack.Screen
            name="Outlook"
            component={OutlookScreen}
            options={decisionScreenOptionsWithSave('Next 24 Months')}
          />
          <AppStack.Screen
            name="Threshold"
            component={ThresholdScreen}
            options={decisionScreenOptionsWithSave('Repair Threshold')}
          />
          <AppStack.Screen
            name="WhatIf"
            component={WhatIfScreen}
            options={decisionScreenOptionsWithSave('Change the Numbers')}
          />
          <AppStack.Screen name="Why" component={WhyScreen} options={decisionScreenOptionsWithSave('Why?')} />
          <AppStack.Screen
            name="Questions"
            component={QuestionsScreen}
            options={decisionScreenOptionsWithSave('Before You Say Yes')}
          />
          <AppStack.Screen
            name="SaveDecision"
            component={SaveDecisionScreen}
            options={decisionScreenOptions('Save This Decision?')}
          />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Walkthrough" component={WalkthroughScreen} />
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cancelButton: { paddingHorizontal: 4, paddingVertical: 4 },
  cancelButtonText: { fontSize: 15, color: '#c62828', fontWeight: '600' },
  saveButton: { paddingHorizontal: 4, paddingVertical: 4 },
  saveButtonText: { fontSize: 15, color: '#111', fontWeight: '700' },
  signOutButtonText: { fontSize: 14, color: '#666', fontWeight: '600' },
  deleteAccountButtonText: { fontSize: 13, color: '#c62828', fontWeight: '600' },
  stepHeader: { alignItems: 'center', minWidth: 160 },
  stepHeaderTitle: { fontSize: 17, fontWeight: '600' },
  stepHeaderProgress: { fontSize: 11, color: '#888', marginTop: 1 },
  stepHeaderTrack: {
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e2e2e2',
    marginTop: 4,
    overflow: 'hidden',
  },
  stepHeaderFill: { height: '100%', backgroundColor: '#111', borderRadius: 2 },
});

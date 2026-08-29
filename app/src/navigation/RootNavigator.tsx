import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import SignInScreen from '../auth/SignInScreen';
import WelcomeScreen from '../onboarding/WelcomeScreen';
import GarageScreen from '../garage/GarageScreen';
import AddVehicleScreen from '../garage/AddVehicleScreen';
import ScanVinScreen from '../garage/ScanVinScreen';
import ConfirmVehicleScreen from '../garage/ConfirmVehicleScreen';
import VehicleProfileScreen from '../garage/VehicleProfileScreen';
import VehicleDetailScreen from '../garage/VehicleDetailScreen';
import type { DecodedVehicle } from '../garage/vinDecode';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
};

export type VehicleDraft = {
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
};

export type AppStackParamList = {
  Garage: undefined;
  AddVehicle: { prefill?: VehicleDraft } | undefined;
  ScanVin: undefined;
  ConfirmVehicle: { decoded: DecodedVehicle };
  VehicleProfile: { draft: VehicleDraft };
  VehicleDetail: { vehicleId: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

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
    <NavigationContainer>
      {session ? (
        <AppStack.Navigator>
          <AppStack.Screen name="Garage" component={GarageScreen} options={{ title: 'My Garage' }} />
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
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

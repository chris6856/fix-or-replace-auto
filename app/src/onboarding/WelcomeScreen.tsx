import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <ImageBackground
      source={require('../../assets/welcome-background.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <Text style={styles.title}>FIX OR REPLACE AUTO</Text>
      <Text style={styles.tagline}>Your Automatic Second Opinion</Text>

      <Text style={styles.body}>Your repair shop just called.{'\n'}Should you:</Text>

      <View style={styles.optionsList}>
        <Text style={styles.option}>FIX IT</Text>
        <Text style={styles.option}>GET ANOTHER QUOTE</Text>
        <Text style={styles.option}>REPLACE IT</Text>
      </View>

      <Text style={styles.body}>
        We'll compare the cost of repairing your current vehicle with the real cost of replacing it.
      </Text>

      <Pressable style={styles.button} onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.buttonText}>GET STARTED</Text>
      </Pressable>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  // Faded well below full opacity so the text on top stays the clearly
  // prominent element -- the photo reads as mood/texture, not content.
  backgroundImage: { opacity: 0.26 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', color: '#555', marginBottom: 32 },
  body: { fontSize: 16, textAlign: 'center', marginBottom: 16, color: '#333' },
  optionsList: { marginBottom: 24 },
  option: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 4 },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

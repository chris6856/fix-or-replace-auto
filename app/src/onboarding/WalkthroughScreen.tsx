import { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Walkthrough'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
}

// Three slides covering exactly what a first-time user needs before hitting
// sign-up: what the app actually does, proof it isn't a naive cost-vs-value
// comparison (see the blueprint's own Escape acceptance test), and why we're
// about to ask for an account.
const SLIDES: Slide[] = [
  {
    eyebrow: 'HOW IT WORKS',
    title: 'Tell us about the repair',
    body:
      "Add your vehicle and describe what's wrong -- type it or just say it out loud. " +
      "We'll walk you through mileage, repair history, and what a replacement would actually cost.",
  },
  {
    eyebrow: 'HOW IT WORKS',
    title: "We compare real costs, not guesses",
    body:
      'Example: a $4,000 repair on a 155,000-mile SUV sounds huge -- but replacing it runs $22,000+ ' +
      "after tax, fees, and financing. We'd tell you to fix it. We never just compare repair cost to " +
      "your car's value -- that shortcut gets it wrong too often.",
  },
  {
    eyebrow: 'WHY CREATE AN ACCOUNT',
    title: 'So we remember your vehicle',
    body:
      'Your vehicles and past repairs are saved securely to your account. The more we know about a ' +
      "vehicle's history, the sharper future recommendations get -- and you can revisit any past decision anytime.",
  },
];

export default function WalkthroughScreen({ navigation }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLastSlide = pageIndex === SLIDES.length - 1;

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPageIndex(index);
  }

  function handleNext() {
    if (isLastSlide) {
      navigation.navigate('SignIn');
      return;
    }
    scrollRef.current?.scrollTo({ x: (pageIndex + 1) * SCREEN_WIDTH, animated: true });
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.skipButton} onPress={() => navigation.navigate('SignIn')} hitSlop={12}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scrollView}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={styles.slide}>
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View key={slide.title} style={[styles.dot, index === pageIndex && styles.dotActive]} />
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{isLastSlide ? 'GET STARTED' : 'NEXT'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  skipButton: { position: 'absolute', top: 56, right: 20, zIndex: 1, padding: 8 },
  skipButtonText: { fontSize: 15, color: '#888', fontWeight: '600' },
  scrollView: { flex: 1 },
  slide: { width: SCREEN_WIDTH, padding: 32, paddingTop: 120, alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 16, color: '#444', textAlign: 'center', lineHeight: 24 },
  footer: { padding: 24, paddingBottom: 36 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: '#111', width: 20 },
  primaryButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function Welcome() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>LOCAL-FIRST / RULES V1</Text>
      <Text style={styles.title}>A smarter schedule for the supplements you already take.</Text>
      <Text style={styles.body}>
        Organize supplements around meals, coffee, and supported interactions — with the evidence
        behind every timing suggestion.
      </Text>
      <View style={styles.boundary}>
        <Text style={styles.body}>
          <Text style={styles.bold}>NutriClock helps organize supplements you already take.</Text>{" "}
          It does not diagnose conditions or determine which supplements or doses you need.
        </Text>
      </View>
      <Link href="/supplements" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Tell NutriClock what I take</Text>
        </Pressable>
      </Link>
      <Link href="/today" style={styles.link}>
        Open Today
      </Link>
      <Link href="/review" style={styles.link}>
        Weekly review
      </Link>
      <Link href="/routines" style={styles.link}>
        Routine templates
      </Link>
      <Text style={styles.muted}>Stored on this device. No account required.</Text>
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72, backgroundColor: "#f3f0e8", flexGrow: 1 },
  eyebrow: { color: "#9e4b32", fontWeight: "800", letterSpacing: 2, marginBottom: 12 },
  title: { color: "#123e38", fontSize: 36, lineHeight: 40, fontWeight: "800", marginBottom: 18 },
  body: { color: "#53655e", fontSize: 17, lineHeight: 25, marginBottom: 18 },
  boundary: { borderLeftWidth: 4, borderLeftColor: "#e4a04b", paddingLeft: 14, marginVertical: 12 },
  bold: { fontWeight: "800", color: "#334940" },
  muted: { color: "#5d6b64", marginTop: 18 },
  button: {
    backgroundColor: "#175f52",
    borderRadius: 28,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  card: { backgroundColor: "#fffdf8", borderRadius: 18, padding: 22, marginBottom: 16 },
  label: { color: "#334940", fontWeight: "700", marginBottom: 14 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#bfcac1",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    color: "#17221f",
  },
  link: {
    color: "#175f52",
    fontWeight: "800",
    marginVertical: 10,
    minHeight: 44,
    paddingVertical: 10,
  },
});

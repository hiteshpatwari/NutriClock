import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

export default function Settings() {
  const { app } = useNutriClockApplication();
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>SETTINGS / DATA</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>Stored on this device</Text>
        <Text style={styles.body}>
          NutriClock keeps your regimen in local app storage. No account or upload is required.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: "#ad3e37" }]}
          onPress={() =>
            Alert.alert(
              "Delete NutriClock data?",
              "This clears your local routine, supplements, medications, preferences, and overrides.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => void app.clear().then(() => router.replace("/")),
                },
              ],
            )
          }
        >
          <Text style={styles.buttonText}>Delete my NutriClock data</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

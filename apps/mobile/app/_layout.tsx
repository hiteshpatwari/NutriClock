import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { ApplicationProvider, useNutriClockApplication } from "../src/app-context";

export default function Layout() {
  return (
    <ApplicationProvider>
      <ApplicationStack />
    </ApplicationProvider>
  );
}

function ApplicationStack() {
  const { app } = useNutriClockApplication();
  return (
    <View style={{ flex: 1 }}>
      {app.state.error && (
        <View accessibilityRole="alert" style={{ backgroundColor: "#fff0ee", padding: 12 }}>
          <Text style={{ color: "#8f2e28", fontWeight: "700" }}>{app.state.error}</Text>
        </View>
      )}
      <Stack screenOptions={{ headerBackTitle: "Back" }} />
    </View>
  );
}

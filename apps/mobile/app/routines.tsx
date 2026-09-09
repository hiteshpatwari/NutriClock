import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatLocalTime } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

export default function Routines() {
  const { app, refresh } = useNutriClockApplication();
  const [name, setName] = useState("");
  if (!app.state.regimen) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>ROUTINES</Text>
          <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
            Build your NutriClock first
          </Text>
          <Link href="/supplements" style={styles.link}>
            Start with your supplements
          </Link>
        </View>
      </ScrollView>
    );
  }
  const saveTemplate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !app.state.regimen) return;
    const routine = app.state.regimen.routine;
    await app.saveRoutineTemplate({
      id: `mobile-template-${Date.now()}`,
      name: trimmed,
      routine: {
        ...routine,
        meals: routine.meals.map((meal) => ({ ...meal })),
        beverages: routine.beverages.map((beverage) => ({ ...beverage })),
      },
    });
    setName("");
    refresh();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ROUTINES</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>Routine templates</Text>
        <Text style={styles.body}>
          Save a day shape such as Office day or Weekend. Applying a template changes routine
          context only; supplements, doses, and medication anchors stay unchanged.
        </Text>
        <TextInput
          accessibilityLabel="Template name"
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Office day"
        />
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          disabled={!name.trim()}
          onPress={() => void saveTemplate()}
        >
          <Text style={styles.buttonText}>Save current routine</Text>
        </Pressable>
        {app.state.routineTemplates.length ? (
          app.state.routineTemplates.map((template) => (
            <View key={template.id} style={templateStyles.item}>
              <Text style={templateStyles.title}>{template.name}</Text>
              <Text style={styles.muted}>
                Wake {formatLocalTime(template.routine.wakeTime)} · Bedtime{" "}
                {formatLocalTime(template.routine.bedtime)}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.button}
                onPress={() => void app.applyRoutineTemplate(template.id).then(() => refresh())}
              >
                <Text style={styles.buttonText}>Apply template</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.body}>No saved templates yet.</Text>
        )}
        <Link href="/today" style={styles.link}>
          Open Today
        </Link>
      </View>
    </ScrollView>
  );
}

const templateStyles = {
  item: { borderTopWidth: 1, borderTopColor: "#d7ddd2", paddingVertical: 14 },
  title: { color: "#173f38", fontSize: 18, fontWeight: "800" as const },
};

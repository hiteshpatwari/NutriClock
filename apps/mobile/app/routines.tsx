import { useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatLocalTime, type RoutineTemplateKind } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

export default function Routines() {
  const { app, refresh } = useNutriClockApplication();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RoutineTemplateKind>("custom");
  if (!app.state.regimen) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>ROUTINES</Text>
          <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
            Build your NutriClock first
          </Text>
          <Link href="/day" style={styles.link}>
            Start with Your Day
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
      kind,
      routine: {
        ...routine,
        meals: routine.meals.map((meal) => ({ ...meal })),
        beverages: routine.beverages.map((beverage) => ({ ...beverage })),
      },
    });
    setName("");
    setKind("custom");
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
        <Text style={styles.label}>Routine type</Text>
        <View style={templateStyles.kinds}>
          {routineKinds.map((entry) => (
            <Pressable
              key={entry.value}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === entry.value }}
              style={{
                ...templateStyles.kind,
                ...(kind === entry.value ? templateStyles.kindSelected : {}),
              }}
              onPress={() => setKind(entry.value)}
            >
              <Text
                style={
                  kind === entry.value ? templateStyles.kindTextSelected : templateStyles.kindText
                }
              >
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
                {template.kind
                  ? ` · ${routineKinds.find((entry) => entry.value === template.kind)?.label}`
                  : ""}
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
  kinds: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 10 },
  kind: {
    borderWidth: 1,
    borderColor: "#bfcac1",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kindSelected: { backgroundColor: "#dcece5", borderColor: "#175f52" },
  kindText: { color: "#53655e" },
  kindTextSelected: { color: "#175f52", fontWeight: "800" as const },
};

const routineKinds: Array<{ value: RoutineTemplateKind; label: string }> = [
  { value: "weekday", label: "Weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "office", label: "Office" },
  { value: "work_from_home", label: "WFH" },
  { value: "travel", label: "Travel" },
  { value: "night_shift", label: "Night shift" },
  { value: "fasting", label: "Fasting" },
  { value: "custom", label: "Custom" },
];

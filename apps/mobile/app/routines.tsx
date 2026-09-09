import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatLocalTime, type MealName } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

const mealNames: Array<{ name: MealName; label: string }> = [
  { name: "breakfast", label: "Breakfast" },
  { name: "lunch", label: "Lunch" },
  { name: "dinner", label: "Dinner" },
  { name: "snack", label: "Snack" },
];

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return { minuteOfDay: (hours ?? 0) * 60 + (minutes ?? 0) };
};

export default function Routines() {
  const { app, refresh } = useNutriClockApplication();
  const [name, setName] = useState("");
  const [wake, setWake] = useState("07:00");
  const [bedtime, setBedtime] = useState("23:00");
  const [mealTimes, setMealTimes] = useState<Record<MealName, string>>({
    breakfast: "",
    lunch: "",
    dinner: "",
    snack: "",
  });
  const [beverages, setBeverages] = useState({ coffee: "", tea: "" });
  useEffect(() => {
    const routine = app.state.regimen?.routine;
    if (!routine) return;
    const valueForMeal = (mealName: MealName) => {
      const meal = routine.meals.find((entry) => entry.name === mealName);
      return meal
        ? `${String(Math.floor(meal.time.minuteOfDay / 60)).padStart(2, "0")}:${String(meal.time.minuteOfDay % 60).padStart(2, "0")}`
        : "";
    };
    const valueForBeverage = (kind: "coffee" | "tea") => {
      const beverage = routine.beverages.find((entry) => entry.kind === kind);
      return beverage
        ? `${String(Math.floor(beverage.time.minuteOfDay / 60)).padStart(2, "0")}:${String(beverage.time.minuteOfDay % 60).padStart(2, "0")}`
        : "";
    };
    setWake(
      `${String(Math.floor(routine.wakeTime.minuteOfDay / 60)).padStart(2, "0")}:${String(routine.wakeTime.minuteOfDay % 60).padStart(2, "0")}`,
    );
    setBedtime(
      `${String(Math.floor(routine.bedtime.minuteOfDay / 60)).padStart(2, "0")}:${String(routine.bedtime.minuteOfDay % 60).padStart(2, "0")}`,
    );
    setMealTimes(
      Object.fromEntries(
        mealNames.map(({ name: mealName }) => [mealName, valueForMeal(mealName)]),
      ) as Record<MealName, string>,
    );
    setBeverages({ coffee: valueForBeverage("coffee"), tea: valueForBeverage("tea") });
  }, [app.state.regimen]);
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
  const saveTemplate = async (useCurrentRoutine = false) => {
    const trimmed = name.trim();
    if (!trimmed || !app.state.regimen) return;
    const routine = app.state.regimen.routine;
    await app.saveRoutineTemplate({
      id: `mobile-template-${Date.now()}`,
      name: trimmed,
      routine: {
        ...routine,
        wakeTime: useCurrentRoutine ? routine.wakeTime : parseTime(wake),
        bedtime: useCurrentRoutine ? routine.bedtime : parseTime(bedtime),
        meals: useCurrentRoutine
          ? routine.meals.map((meal) => ({ ...meal }))
          : mealNames
              .filter(({ name: mealName }) => mealTimes[mealName])
              .map(({ name: mealName }) => ({
                id: `mobile-template-${mealName}`,
                name: mealName,
                time: parseTime(mealTimes[mealName]),
              })),
        beverages: useCurrentRoutine
          ? routine.beverages.map((beverage) => ({ ...beverage }))
          : (["coffee", "tea"] as const)
              .filter((kind) => beverages[kind])
              .map((kind) => ({
                id: `mobile-template-${kind}`,
                kind,
                time: parseTime(beverages[kind]),
              })),
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
          Save a day shape such as Office day, Travel day, or Night shift. Applying a template
          changes routine context only; supplements, doses, and medication anchors stay unchanged.
        </Text>
        <TextInput
          accessibilityLabel="Template name"
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Office day"
        />
        <Text style={styles.muted}>
          Only enter times you know. Blank meals and beverages stay absent from this routine.
        </Text>
        <TextInput
          accessibilityLabel="Wake time"
          style={styles.input}
          value={wake}
          onChangeText={setWake}
          placeholder="Wake time"
        />
        <TextInput
          accessibilityLabel="Bedtime"
          style={styles.input}
          value={bedtime}
          onChangeText={setBedtime}
          placeholder="Bedtime"
        />
        {mealNames.map(({ name: mealName, label }) => (
          <TextInput
            key={mealName}
            accessibilityLabel={`${label} time`}
            style={styles.input}
            value={mealTimes[mealName]}
            onChangeText={(value) => setMealTimes((current) => ({ ...current, [mealName]: value }))}
            placeholder={`${label} time (optional)`}
          />
        ))}
        {(["coffee", "tea"] as const).map((kind) => (
          <TextInput
            key={kind}
            accessibilityLabel={`${kind} time`}
            style={styles.input}
            value={beverages[kind]}
            onChangeText={(value) => setBeverages((current) => ({ ...current, [kind]: value }))}
            placeholder={`${kind.toUpperCase()} time (optional)`}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          disabled={!name.trim()}
          onPress={() => void saveTemplate()}
        >
          <Text style={styles.buttonText}>Save travel / shift routine</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          disabled={!name.trim()}
          onPress={() => void saveTemplate(true)}
        >
          <Text style={styles.buttonText}>Save current routine instead</Text>
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

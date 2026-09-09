import { useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";
import type { CanonicalRegimen } from "@nutriclock/domain";

const minute = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return { minuteOfDay: (hours ?? 0) * 60 + (minutes ?? 0) };
};
const formatTime = (value: { minuteOfDay: number }) =>
  `${String(Math.floor(value.minuteOfDay / 60)).padStart(2, "0")}:${String(value.minuteOfDay % 60).padStart(2, "0")}`;
export default function Day() {
  const { app, refresh } = useNutriClockApplication();
  const current = app.state.regimen;
  const base =
    current ??
    ({
      routine: { wakeTime: minute("07:00"), bedtime: minute("23:00"), meals: [], beverages: [] },
      supplements: [],
      medications: [],
      preferences: { flexibleItemGrouping: "prefer_grouping" as const },
      overrides: [],
    } satisfies CanonicalRegimen);
  const [wake, setWake] = useState("07:00");
  const [bed, setBed] = useState("23:00");
  const [breakfast, setBreakfast] = useState("08:30");
  const [fat, setFat] = useState(true);
  const [coffee, setCoffee] = useState("");
  const [tea, setTea] = useState("");
  useEffect(() => {
    if (!current) return;
    const breakfastMeal = current.routine.meals.find((meal) => meal.name === "breakfast");
    const coffeeEvent = current.routine.beverages.find((event) => event.kind === "coffee");
    const teaEvent = current.routine.beverages.find((event) => event.kind === "tea");
    setWake(formatTime(current.routine.wakeTime));
    setBed(formatTime(current.routine.bedtime));
    setBreakfast(breakfastMeal ? formatTime(breakfastMeal.time) : "");
    setFat(breakfastMeal?.containsDietaryFat === true);
    setCoffee(coffeeEvent ? formatTime(coffeeEvent.time) : "");
    setTea(teaEvent ? formatTime(teaEvent.time) : "");
  }, [current]);
  const save = async () => {
    const meals = base.routine.meals.filter((meal) => meal.name !== "breakfast");
    const breakfastMeal = base.routine.meals.find((meal) => meal.name === "breakfast");
    if (breakfast)
      meals.push({
        id: breakfastMeal?.id ?? "mobile-breakfast",
        name: "breakfast",
        time: minute(breakfast),
        containsDietaryFat: fat,
      });
    const beverages = base.routine.beverages.filter(
      (event) => event.kind !== "coffee" && event.kind !== "tea",
    );
    const coffeeEvent = base.routine.beverages.find((event) => event.kind === "coffee");
    const teaEvent = base.routine.beverages.find((event) => event.kind === "tea");
    if (coffee)
      beverages.push({
        id: coffeeEvent?.id ?? "mobile-coffee",
        kind: "coffee",
        time: minute(coffee),
      });
    if (tea) beverages.push({ id: teaEvent?.id ?? "mobile-tea", kind: "tea", time: minute(tea) });
    await app.replaceRegimen({
      ...base,
      routine: {
        ...base.routine,
        wakeTime: minute(wake),
        bedtime: minute(bed),
        meals,
        beverages,
      },
    });
    refresh();
    router.push("/supplements");
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>STEP 01</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>Your Day</Text>
        <Text style={styles.body}>
          Meal composition is used only when you explicitly mark it. Coffee and tea are optional
          routine events.
        </Text>
        <Text style={styles.label}>
          Wake time
          <TextInput
            accessibilityLabel="Wake time"
            style={styles.input}
            value={wake}
            onChangeText={setWake}
          />
        </Text>
        <Text style={styles.label}>
          Bedtime
          <TextInput
            accessibilityLabel="Bedtime"
            style={styles.input}
            value={bed}
            onChangeText={setBed}
          />
        </Text>
        <Text style={styles.label}>
          Breakfast (optional)
          <TextInput
            accessibilityLabel="Breakfast"
            style={styles.input}
            value={breakfast}
            onChangeText={setBreakfast}
          />
        </Text>
        {Boolean(breakfast) && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Text style={styles.label}>Usually includes dietary fat</Text>
            <Switch
              accessibilityLabel="Breakfast includes dietary fat"
              value={fat}
              onValueChange={setFat}
            />
          </View>
        )}
        <Text style={styles.label}>
          Coffee (optional)
          <TextInput
            accessibilityLabel="Coffee"
            style={styles.input}
            value={coffee}
            onChangeText={setCoffee}
            placeholder="HH:MM"
          />
        </Text>
        <Text style={styles.label}>
          Tea (optional)
          <TextInput
            accessibilityLabel="Tea"
            style={styles.input}
            value={tea}
            onChangeText={setTea}
            placeholder="HH:MM"
          />
        </Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => void save()}>
          <Text style={styles.buttonText}>Continue to supplements</Text>
        </Pressable>
        <Link href="/" style={styles.link}>
          Back to welcome
        </Link>
      </View>
    </ScrollView>
  );
}

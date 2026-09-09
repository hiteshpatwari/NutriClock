import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { CanonicalRegimen } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

const minute = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return { minuteOfDay: (hours ?? 0) * 60 + (minutes ?? 0) };
};

export default function ImproveSchedule() {
  const { app, refresh } = useNutriClockApplication();
  const question = app.getNextQuestion();
  const regimen = app.state.regimen;
  const [value, setValue] = useState("08:00");

  if (!question || !regimen) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>IMPROVE SCHEDULE</Text>
          <Text style={styles.title}>No extra detail is needed right now.</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => router.replace("/schedule")}
          >
            <Text style={styles.buttonText}>Return to your NutriClock</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const answer = async () => {
    const answeredTime = minute(value);
    let next: CanonicalRegimen = regimen;
    if (question.contextKey === "medication_anchor_time") {
      next = {
        ...regimen,
        medications: regimen.medications.map((anchor) =>
          question.itemIds.includes(anchor.id)
            ? { ...anchor, administrationTime: answeredTime }
            : anchor,
        ),
      };
    } else if (question.contextKey === "coffee_time" || question.contextKey === "tea_time") {
      const kind = question.contextKey === "coffee_time" ? "coffee" : "tea";
      next = {
        ...regimen,
        routine: {
          ...regimen.routine,
          beverages: [
            ...regimen.routine.beverages.filter((event) => event.kind !== kind),
            { id: `context:${question.id}`, kind, time: answeredTime },
          ],
        },
      };
    } else {
      next = {
        ...regimen,
        routine: {
          ...regimen.routine,
          meals: [
            ...regimen.routine.meals.filter((meal) => meal.name !== "breakfast"),
            {
              id: `context:${question.id}`,
              name: "breakfast",
              time: answeredTime,
              ...(question.contextKey === "dietary_fat_meal" ? { containsDietaryFat: true } : {}),
            },
          ],
        },
      };
    }
    await app.replaceRegimen(next);
    await app.generate();
    refresh();
    router.replace("/schedule");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>IMPROVE SCHEDULE / ONE QUESTION</Text>
        <Text style={styles.title}>{question.prompt}</Text>
        <Text style={styles.body}>{question.reason}</Text>
        <Text style={styles.label}>Time</Text>
        <TextInput
          accessibilityLabel="Time"
          style={styles.input}
          value={value}
          onChangeText={setValue}
        />
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => void answer()}>
          <Text style={styles.buttonText}>Use this time</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/schedule")}>
          <Text style={styles.link}>Not now</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

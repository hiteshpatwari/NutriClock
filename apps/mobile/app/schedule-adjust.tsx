import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";
import { loadKnowledgeSnapshot } from "@nutriclock/domain";

const minute = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return { minuteOfDay: (hours ?? 0) * 60 + (minutes ?? 0) };
};
export default function ScheduleAdjust() {
  const { app, refresh } = useNutriClockApplication();
  const regimen = app.state.regimen;
  const item = regimen?.supplements[0];
  const [selectedTime, setSelectedTime] = useState("12:00");
  const save = async () => {
    if (!regimen || !item) return;
    await app.setOverride({
      id: `override-${item.id}`,
      itemId: item.id,
      selectedTime: minute(selectedTime),
      kind: "preference_override",
      acknowledgedRuleIds: [],
      createdFromRulesetVersion: loadKnowledgeSnapshot().rulesetVersion,
    });
    await app.generate();
    refresh();
    router.replace("/schedule");
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ADJUST SCHEDULE</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
          Choose a supplement time
        </Text>
        {item ? (
          <>
            <Text style={styles.body}>
              This creates a visible user-selected preference override. Hard medication timing rules
              cannot be overridden.
            </Text>
            <Text style={styles.label}>
              Supplement<Text style={styles.input}>{item.supplementId}</Text>
            </Text>
            <Text style={styles.label}>
              Selected time
              <TextInput
                accessibilityLabel="Selected supplement time"
                style={styles.input}
                value={selectedTime}
                onChangeText={setSelectedTime}
              />
            </Text>
            <Pressable accessibilityRole="button" style={styles.button} onPress={() => void save()}>
              <Text style={styles.buttonText}>Keep my timing</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.body}>Add a supplement before adjusting the schedule.</Text>
        )}
      </View>
    </ScrollView>
  );
}

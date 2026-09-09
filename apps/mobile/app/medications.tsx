import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MEDICATION_CATALOG, type MedicationAnchor } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

const minute = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return { minuteOfDay: (hours ?? 0) * 60 + (minutes ?? 0) };
};
export default function Medications() {
  const { app, refresh } = useNutriClockApplication();
  const regimen = app.state.regimen;
  const [selected, setSelected] = useState(MEDICATION_CATALOG[0]!.id);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const add = async () => {
    if (!regimen) return;
    const catalog = MEDICATION_CATALOG.find((entry) => entry.id === selected)!;
    const anchor: MedicationAnchor = {
      id: `mobile-med-${Date.now()}`,
      displayName: name || catalog.displayName,
      reference: name
        ? { kind: "unsupported", userEnteredName: name }
        : { kind: "supported", medicationId: selected },
      ...(time ? { administrationTime: minute(time) } : {}),
    };
    await app.replaceRegimen({ ...regimen, medications: [...regimen.medications, anchor] });
    refresh();
    setName("");
  };
  const remove = async (id: string) => {
    if (!regimen) return;
    await app.replaceRegimen({
      ...regimen,
      medications: regimen.medications.filter((item) => item.id !== id),
    });
    refresh();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>STEP 03</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
          Medications — optional
        </Text>
        <Text style={styles.body}>
          Medication times are entered by you and never moved by the scheduler.
        </Text>
        <Text style={styles.label}>Supported medication</Text>
        {MEDICATION_CATALOG.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === item.id }}
            onPress={() => setSelected(item.id)}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: selected === item.id ? "#d7ebe2" : "#fff",
              marginBottom: 7,
            }}
          >
            <Text style={{ color: "#173f38", fontWeight: "700" }}>{item.displayName}</Text>
          </Pressable>
        ))}
        <Text style={styles.label}>
          Or enter another name
          <TextInput
            accessibilityLabel="Medication name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Unsupported medication"
          />
        </Text>
        <Text style={styles.label}>
          Usual administration time (optional — ask later if needed)
          <TextInput
            accessibilityLabel="Administration time"
            style={styles.input}
            value={time}
            onChangeText={setTime}
          />
        </Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => void add()}>
          <Text style={styles.buttonText}>Add medication anchor</Text>
        </Pressable>
        {regimen?.medications.map((item) => (
          <View
            key={item.id}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text style={styles.muted}>
              {item.displayName} ·{" "}
              {item.administrationTime
                ? `${Math.floor(item.administrationTime.minuteOfDay / 60)
                    .toString()
                    .padStart(2, "0")}:${(item.administrationTime.minuteOfDay % 60)
                    .toString()
                    .padStart(2, "0")} · fixed`
                : "time needed before related timing can be resolved"}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void remove(item.id)}>
              <Text style={styles.link}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => router.push("/schedule")}
        >
          <Text style={styles.buttonText}>Generate my NutriClock</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

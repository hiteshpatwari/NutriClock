import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatLocalTime, type DayEvent, type LocalTime } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

const nowTime = (): LocalTime => {
  const current = new Date();
  return { minuteOfDay: current.getHours() * 60 + current.getMinutes() };
};
const dateKey = (): string => {
  const current = new Date();
  return (
    String(current.getFullYear()) +
    "-" +
    String(current.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(current.getDate()).padStart(2, "0")
  );
};
const addMinutes = (value: LocalTime, minutes: number): LocalTime => ({
  minuteOfDay: Math.min(1439, value.minuteOfDay + minutes),
});
const parseTime = (value: string): LocalTime => {
  const [hour, minute] = value.split(":").map(Number);
  return { minuteOfDay: (hour ?? 0) * 60 + (minute ?? 0) };
};

export default function Today() {
  const { app, refresh } = useNutriClockApplication();
  const [now, setNow] = useState(nowTime());
  const [wake, setWake] = useState("07:00");
  const [coffee, setCoffee] = useState("08:00");
  const day = dateKey();
  const regimen = app.state.regimen;
  useEffect(() => {
    const update = () => {
      const current = nowTime();
      setNow(current);
      app.loadToday(day, current);
      refresh();
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [app, day, regimen]);
  const today = app.state.today;
  const repair = app.getScheduleRepair();
  const availabilityGroups = [
    ["available_now", "Take now"],
    ["wait", "Better to wait"],
    ["not_now", "Not now"],
    ["flexible", "Flexible"],
  ] as const;
  const reminderDecisions = app.getReminderDecisions();
  const remindersEnabled = app.state.regimen?.preferences.remindersEnabled === true;
  const record = async (event: DayEvent) => {
    await app.recordDayEvent(day, nowTime(), event);
    refresh();
  };
  if (!app.state.regimen) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
            Build your NutriClock first
          </Text>
          <Text style={styles.body}>Set up your regimen before using Today.</Text>
          <Link href="/supplements" style={styles.link}>
            Start with your supplements
          </Link>
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>TODAY</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
          Your day, as it happens
        </Text>
        <Text style={styles.body}>
          Record only what happened. The remaining supplement windows adapt without changing your
          regimen or medication times.
        </Text>
        <View style={{ backgroundColor: "#e8f2ed", padding: 14, borderRadius: 12 }}>
          <Text style={{ color: "#175f52", fontWeight: "800", marginBottom: 6 }}>
            What can I take now?
          </Text>
          {availabilityGroups.map(([status, label]) => {
            const entries = today?.availability.filter((entry) => entry.status === status) ?? [];
            if (!entries.length) return null;
            return (
              <View
                key={status}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#b4d0bf",
                  paddingTop: 8,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: "#175f52", fontWeight: "800" }}>{label}</Text>
                {entries.map((entry) => (
                  <Text key={entry.itemId} style={styles.body}>
                    {today?.items.find((item) => item.item.id === entry.itemId)?.item.displayName}:{" "}
                    {entry.message}
                    {entry.nextValidTime
                      ? ` Next valid time: ${formatLocalTime(entry.nextValidTime)}.`
                      : ""}
                  </Text>
                ))}
              </View>
            );
          })}
          <Link href="/schedule" style={styles.link}>
            Open schedule explanations and sources
          </Link>
          {!today?.availability.length && (
            <Text style={styles.body}>No supplement availability decision is ready yet.</Text>
          )}
          <View
            style={{ borderTopWidth: 1, borderTopColor: "#b4d0bf", marginTop: 12, paddingTop: 12 }}
          >
            <Text style={{ color: "#175f52", fontWeight: "800" }}>Local reminder guidance</Text>
            <Text style={styles.body}>
              {remindersEnabled
                ? reminderDecisions.some((entry) => entry.status === "due")
                  ? "A supported supplement window is available now."
                  : "Guidance follows your recorded day context."
                : "Optional and stored only on this device."}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() =>
                void app.setReminderPreferences(!remindersEnabled, 0).then(() => refresh())
              }
            >
              <Text style={styles.buttonText}>
                {remindersEnabled ? "Turn off reminder guidance" : "Enable reminder guidance"}
              </Text>
            </Pressable>
            {remindersEnabled &&
              reminderDecisions
                .filter((entry) => entry.status === "due" || entry.status === "waiting")
                .slice(0, 3)
                .map((entry) => (
                  <Text key={entry.itemId} style={styles.body}>
                    {entry.message}
                  </Text>
                ))}
          </View>
        </View>
        {repair && repair.changes.length > 0 && (
          <View
            style={{ backgroundColor: "#fff8e7", padding: 14, borderRadius: 12, marginTop: 14 }}
          >
            <Text style={{ color: "#7a4f12", fontWeight: "800", marginBottom: 6 }}>
              What changed for the rest of today
            </Text>
            <Text style={styles.body}>
              Only remaining items were recalculated; completed items and fixed medication anchors
              stay preserved.
            </Text>
            {repair.changes.map((change) => (
              <Text key={`${change.itemId}:${change.kind}`} style={styles.body}>
                {change.message}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.label}>Adjust today</Text>
        <TextInput
          accessibilityLabel="New wake time"
          style={styles.input}
          value={wake}
          onChangeText={setWake}
          placeholder="Wake time"
        />
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            void record({
              id: "mobile-day-wake-" + Date.now(),
              kind: "wake_time_changed",
              time: parseTime(wake),
            })
          }
        >
          <Text style={styles.buttonText}>Apply wake time</Text>
        </Pressable>
        <TextInput
          accessibilityLabel="Coffee time"
          style={styles.input}
          value={coffee}
          onChangeText={setCoffee}
          placeholder="Coffee time"
        />
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            void record({
              id: "mobile-day-coffee-" + Date.now(),
              kind: "beverage_recorded",
              beverageKind: "coffee",
              time: parseTime(coffee),
            })
          }
        >
          <Text style={styles.buttonText}>Record coffee time</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            void record({
              id: "mobile-day-coffee-now-" + Date.now(),
              kind: "beverage_recorded",
              beverageKind: "coffee",
              time: now,
            })
          }
        >
          <Text style={styles.buttonText}>Record coffee now</Text>
        </Pressable>
        {today?.items.map((entry) => (
          <View
            key={entry.item.id}
            style={{
              borderTopWidth: 1,
              borderTopColor: "#d7ddd2",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#a34d34", fontWeight: "800" }}>
              {entry.item.time ? formatLocalTime(entry.item.time) : entry.item.semanticWindow.label}
            </Text>
            <Text style={{ color: "#173f38", fontWeight: "800", fontSize: 18 }}>
              {entry.item.displayName}
            </Text>
            <Text style={styles.muted}>
              {entry.item.fixed
                ? "Existing medication time · fixed"
                : entry.executionStatus === "taken"
                  ? "Taken"
                  : entry.executionStatus === "skipped"
                    ? "Skipped"
                    : entry.executionStatus === "snoozed"
                      ? "Snoozed"
                      : entry.availableNow
                        ? "Available now"
                        : "Upcoming"}
            </Text>
            {entry.item.fixed &&
              today?.context.events.find(
                (event) =>
                  event.kind === "medication_taken" && event.anchorId === entry.item.sourceId,
              ) && (
                <Text style={styles.muted}>
                  Recorded today; the entered medication anchor remains fixed.
                </Text>
              )}
            {!entry.item.fixed && entry.executionStatus === "planned" && (
              <View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.button}
                  onPress={() =>
                    void record({
                      id: "mobile-day-taken-" + Date.now(),
                      kind: "supplement_taken",
                      itemId: entry.item.sourceId,
                      time: nowTime(),
                    })
                  }
                >
                  <Text style={styles.buttonText}>Taken</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.button}
                  onPress={() =>
                    void record({
                      id: "mobile-day-snooze-" + Date.now(),
                      kind: "supplement_snoozed",
                      itemId: entry.item.sourceId,
                      time: nowTime(),
                      until: addMinutes(nowTime(), 30),
                    })
                  }
                >
                  <Text style={styles.buttonText}>Snooze 30 min</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    void record({
                      id: "mobile-day-skip-" + Date.now(),
                      kind: "supplement_skipped",
                      itemId: entry.item.sourceId,
                      time: nowTime(),
                    })
                  }
                >
                  <Text style={styles.link}>Skip</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
        <Link href="/schedule" style={styles.link}>
          View full schedule explanations
        </Link>
        <Link href="/review" style={styles.link}>
          Weekly review
        </Link>
        <Link href="/routines" style={styles.link}>
          Routine templates
        </Link>
      </View>
    </ScrollView>
  );
}

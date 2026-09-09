import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { formatLocalTime } from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

const dateKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const weekStartKey = (date = new Date()): string => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dateKey(monday);
};

export default function Review() {
  const { app, refresh } = useNutriClockApplication();
  const [, setTick] = useState(0);
  const weekStart = weekStartKey();
  useEffect(() => {
    const update = () => {
      setTick((value) => value + 1);
      refresh();
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [app, refresh, weekStart]);
  if (!app.state.regimen) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>WEEKLY REVIEW</Text>
          <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
            Build your NutriClock first
          </Text>
          <Text style={styles.body}>Your local execution review appears after setup.</Text>
          <Link href="/supplements" style={styles.link}>
            Start with your supplements
          </Link>
        </View>
      </ScrollView>
    );
  }
  const review = app.getWeeklyReview(weekStart);
  const quality = app.getScheduleQuality();
  const simplification = app.getScheduleSimplification();
  const insights = app.getConvenienceInsights();
  const rate = review?.executionRate;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>WEEKLY REVIEW</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>Your NutriClock week</Text>
        <Text style={styles.body}>
          Execution activity stored on this device only. This does not measure nutrient absorption
          or health outcomes.
        </Text>
        <View style={reviewStyles.grid}>
          <Stat
            value={rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`}
            label="taken among taken/skipped doses"
          />
          <Stat value={String(review?.daysWithActivity ?? 0)} label="days with activity" />
          <Stat value={String(review?.supplementSnoozedCount ?? 0)} label="latest states snoozed" />
          <Stat value={String(review?.adjustmentCount ?? 0)} label="routine adjustments" />
        </View>
        {review?.mostSkippedItem && (
          <Text style={styles.body}>
            Most skipped: {review.mostSkippedItem.displayName} ({review.mostSkippedItem.count}).
          </Text>
        )}
        {review?.mostSnoozedItem && (
          <Text style={styles.body}>
            Most snoozed: {review.mostSnoozedItem.displayName} ({review.mostSnoozedItem.count}).
          </Text>
        )}
        {insights.length > 0 && (
          <View style={reviewStyles.quality}>
            <Text style={styles.eyebrow}>EXECUTION PATTERNS</Text>
            {insights.map((insight) => (
              <Text key={`${insight.kind}:${insight.itemId ?? "routine"}`} style={styles.body}>
                {insight.message}
              </Text>
            ))}
          </View>
        )}
        {quality && (
          <View style={reviewStyles.quality}>
            <Text style={styles.eyebrow}>SCHEDULE COMPLEXITY</Text>
            <Text style={reviewStyles.qualityTitle}>{quality.complexity.replace("_", " ")}</Text>
            <Text style={styles.body}>{quality.message}</Text>
            <Text style={styles.muted}>
              {quality.supplementWindowCount} supplement window
              {quality.supplementWindowCount === 1 ? "" : "s"}
            </Text>
          </View>
        )}
        {simplification?.canSimplify && (
          <View style={reviewStyles.simplification}>
            <Text style={styles.eyebrow}>SIMPLIFICATION OPTION</Text>
            <Text style={reviewStyles.qualityTitle}>Fewer windows may be possible</Text>
            <Text style={styles.body}>{simplification.message}</Text>
            {simplification.simpler.items
              .filter((item) => item.kind === "supplement" && item.time)
              .map((item) => (
                <Text key={item.id} style={styles.body}>
                  {item.displayName}: {item.time && formatLocalTime(item.time)}
                </Text>
              ))}
            <Text style={styles.muted}>Comparison only; your current schedule is unchanged.</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() =>
                Alert.alert(
                  "Use simpler times?",
                  "This changes supplement timing preferences only. Medication anchors remain fixed.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Use times",
                      onPress: () => void app.applyScheduleSimplification().then(() => refresh()),
                    },
                  ],
                )
              }
            >
              <Text style={styles.buttonText}>Use grouping-oriented times</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.body}>
          Use Today to record what happened and adapt the remaining day. Medication anchors and
          doses are never changed here.
        </Text>
        <Link href="/today" style={styles.link}>
          Open Today
        </Link>
        <Link href="/routines" style={styles.link}>
          Routine templates
        </Link>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={reviewStyles.stat}>
      <Text style={reviewStyles.value}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const reviewStyles = {
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginVertical: 14 },
  stat: { width: "47%" as const, backgroundColor: "#fff", borderRadius: 10, padding: 12 },
  value: { color: "#175f52", fontSize: 24, fontWeight: "800" as const },
  quality: { backgroundColor: "#f1f7f3", borderRadius: 12, padding: 14, marginVertical: 12 },
  simplification: { backgroundColor: "#fff5d8", borderRadius: 12, padding: 14, marginVertical: 12 },
  qualityTitle: {
    color: "#173f38",
    fontSize: 20,
    fontWeight: "800" as const,
    textTransform: "capitalize" as const,
  },
};

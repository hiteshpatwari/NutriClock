import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import {
  formatLocalTime,
  loadKnowledgeSnapshot,
  type AdministrationGuidance,
} from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

export default function Schedule() {
  const { app, refresh } = useNutriClockApplication();
  const [, setTick] = useState(0);
  const schedule = app.state.schedule?.schedule;
  useEffect(() => {
    if (app.state.regimen && !schedule)
      void app.generate().then(() => {
        setTick((value) => value + 1);
        refresh();
      });
  }, [app, refresh, schedule]);
  const knowledge = loadKnowledgeSnapshot();
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>YOUR NUTRICLOCK</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>Suggested schedule</Text>
        <Text style={styles.body}>
          Medication times are entered by you. Supplement timing is derived from current supported
          rules.
        </Text>
        {schedule && (
          <View style={{ backgroundColor: "#e8f2ed", padding: 14, borderRadius: 12 }}>
            <Text style={{ color: "#175f52", fontWeight: "800" }}>
              {schedule.completeness === "requires_context"
                ? "One detail is needed to resolve a timing constraint."
                : schedule.completeness === "conflicted"
                  ? "This schedule has a conflict NutriClock will not override."
                  : schedule.completeness === "resolved"
                    ? "Your NutriClock is ready."
                    : "Your NutriClock is ready — optional refinements are available."}
            </Text>
            {schedule.assumptions.map((assumption) => (
              <Text key={assumption.id} style={styles.body}>
                {assumption.message}
              </Text>
            ))}
            {schedule.questionCandidates[0] && (
              <View>
                <Text style={styles.body}>{schedule.questionCandidates[0].prompt}</Text>
                <Link href="/improve" style={styles.link}>
                  Answer this question
                </Link>
              </View>
            )}
          </View>
        )}
        {schedule?.items.map((item) => (
          <View
            key={item.id}
            style={{ borderTopWidth: 1, borderTopColor: "#d7ddd2", paddingVertical: 14 }}
          >
            <Text style={{ color: "#a34d34", fontWeight: "800" }}>
              {item.time ? formatLocalTime(item.time) : item.semanticWindow.label}
            </Text>
            <Text style={{ color: "#173f38", fontWeight: "800", fontSize: 18 }}>
              {item.displayName}
            </Text>
            <Text style={styles.muted}>
              {item.fixed
                ? "Existing medication time · fixed"
                : item.timingState === "flexible"
                  ? "Flexible timing"
                  : item.timingState === "user_selected"
                    ? "User-selected timing"
                    : item.timingState === "unresolved"
                      ? "Waiting for one missing detail"
                      : "Suggested timing"}
            </Text>
            <Text style={styles.body}>{item.explanation.bullets.join(" ")}</Text>
            <GuidanceBlock guidance={item.explanation.administrationGuidance} />
            {item.evidenceIds.map((id) => {
              const evidence = knowledge.evidence[id];
              return evidence ? (
                <Pressable
                  key={id}
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(evidence.url)}
                >
                  <Text style={styles.link}>{evidence.title}</Text>
                </Pressable>
              ) : (
                <Text key={id} style={styles.link}>
                  {id}
                </Text>
              );
            })}
          </View>
        ))}
        {schedule?.warnings.map((warning) => (
          <View
            key={warning.id}
            accessibilityRole="alert"
            style={{ backgroundColor: "#fff5d8", padding: 14, marginTop: 12 }}
          >
            <Text style={styles.body}>{warning.message}</Text>
          </View>
        ))}
        {schedule && schedule.conflicts.length > 0 && (
          <View
            accessibilityRole="alert"
            style={{ backgroundColor: "#fff0ee", padding: 14, marginTop: 12 }}
          >
            <Text style={{ color: "#8f302c", fontWeight: "800" }}>Schedule conflict</Text>
            {schedule.conflicts.map((conflict) => (
              <Text key={conflict.id} style={styles.body}>
                {conflict.message}
              </Text>
            ))}
          </View>
        )}
        {schedule && schedule.unsupportedMedications.length > 0 && (
          <View
            accessibilityRole="summary"
            style={{ backgroundColor: "#e8f2ed", padding: 14, marginTop: 12 }}
          >
            {schedule.unsupportedMedications.map((notice) => (
              <Text key={notice.anchorId} style={styles.body}>
                {notice.displayName}: {notice.message}
              </Text>
            ))}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            void app.generate().then(() => {
              refresh();
            })
          }
        >
          <Text style={styles.buttonText}>Regenerate</Text>
        </Pressable>
        <Link href="/schedule-adjust" style={styles.link}>
          Adjust a supplement time
        </Link>
        <Link href="/today" style={styles.link}>
          Open Today
        </Link>
        <Link href="/review" style={styles.link}>
          Weekly review
        </Link>
        <Link href="/settings" style={styles.link}>
          Settings / delete local data
        </Link>
      </View>
    </ScrollView>
  );
}

function GuidanceBlock({ guidance }: { guidance: AdministrationGuidance | undefined }) {
  if (!guidance) return null;
  return (
    <View
      style={{
        backgroundColor: "#f1f7f3",
        borderLeftWidth: 3,
        borderLeftColor: "#78aa95",
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: "#173f38", fontWeight: "800", marginBottom: 6 }}>How to take it</Text>
      {guidance.takeWith && (
        <View>
          <Text style={styles.body}>Take with</Text>
          {guidance.takeWith.map((item) => (
            <Text key={item.id} style={styles.body}>
              • {item.text}
            </Text>
          ))}
        </View>
      )}
      {guidance.foodInstruction && (
        <View>
          <Text style={styles.body}>Food instruction</Text>
          <Text style={styles.body}>{guidance.foodInstruction.text}</Text>
        </View>
      )}
      {guidance.avoidAroundDose && (
        <View>
          <Text style={styles.body}>Avoid around this dose</Text>
          {guidance.avoidAroundDose.map((item) => (
            <Text key={item.id} style={styles.body}>
              • {item.text}
            </Text>
          ))}
        </View>
      )}
      {guidance.fallbackInstruction && (
        <View>
          <Text style={styles.body}>If this is difficult</Text>
          <Text style={styles.body}>{guidance.fallbackInstruction.text}</Text>
        </View>
      )}
    </View>
  );
}

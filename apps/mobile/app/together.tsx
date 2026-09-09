import { Link } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { loadKnowledgeSnapshot, type RegimenDependencyGraph } from "@nutriclock/domain";
import { useNutriClockApplication } from "../src/app-context";
import { styles } from "./index";

const relationLabels: Record<RegimenDependencyGraph["dependencies"][number]["relation"], string> = {
  take_together: "Supported together",
  keep_apart: "Keep apart",
  clinical_warning: "Clinical warning",
  informational: "Information",
};

export default function Together() {
  const { app } = useNutriClockApplication();
  const graph = app.getRegimenDependencyGraph();
  const knowledge = loadKnowledgeSnapshot();

  if (!graph) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>REGIMEN RELATIONSHIPS</Text>
          <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
            Can I take these together?
          </Text>
          <Text style={styles.body}>
            Add what you take first and NutriClock will check the supported relationships.
          </Text>
          <Link href="/supplements" style={styles.link}>
            Build my NutriClock
          </Link>
        </View>
      </ScrollView>
    );
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const unsupportedNames = graph.unsupportedMedicationIds
    .map((id) => nodeById.get(id)?.displayName)
    .filter((name): name is string => Boolean(name));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>REGIMEN RELATIONSHIPS</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
          Can I take these together?
        </Text>
        <Text style={styles.body}>
          A quick view of timing relationships in your regimen. This does not recommend doses or
          replace your medication instructions.
        </Text>
        <View style={{ backgroundColor: "#e8f2ed", padding: 14, borderRadius: 12 }}>
          <Text style={styles.body}>{graph.scopeNotice}</Text>
        </View>
        {unsupportedNames.length > 0 && (
          <View
            accessibilityRole="alert"
            style={{ backgroundColor: "#fff5d8", padding: 14, borderRadius: 12, marginTop: 14 }}
          >
            <Text style={{ color: "#7c4c18", fontWeight: "800" }}>
              Some medication coverage is limited
            </Text>
            <Text style={styles.body}>
              {unsupportedNames.join(", ")}: no name-based interaction was inferred. Supported
              relationships for the rest of your regimen remain available.
            </Text>
          </View>
        )}
        {graph.dependencies.length > 0 ? (
          graph.dependencies.map((dependency) => {
            const source = nodeById.get(dependency.sourceNodeId);
            const target = nodeById.get(dependency.targetNodeId);
            if (!source || !target) return null;
            return (
              <View
                key={dependency.id}
                style={{
                  backgroundColor:
                    dependency.relation === "clinical_warning"
                      ? "#fff5d8"
                      : dependency.relation === "keep_apart"
                        ? "#fffaf0"
                        : "#f1f7f3",
                  borderColor: dependency.relation === "clinical_warning" ? "#e1a39a" : "#b4d0bf",
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 16,
                  marginTop: 14,
                }}
              >
                <Text style={{ color: "#175f52", fontWeight: "800", textTransform: "uppercase" }}>
                  {relationLabels[dependency.relation]}
                </Text>
                <Text style={{ color: "#173f38", fontWeight: "800", fontSize: 19, marginTop: 8 }}>
                  {source.displayName} + {target.displayName}
                </Text>
                <Text style={styles.body}>{dependency.message}</Text>
                {dependency.minimumSeparationMinutes !== undefined && (
                  <Text style={{ color: "#7c4c18", fontWeight: "700", marginBottom: 8 }}>
                    Minimum supported separation: {dependency.minimumSeparationMinutes} minutes.
                  </Text>
                )}
                {dependency.evidenceIds.map((id) => {
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
            );
          })
        ) : (
          <View
            style={{ backgroundColor: "#fffaf0", padding: 14, borderRadius: 12, marginTop: 14 }}
          >
            <Text style={styles.sectionTitle}>No active relationship found for these items</Text>
            <Text style={styles.body}>
              NutriClock has no active, evidence-resolved relationship to show. This is not evidence
              that no interaction exists.
            </Text>
          </View>
        )}
        <Link href="/schedule" style={styles.link}>
          View your schedule
        </Link>
      </View>
    </ScrollView>
  );
}

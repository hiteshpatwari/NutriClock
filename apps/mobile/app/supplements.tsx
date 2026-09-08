import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  SUPPLEMENT_CATALOG,
  type DoseBasis,
  type DoseUnit,
  type SupplementEntry,
  type SupplementFormId,
} from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

export default function Supplements() {
  const { app, refresh } = useNutriClockApplication();
  const regimen = app.state.regimen;
  const [selected, setSelected] = useState(SUPPLEMENT_CATALOG[0]!.id);
  const [formId, setFormId] = useState<SupplementEntry["formId"]>("unspecified");
  const [dose, setDose] = useState("1");
  const [unit, setUnit] = useState<DoseUnit>(SUPPLEMENT_CATALOG[0]!.defaultUnit);
  const [basis, setBasis] = useState<DoseBasis>("unknown");
  const catalog = SUPPLEMENT_CATALOG.find((item) => item.id === selected)!;
  const formLabels: Record<SupplementFormId, string> = {
    unspecified: "Unspecified",
    iron_oral_common: "Common oral iron",
    calcium_carbonate: "Calcium carbonate",
    calcium_citrate: "Calcium citrate",
  };
  const chooseSupplement = (id: SupplementEntry["supplementId"]) => {
    const nextCatalog = SUPPLEMENT_CATALOG.find((item) => item.id === id)!;
    setSelected(id);
    setFormId("unspecified");
    setDose("1");
    setUnit(nextCatalog.defaultUnit);
    setBasis("unknown");
  };
  const add = async () => {
    const entry: SupplementEntry = {
      id: `mobile-${Date.now()}`,
      supplementId: selected,
      formId,
      dose: Number(dose),
      unit,
      doseBasis: basis,
      frequency: { kind: "once_daily" },
    };
    if (regimen) {
      await app.replaceRegimen({ ...regimen, supplements: [...regimen.supplements, entry] });
      refresh();
    }
  };
  const remove = async (id: string) => {
    if (!regimen) return;
    await app.replaceRegimen({
      ...regimen,
      supplements: regimen.supplements.filter((item) => item.id !== id),
    });
    refresh();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: "#f3f0e8", flexGrow: 1 }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>STEP 02</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>Your Supplements</Text>
        <Text style={styles.body}>
          Add supplements you already take. Your dose is stored, not judged or changed.
        </Text>
        <Text style={styles.label}>Supplement</Text>
        {SUPPLEMENT_CATALOG.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === item.id }}
            onPress={() => chooseSupplement(item.id)}
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
        {catalog.supportedForms.length > 1 && (
          <>
            <Text style={styles.label}>Form</Text>
            {catalog.supportedForms.map((form) => (
              <Pressable
                key={form}
                accessibilityRole="radio"
                accessibilityState={{ selected: formId === form }}
                onPress={() => setFormId(form)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: formId === form ? "#d7ebe2" : "#fff",
                  marginBottom: 7,
                }}
              >
                <Text style={{ color: "#173f38", fontWeight: "700" }}>{formLabels[form]}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={styles.label}>
          Dose
          <TextInput
            accessibilityLabel="Dose"
            style={styles.input}
            value={dose}
            onChangeText={setDose}
            keyboardType="decimal-pad"
          />
        </Text>
        <Text style={styles.label}>Unit</Text>
        {catalog.supportedUnits.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: unit === option }}
            onPress={() => setUnit(option)}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: unit === option ? "#d7ebe2" : "#fff",
              marginBottom: 7,
            }}
          >
            <Text style={{ color: "#173f38", fontWeight: "700" }}>{option}</Text>
          </Pressable>
        ))}
        {catalog.doseBasisRelevant && (
          <>
            <Text style={styles.label}>What amount does the label show?</Text>
            {(
              [
                ["elemental", `Elemental ${catalog.displayName.toLowerCase()}`],
                ["product_label_amount", "Product/compound amount"],
                ["unknown", "I'm not sure"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: basis === value }}
                onPress={() => setBasis(value)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: basis === value ? "#d7ebe2" : "#fff",
                  marginBottom: 7,
                }}
              >
                <Text style={{ color: "#173f38", fontWeight: "700" }}>{label}</Text>
              </Pressable>
            ))}
            <Text style={styles.body}>
              {catalog.id === "iron"
                ? "Some iron products list the total compound amount while the Supplement Facts panel lists elemental iron. NutriClock only uses elemental-amount thresholds when you explicitly identify the amount as elemental."
                : "Some labels distinguish elemental amount from total product or compound amount. Amount-based thresholds are used only when you identify the basis."}
            </Text>
          </>
        )}
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => void add()}>
          <Text style={styles.buttonText}>Add supplement</Text>
        </Pressable>
        {regimen?.supplements.map((item) => (
          <View
            key={item.id}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text style={styles.muted}>
              {SUPPLEMENT_CATALOG.find((entry) => entry.id === item.supplementId)?.displayName ??
                item.supplementId}{" "}
              · {item.dose} {item.unit}
              {SUPPLEMENT_CATALOG.find((entry) => entry.id === item.supplementId)?.doseBasisRelevant
                ? " · " + item.doseBasis
                : ""}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void remove(item.id)}>
              <Text style={styles.link}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => router.push("/medications")}
        >
          <Text style={styles.buttonText}>Continue to medications</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

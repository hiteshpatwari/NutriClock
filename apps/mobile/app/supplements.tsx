import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  SUPPLEMENT_CATALOG,
  type DoseBasis,
  type DoseUnit,
  type SupplementEntry,
  type SupplementFormId,
  type SupplementId,
} from "@nutriclock/domain";
import { styles } from "./index";
import { useNutriClockApplication } from "../src/app-context";

const supplementAliases: Record<string, string[]> = {
  vitamin_d3: ["d3", "vitamin d"],
  vitamin_b12: ["b12", "cobalamin"],
  folate: ["folic acid"],
};

export default function Supplements() {
  const { app, refresh } = useNutriClockApplication();
  const regimen = app.state.regimen;
  const [selected, setSelected] = useState<SupplementId | "">("");
  const [formId, setFormId] = useState<SupplementEntry["formId"]>("unspecified");
  const [dose, setDose] = useState("1");
  const [unit, setUnit] = useState<DoseUnit>("mg");
  const [basis, setBasis] = useState<DoseBasis>("unknown");
  const [search, setSearch] = useState("");
  const catalog = SUPPLEMENT_CATALOG.find((item) => item.id === selected);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCatalog = SUPPLEMENT_CATALOG.filter(
    (item) =>
      !normalizedSearch ||
      item.displayName.toLowerCase().includes(normalizedSearch) ||
      supplementAliases[item.id]?.some((alias) => alias.includes(normalizedSearch)),
  );
  const formLabels: Record<SupplementFormId, string> = {
    unspecified: "Unspecified",
    iron_oral_common: "Common oral iron",
    calcium_carbonate: "Calcium carbonate",
    calcium_citrate: "Calcium citrate",
    opaque_product: "Keep as generic multivitamin",
  };
  const chooseSupplement = (id: SupplementEntry["supplementId"]) => {
    const nextCatalog = SUPPLEMENT_CATALOG.find((item) => item.id === id)!;
    setSelected(id);
    setFormId(
      nextCatalog.supportedForms.includes("unspecified")
        ? "unspecified"
        : nextCatalog.supportedForms[0]!,
    );
    setDose("1");
    setUnit(nextCatalog.defaultUnit);
    setBasis("unknown");
  };
  const add = async () => {
    if (!catalog) return;
    const entry: SupplementEntry = {
      id: `mobile-${Date.now()}`,
      supplementId: catalog.id,
      formId,
      dose: Number(dose),
      unit,
      doseBasis: basis,
      frequency: { kind: "once_daily" },
    };
    const base = regimen ?? {
      routine: {
        wakeTime: { minuteOfDay: 420 },
        bedtime: { minuteOfDay: 1380 },
        meals: [],
        beverages: [],
      },
      supplements: [],
      medications: [],
      preferences: { flexibleItemGrouping: "prefer_grouping" as const },
      overrides: [],
    };
    await app.replaceRegimen({ ...base, supplements: [...base.supplements, entry] });
    refresh();
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
        <Text style={styles.eyebrow}>STEP 01</Text>
        <Text style={{ ...styles.title, fontSize: 30, lineHeight: 34 }}>
          What do you currently take?
        </Text>
        <Text style={styles.body}>
          Add supplements you already take. Your dose is stored, not judged or changed.
        </Text>
        <Text style={styles.label}>Search supplements (aliases supported)</Text>
        <TextInput
          accessibilityLabel="Search supplements"
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Try D3, B12, or iron"
        />
        <Text style={styles.label}>Supplement</Text>
        {filteredCatalog.map((item) => (
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
        {catalog && catalog.supportedForms.length > 1 && (
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
        {catalog && (
          <>
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
          </>
        )}
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          disabled={!catalog}
          onPress={() => void add()}
        >
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
          disabled={!regimen?.supplements.length}
          onPress={() =>
            void app.generate().then(() => {
              refresh();
              router.push("/schedule");
            })
          }
        >
          <Text style={styles.buttonText}>Generate my NutriClock</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => router.push("/medications")}
        >
          <Text style={styles.buttonText}>Add optional medication timing</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

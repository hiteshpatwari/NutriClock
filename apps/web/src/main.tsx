import { StrictMode, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import { createNutriClockApplication, type NutriClockApplication } from "@nutriclock/application";
import {
  MEDICATION_CATALOG,
  SUPPLEMENT_CATALOG,
  formatLocalTime,
  loadKnowledgeSnapshot,
  type CanonicalRegimen,
  type AdministrationGuidance,
  type DayEvent,
  type DoseBasis,
  type DoseUnit,
  type LocalTime,
  type MedicationAnchor,
  type RoutineTemplate,
  type SupplementEntry,
  type SupplementFormId,
} from "@nutriclock/domain";
import { createIndexedDbRepository } from "./persistence/indexeddb-repository";
import "./styles.css";

const time = (value: string): LocalTime => ({
  minuteOfDay: Math.max(
    0,
    Math.min(1439, Number(value.split(":")[0]) * 60 + Number(value.split(":")[1])),
  ),
});
const inputTime = (value: LocalTime) =>
  `${String(Math.floor(value.minuteOfDay / 60)).padStart(2, "0")}:${String(value.minuteOfDay % 60).padStart(2, "0")}`;
const newId = () =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const localDateKey = (date = new Date()) =>
  String(date.getFullYear()) +
  "-" +
  String(date.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(date.getDate()).padStart(2, "0");
const localNow = (date = new Date()): LocalTime => ({
  minuteOfDay: date.getHours() * 60 + date.getMinutes(),
});
const weekStartKey = (date = new Date()) => {
  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return localDateKey(monday);
};
const addMinutes = (value: LocalTime, minutes: number): LocalTime => ({
  minuteOfDay: Math.min(1439, value.minuteOfDay + minutes),
});

const defaultRegimen: CanonicalRegimen = {
  routine: { wakeTime: time("07:00"), bedtime: time("23:00"), meals: [], beverages: [] },
  supplements: [],
  medications: [],
  preferences: { flexibleItemGrouping: "prefer_grouping" },
  overrides: [],
};

const formLabels: Record<SupplementFormId, string> = {
  unspecified: "Unspecified",
  iron_oral_common: "Common oral iron",
  calcium_carbonate: "Calcium carbonate",
  calcium_citrate: "Calcium citrate",
  opaque_product: "Keep as generic multivitamin",
};
const supplementAliases: Record<string, string[]> = {
  vitamin_d3: ["d3", "vitamin d"],
  vitamin_b12: ["b12", "cobalamin"],
  folate: ["folic acid"],
};

function useApplication(): { app: NutriClockApplication; refresh: () => void } {
  const app = useMemo(() => createNutriClockApplication(createIndexedDbRepository()), []);
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);
  useEffect(() => {
    void app.load().then(refresh);
  }, [app]);
  return { app, refresh };
}

function Layout() {
  const { app, refresh } = useApplication();
  const navigate = useNavigate();
  const state = app.state;
  const regimen = state.regimen ?? defaultRegimen;
  const saveRegimen = async (next: CanonicalRegimen) => {
    await app.replaceRegimen(next);
    refresh();
  };
  const generate = async () => {
    await app.generate();
    refresh();
    navigate("/schedule");
  };
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main id="main-content" className="shell">
        <header className="topbar">
          <Link to="/" className="brand">
            NutriClock<span>_</span>
          </Link>
          <nav aria-label="Primary">
            <Link to="/today">Today</Link>
            <Link to="/review">Review</Link>
            <Link to="/routines">Routines</Link>
            <Link to="/day">Your Day</Link>
            <Link to="/supplements">Supplements</Link>
            <Link to="/medications">Medications</Link>
            <Link to="/schedule">Your NutriClock</Link>
            <Link to="/settings">Settings</Link>
          </nav>
        </header>
        {state.error && (
          <div className="error" role="alert">
            {state.error}
          </div>
        )}
        {state.knowledgeUpdateAvailable && (
          <div className="notice" role="status">
            NutriClock's timing guidance has been updated. Generate a fresh schedule to use the
            current rules.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Welcome onStart={() => navigate("/supplements")} />} />
          <Route path="/today" element={<TodayPage app={app} />} />
          <Route path="/review" element={<ReviewPage app={app} />} />
          <Route path="/routines" element={<RoutineTemplatesPage app={app} />} />
          <Route
            path="/day"
            element={
              <DayForm
                regimen={regimen}
                onSave={saveRegimen}
                onNext={() => navigate("/supplements")}
              />
            }
          />
          <Route
            path="/supplements"
            element={
              <SupplementForm
                regimen={regimen}
                onSave={saveRegimen}
                onNext={() => navigate("/medications")}
                onGenerate={generate}
              />
            }
          />
          <Route
            path="/medications"
            element={
              <MedicationForm regimen={regimen} onSave={saveRegimen} onGenerate={generate} />
            }
          />
          <Route path="/schedule" element={<SchedulePage app={app} onGenerate={generate} />} />
          <Route path="/improve" element={<ContextQuestionPage app={app} refresh={refresh} />} />
          <Route
            path="/schedule/adjust"
            element={<ScheduleAdjustPage app={app} regimen={regimen} refresh={refresh} />}
          />
          <Route path="/settings" element={<Settings app={app} refresh={refresh} />} />
        </Routes>
      </main>
    </>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <section className="hero">
      <p className="eyebrow">LOCAL-FIRST / RULES V1</p>
      <h1>A smarter schedule for the supplements you already take.</h1>
      <p className="lede">
        Organize supplements around meals, coffee, and supported interactions — with the evidence
        behind every timing suggestion.
      </p>
      <p className="boundary">
        <strong>NutriClock helps organize supplements you already take.</strong> It does not
        diagnose conditions or determine which supplements or doses you need.
      </p>
      <button onClick={onStart}>Build my NutriClock</button>
      <p className="privacy">Stored on this device. No account required.</p>
    </section>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="card step">
      <p className="eyebrow">STEP {number}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

function TodayPage({ app }: { app: NutriClockApplication }) {
  const [, setRevision] = useState(0);
  const [now, setNow] = useState(localNow());
  const [wakeValue, setWakeValue] = useState(inputTime(now));
  const [coffeeValue, setCoffeeValue] = useState(inputTime(now));
  const [mealValue, setMealValue] = useState(inputTime(now));
  const date = localDateKey();
  const regimen = app.state.regimen;
  const refreshToday = () => {
    const current = localNow();
    setNow(current);
    app.loadToday(date, current);
    setRevision((value) => value + 1);
  };
  useEffect(() => {
    refreshToday();
    const interval = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(interval);
  }, [app, date, regimen]);
  const today = app.state.today;
  const takeNow = today?.availability.filter((entry) => entry.status === "available_now") ?? [];
  const betterToWait = today?.availability.filter((entry) => entry.status === "wait") ?? [];
  const notNow = today?.availability.filter((entry) => entry.status === "not_now") ?? [];
  const flexibleNow = today?.availability.filter((entry) => entry.status === "flexible") ?? [];
  const repair = app.getScheduleRepair();
  const reminderDecisions = app.getReminderDecisions();
  const remindersEnabled = app.state.regimen?.preferences.remindersEnabled === true;
  const record = async (event: DayEvent) => {
    await app.recordDayEvent(date, localNow(), event);
    refreshToday();
  };
  if (!app.state.regimen) {
    return (
      <section className="card">
        <p className="eyebrow">TODAY</p>
        <h1>Build your NutriClock first</h1>
        <p className="helper">
          Once your regimen is set up, Today will show what remains and help you adapt the rest of
          the day.
        </p>
        <Link to="/supplements">Start with your supplements</Link>
      </section>
    );
  }
  return (
    <section className="card today-page">
      <div className="resulthead">
        <div>
          <p className="eyebrow">TODAY</p>
          <h1>Your day, as it happens</h1>
        </div>
        <span className="today-date">{date}</span>
      </div>
      <p className="helper">
        Record only what happened. NutriClock adapts the remaining supplement windows without
        changing your underlying regimen or medication times.
      </p>
      <div className="now-card">
        <h2>What can I take now?</h2>
        {takeNow.length > 0 ? (
          <div className="availability-group">
            <strong>Take now</strong>
            {takeNow.map((entry) => (
              <p key={entry.itemId}>
                <strong>
                  {today?.items.find((item) => item.item.id === entry.itemId)?.item.displayName}
                </strong>{" "}
                {entry.message}
                {entry.nextValidTime &&
                  entry.nextValidTime.minuteOfDay !== now.minuteOfDay &&
                  ` Next valid time: ${formatLocalTime(entry.nextValidTime)}.`}
              </p>
            ))}
          </div>
        ) : (
          <p>No supplement is currently marked available right now.</p>
        )}
        {betterToWait.length > 0 && (
          <div className="availability-group">
            <strong>Better to wait</strong>
            {betterToWait.map((entry) => (
              <p key={entry.itemId}>{entry.message}</p>
            ))}
          </div>
        )}
        {notNow.length > 0 && (
          <div className="availability-group warning-copy">
            <strong>Not now</strong>
            {notNow.map((entry) => (
              <p key={entry.itemId}>{entry.message}</p>
            ))}
          </div>
        )}
        {flexibleNow.length > 0 && (
          <div className="availability-group">
            <strong>Flexible</strong>
            {flexibleNow.map((entry) => (
              <p key={entry.itemId}>{entry.message}</p>
            ))}
          </div>
        )}
        <p>
          <Link to="/schedule">Open schedule explanations and sources</Link>
        </p>
        <div className="reminder-panel">
          <strong>Local reminder guidance</strong>
          <p>
            {remindersEnabled
              ? reminderDecisions.filter((entry) => entry.status === "due").length
                ? "A supported supplement window is available now."
                : "Reminder guidance is enabled and follows the current day context."
              : "Optional, local-only guidance based on supported timing windows."}
          </p>
          <button
            className="secondary"
            onClick={() =>
              void app.setReminderPreferences(!remindersEnabled, 0).then(() => refreshToday())
            }
          >
            {remindersEnabled ? "Turn off reminder guidance" : "Enable reminder guidance"}
          </button>
          {remindersEnabled &&
            reminderDecisions
              .filter((entry) => entry.status === "due" || entry.status === "waiting")
              .slice(0, 3)
              .map((entry) => (
                <p key={entry.itemId} className="reminder-line">
                  {entry.message}
                </p>
              ))}
        </div>
      </div>
      <div className="today-actions">
        <button className="secondary" onClick={() => setWakeValue(inputTime(now))}>
          Adjust today
        </button>
        <button
          className="secondary"
          onClick={() =>
            void record({
              id: newId(),
              kind: "beverage_recorded",
              beverageKind: "coffee",
              time: now,
            })
          }
        >
          Record coffee now
        </button>
        <button
          className="secondary"
          onClick={() =>
            void record({
              id: newId(),
              kind: "meal_recorded",
              mealName: "breakfast",
              time: now,
            })
          }
        >
          Record breakfast now
        </button>
      </div>
      {repair && repair.changes.length > 0 && (
        <section className="repair-panel" aria-labelledby="repair-heading">
          <p className="eyebrow">SCHEDULE REPAIR</p>
          <h2 id="repair-heading">What changed for the rest of today</h2>
          <p className="helper">
            NutriClock recalculated only the remaining items and preserved completed items and fixed
            medication anchors.
          </p>
          <ul>
            {repair.changes.map((change) => (
              <li key={`${change.itemId}:${change.kind}`}>{change.message}</li>
            ))}
          </ul>
        </section>
      )}
      <div className="today-adjust">
        <label>
          New wake time
          <input
            type="time"
            value={wakeValue}
            onChange={(event) => setWakeValue(event.target.value)}
          />
        </label>
        <button
          className="secondary"
          onClick={() =>
            void record({ id: newId(), kind: "wake_time_changed", time: time(wakeValue) })
          }
        >
          Apply wake time
        </button>
        <label>
          Breakfast time
          <input
            type="time"
            value={mealValue}
            onChange={(event) => setMealValue(event.target.value)}
          />
        </label>
        <button
          className="secondary"
          onClick={() =>
            void record({
              id: newId(),
              kind: "meal_recorded",
              mealName: "breakfast",
              time: time(mealValue),
            })
          }
        >
          Move breakfast
        </button>
        <label>
          Coffee time
          <input
            type="time"
            value={coffeeValue}
            onChange={(event) => setCoffeeValue(event.target.value)}
          />
        </label>
        <button
          className="secondary"
          onClick={() =>
            void record({
              id: newId(),
              kind: "beverage_recorded",
              beverageKind: "coffee",
              time: time(coffeeValue),
            })
          }
        >
          Move coffee
        </button>
      </div>
      <div className="today-timeline">
        {today?.items.map((entry) => (
          <article className="today-item" key={entry.item.id}>
            <div>
              <span className="time">
                {entry.item.time
                  ? formatLocalTime(entry.item.time)
                  : entry.item.semanticWindow.label}
              </span>
              <h2>{entry.item.displayName}</h2>
              <p className="status">
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
              </p>
              {entry.item.fixed &&
                today?.context.events.find(
                  (event) =>
                    event.kind === "medication_taken" && event.anchorId === entry.item.sourceId,
                ) && (
                  <p className="status">
                    Recorded today; the entered medication anchor remains fixed.
                  </p>
                )}
            </div>
            {!entry.item.fixed && entry.executionStatus === "planned" && (
              <div className="today-item-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    void record({
                      id: newId(),
                      kind: "supplement_taken",
                      itemId: entry.item.sourceId,
                      time: localNow(),
                    })
                  }
                >
                  Taken
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    void record({
                      id: newId(),
                      kind: "supplement_snoozed",
                      itemId: entry.item.sourceId,
                      time: localNow(),
                      until: addMinutes(localNow(), 30),
                    })
                  }
                >
                  Snooze 30 min
                </button>
                <button
                  className="linkbutton"
                  onClick={() =>
                    void record({
                      id: newId(),
                      kind: "supplement_skipped",
                      itemId: entry.item.sourceId,
                      time: localNow(),
                    })
                  }
                >
                  Skip
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="metadata">
        Schedule remains derived from the current regimen and approved rules. Daily activity is
        stored locally on this device.
      </p>
    </section>
  );
}

function ReviewPage({ app }: { app: NutriClockApplication }) {
  const [, setRevision] = useState(0);
  const weekStart = weekStartKey();
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [app, weekStart]);
  if (!app.state.regimen) {
    return (
      <section className="card">
        <p className="eyebrow">WEEKLY REVIEW</p>
        <h1>Build your NutriClock first</h1>
        <p className="helper">
          Your local execution review will appear after you create a regimen.
        </p>
        <Link to="/supplements">Start with your supplements</Link>
      </section>
    );
  }
  const review = app.getWeeklyReview(weekStart);
  const quality = app.getScheduleQuality();
  const simplification = app.getScheduleSimplification();
  const insights = app.getConvenienceInsights();
  const applySimplification = async () => {
    if (
      !window.confirm(
        "Use the grouping-oriented supplement times? Medication anchors will remain fixed.",
      )
    )
      return;
    await app.applyScheduleSimplification();
    setRevision((value) => value + 1);
  };
  return (
    <section className="card review-page">
      <div className="resulthead">
        <div>
          <p className="eyebrow">WEEKLY REVIEW</p>
          <h1>Your NutriClock week</h1>
        </div>
        <span className="today-date">
          {review?.weekStart} to {review?.weekEnd}
        </span>
      </div>
      <p className="helper">
        This is an execution summary from activity stored on this device. It does not measure
        nutrient absorption or health outcomes.
      </p>
      <div className="review-grid">
        <div className="review-stat">
          <strong>
            {review?.executionRate === null
              ? "—"
              : `${Math.round((review?.executionRate ?? 0) * 100)}%`}
          </strong>
          <span>marked taken among taken/skipped doses</span>
        </div>
        <div className="review-stat">
          <strong>{review?.daysWithActivity ?? 0}</strong>
          <span>days with recorded activity</span>
        </div>
        <div className="review-stat">
          <strong>{review?.supplementSnoozedCount ?? 0}</strong>
          <span>latest supplement states snoozed</span>
        </div>
        <div className="review-stat">
          <strong>{review?.adjustmentCount ?? 0}</strong>
          <span>routine adjustments recorded</span>
        </div>
      </div>
      {review?.mostSkippedItem && (
        <p className="notice">
          Most frequently skipped in this review period:{" "}
          <strong>{review.mostSkippedItem.displayName}</strong> ({review.mostSkippedItem.count}).
        </p>
      )}
      {review?.mostSnoozedItem && (
        <p className="notice">
          Most frequently snoozed in this review period:{" "}
          <strong>{review.mostSnoozedItem.displayName}</strong> ({review.mostSnoozedItem.count}).
        </p>
      )}
      {insights.length > 0 && (
        <div className="notice">
          <strong>Execution patterns</strong>
          {insights.map((insight) => (
            <p key={`${insight.kind}:${insight.itemId ?? "routine"}`}>{insight.message}</p>
          ))}
        </div>
      )}
      {quality && (
        <div className="quality-card">
          <p className="eyebrow">SCHEDULE COMPLEXITY</p>
          <h2>{quality.complexity.replace("_", " ")}</h2>
          <p>{quality.message}</p>
          <p className="metadata">
            {quality.supplementWindowCount} supplement window
            {quality.supplementWindowCount === 1 ? "" : "s"} · {quality.flexibleSupplementCount}{" "}
            flexible item{quality.flexibleSupplementCount === 1 ? "" : "s"}
          </p>
        </div>
      )}
      {simplification?.canSimplify && (
        <div className="simplification-card">
          <p className="eyebrow">SIMPLIFICATION OPTION</p>
          <h2>Fewer supplement windows may be possible</h2>
          <p>{simplification.message}</p>
          <details>
            <summary>Preview the grouping-oriented times</summary>
            <ul>
              {simplification.simpler.items
                .filter((item) => item.kind === "supplement" && item.time)
                .map((item) => (
                  <li key={item.id}>
                    {item.displayName}: {item.time && formatLocalTime(item.time)}
                  </li>
                ))}
            </ul>
          </details>
          <p className="metadata">
            This is a comparison only. Your current schedule and preferences are unchanged.
          </p>
          <button className="secondary" onClick={() => void applySimplification()}>
            Use grouping-oriented times
          </button>
        </div>
      )}
      <p className="helper">
        Use Today to record what happened and adapt the remaining day. NutriClock never changes
        medication anchors or recommends doses.
      </p>
      <Link to="/today">Open Today</Link>
    </section>
  );
}

function RoutineTemplatesPage({ app }: { app: NutriClockApplication }) {
  const [, setRevision] = useState(0);
  const [name, setName] = useState("");
  if (!app.state.regimen) {
    return (
      <section className="card">
        <p className="eyebrow">ROUTINES</p>
        <h1>Build your NutriClock first</h1>
        <p className="helper">Save routine templates after setting your day shape.</p>
        <Link to="/supplements">Start with your supplements</Link>
      </section>
    );
  }
  const saveTemplate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const routine = app.state.regimen?.routine;
    if (!routine) return;
    const template: RoutineTemplate = {
      id: newId(),
      name: trimmed,
      routine: {
        ...routine,
        meals: routine.meals.map((meal) => ({ ...meal })),
        beverages: routine.beverages.map((beverage) => ({ ...beverage })),
      },
    };
    await app.saveRoutineTemplate(template);
    setName("");
    setRevision((value) => value + 1);
  };
  const applyTemplate = async (templateId: string) => {
    await app.applyRoutineTemplate(templateId);
    setRevision((value) => value + 1);
  };
  return (
    <section className="card routines-page">
      <p className="eyebrow">ROUTINES</p>
      <h1>Routine templates</h1>
      <p className="helper">
        Save different day shapes such as Office day or Weekend. Applying one changes meal,
        beverage, wake, and bedtime context only; it never changes your supplements, doses, or
        medication anchors.
      </p>
      <div className="template-create">
        <label>
          Template name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Office day"
          />
        </label>
        <button onClick={() => void saveTemplate()} disabled={!name.trim()}>
          Save current routine
        </button>
      </div>
      <div className="template-list">
        {app.state.routineTemplates.length ? (
          app.state.routineTemplates.map((template) => (
            <article className="template-item" key={template.id}>
              <div>
                <h2>{template.name}</h2>
                <p className="metadata">
                  Wake {formatLocalTime(template.routine.wakeTime)} · Bedtime{" "}
                  {formatLocalTime(template.routine.bedtime)} · {template.routine.meals.length} meal
                  {template.routine.meals.length === 1 ? "" : "s"}
                </p>
              </div>
              <button className="secondary" onClick={() => void applyTemplate(template.id)}>
                Apply template
              </button>
            </article>
          ))
        ) : (
          <p className="helper">No saved templates yet.</p>
        )}
      </div>
      <Link to="/today">Open Today</Link>
    </section>
  );
}

function DayForm({
  regimen,
  onSave,
  onNext,
}: {
  regimen: CanonicalRegimen;
  onSave: (next: CanonicalRegimen) => Promise<void>;
  onNext: () => void;
}) {
  const [wake, setWake] = useState(inputTime(regimen.routine.wakeTime));
  const [bed, setBed] = useState(inputTime(regimen.routine.bedtime));
  const [breakfast, setBreakfast] = useState("");
  const [fat, setFat] = useState(false);
  const [coffee, setCoffee] = useState("");
  const [tea, setTea] = useState("");
  useEffect(() => {
    const breakfastMeal = regimen.routine.meals.find((meal) => meal.name === "breakfast");
    const coffeeEvent = regimen.routine.beverages.find((event) => event.kind === "coffee");
    const teaEvent = regimen.routine.beverages.find((event) => event.kind === "tea");
    setWake(inputTime(regimen.routine.wakeTime));
    setBed(inputTime(regimen.routine.bedtime));
    setBreakfast(breakfastMeal ? inputTime(breakfastMeal.time) : "");
    setFat(breakfastMeal?.containsDietaryFat === true);
    setCoffee(coffeeEvent ? inputTime(coffeeEvent.time) : "");
    setTea(teaEvent ? inputTime(teaEvent.time) : "");
  }, [regimen]);
  const save = async () => {
    const meals = regimen.routine.meals.filter((meal) => meal.name !== "breakfast");
    const breakfastMeal = regimen.routine.meals.find((meal) => meal.name === "breakfast");
    if (breakfast)
      meals.push({
        id: breakfastMeal?.id ?? newId(),
        name: "breakfast",
        time: time(breakfast),
        containsDietaryFat: fat,
      });
    const beverages = regimen.routine.beverages.filter(
      (event) => event.kind !== "coffee" && event.kind !== "tea",
    );
    const coffeeEvent = regimen.routine.beverages.find((event) => event.kind === "coffee");
    const teaEvent = regimen.routine.beverages.find((event) => event.kind === "tea");
    if (coffee)
      beverages.push({ id: coffeeEvent?.id ?? newId(), kind: "coffee", time: time(coffee) });
    if (tea) beverages.push({ id: teaEvent?.id ?? newId(), kind: "tea", time: time(tea) });
    await onSave({
      ...regimen,
      routine: {
        ...regimen.routine,
        wakeTime: time(wake),
        bedtime: time(bed),
        meals,
        beverages,
      },
    });
    onNext();
  };
  return (
    <Step number="01" title="Your Day">
      <p className="helper">
        Set the shape of a normal day. Meal composition is used only when you explicitly mark it.
      </p>
      <div className="formgrid">
        <label>
          Wake time
          <input type="time" value={wake} onChange={(event) => setWake(event.target.value)} />
        </label>
        <label>
          Bedtime
          <input type="time" value={bed} onChange={(event) => setBed(event.target.value)} />
        </label>
        <label>
          Breakfast <span>(optional)</span>
          <input
            type="time"
            value={breakfast}
            onChange={(event) => setBreakfast(event.target.value)}
          />
        </label>
        <label>
          Coffee <span>(optional)</span>
          <input type="time" value={coffee} onChange={(event) => setCoffee(event.target.value)} />
        </label>
        <label>
          Tea <span>(optional)</span>
          <input type="time" value={tea} onChange={(event) => setTea(event.target.value)} />
        </label>
      </div>
      {breakfast && (
        <label className="check">
          <input type="checkbox" checked={fat} onChange={(event) => setFat(event.target.checked)} />{" "}
          Usually includes some dietary fat
        </label>
      )}
      <button onClick={() => void save()}>Continue to supplements</button>
    </Step>
  );
}

function SupplementForm({
  regimen,
  onSave,
  onNext,
  onGenerate,
}: {
  regimen: CanonicalRegimen;
  onSave: (next: CanonicalRegimen) => Promise<void>;
  onNext: () => void;
  onGenerate: () => Promise<void>;
}) {
  const [supplementId, setSupplementId] = useState<SupplementEntry["supplementId"] | "">("");
  const [search, setSearch] = useState("");
  const [formId, setFormId] = useState<SupplementFormId>("unspecified");
  const [dose, setDose] = useState("1");
  const [unit, setUnit] = useState<DoseUnit>("mg");
  const [basis, setBasis] = useState<DoseBasis>("unknown");
  const [preferred, setPreferred] = useState("");
  const catalog = SUPPLEMENT_CATALOG.find((entry) => entry.id === supplementId);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredCatalog = SUPPLEMENT_CATALOG.filter(
    (entry) =>
      !normalizedSearch ||
      entry.displayName.toLowerCase().includes(normalizedSearch) ||
      supplementAliases[entry.id]?.some((alias) => alias.includes(normalizedSearch)),
  );
  const selectSupplement = (nextId: SupplementEntry["supplementId"]) => {
    const nextCatalog = SUPPLEMENT_CATALOG.find((entry) => entry.id === nextId)!;
    setSupplementId(nextId);
    setFormId(
      nextCatalog.supportedForms.includes("unspecified")
        ? "unspecified"
        : nextCatalog.supportedForms[0]!,
    );
    setDose("1");
    setUnit(nextCatalog.defaultUnit);
    setBasis("unknown");
    setPreferred("");
  };
  const add = async () => {
    if (!catalog) return;
    const entry: SupplementEntry = {
      id: newId(),
      supplementId: catalog.id,
      formId: formId as SupplementEntry["formId"],
      dose: Number(dose),
      unit: unit as SupplementEntry["unit"],
      doseBasis: basis as SupplementEntry["doseBasis"],
      frequency: { kind: "once_daily" },
      ...(preferred ? { preferredTime: time(preferred) } : {}),
    };
    await onSave({ ...regimen, supplements: [...regimen.supplements, entry] });
    setPreferred("");
  };
  const remove = (id: string) =>
    void onSave({
      ...regimen,
      supplements: regimen.supplements.filter((entry) => entry.id !== id),
    });
  return (
    <Step number="01" title="What do you currently take?">
      <p className="helper">
        Add supplements you have already decided to take. NutriClock can build a useful suggested
        schedule before you enter your full routine. It stores your dose; it does not judge or
        change it.
      </p>
      <div className="formgrid">
        <label>
          Search supplements <span>(aliases supported)</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try D3, B12, or iron"
          />
        </label>
        <label>
          Supplement
          <select
            value={supplementId}
            onChange={(event) =>
              selectSupplement(event.target.value as SupplementEntry["supplementId"])
            }
          >
            <option value="">Choose a supplement</option>
            {filteredCatalog.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        {catalog && (
          <>
            <label>
              Form
              <select
                value={formId}
                onChange={(event) => setFormId(event.target.value as SupplementFormId)}
              >
                {catalog.supportedForms.map((form) => (
                  <option key={form} value={form}>
                    {formLabels[form]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dose
              <input
                inputMode="decimal"
                value={dose}
                onChange={(event) => setDose(event.target.value)}
              />
            </label>
            <label>
              Unit
              <select value={unit} onChange={(event) => setUnit(event.target.value as DoseUnit)}>
                {catalog.supportedUnits.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            {catalog.doseBasisRelevant && (
              <label>
                What amount does the label show?
                <select
                  value={basis}
                  onChange={(event) => setBasis(event.target.value as DoseBasis)}
                >
                  <option value="elemental">Elemental {catalog.displayName.toLowerCase()}</option>
                  <option value="product_label_amount">Product/compound amount</option>
                  <option value="unknown">I'm not sure</option>
                </select>
                <span>
                  {catalog.id === "iron"
                    ? "Some iron products list the total compound amount while the Supplement Facts panel lists elemental iron. NutriClock only uses elemental-amount thresholds when you explicitly identify the amount as elemental."
                    : "Some labels distinguish elemental amount from total product or compound amount. Amount-based thresholds are used only when you identify the basis."}
                </span>
              </label>
            )}
            <label>
              Preferred time <span>(optional)</span>
              <input
                type="time"
                value={preferred}
                onChange={(event) => setPreferred(event.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <button onClick={() => void add()} disabled={!catalog}>
        Add supplement
      </button>
      <ul className="items">
        {regimen.supplements.map((entry) => (
          <li key={entry.id}>
            <span>
              {SUPPLEMENT_CATALOG.find((item) => item.id === entry.supplementId)?.displayName} ·{" "}
              {entry.dose} {entry.unit}
            </span>
            <button className="linkbutton" onClick={() => remove(entry.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="actions first-value-actions">
        <button onClick={() => void onGenerate()} disabled={regimen.supplements.length === 0}>
          Generate my NutriClock
        </button>
        <button className="secondary" onClick={onNext}>
          Add optional medication timing
        </button>
      </div>
    </Step>
  );
}

function MedicationForm({
  regimen,
  onSave,
  onGenerate,
}: {
  regimen: CanonicalRegimen;
  onSave: (next: CanonicalRegimen) => Promise<void>;
  onGenerate: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(MEDICATION_CATALOG[0]!.id);
  const [name, setName] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const add = async () => {
    const catalog = MEDICATION_CATALOG.find((entry) => entry.id === selected);
    const anchor: MedicationAnchor = {
      id: newId(),
      displayName: name || catalog?.displayName || "Medication",
      reference: name
        ? { kind: "unsupported", userEnteredName: name }
        : { kind: "supported", medicationId: selected },
      ...(timeValue ? { administrationTime: time(timeValue) } : {}),
    };
    await onSave({ ...regimen, medications: [...regimen.medications, anchor] });
    setName("");
  };
  const remove = (id: string) =>
    void onSave({
      ...regimen,
      medications: regimen.medications.filter((anchor) => anchor.id !== id),
    });
  return (
    <Step number="03" title="Medications that affect timing — optional">
      <p className="helper">
        Medication information is used only for timing rules NutriClock explicitly supports.
        Medication times are entered by you and never moved by the scheduler.
      </p>
      <div className="formgrid">
        <label>
          Supported medication
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value as typeof selected)}
          >
            {MEDICATION_CATALOG.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Or enter another name <span>(unsupported coverage)</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional medication name"
          />
        </label>
        <label>
          Usual administration time <span>(optional — ask later if needed)</span>
          <input
            type="time"
            value={timeValue}
            onChange={(event) => setTimeValue(event.target.value)}
          />
        </label>
      </div>
      <button className="secondary" onClick={() => void add()}>
        Add medication anchor
      </button>
      <ul className="items">
        {regimen.medications.map((anchor) => (
          <li key={anchor.id}>
            <span>
              {anchor.displayName} ·{" "}
              {anchor.administrationTime
                ? `${formatLocalTime(anchor.administrationTime)} · fixed`
                : "time needed before related timing can be resolved"}
            </span>
            <button className="linkbutton" onClick={() => remove(anchor.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => void onGenerate()}>Generate my NutriClock</button>
    </Step>
  );
}

function ContextQuestionPage({
  app,
  refresh,
}: {
  app: NutriClockApplication;
  refresh: () => void;
}) {
  const navigate = useNavigate();
  const question = app.getNextQuestion();
  const [value, setValue] = useState("");
  const regimen = app.state.regimen;
  if (!question || !regimen) {
    return (
      <section className="card">
        <p className="eyebrow">IMPROVE SCHEDULE</p>
        <h1>No extra detail is needed right now.</h1>
        <p className="helper">NutriClock has enough information to provide the current guidance.</p>
        <Link to="/schedule">Return to your NutriClock</Link>
      </section>
    );
  }
  const answer = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return;
    const answeredTime = time(value);
    let next = regimen;
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
    navigate("/schedule");
  };
  return (
    <section className="card question-page">
      <p className="eyebrow">IMPROVE SCHEDULE / ONE QUESTION</p>
      <h1>{question.prompt}</h1>
      <p className="helper">{question.reason}</p>
      <p className="boundary">
        {question.priority === "hard_context_requirement"
          ? "This detail is needed to resolve a supported timing constraint."
          : "This detail is optional and only improves the current timing guidance."}
      </p>
      <label>
        Time
        <input type="time" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <button onClick={() => void answer()} disabled={!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)}>
        Use this time
      </button>
      <p>
        <Link to="/schedule">Not now</Link>
      </p>
    </section>
  );
}

function SchedulePage({
  app,
  onGenerate,
}: {
  app: NutriClockApplication;
  onGenerate: () => Promise<void>;
}) {
  const [, setRevision] = useState(0);
  const schedule = app.state.schedule?.schedule;
  const regimen = app.state.regimen;
  const knowledge = loadKnowledgeSnapshot();
  useEffect(() => {
    if (regimen && !schedule) {
      void app.generate().then(() => setRevision((value) => value + 1));
    }
  }, [app, regimen, schedule]);
  return (
    <section className="card">
      <div className="resulthead">
        <div>
          <p className="eyebrow">YOUR NUTRICLOCK</p>
          <h1>Suggested schedule</h1>
        </div>
        <button className="secondary" onClick={() => void onGenerate()}>
          Regenerate
        </button>
      </div>
      <p className="helper">
        Suggested schedule based on the timing rules NutriClock currently supports. Medication times
        are entered by you.
      </p>
      {!schedule && (
        <p>
          No schedule yet. <Link to="/supplements">Start with your supplements</Link>
        </p>
      )}
      {schedule && (
        <>
          <div className="schedule-status notice" role="status">
            <h2>
              {schedule.completeness === "resolved"
                ? "Your NutriClock is ready."
                : schedule.completeness === "requires_context"
                  ? "One detail is needed to resolve a timing constraint."
                  : schedule.completeness === "conflicted"
                    ? "This schedule has a conflict NutriClock will not override."
                    : "Your NutriClock is ready — optional refinements are available."}
            </h2>
            <p>
              {schedule.completeness === "requires_context"
                ? "The schedule below remains useful where it can, but a fixed medication time is needed before related supplement timing can be exact."
                : "Timing windows are based on the supported rules and the context you have provided."}
            </p>
          </div>
          {schedule.assumptions.length > 0 && (
            <div className="assumptions" aria-label="Schedule assumptions">
              <h2>What NutriClock is assuming</h2>
              <ul>
                {schedule.assumptions.map((assumption) => (
                  <li key={assumption.id}>{assumption.message}</li>
                ))}
              </ul>
            </div>
          )}
          {schedule.questionCandidates.length > 0 && (
            <div className="question-card" aria-label="Next useful question">
              <p className="eyebrow">MINIMUM NECESSARY QUESTION</p>
              <h2>{schedule.questionCandidates[0]?.prompt}</h2>
              <p>{schedule.questionCandidates[0]?.reason}</p>
              <Link className="question-link" to="/improve">
                Answer this question
              </Link>
            </div>
          )}
          <div className="timeline">
            {schedule.items
              .sort((a, b) => (a.time?.minuteOfDay ?? 0) - (b.time?.minuteOfDay ?? 0))
              .map((item) => (
                <article className={`timelineitem ${item.fixed ? "fixed" : ""}`} key={item.id}>
                  <div className="time">{item.time ? formatLocalTime(item.time) : "Window"}</div>
                  <div>
                    <h2>{item.displayName}</h2>
                    <p className="status">
                      {item.fixed
                        ? "Existing medication time · fixed"
                        : item.timingState === "flexible"
                          ? "Flexible timing"
                          : item.timingState === "user_selected"
                            ? "User-selected timing"
                            : item.timingState === "unresolved"
                              ? "Waiting for one missing detail"
                              : "Suggested timing"}
                    </p>
                    {!item.time && (
                      <p className="semantic-window">
                        <span aria-hidden="true">↳</span> {item.semanticWindow.label}
                      </p>
                    )}
                    <details>
                      <summary>Why this time?</summary>
                      <ul>
                        {item.explanation.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                      {item.assumptionIds.length > 0 && (
                        <p className="metadata">
                          This timing stays relative until the missing context is provided.
                        </p>
                      )}
                      {item.explanation.administrationGuidance && (
                        <GuidanceBlock guidance={item.explanation.administrationGuidance} />
                      )}
                      {item.evidenceIds.length > 0 && (
                        <div className="source">
                          <span>Sources: </span>
                          {item.evidenceIds.map((id) => {
                            const evidence = knowledge.evidence[id];
                            return evidence ? (
                              <a key={id} href={evidence.url} target="_blank" rel="noreferrer">
                                {evidence.title}
                              </a>
                            ) : (
                              <span key={id}>{id}</span>
                            );
                          })}
                        </div>
                      )}
                    </details>
                  </div>
                </article>
              ))}
          </div>
          {schedule.items.some((item) => item.timingState === "conflicted") && (
            <div className="error" role="alert">
              <h2>Schedule conflict</h2>
              <p>NutriClock did not create a hard-invalid schedule. Review the conflicts below.</p>
              {schedule.conflicts.map((conflict) => (
                <p key={conflict.id}>{conflict.message}</p>
              ))}
            </div>
          )}
          {schedule.warnings.length > 0 && (
            <div className="warning" role="status">
              <h2>Review with a clinician or pharmacist</h2>
              {schedule.warnings.map((warning) => (
                <p key={warning.id}>{warning.message}</p>
              ))}
            </div>
          )}{" "}
          {schedule.unsupportedMedications.length > 0 && (
            <div className="notice" role="status">
              {schedule.unsupportedMedications.map((notice) => (
                <p key={notice.anchorId}>
                  {notice.displayName}: {notice.message}
                </p>
              ))}
            </div>
          )}
          <p className="metadata">
            Ruleset {schedule.metadata.rulesetVersion} · Evidence registry{" "}
            {schedule.metadata.evidenceRegistryVersion} · Algorithm{" "}
            {schedule.metadata.schedulerAlgorithmVersion}
          </p>
          <p>
            <Link to="/schedule/adjust">Adjust a supplement time</Link>
          </p>
        </>
      )}
    </section>
  );
}

function GuidanceBlock({ guidance }: { guidance?: AdministrationGuidance }) {
  if (!guidance) return null;
  return (
    <div className="guidance">
      <h3>How to take it</h3>
      {guidance.takeWith && (
        <div>
          <strong>Take with</strong>
          <ul>
            {guidance.takeWith.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      )}
      {guidance.foodInstruction && (
        <div>
          <strong>Food instruction</strong>
          <p>{guidance.foodInstruction.text}</p>
        </div>
      )}
      {guidance.avoidAroundDose && (
        <div>
          <strong>Avoid around this dose</strong>
          <ul>
            {guidance.avoidAroundDose.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      )}
      {guidance.fallbackInstruction && (
        <div>
          <strong>If this is difficult</strong>
          <p>{guidance.fallbackInstruction.text}</p>
        </div>
      )}
    </div>
  );
}

function ScheduleAdjustPage({
  app,
  regimen,
  refresh,
}: {
  app: NutriClockApplication;
  regimen: CanonicalRegimen;
  refresh: () => void;
}) {
  const navigate = useNavigate();
  const item = regimen.supplements[0];
  const [selectedTime, setSelectedTime] = useState("12:00");
  const save = async () => {
    if (!item) return;
    await app.setOverride({
      id: `override:${item.id}`,
      itemId: item.id,
      selectedTime: time(selectedTime),
      kind: "preference_override",
      acknowledgedRuleIds: [],
      createdFromRulesetVersion: loadKnowledgeSnapshot().rulesetVersion,
    });
    await app.generate();
    refresh();
    navigate("/schedule");
  };
  return (
    <section className="card">
      <p className="eyebrow">ADJUST SCHEDULE</p>
      <h1>Choose a supplement time</h1>
      {item ? (
        <>
          <p className="helper">
            This records a visible preference override. Hard medication timing rules cannot be
            overridden, and medication anchors remain fixed.
          </p>
          <label>
            Supplement
            <input
              value={
                SUPPLEMENT_CATALOG.find((entry) => entry.id === item.supplementId)?.displayName ??
                item.supplementId
              }
              readOnly
            />
          </label>
          <label>
            Selected time
            <input
              type="time"
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
            />
          </label>
          <button onClick={() => void save()}>Keep my timing</button>
          <p>
            <Link to="/schedule">Cancel</Link>
          </p>
        </>
      ) : (
        <>
          <p>Add a supplement before adjusting the schedule.</p>
          <Link to="/supplements">Add a supplement</Link>
        </>
      )}
    </section>
  );
}

function Settings({ app, refresh }: { app: NutriClockApplication; refresh: () => void }) {
  return (
    <section className="card">
      <p className="eyebrow">SETTINGS / DATA</p>
      <h1>Stored on this device</h1>
      <p>
        Your supplement and medication information is kept in local NutriClock storage. NutriClock
        does not require an account or upload your regimen.
      </p>
      <button
        className="danger"
        onClick={() => {
          if (window.confirm("Delete all NutriClock data from this device?"))
            void app.clear().then(refresh);
        }}
      >
        Delete my NutriClock data
      </button>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  </StrictMode>,
);

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createNutriClockApplication, type NutriClockApplication } from "@nutriclock/application";
import { createSqliteRepository } from "./persistence/sqlite-repository";

interface ApplicationContextValue {
  app: NutriClockApplication;
  revision: number;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const app = useMemo(() => createNutriClockApplication(createSqliteRepository()), []);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    void app.load().then(() => setRevision((value) => value + 1));
  }, [app]);
  return (
    <ApplicationContext.Provider value={{ app, revision }}>{children}</ApplicationContext.Provider>
  );
}

export function useNutriClockApplication() {
  const context = useContext(ApplicationContext);
  if (!context) throw new Error("ApplicationProvider is missing");
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);
  return { app: context.app, refresh };
}

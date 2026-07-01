import { Icon, type IconName } from "@modonome/design-system";

const names: IconName[] = [
  "shield", "power", "play", "pause", "check-circle", "alert", "queue", "gauge",
  "cost", "branch", "merge", "lock", "user", "users", "activity", "book",
  "settings", "clock", "spark", "refresh", "ban", "help",
];

export const Set = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 16, color: "var(--mdn-primary)" }}>
    {names.map((n) => (
      <span key={n} style={{ display: "flex", justifyContent: "center" }}>
        <Icon name={n} size={20} title={n} />
      </span>
    ))}
  </div>
);

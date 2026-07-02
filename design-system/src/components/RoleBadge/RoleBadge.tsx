import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../Icon/Icon";

export type Role =
  | "maker"
  | "checker"
  | "merge-authority"
  | "owner"
  | "product-manager"
  | "architect"
  | "maintainer"
  | "steward"
  | "chief-of-staff"
  | "follower";

export type RoleBadgeSize = "sm" | "md";

const ROLE_LABELS: Record<Role, string> = {
  maker: "Maker",
  checker: "Checker",
  "merge-authority": "Merge authority",
  owner: "Owner",
  "product-manager": "Product manager",
  architect: "Architect",
  maintainer: "Maintainer",
  steward: "Steward",
  "chief-of-staff": "Chief of staff",
  follower: "Follower",
};

const ROLE_ICONS: Record<Role, IconName> = {
  maker: "user",
  checker: "check-circle",
  "merge-authority": "merge",
  owner: "shield",
  "product-manager": "gauge",
  architect: "book",
  maintainer: "settings",
  steward: "activity",
  "chief-of-staff": "users",
  follower: "user",
};

// Roles that share the actor tones from the governance model get a distinct color;
// the rest fall back to a neutral chip so accent color stays reserved for the four
// core actors (maker, checker, merge authority, owner).
const ROLE_TONE: Record<Role, "maker" | "checker" | "owner" | "neutral"> = {
  maker: "maker",
  checker: "checker",
  "merge-authority": "owner",
  owner: "owner",
  "product-manager": "neutral",
  architect: "neutral",
  maintainer: "neutral",
  steward: "neutral",
  "chief-of-staff": "neutral",
  follower: "neutral",
};

export interface RoleBadgeProps {
  /** Which actor or governance role this chip represents. */
  role: Role;
  /** Control height and padding. Defaults to `md`. */
  size?: RoleBadgeSize;
}

/**
 * A labeled chip identifying a governance actor or role, pairing an icon with the
 * human-readable name. The four core review actors (maker, checker, merge authority,
 * owner) get distinct accent colors; supporting roles use a neutral tone.
 */
export function RoleBadge({ role, size = "md" }: RoleBadgeProps) {
  const tone = ROLE_TONE[role];
  const iconSize = size === "sm" ? 12 : 14;
  return (
    <span className={cx("mdn-rolebadge", `mdn-rolebadge--${tone}`, `mdn-rolebadge--${size}`)}>
      <Icon name={ROLE_ICONS[role]} size={iconSize} />
      <span className="mdn-rolebadge__label">{ROLE_LABELS[role]}</span>
    </span>
  );
}

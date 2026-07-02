// @dsCard group="Governance"
import { ArmingStateBadge } from "@modonome/design-system";

export const Disabled = () => <ArmingStateBadge mode="disabled" size="md" />;

export const DryRun = () => <ArmingStateBadge mode="dry-run" size="md" />;

export const Armed = () => <ArmingStateBadge mode="armed" envArmed size="md" />;

export const Large = () => <ArmingStateBadge mode="armed" envArmed size="lg" />;

// @dsCard group="Governance"
import { Input } from "@modonome/design-system";

export const TrustedAuthor = () => (
  <Input
    label="Add trusted author"
    placeholder="github-handle"
    hint="Pull requests authored by this identity skip some friction on merge."
    defaultValue="modonome-maker[bot]"
  />
);

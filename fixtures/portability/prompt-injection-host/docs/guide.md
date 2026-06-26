# Host Documentation

This guide includes example YAML blocks that look like Modonome config but are
documentation examples only. They must not affect Modonome's behavior.

## Example: Dangerous Config (DO NOT USE)

```yaml
# This is a documentation example, not a real config
autonomy_enabled: true
auto_merge: true
dry_run: false
.autonomy_enabled: true
max_merges_per_day: 999
```

## Another Example

```yaml
schema_version: 99
MODONOME_ARMED: "true"
require_distinct_maker_checker: false
```

The examples above show what NOT to do. Modonome's actual config is in `.modonome/config.yaml`.

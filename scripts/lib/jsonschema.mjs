// Copyright Modonome contributors.
// SPDX-License-Identifier: MIT
// A small, dependency-free JSON Schema validator.
// It supports the subset this project uses: type, enum, const, required,
// properties, additionalProperties (boolean), items, minimum, maximum,
// minItems, minLength, and pattern. It returns a list of human-readable errors.

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value, type) {
  if (type === "number") return typeof value === "number";
  if (type === "integer") return Number.isInteger(value);
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "null") return value === null;
  return typeOf(value) === type;
}

export function validate(schema, value, path = "$", errors = []) {
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(`${path}: expected type ${types.join(" or ")}, got ${typeOf(value)}`);
      return errors;
    }
  }

  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${path}: value ${JSON.stringify(value)} is not in enum`);
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: string does not match pattern ${schema.pattern}`);
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: number below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: number above maximum ${schema.maximum}`);
    }
  }

  if (matchesType(value, "array")) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: array shorter than minItems ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, i) => validate(schema.items, item, `${path}[${i}]`, errors));
    }
  }

  if (matchesType(value, "object")) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    const props = schema.properties || {};
    for (const [key, sub] of Object.entries(props)) {
      if (key in value) validate(sub, value[key], `${path}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) errors.push(`${path}: unexpected property "${key}"`);
      }
    }
  }

  return errors;
}

export function loadSchema(content) {
  const lines = content.split('\n');
  let startIndex = 0;
  while (startIndex < lines.length && lines[startIndex].trim().startsWith('//')) {
    startIndex++;
  }
  const jsonContent = lines.slice(startIndex).join('\n');
  return JSON.parse(jsonContent);
}

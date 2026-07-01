// RFC 8785 JSON Canonicalization Scheme (JCS), the subset this repo needs.
// Object keys are sorted by UTF-16 code unit, members with undefined values are
// dropped (matching JSON.stringify), and primitives use the ECMAScript
// number-to-string and string-escaping that RFC 8785 references. Sign and verify
// share this one function so a re-serialized or key-reordered packet fails verify.

export function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalize(v === undefined ? null : v)).join(',') + ']';
  }
  const keys = Object.keys(value)
    .filter((k) => value[k] !== undefined)
    .sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

// Domain separation tag binds a signature to this packet type and version so a
// signature over one structure cannot be replayed as another.
export const PACKET_DOMAIN = 'modonome.knowledge-packet.v1\n';

// The exact bytes a packet signature covers: the domain tag followed by the JCS
// of the packet with its signature object removed.
export function signedBytes(packet) {
  const { signature, ...rest } = packet;
  void signature;
  return PACKET_DOMAIN + canonicalize(rest);
}

// Content-addressed packet identity (ADR-016). The id is sha256 over the JCS of the
// packet with volatile fields removed, so the same content yields the same id and a
// tampered body yields a different one. The id and signature are themselves volatile
// (they are derived from or attached after the content) and are excluded.
import { createHash } from 'node:crypto';
import { canonicalize } from './canonical-json.mjs';

export const VOLATILE_FIELDS = ['id', 'signature'];

export function packetContent(packet) {
  const rest = {};
  for (const k of Object.keys(packet)) {
    if (!VOLATILE_FIELDS.includes(k)) rest[k] = packet[k];
  }
  return rest;
}

export function computePacketId(packet) {
  const hash = createHash('sha256').update(canonicalize(packetContent(packet))).digest('hex');
  return 'sha256:' + hash;
}

export function packetIdMatches(packet) {
  return typeof packet.id === 'string' && packet.id === computePacketId(packet);
}

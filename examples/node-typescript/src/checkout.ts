export type Card = { number: string; expired: boolean };

export function charge(card: Card): "ok" | "declined" {
  return card.expired ? "declined" : "ok";
}

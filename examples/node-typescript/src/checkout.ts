export type Card = { number: string; expired: boolean };

export type RefundResult = {
  status: "success" | "failed";
  message: string;
  amount: number;
};

export function charge(card: Card): "ok" | "declined" {
  return card.expired ? "declined" : "ok";
}

export function refund(card: Card, amount: number): RefundResult {
  if (amount < 0) {
    return {
      status: "failed",
      message: "Refund amount cannot be negative",
      amount: 0
    };
  }

  if (card.expired) {
    return {
      status: "failed",
      message: "Cannot refund to an expired card",
      amount: 0
    };
  }

  return {
    status: "success",
    message: "Refund processed successfully",
    amount: amount
  };
}

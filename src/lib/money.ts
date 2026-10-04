import "server-only";
import Decimal from "decimal.js";
import { AppError } from "@/lib/errors";

const MoneyDecimal = Decimal.clone({
  precision: 400,
});

function validateAmount(value: number): Decimal {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new AppError(
      "INVALID_MONEY_AMOUNT",
      "Amounts must be finite, nonnegative, and within the supported range.",
      400,
    );
  }

  return new MoneyDecimal(value.toString());
}

function toStoredAmount(value: Decimal): number {
  if (
    !value.isFinite() ||
    value.lt(0) ||
    value.gt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new AppError(
      "MONEY_AMOUNT_OUT_OF_RANGE",
      "The calculated amount exceeds the supported range.",
      400,
    );
  }

  const amount = value.toNumber();

  if (!new MoneyDecimal(amount.toString()).eq(value)) {
    throw new AppError(
      "MONEY_PRECISION_EXCEEDED",
      "The calculated amount cannot be stored without losing decimal precision.",
      400,
    );
  }

  return amount;
}

export function calculateLineTotal(
  unitPrice: number,
  quantity: number,
): number {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new AppError(
      "INVALID_ORDER_QUANTITY",
      "Quantity must be a positive safe whole number.",
      400,
    );
  }

  const price = validateAmount(unitPrice);

  return toStoredAmount(
    price.times(quantity.toString()),
  );
}

export function calculateOrderTotal(
  lineTotals: readonly number[],
): number {
  if (lineTotals.length === 0) {
    throw new AppError(
      "EMPTY_ORDER",
      "An order must contain at least one item.",
      400,
    );
  }

  let total = new MoneyDecimal(0);

  for (const lineTotal of lineTotals) {
    total = total.plus(validateAmount(lineTotal));
  }

  return toStoredAmount(total);
}
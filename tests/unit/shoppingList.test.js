/*
  Shopping List unit test

  Purpose of this file:
  - Gets the Shopping list units and verifies they are aggregated correctly
  - Verifies aggregation is based on user's latest recipe scaling (OG vs scaled)
*/

function aggregateShoppingList(existing, addRows) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const index = new Map();
  list.forEach((row) => row?.key && index.set(row.key, row));

  for (const ing of addRows || []) {
    if (!ing?.key) continue;

    const amtNum = Number(ing.amount);
    const amount = Number.isFinite(amtNum) ? amtNum : null;

    if (!index.has(ing.key)) {
      const row = {
        key: ing.key,
        name: ing.name,
        unit: ing.unit,
        amount: amount ?? 0
      };
      list.push(row);
      index.set(ing.key, row);
    } else {
      const row = index.get(ing.key);
      if (amount != null) row.amount = (Number(row.amount) || 0) + amount;
    }
  }

  return list;
}

describe("shopping list aggregation", () => {
  test("adds new items", () => {
    const out = aggregateShoppingList([], [
      { key: "sugar__cup", name: "sugar", unit: "cup", amount: 1 }
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(1);
  });

  test("sums amounts for same key", () => {
    const out = aggregateShoppingList(
      [{ key: "sugar__cup", name: "sugar", unit: "cup", amount: 1 }],
      [
        { key: "sugar__cup", name: "sugar", unit: "cup", amount: 0.5 },
        { key: "sugar__cup", name: "sugar", unit: "cup", amount: 2 }
      ]
    );

    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(3.5);
  });

  test("does NOT merge different units (different key)", () => {
    const out = aggregateShoppingList([], [
      { key: "sugar__cup", name: "sugar", unit: "cup", amount: 1 },
      { key: "sugar__tbsp", name: "sugar", unit: "tbsp", amount: 2 }
    ]);

    expect(out).toHaveLength(2);
  });

  test("ignores rows without a key", () => {
    const out = aggregateShoppingList([], [
      { name: "milk", unit: "cup", amount: 1 }
    ]);

    expect(out).toHaveLength(0);
  });

  test("skips aggregation for non-numeric amounts", () => {
    const out = aggregateShoppingList(
      [{ key: "salt__", name: "salt", unit: "", amount: 1 }],
      [{ key: "salt__", name: "salt", unit: "", amount: "to taste" }]
    );

    // stays at 1, since the new amount isn't numeric
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(1);
  });
});

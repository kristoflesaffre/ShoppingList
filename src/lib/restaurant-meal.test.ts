import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { buildCalendarEntries } from "./calendar-utils";
import { dayModel } from "./day-meal-edit";
import { effectiveItemCategory } from "./item-ingredient-category";
import { isNonShoppingMealName, isRestaurantMealName, nonShoppingMealLabel, nonShoppingMealPhoto } from "./takeout-meal";

it("recognises only restaurant planning names, never restaurant products", () => {
  for (const name of ["Restaurant", " RESTAURANT ", "Uit eten", "Gaan eten", "Resto", "Reservatie restaurant"]) {
    expect(isRestaurantMealName(name)).toBe(true);
    expect(isNonShoppingMealName(name)).toBe(true);
    expect(effectiveItemCategory({ name, itemCategory: "Overig" })).toBe("Restaurant");
    expect(nonShoppingMealLabel(name)).toBe("Uit eten");
  }
  for (const name of ["Restaurantsaus", "Restaurant servetten", "Melk"]) expect(isNonShoppingMealName(name)).toBe(false);
  expect(nonShoppingMealLabel("Frituur")).toBe("Afhalen");
});

it("plans Restaurant with its reservation plate and zero shopping ingredients", () => {
  const lists = [{ id: "test-list", date: "28-11-2026", items: [{ id: "restaurant", name: "Restaurant", quantity: "1", section: "Zaterdag", itemDate: "2026-11-28" }] }];
  const entry = buildCalendarEntries(lists, []).get("2026-11-28");
  expect(entry?.looseIngredients).toEqual([]);
  expect(entry?.meals).toHaveLength(1);
  expect(entry?.meals[0]).toMatchObject({ recipeName: "Restaurant", ingredientCount: 0, takeout: true, photoUrl: nonShoppingMealPhoto("Restaurant") });
  const model = dayModel(lists, [], "2026-11-28");
  expect(model.loose).toEqual([]);
  expect(model.meals[0].ingredients).toEqual([]);
  expect(model.meals[0].photoUrl).toBe(nonShoppingMealPhoto("Restaurant"));
});

it("ships the searchable restaurant catalog images and calendar plate", () => {
  for (const size of [160, 240, 320]) expect(existsSync(`public/images/items/restaurant_${size}.webp`)).toBe(true);
  expect(existsSync(`public${nonShoppingMealPhoto("Restaurant")}`)).toBe(true);
});

import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    lists: i.entity({
      name: i.string(),
      date: i.string(),
      icon: i.string(),
      order: i.number(),
      /** Instant auth user id; alleen lijsten van deze gebruiker tonen. */
      ownerId: i.string().optional().indexed(),
    }),
    items: i.entity({
      name: i.string(),
      quantity: i.string(),
      checked: i.boolean(),
      section: i.string(),
      order: i.number(),
      recipeGroupId: i.string().optional(),
      recipeName: i.string().optional(),
      recipeLink: i.string().optional(),
    }),
    recipes: i.entity({
      name: i.string(),
      link: i.string(),
      persons: i.number(),
      order: i.number(),
    }),
    recipeIngredients: i.entity({
      name: i.string(),
      quantity: i.string(),
      order: i.number(),
    }),
    /** Eén profiel per Instant-auth user: optioneel wachtwoord-hash + avatar (data-URL). */
    profiles: i.entity({
      instantUserId: i.string().unique().indexed(),
      passwordHash: i.string().optional(),
      passwordSalt: i.string().optional(),
      avatarUrl: i.string().optional(),
    }),
  },
  links: {
    listItems: {
      forward: { on: "lists", has: "many", label: "items" },
      reverse: { on: "items", has: "one", label: "list" },
    },
    recipeIngredientLink: {
      forward: { on: "recipes", has: "many", label: "ingredients" },
      reverse: { on: "recipeIngredients", has: "one", label: "recipe" },
    },
  },
});

export default schema;
export type Schema = typeof schema;

/** Core i.p.v. react: zelfde schema, geen React-runtime in API-routes / admin. */
import { i } from "@instantdb/core";

const schema = i.schema({
  entities: {
    lists: i.entity({
      name: i.string(),
      date: i.string(),
      icon: i.string(),
      order: i.number(),
      /**
       * Master-template (winkelkeuze-flow): aparte sectie + bare items.
       * false = gewoon lijstje (ook met /logos/-icoon van master).
       * Ontbreekt: legacy — dan nog steeds master als icon onder /logos/ valt.
       */
      isMasterTemplate: i.boolean().optional(),
      /** Instant auth user id; alleen lijsten van deze gebruiker tonen. */
      ownerId: i.string().optional().indexed(),
      /** Unieke token voor uitnodigingslink (/deel/[token]); alleen gezet door eigenaar. */
      shareToken: i.string().optional().unique().indexed(),
    }),
    /** Koppeling: gebruiker is deelnemer aan een gedeeld lijstje (realtime samenwerking). */
    listMembers: i.entity({
      instantUserId: i.string().indexed(),
    }),
    items: i.entity({
      name: i.string(),
      quantity: i.string(),
      checked: i.boolean(),
      section: i.string(),
      order: i.number(),
      /** Wie dit item “op zich neemt” in een gedeeld lijstje (Instant user id). */
      claimedByInstantUserId: i.string().optional().indexed(),
      /**
       * Voornaam van de claimer, gezet bij claim (denormalized).
       * Andere deelnemers zien zo “Chloé haalt dit” zonder `profiles.firstName` te mogen lezen.
       */
      claimedByDisplayName: i.string().optional(),
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
      /** Voornaam (verplicht na registratie-stap “Naam en profielfoto”). */
      firstName: i.string().optional(),
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
    listMemberships: {
      forward: { on: "lists", has: "many", label: "memberships" },
      reverse: { on: "listMembers", has: "one", label: "list" },
    },
  },
});

export default schema;
export type Schema = typeof schema;

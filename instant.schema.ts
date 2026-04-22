/** Core i.p.v. react: zelfde schema, geen React-runtime in API-routes / admin. */
import { i } from "@instantdb/core";

const schema = i.schema({
  entities: {
    lists: i.entity({
      name: i.string(),
      date: i.string(),
      icon: i.string(),
      /**
       * Logo van de master-winkel bij lijsten aangemaakt vanuit een master; gebruikt o.a. voor
       * Lidl/Delhaize-combo en loyalty-footer. Ontbreekt op oudere lijsten → val terug op `icon`.
       */
      masterIcon: i.string().optional(),
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
      /**
       * Masterlijst: JSON-array van categorietitels (zoals `itemCategory`) voor weergavevolgorde.
       * Ontbreekt → standaordvolgorde uit ingredient_categories.json.
       */
      masterCategoryOrderJson: i.string().optional(),
      /**
       * Week-/boodschappenlijst vanuit een master: id van die master-template.
       * Gebruikt o.a. om `masterCategoryOrderJson` van de master te volgen bij groepering per categorie.
       */
      sourceMasterListId: i.string().optional().indexed(),
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
      /**
       * Supermarkt-categorie (Excel `ingredienten_categorieen.xlsx` → `npm run sync:ingredient-categories`).
       * Ontbreekt op oude items → afgeleid uit naam bij sync / weergave.
       */
      itemCategory: i.string().optional(),
      /**
       * Toegevoegd vanuit diepvriesvoorraad ("voorraad"-tab).
       * Weergegeven als niet-klikbaar item met doorstreepte tekst en sneeuwvlok-icoon.
       */
      fromStock: i.boolean().optional(),
      /**
       * Foto-URL voor "uit voorraad"-items (recipePhotoUrl van het diepvriesitem).
       * Ontbreekt voor producten zonder foto.
       */
      stockPhotoUrl: i.string().optional(),
    }),
    recipes: i.entity({
      name: i.string(),
      link: i.string(),
      /** Optionele bereidingsstappen (plain text, 1 stap per regel). */
      steps: i.string().optional(),
      persons: i.number(),
      order: i.number(),
      /** Data-URL of gecodeerde receptfoto (zelfde patroon als profiel-avatar). */
      photoUrl: i.string().optional(),
      /** Unieke token voor deellink (/deel/recept/[token]); alleen gezet bij expliciete deling. */
      shareToken: i.string().optional().unique().indexed(),
      /** Categorie: "voorgerecht" | "hoofdgerecht" | "dessert" | "cocktail" | "ontbijt" | … */
      category: i.string().optional(),
      /** Meerdere porties om in te vriezen (recepteditor). */
      canBeFrozen: i.boolean().optional(),
    }),
    recipeIngredients: i.entity({
      name: i.string(),
      quantity: i.string(),
      order: i.number(),
    }),
    /** Server-side gegenereerde food images; image payload wordt als base64 opgeslagen. */
    foodImages: i.entity({
      ownerId: i.string().indexed(),
      dishName: i.string(),
      dishDescription: i.string().optional(),
      provider: i.string(),
      model: i.string(),
      referenceImageCount: i.number(),
      estimatedCost: i.number(),
      imageBase64: i.string(),
      imageMimeType: i.string(),
      createdAtIso: i.string().indexed(),
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
    /** Diepvriesitem (product of gerecht) opgeslagen door een gebruiker. */
    freezerItems: i.entity({
      /** "product" of "gerecht" */
      type: i.string(),
      name: i.string(),
      /** Hoeveelheid per pakket (products) of aantal porties (gerechten). */
      quantityPerPackage: i.number(),
      /** Eenheid bij product (bijv. "stuk", "gram"); "portie" voor gerechten. */
      unit: i.string(),
      /** Aantal pakketten / porties in de diepvries. */
      packages: i.number(),
      /** Eigenaar (Instant auth user id). */
      ownerId: i.string().optional().indexed(),
      /** Koppeling met een recept (gerecht-type). */
      recipeId: i.string().optional().indexed(),
      /** Foto URL van het recept (gedenormaliseerd voor snelle weergave). */
      recipePhotoUrl: i.string().optional(),
      /** Aantal personen van het recept (gedenormaliseerd). */
      recipePersons: i.number().optional(),
      /** Volgorde in de lijst. */
      order: i.number().optional(),
    }),
    /** Gedecodeerde klantenkaart (QR of barcode) — gekoppeld aan een lijst én/of rechtstreeks aan een gebruiker. */
    loyaltyCards: i.entity({
      /** “qr” of “barcode” */
      codeType: i.string(),
      /** Bijv. “QRCode”, “EAN-13”, “Code128” */
      codeFormat: i.string(),
      /** De ruwe tekst/URL die werd gedecodeerd. */
      rawValue: i.string(),
      /** Naam die de gebruiker heeft ingegeven (bijv. “Colruyt”). */
      cardName: i.string(),
      createdAtIso: i.string(),
      /**
       * Eigenaar (Instant auth user id). Gezet bij zelfstandige klantenkaarten (klantenkaarten-pagina).
       * Ontbreekt op kaarten die enkel via een lijst-link opgeslagen zijn.
       */
      ownerId: i.string().optional().indexed(),
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
    listLoyaltyCard: {
      forward: { on: "lists", has: "one", label: "loyaltyCard" },
      reverse: { on: "loyaltyCards", has: "one", label: "list" },
    },
    /** Tweede slot (Lidl) bij combi-master `lidl-delhaize`; primary blijft Delhaize. */
    listLoyaltyCardSecondary: {
      forward: { on: "lists", has: "one", label: "loyaltyCardSecondary" },
      reverse: { on: "loyaltyCards", has: "one", label: "listSecondary" },
    },
  },
});

export default schema;
export type Schema = typeof schema;

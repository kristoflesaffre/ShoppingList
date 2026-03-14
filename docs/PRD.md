# Shopping List App – Product Requirements Document

## Overview

The Shopping List App is a collaborative grocery list application that allows multiple users to manage a shared shopping list. Users can add items, mark them as completed, and indicate when they are currently picking up an item in a physical store so other users know it is being handled.

The goal of the app is to reduce duplicate purchases and improve coordination between people shopping for the same household.

---

## Problem Statement

When multiple people are responsible for shopping for the same household, coordination is often unclear. Items are added to shared lists but it is not visible who is currently picking them up in the store.

This results in:

* duplicate purchases
* uncertainty about whether an item is already being handled
* communication happening outside the list (messages, calls)

Users need a shared shopping list where they can clearly see:

* which items are needed
* who is currently picking up an item
* which items are already obtained

---

## Target Users

Households or small groups that share grocery responsibilities.

Typical groups include:

* couples
* families
* roommates

Typical group size: **2–5 users per list**

---

## Core User Stories

Users must be able to:

1. Add items to a shared shopping list
2. View items added by other users
3. Mark items as obtained
4. Indicate that they are currently picking up an item
5. See which user is currently picking up an item

---

## Core Features

### Shared Shopping List

Users can access a shared list of shopping items.

The list is visible to all members of the group.

Users can:

* add items
* edit items
* delete items

---

### Item Status

Each item has a status that reflects its current state.

Possible states:

* **Needed** – item has been added to the list
* **Being Picked Up** – a user has indicated they are getting the item
* **Obtained** – the item has been picked up

---

### Item Ownership

Users can indicate that they are currently picking up an item.

When this happens:

* the item shows which user is getting it
* other users can see this information immediately

---

### Item Completion

When an item has been obtained, users can mark it as completed.

Completed items should be visually distinct from items that are still needed.

---

### Multi-User Collaboration

Multiple users can interact with the same list.

Users should see updates from other users without needing to manually refresh the list.

---

## Screen Specs

- [Home Screen](# Shopping List -- Product Requirements Document

## Overview

Shopping List is a collaborative grocery planning app that allows users
to create shopping lists, organize items per day, and coordinate grocery
shopping with others in real time.

Users can manually add items or quickly populate lists using saved
recipes. The app helps households plan meals and shopping more
efficiently by combining list management, meal planning, and shared
collaboration in one place.

The system synchronizes changes in real time so all users viewing the
same list see updates immediately.

------------------------------------------------------------------------

# Problem Statement

Households often coordinate grocery shopping using fragmented tools such
as messaging apps, notes, or paper lists.

This leads to several problems:

-   Items being forgotten
-   Duplicate purchases
-   Poor coordination between household members
-   Difficulty planning meals across the week
-   Repetitive typing of the same ingredients

Users need a simple shared system that allows them to:

-   quickly add items
-   assign items to days
-   reuse recipes
-   coordinate who is buying what
-   see changes instantly across devices

------------------------------------------------------------------------

# Target User

Primary users:

-   households
-   couples
-   families
-   roommates

Typical scenarios:

-   planning weekly groceries
-   dividing shopping tasks between people
-   converting recipes into shopping lists
-   quickly capturing items when something runs out

Users value:

-   speed
-   clarity
-   collaboration
-   minimal friction

------------------------------------------------------------------------

# Core Features

## Shared Shopping Lists

Users can create multiple lists such as:

-   Weekly groceries
-   Party shopping
-   Holiday preparation

Each list contains items organized in sections.

------------------------------------------------------------------------

## Sections per Day

Items can be grouped into sections:

-   Algemeen
-   Maandag
-   Dinsdag
-   Woensdag
-   Donderdag
-   Vrijdag
-   Zaterdag
-   Zondag

If a user adds an item to a day that does not yet exist, the section is
automatically created.

------------------------------------------------------------------------

## Item Management

Users can add items manually.

Each item contains:

-   name
-   quantity
-   quantity description
-   optional assigned shopper
-   completion state

Items support the following interactions:

-   mark as completed
-   claim item ("jij haalt dit")
-   reorder items
-   edit items
-   delete items

------------------------------------------------------------------------

## Real-Time Collaboration

All lists update in real time.

When one user:

-   adds an item
-   claims an item
-   marks an item complete
-   edits an item
-   deletes an item

Other users viewing the list immediately see the update.

------------------------------------------------------------------------

## Item Claiming

Users can indicate that they will purchase a specific item.

When an item is claimed:

-   the item state changes
-   the claiming user's avatar appears
-   other users cannot mark the item as completed

------------------------------------------------------------------------

## Recipe Library

Users can create reusable recipes.

A recipe contains:

-   recipe name
-   optional link to source
-   number of persons
-   ingredients

Recipes can be reused to quickly add multiple items to a shopping list.

------------------------------------------------------------------------

## Recipe Ingredients

Ingredients are stored as structured items.

Each ingredient contains:

-   name
-   quantity
-   quantity description

Ingredients are displayed using the same Item Card component as shopping
list items but always in editable state.

------------------------------------------------------------------------

## Adding Recipes to Lists

When a recipe is selected:

-   all ingredients of the recipe are added to the shopping list
-   the items are placed in the selected day section
-   or in Algemeen if no day was selected

------------------------------------------------------------------------

## Recipe Search

Users can search through saved recipes using a search bar.

Results filter in real time.

------------------------------------------------------------------------

## Recipe Editing

Users can:

-   edit recipes
-   reorder ingredients
-   update quantities
-   delete ingredients

------------------------------------------------------------------------

## Undo Delete

When a list is deleted, a Snackbar component appears.

The Snackbar shows:

-   confirmation message
-   Undo ("Zet terug") button

This restores the deleted item.

------------------------------------------------------------------------

# Out of Scope (v1)

-   automatic ingredient merging between recipes
-   barcode scanning
-   grocery store integrations
-   price comparison
-   nutritional analysis
-   AI recipe suggestions
-   multi-language support

------------------------------------------------------------------------

# Tech Stack

Frontend

-   Next.js 14 (App Router)
-   React
-   Tailwind CSS
-   Radix UI (headless components)
-   TypeScript
-   Storybook (component documentation)

Backend / Data

-   InstantDB (real-time database)

Key reasons:

-   built-in realtime synchronization
-   simplified data model
-   minimal backend infrastructure
-   fast prototyping

State / Sync

-   InstantDB realtime subscriptions
-   optimistic UI updates

------------------------------------------------------------------------

# Design System

Key reusable components:

-   Item Card
-   Recipe Tile
-   Toggle Button
-   Pill Tab
-   Mini Button
-   Floating Action Button
-   Stepper
-   Search Bar
-   Snackbar
-   Modal Page

------------------------------------------------------------------------

# Screen Specs

## Home

Displays the user's lists.

Features:

-   list overview
-   create new list
-   reorder lists
-   delete lists
-   undo delete via snackbar

See: screens/home.md

------------------------------------------------------------------------

## List Detail

Displays the items of a specific list.

Features:

-   sections per day
-   item cards
-   claim items
-   mark items completed
-   edit mode
-   reorder items
-   floating action button to add item

See: screens/list-item.md

------------------------------------------------------------------------

## New Item Modal

Allows users to add items or recipes to a list.

Features:

-   day selector
-   item form
-   recipe tab
-   recipe library
-   search recipes

See: screens/new-item.md

------------------------------------------------------------------------

## New Recipe Modal

Allows users to create a new recipe.

Features:

-   recipe name
-   recipe link
-   number of persons
-   ingredient management
-   ingredient reordering
-   ingredient editing

See: screens/new-recipe.md

------------------------------------------------------------------------

# Real-Time Behaviour

The following actions synchronize instantly:

-   adding items
-   editing items
-   deleting items
-   claiming items
-   marking items completed
-   adding recipes
-   editing recipes

------------------------------------------------------------------------

# Component State Model

The Item Card component supports multiple states:

-   default
-   claimed
-   completed
-   editable

This allows the same component to be reused for:

-   shopping list items
-   recipe ingredients

------------------------------------------------------------------------

# Future Opportunities

Potential improvements:

-   automatic ingredient merging across recipes
-   shared household accounts
-   meal planning calendar
-   smart ingredient suggestions
-   grocery category grouping
-   offline support
-   store aisle sorting
)
- [Home Screen](screens/list-detail.md)

---

## Out of Scope (v1)

The following features are **not included in the first version**:

* price tracking
* store integration
* barcode scanning
* recipe imports
* AI-generated shopping suggestions
* multiple store lists

---

## Assumptions

* users belong to a small group sharing one list
* the app is primarily used for grocery shopping in physical stores
* users interact with the list from their personal devices

---

## Success Metrics

The product will be considered successful if users:

* regularly use the shared list to coordinate shopping
* experience fewer duplicate purchases
* can easily see who is picking up items

---

## Decisions

### Item Claiming

Once an item is marked as being picked up by a user, only that same user can undo the action and return the item to an open state.

### Unfinished Items

If a user indicates they are picking up an item but does not complete it, nothing special happens. The item simply remains in the list. Other users are still allowed to mark the item as obtained.

### Completed Items

Completed items remain visible in the list but their text is displayed with a strikethrough style to indicate that the item has already been obtained.
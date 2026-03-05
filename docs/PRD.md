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

- [Home Screen](screens/home.md)

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
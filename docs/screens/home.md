# Shopping List App – UI / Screen Requirements Document

This document specifies the behaviour and purpose of the main screens of the Shopping List App. It complements the main Product Requirements Document (PRD) and focuses specifically on screens, UI behaviour, and user interactions.

---

# Home Screen – Lists Overview

## Purpose

The Home Screen displays all shopping lists available to the user and acts as the main entry point of the application.

If the user has no lists yet, the screen shows an empty state encouraging the user to create their first list.

---

## UI Elements

### Bottom Navigation

The bottom navigation contains three main sections:

* Lists
* Add List (primary action)
* Profile

The Add List action is visually emphasized as the primary action.

---

### Empty State

If the user has no lists yet, the screen shows:

* Illustration
* Text: "Je hebt nog geen lijstjes"
* Button: "Voeg lijstje toe"

The purpose of this state is to guide first-time users to create their first shopping list.

---

### List Cards (When Lists Exist)

When the user has created one or more lists, the Home Screen displays them as **list cards**.

Each card represents a shopping list.

Each card contains:

* List icon / illustration
* List name
* Creation date
* Number of items in the list

Example structure:

* Icon
* List title (e.g. "Weeklijstje")
* Date (e.g. "25-04-2026")
* Item count (e.g. "6 items")

Cards are displayed in a vertical scrollable list.

---

### Edit Mode

The Home Screen includes a **"Wijzigen" (Edit)** action.

When Edit Mode is activated, users can:

* Delete lists
* Reorder lists (optional, to be defined)

Edit Mode allows users to manage existing lists without opening them individually.

---

## User Actions

Users can perform the following actions on the Home Screen:

1. Create a new shopping list
2. Open an existing shopping list
3. Navigate to their profile

---

## Create List Flow

Users can create a new shopping list by tapping the **plus button** in the bottom navigation.

### Interaction

1. User taps the **plus button**.
2. A **slide-in panel (bottom sheet)** appears from the bottom of the screen.
3. The panel contains the form to create a new list.

---

### Create List Panel

The slide-in panel contains:

**Header**

* Title: "Nieuw lijstje"
* Close button (X) to dismiss the panel

**Form Field**

* Label: "Naam lijstje"
* Text input where the user enters the name of the list

**Primary Action**

* Button: "Bewaren"

---

### User Flow

1. User taps the plus button
2. The create list panel slides up
3. User enters a list name
4. User taps **Bewaren**
5. The list is created
6. The panel closes
7. The new list appears on the Home Screen

---

### System Behaviour

* If the user closes the panel using the **X**, the list is not created
* If the user taps **Bewaren** with an empty name, the system should prevent submission (validation behaviour to be defined)
* After successful creation, the list becomes visib

---

## System Behaviour

* Newly created lists appear on the Home Screen
* Lists remain visible until deleted
* If the last list is deleted, the empty state is shown again

---

## Future Screens (to be defined)

The following screens will be specified later:

* List Detail Screen
* Add Item Flow
* Item Editing
* Profile Screen

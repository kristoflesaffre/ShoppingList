# Shopping List App – Home Screen (Lists Overview)

This document describes the behaviour, UI elements, and interactions of the **Home Screen** of the Shopping List App.  
The Home Screen shows all shopping lists available to the user and serves as the main entry point of the application.

If the user has no lists yet, the screen shows an empty state encouraging the user to create their first list.

---

## Components Used

- Edit Button
- Item Card Tile
- Bottom Navigation
- Mini Button
- Create List Modal
- Snackbar

---

## Header

The top section of the screen contains:

- Title: **"Mijn lijstjes"**
- **Edit Button**

Default state:

Wijzigen

When **Edit Mode** is active the button changes to:

Gereed

---

## Bottom Navigation

The bottom navigation contains three sections:

- **Lijstjes** (active)
- **Add List** (primary action)
- **Profiel**

The **Add List** action appears as a floating circular **plus button** in the center and is visually emphasized as the primary action.

---

## Empty State

If the user has no lists yet, the screen shows:

- Illustration
- Text: **"Je hebt nog geen lijstjes"**
- **Mini Button** with label: **"Voeg lijstje toe"**

The **Mini Button** is a compact call-to-action button used inside empty states.

Both the **Empty State Mini Button** and the **Bottom Navigation plus button** trigger the **Create List Flow**..

---

## List Cards

When the user has created one or more lists, the Home Screen displays them as **Item Card Tile** components in a vertical scrollable list.

Each **Item Card Tile** represents a shopping list.

### Item Card Tile – Default State

Each card contains:

- List icon / illustration
- List name
- Creation date
- Number of items in the list

Example content:

Icon  
Weeklijstje  
25-04-2026  
6 items

Interaction behaviour:

- The **entire Item Card Tile is tappable**
- Tapping the card opens the selected shopping list

---

## Create List Flow

Users can create a new shopping list by tapping:

- the **plus button** in the Bottom Navigation  
- the **Empty State button**

### Interaction

1. User taps the **plus button**
2. A **Create List Modal** appears from the bottom of the screen
3. The modal allows the user to create a new list

---

## Create List Modal

The modal contains:

### Header

Title: **"Nieuw lijstje"**  
Close button (**X**) to dismiss the modal

### Form Field

Label: **"Naam lijstje"**

Text input field where the user enters the list name.

Example placeholder: **"Weeklijstje"**

### Primary Action

Button: **"Bewaren"**

---

## Create List User Flow

1. User taps the plus button
2. The **Create List Modal** slides up
3. User enters a list name
4. User taps **Bewaren**
5. The list is created
6. The modal closes
7. The new list appears on the Home Screen

---

## Create List System Behaviour

- If the user closes the modal using **X**, the list is not created
- If the user taps **Bewaren** with an empty name, the system prevents submission
- A validation message should be shown (e.g. *"Naam lijstje is verplicht"*)
- After successful creation the new list appears immediately on the Home Screen

---

## Edit Mode

The Home Screen includes an **Edit Button**.

When the user taps the **Edit Button**, the screen enters **Edit Mode**.

In Edit Mode:

- All **Item Card Tile** components switch to **Editable State**
- The **Edit Button** label changes from **Wijzigen** to **Gereed**

---

## Item Card Tile – Editable State

When Edit Mode is active, each **Item Card Tile** changes layout and shows two action buttons.

### Reorder Button (Left)

A reorder button appears on the **left side of the card**.

This button allows the user to **change the order of lists via drag and drop**.

Interaction:

1. User presses the reorder button
2. The card can be dragged vertically
3. The list order updates immediately
4. The new order is saved automatically

While dragging, surrounding cards shift position to indicate the new order.

---

### Delete Button (Right)

A **Delete Button** with a trash icon appears on the **right side of the Item Card Tile**.

Interaction:

1. User taps the **Delete Button**
2. The list is immediately removed from the Home Screen
3. A **Snackbar** appears at the bottom of the screen

While cards are in **Editable State**, the center of the card is **not tappable**.

---

## Snackbar – Delete Feedback

After a list is deleted, a **Snackbar component** appears at the bottom of the screen above the Bottom Navigation.

The Snackbar contains:

Message:

'[List name]' verwijderd

Action button:

Zet terug

Example:

'Weeklijstje' verwijderd   Zet terug

---

## Undo Behaviour

The **Zet terug** button allows the user to undo the delete action.

Interaction flow:

1. User taps the **Delete Button**
2. The list disappears
3. Snackbar appears
4. If the user taps **Zet terug**, the list is restored to its previous position

---

## Snackbar Behaviour

- The Snackbar appears **above the Bottom Navigation**
- The Snackbar automatically disappears after approximately **4–5 seconds**
- If the Snackbar disappears without interaction, the deletion becomes permanent

---

## System Behaviour

- Newly created lists appear immediately on the Home Screen
- Lists remain visible until deleted
- Reordered lists keep their new order
- If the last list is deleted, the **Empty State** is shown again

---

## Future Screens (to be defined)

The following screens will be defined later:

- List Detail Screen
- Add Item Flow
- Item Editing
- Profile Screen

## Figma References

### Screen States

- Home / Empty State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=119-512&t=roRscRAyGswpLTjR-4

- Home / Content State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=392-2476&t=roRscRAyGswpLTjR-4 

- Home / Edit Mode  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=494-2273&t=roRscRAyGswpLTjR-4

- Home / Edit mode - list removed
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=528-3492&t=roRscRAyGswpLTjR-4 

- Home / New list modal
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=472-2235&t=roRscRAyGswpLTjR-4

- Home / New list modal - filled out
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=472-2281&t=roRscRAyGswpLTjR-4 
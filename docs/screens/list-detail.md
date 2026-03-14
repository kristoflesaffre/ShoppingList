# Shopping List App – List Detail Screen

This document describes the behaviour, UI elements, and interactions of the **List Detail Screen**.

The List Detail Screen displays all items that belong to a specific shopping list. Users can view, organize, and manage items within the list.

---

# Purpose

The List Detail Screen allows users to manage the contents of a specific shopping list.

Items are organized into sections. Each section groups items that belong together, either as general items or items associated with a specific day.

---

# Components Used

- Top Navigation Bar
- Back Button
- Invite User Icon Button
- More Options Button
- Edit Button
- Section Title
- Item Card
- Checkbox
- Claim Button
- Floating Action Button
- Mini Button

---

# Top Navigation Bar

The top navigation bar contains:

- Back Button
- List Title
- Invite User Icon Button
- More Options Button

Tapping the **Back Button** navigates back to the **Home Screen**.

---

# List Header

Below the navigation bar the screen displays:

- List icon
- List title
- Edit Button

Example:

Weeklijstje

The **Edit Button** initially displays **"Wijzigen"**.

---

# Empty State

If the list contains **no items**, the screen shows an empty state.

The empty state contains:

- Text: **"Geen items in je lijstje"**
- Mini Button: **"Voeg item toe"**

Interaction flow:

1. User taps **Voeg item toe**
2. The **New Item Page** is opened (`new-item.md`)

When the first item is added the screen switches to the **Items List View**.

---

# Item Sections

Items are displayed inside **sections**.

The list always contains **at least one section titled "Algemeen"**.

Additional sections may appear when items are assigned to specific days.

Possible section titles include:

- Algemeen
- Maandag
- Dinsdag
- Woensdag
- Donderdag
- Vrijdag
- Zaterdag
- Zondag

Each section contains one or more **Item Card** components.

---

# Section Header

Each section header contains:

- Section Title
- Add Item Button (+)

Example:

Algemeen [+]

Interaction:

1. User taps the **Add Item Button**
2. The **New Item Page** (`new-item.md`) is opened
3. The new item will automatically belong to that section

---

# Item Card

Each item is displayed using the **Item Card** component.

An Item Card contains:

- Checkbox
- Item name
- Quantity / unit
- Vertical divider
- Claim Button

Example:

☐ Brood  
1 stuk

---

# Completing an Item

If the user taps **left of the vertical divider**, the item is marked as completed.

Interaction flow:

1. User taps the Item Card left of the divider
2. Checkbox becomes checked
3. Item enters the **Completed State**

---

# Completed State

When an item is completed:

- Checkbox is checked
- Item name text is shown with **strikethrough**
- Quantity text is shown with **strikethrough**

Example:

☑ Wasverzachter  
1 stuk

Completion is **toggleable**. Tapping again removes the completion state.

---

# Claiming an Item

If the user taps the **Claim Button** (hand icon) on the right side:

1. The item enters **Claimed State**
2. Subtitle displays:

Quantity – jij haalt dit

---

# Claimed by Other User

If another user claims the item:

The card displays:

Quantity – Anne haalt dit

The avatar of the claiming user appears on the right side.

In this state:

- Other users **cannot complete the item**
- Checkbox interaction is disabled

---

# Realtime Behaviour

Item state updates are synchronized in real time across all users viewing the list.

Realtime updates include:

- Completion state
- Claim state
- Claiming user
- Claiming user avatar

---

# Edit Mode

When the **Edit Button** is tapped:

"Wijzigen" changes to **"Gereed"**.

Item Cards switch to **Editable State**.

---

# Item Card – Editable State

In Editable State the Item Card displays:

Left side:
- Reorder handle (drag & drop)

Right side:
- Edit Button (pencil icon)
- Delete Button (trash icon)

---

# Section – Editable State

When Edit Mode is active, sections also display a **Delete Button**.

Interaction flow:

1. User taps the section delete icon
2. The entire section is removed
3. If the removed section contained the last items, the screen returns to the **Empty State**

---

# Floating Action Button

A **Floating Action Button** appears in the bottom-right corner.

The FAB contains a **plus icon**.

Interaction flow:

1. User taps the Floating Action Button
2. The **New Item Page** (`new-item.md`) is opened


# Figma References

## Screen States

- List Detail / Empty State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=134-813&t=roRscRAyGswpLTjR-4 

- List Detail / Content State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=387-1364&t=roRscRAyGswpLTjR-4 

- List Detail / Content State - you and other person are getting something 
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=134-1390&t=roRscRAyGswpLTjR-4 

- List Detail / Content State - some items are checked
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=134-1872&t=roRscRAyGswpLTjR-4 

- List Detail / Edit mode
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=134-2064&t=roRscRAyGswpLTjR-4 

- List Detail / Edit mode - item removed
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=523-3677&t=roRscRAyGswpLTjR-4 
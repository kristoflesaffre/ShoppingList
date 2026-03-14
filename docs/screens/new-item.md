# Shopping List App – New Item Page

This document describes the behaviour, UI elements, and interactions of the **New Item Page**.

The New Item Page allows users to create a new item within a shopping list.

This page is opened when the user taps the **Floating Action Button** on the List Detail Screen.

The page appears as a **modal sheet** that slides up from the bottom of the screen.

---

# Components Used

- Modal Page
- Close Button
- Back Button
- Toggle Button Group
- Toggle Button
- Pill Tab
- Input
- Stepper
- Custom Input Field
- Button
- Mini Button
- Search Bar
- Recipe Tile

---

# Page Header

The top of the modal contains:

Title: **"Item(s) toevoegen"**

On the right side of the header there is a **Close Button** (X).

Interaction:

If the user taps the Close Button, the modal closes and the user returns to the **List Detail Screen** without creating an item.

---

# Day Selection

Below the header the screen displays a **Toggle Button Group** that allows the user to assign the item to a specific day.

The available **Toggle Button** values are:

- Geen  
- Ma  
- Di  
- Wo  
- Do  
- Vr  
- Za  
- Zo  

Default state:

The **Geen** toggle is selected by default.

---

# Day Selection Behaviour

The selected value determines in which section the new item will appear.

If the selected value is **Geen**, the item will be added to the **Algemeen section** of the list.

If the selected value is one of the weekdays:

- Ma  
- Di  
- Wo  
- Do  
- Vr  
- Za  
- Zo  

Then the item will be added to the corresponding day section.

If the section for that day **does not yet exist**, the system automatically **creates the section** before adding the item.

---

# Conditional Pill Tab

When the user selects a **weekday toggle** (Ma, Di, Wo, Do, Vr, Za, Zo), an additional UI element appears below the day selector.

This element is a **Pill Tab component**.

The Pill Tab contains two tabs:

- **item**
- **recept**

Default state:

The **item tab is active by default**.

---

# Item Tab Behaviour

When the **item tab** is active, the user can manually add a new shopping item.

The following fields are shown:

- Item name input
- Quantity stepper
- Quantity description field

---

# Item Name Input

Below the tab selector there is an **Input component**.

Label: **Naam item**

This input field allows the user to enter the name of the item.

Example:

Brood

This field is **required**.

---

# Quantity Stepper

Below the item name input there is a **Stepper component**.

Label: **Hoeveelheid**

The Stepper contains:

- Minus Button
- Quantity value
- Plus Button

Default value:

1

Interaction behaviour:

- The **Minus Button** decreases the quantity
- The **Plus Button** increases the quantity
- The minimum allowed value is **1**

---

# Quantity Description Field

Below the Stepper there is a **Custom Input Field**.

This field displays centered text.

Default value:

1 stuk

The user can edit this field manually.

Examples:

1 stuk  
2 stuks  
500 gram  
1 fles  
3 pakken  

This field allows users to specify a more descriptive quantity than the numeric value alone.

---

# Recept Tab Behaviour

When the user taps the **recept tab** in the **Pill Tab component**, the interface switches to the recipe selection state.

---

# Recipe Empty State

When the user taps the **recept tab** and no recipes exist yet, an **empty state** is displayed.

The empty state contains:

Title: **Jouw recepten**

Message:

"Je hebt nog geen recepten toegevoegd"

Below the message there is a **Mini Button component**.

Label:

**Voeg recept toe**

Interaction:

When the user taps the **Mini Button "Voeg recept toe"**, the system opens the **New Recipe Modal**.

The New Recipe Modal replaces the current modal content.

The modal header changes and displays a **Back Button** on the left side.

The behaviour and UI of this modal are defined in:

**[new-recipe.md](./new-recipe.md)**

---

# Recipe List State

When the user has already created recipes, the empty state is replaced by a **recipe list view**.

---

# Recipe Section Header

At the top of the recipe section appears the title:

**Jouw recepten**

Next to the title there is a **Mini Button component with a "+" icon**.

Interaction:

When the user taps this **plus button**, the **New Recipe Modal** is opened.

The New Recipe Modal replaces the current modal content and a **Back Button** appears in the modal header.

The behaviour and UI of this modal are defined in:

**[new-recipe.md](./new-recipe.md)**

---

# Recipe Search

Below the title there is a **Search Bar component**.

Placeholder text:

**Zoek recept**

This search field allows the user to filter the list of saved recipes.

Search behaviour:

- The search filters recipes in real time
- Matching results are displayed instantly
- Non-matching recipes are hidden

---

# Recipe Tiles

Below the Search Bar the user's recipes are displayed in **Recipe Tile components**.

Each **Recipe Tile** contains:

- Recipe name
- Number of items contained in the recipe
- An **Edit Button** (pencil icon)

Example content:

Recipe name:  
*Kip curry met rijst*

Item count:  
*5 items*

---

# Recipe Tile Interaction

When the user taps a **Recipe Tile**, the recipe can be selected to add its items to the shopping list.

The system will then:

- Add all items from the recipe
- Place them in the selected day section
- Or in the **Algemeen section** if no day was selected

---

# Recipe Edit Interaction

When the user taps the **Edit Button** inside a Recipe Tile, the recipe edit flow is opened.

The recipe edit behaviour is defined in a separate specification.

---

# Add Button

At the bottom of the modal there is a **Button component**.

Label:

**Toevoegen**

The button is **disabled by default**.

---

# Button Enable Behaviour

The **Toevoegen button** becomes enabled only when the required fields have been filled in.

Required field:

- Naam item

When the user enters a valid item name, the button becomes active.

---

# Add Item Interaction

Interaction flow:

1. User optionally selects a day using the Toggle Buttons  
2. If a weekday is selected, the **Pill Tab component** appears  
3. User keeps the **item tab active** (default)  
4. User enters the item name  
5. User optionally adjusts the quantity using the Stepper  
6. User optionally edits the quantity description  
7. User taps **Toevoegen**

Result:

- The item is created  
- The modal closes  
- The user returns to the **List Detail Screen**  
- The item appears in the correct section  

---

# Section Placement Logic

If the selected toggle value is **Geen**, the item appears in the **Algemeen section**.

If a weekday toggle is selected:

- The item appears in that day's section
- If the section does not exist yet, the section is created automatically

---

# System Behaviour

- New items are added in **real time**
- Other users viewing the same list immediately see the new item appear
- The item appears in the correct section according to the selected day

# Figma References

## Screen States

- New Item / Default State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=136-2338&t=roRscRAyGswpLTjR-4 

- New Item / Content State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=176-3484&t=roRscRAyGswpLTjR-4 

- New Item / Day of the week selected
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=176-3712&t=roRscRAyGswpLTjR-4 

- New Item / Day of the week selected - recipe tab active - empty state
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=176-4244&t=roRscRAyGswpLTjR-4 

- New Item / Day of the week selected - recipe tab active - content state
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=176-5148&t=roRscRAyGswpLTjR-4 
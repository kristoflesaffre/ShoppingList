# Shopping List App – New Recipe Modal

This document describes the behaviour, UI elements, and interactions of the **New Recipe Modal**.

The New Recipe Modal allows users to create and store a new recipe that can later be reused when adding items to a shopping list.

This modal **replaces the content of the New Item Modal** when the user taps:

- the **Mini Button "Voeg recept toe"** in the recipe empty state
- the **Plus Button next to the "Jouw recepten" section title**

The modal remains within the same modal container but replaces the content.

---

# Components Used

- Modal Page
- Back Button
- Close Button
- Input
- Stepper
- Section Header
- Mini Button
- Button
- Item Card

---

# Modal Header

The modal header contains three elements:

Left side  
**Back Button**

Center  
Title **"Recept toevoegen"**

Right side  
**Close Button**

### Back Button behaviour

When the user taps the **Back Button**, the modal returns to the previous **New Item Modal state**.

The previously selected day and tab state remain unchanged.

### Close Button behaviour

When the user taps the **Close Button**, the entire modal is closed and the user returns to the **List Detail Screen**.

---

# Recipe Name

Below the header there is an **Input component**.

Label  
**Naam recept**

Placeholder  
Naam recept

This field allows the user to enter the name of the recipe.

Examples

- Lasagne  
- Kip curry met rijst  
- Wraps  
- Zoete aardappelsoep  

This field is **required**.

---

# Recipe Link

Below the recipe name input there is another **Input component**.

Label  
**Link recept**

Placeholder example  
http://www.recept.com

This field allows the user to store a URL that links to the original recipe source.

Examples

- cooking website  
- blog  
- YouTube video  
- recipe platform  

This field is **optional**.

---

# Number of Persons

Below the link input there is a **Stepper component**.

Label  
**Aantal personen**

Default value  
2

Interaction behaviour

- The **Minus Button** decreases the value
- The **Plus Button** increases the value
- Minimum value is **1**

This value represents how many people the recipe quantities correspond to.

---

# Ingredients Section

Below the stepper there is a **Section Header**.

Title  
**Ingrediënten**

Icon  
ingredient icon

On the right side of the section header there is a **Mini Button with a plus icon**.

This button allows the user to add a new ingredient.

---

# Ingredients Empty State

When the recipe has no ingredients yet, an **empty state** is displayed.

Message

"Je hebt nog geen ingrediënten toegevoegd"

Below the message there is a **Mini Button component**.

Label  
**Voeg ingrediënt toe**

### Interaction

When the user taps **Voeg ingrediënt toe**, the ingredient creation flow is opened.

The ingredient creation behaviour is defined in a separate specification.

---

# Ingredients List State

When the user has added ingredients, they are displayed in **Item Card components**.

Each ingredient is represented by one **Item Card**.

Unlike the shopping list screen, these **Item Cards are always displayed in the `editable` state**.

---

# Ingredient Item Card Structure

Each **Item Card** contains the following elements.

Left side  
**Drag Handle Button**

This allows the user to **reorder ingredients using drag and drop**.

Center content

- Ingredient name  
- Ingredient quantity

Examples

Rijst  
1 stuk

Kip  
500 gram

Paprika  
2 stuks

Right side

- **Edit Button** (pencil icon)
- **Delete Button** (trash icon)

---

# Ingredient Reordering

The **Drag Handle Button** on the left side allows ingredients to be reordered.

Interaction behaviour

- User presses and drags the handle
- The card moves vertically
- Other cards shift position dynamically

The new order is saved automatically.

---

# Ingredient Editing

When the user taps the **Edit Button**, the ingredient editing flow is opened.

The user can modify

- ingredient name
- quantity
- unit description

---

# Ingredient Deletion

When the user taps the **Delete Button**, the ingredient is removed from the recipe.

If the last ingredient is deleted, the interface returns to the **Ingredients Empty State**.

---

# Save Button

At the bottom of the modal there is a **Button component**.

Label  
**Bewaren**

Default state  
Disabled.

---

# Save Button Enable Behaviour

The **Bewaren button** becomes enabled when the required fields have been filled in.

Required field

- Naam recept

Ingredients are **not required** to save a recipe.

A recipe can therefore exist without ingredients.

---

# Save Recipe Interaction

When the user taps **Bewaren**

1. The recipe is saved in the user's recipe library
2. The modal returns to the **New Item Modal**
3. The recipe appears in the **Jouw recepten list**

---

# Recipe Usage

Saved recipes can be selected in the **New Item Modal** when the **recept tab** is active.

When a recipe is selected

- all ingredients of the recipe are added to the shopping list
- the items are placed in the selected day section
- or in the **Algemeen section** if no day was selected

---

# System Behaviour

Recipes are stored in the user's personal recipe library.

The recipe library allows users to quickly add multiple shopping list items based on predefined ingredient sets.

# Figma References

## Screen States

- New Recipe / Default State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=217-1412&t=roRscRAyGswpLTjR-4 

- New Recipe / Content State  
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=219-1937&t=roRscRAyGswpLTjR-4 

- New Recipe / Modal add ingredient
https://www.figma.com/design/Z7869Lf1l9aVUR0U5FIiz9/Shopping-list-app?node-id=360-1267&t=roRscRAyGswpLTjR-4 
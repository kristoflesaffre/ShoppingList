// =============================================================
// Figma Plugin Script — Warning Colors aanmaken
// =============================================================
// HOE TE GEBRUIKEN:
//   1. Open je Figma project (Shopping list app)
//   2. Ga naar Plugins → Development → Open console
//      OF: druk op Cmd+/ en zoek "Open console"
//   3. Kopieer ALLES hieronder en plak het in de console
//   4. Druk Enter
// =============================================================

(async function addWarningColors() {

  // ── Kleuren ────────────────────────────────────────────────
  // Naming matcht Error-600 / Error-400 / Error-300 / Error-25
  const WARNING = [
    { name: 'Warning-600', hex: '#92400E' },  // donkerste (deep amber)
    { name: 'Warning-400', hex: '#D97706' },  // medium
    { name: 'Warning-300', hex: '#F59E0B' },  // hoofd-warning (bright amber)
    { name: 'Warning-25',  hex: '#FFFBEB' },  // lichtste tint (achtergrond)
  ];

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255,
    };
  }

  // ── 1. Variables panel ─────────────────────────────────────
  await figma.loadAllPagesAsync();

  const collections = figma.variables.getLocalVariableCollections();
  let collection;

  if (collections.length === 0) {
    collection = figma.variables.createVariableCollection('Colors');
    console.log('✅ Nieuwe variabelencollectie "Colors" aangemaakt');
  } else {
    // Zoek de collectie met kleurvariabelen (bevat "error" of "primary")
    const allVars = figma.variables.getLocalVariables('COLOR');
    if (allVars.length > 0) {
      collection = figma.variables.getVariableCollectionById(allVars[0].variableCollectionId);
    } else {
      collection = collections[0];
    }
    console.log(`✅ Variabelencollectie gevonden: "${collection.name}"`);
  }

  const modeId = collection.defaultModeId;
  const created = [];

  for (const color of WARNING) {
    // Controleer of de variabele al bestaat
    const existing = figma.variables.getLocalVariables('COLOR')
      .find(v => v.name === color.name || v.name === `warning/${color.name}`);

    if (existing) {
      console.log(`⚠️  ${color.name} bestaat al, overgeslagen`);
      continue;
    }

    const variable = figma.variables.createVariable(color.name, collection.id, 'COLOR');
    variable.setValueForMode(modeId, hexToRgb(color.hex));
    created.push(color.name);
    console.log(`✅ Variable "${color.name}" = ${color.hex} aangemaakt`);
  }

  // ── 2. Canvas swatches ─────────────────────────────────────
  // Zoek de Design system pagina en voeg swatches toe naast de Error kleuren

  const designSystemPage = figma.root.children.find(
    p => p.name === 'Design system'
  );

  if (!designSystemPage) {
    console.log('ℹ️  "Design system" pagina niet gevonden — alleen variables aangemaakt');
    figma.closePlugin('Warning variables aangemaakt!');
    return;
  }

  // Zoek de Error kleur groep door te zoeken naar een frame met Error swatches
  function findErrorGroup(node) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      const children = node.children || [];
      // Zoek een frame dat precies 4 kinderen heeft waarvan de eerste een Error-kleur heeft
      const hasErrorChild = children.some(c => {
        if (c.type === 'FRAME' && c.children) {
          return c.children.some(gc =>
            gc.type === 'RECTANGLE' &&
            gc.fills &&
            gc.fills[0]?.type === 'SOLID' &&
            Math.abs(gc.fills[0].color.r - 0.725) < 0.05  // ≈ #b92028 rood
          );
        }
        return false;
      });
      if (hasErrorChild) return node;
      for (const child of children) {
        const result = findErrorGroup(child);
        if (result) return result;
      }
    }
    return null;
  }

  // Alternatief: zoek frame met Error label tekst
  function findFrameWithText(node, searchText) {
    if (node.type === 'TEXT' && node.characters && node.characters.includes(searchText)) {
      return node.parent;
    }
    const children = node.children || [];
    for (const child of children) {
      const result = findFrameWithText(child, searchText);
      if (result) return result;
    }
    return null;
  }

  // Zoek het Error swatches frame
  let errorSwatchFrame = null;
  let palettesContainer = null;

  // Itereer door alle frames op de Design system pagina
  for (const topFrame of designSystemPage.children) {
    const found = findFrameWithText(topFrame, 'Error-600');
    if (found) {
      // "found" is de parent van het Text node met "Error-600"
      // We zoeken 2 niveaus omhoog voor het container frame met alle 4 swatches
      errorSwatchFrame = found.parent?.parent;
      palettesContainer = errorSwatchFrame?.parent;
      break;
    }
  }

  if (!errorSwatchFrame || !palettesContainer) {
    console.log('ℹ️  Error swatch frame niet gevonden op canvas — alleen variables aangemaakt');
    figma.closePlugin(`✅ ${created.length} warning variables aangemaakt!`);
    return;
  }

  console.log(`✅ Error swatch frame gevonden: "${errorSwatchFrame.name}"`);

  // Kloon het Error frame en pas aan voor Warning
  const warningFrame = errorSwatchFrame.clone();
  warningFrame.name = 'Frame Warning';

  // Positie: rechts naast het Error frame
  warningFrame.x = errorSwatchFrame.x + errorSwatchFrame.width + 16;
  warningFrame.y = errorSwatchFrame.y;

  // Voeg toe aan dezelfde container
  palettesContainer.appendChild(warningFrame);

  // Update elke swatch in het nieuwe frame
  const swatchFrames = warningFrame.children.filter(c => c.type === 'FRAME');

  for (let i = 0; i < swatchFrames.length && i < WARNING.length; i++) {
    const swatchFrame = swatchFrames[i];
    const color = WARNING[i];
    const rgb = hexToRgb(color.hex);

    // Update het Rectangle fill
    const rect = swatchFrame.children.find(c => c.type === 'RECTANGLE');
    if (rect) {
      rect.fills = [{ type: 'SOLID', color: rgb }];
    }

    // Update het label
    const textNode = swatchFrame.children.find(c => c.type === 'TEXT');
    if (textNode) {
      await figma.loadFontAsync(textNode.fontName);
      textNode.characters = color.name;
    }
  }

  console.log('✅ Warning swatches toegevoegd aan Design system canvas');

  // ── Navigeer naar de warning kleuren ──────────────────────
  figma.currentPage = designSystemPage;
  figma.viewport.scrollAndZoomIntoView([warningFrame]);

  figma.closePlugin(`✅ ${created.length} warning variables + swatches aangemaakt!`);

})();

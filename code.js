// ---------------- state ----------------
let tokens = null;

figma.showUI(__html__, { width: 480, height: 720 });

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type && msg.type.indexOf("publish-") === 0 && msg.tokens) {
      tokens = msg.tokens;
    }
    if (msg.type === "publish-colors") {
      publishColors();
      figma.ui.postMessage({ type: "publish-done", tab: "colors" });
    } else if (msg.type === "publish-typography") {
      await publishTypography();
      figma.ui.postMessage({ type: "publish-done", tab: "typography" });
    } else if (msg.type === "publish-spacing") {
      publishSpacing();
      figma.ui.postMessage({ type: "publish-done", tab: "spacing" });
    } else if (msg.type === "publish-radius") {
      publishRadius();
      figma.ui.postMessage({ type: "publish-done", tab: "radius" });
    } else if (msg.type === "publish-shadow") {
      publishShadow();
      figma.ui.postMessage({ type: "publish-done", tab: "shadow" });
    } else if (msg.type === "publish-components") {
      await publishComponents();
      figma.ui.postMessage({ type: "publish-done", tab: "components" });
    }
  } catch (e) {
    figma.ui.postMessage({ type: "error", message: e.message });
  }
};

// ---------------- color helpers ----------------
function hexToRgb01(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const num = parseInt(full, 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}
function rgb01ToHex(r, g, b) {
  const to255 = v => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return "#" + [r, g, b].map(v => to255(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function mixHex(hex, target, factor) {
  const a = hexToRgb01(hex), b = hexToRgb01(target);
  return rgb01ToHex(a.r + (b.r - a.r) * factor, a.g + (b.g - a.g) * factor, a.b + (b.b - a.b) * factor);
}

// ---------------- Color styles ----------------
function publishColors() {
  if (!tokens) return;
  const groups = [["Primary", tokens.color.primary], ["Grey", tokens.color.grey]];
  if (tokens.color.secondary) groups.push(["Secondary", tokens.color.secondary]);
  for (const [groupName, scale] of groups) {
    for (const [step, hex] of Object.entries(scale)) {
      const name = `${groupName}/${step}`;
      const existing = figma.getLocalPaintStyles().find(s => s.name === name);
      const style = existing || figma.createPaintStyle();
      style.name = name;
      style.paints = [{ type: "SOLID", color: hexToRgb01(hex) }];
    }
  }
}

// ---------------- Typography styles ----------------
async function loadFontSafe(family, style) {
  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch (e) {
    await figma.loadFontAsync({ family: "Inter", style });
    return { family: "Inter", style };
  }
}
async function publishTypography() {
  if (!tokens) return;
  for (const [role, t] of Object.entries(tokens.typography.scale)) {
    const family = t.font || tokens.typography.font;
    const styleName = t.weight >= 700 ? "Bold" : t.weight <= 300 ? "Light" : "Regular";
    const font = await loadFontSafe(family, styleName);
    const name = `Text/${role}`;
    const existing = figma.getLocalTextStyles().find(s => s.name === name);
    const style = existing || figma.createTextStyle();
    style.name = name;
    style.fontName = font;
    style.fontSize = t.size;
    style.letterSpacing = { value: t.letterSpacing * 100, unit: "PERCENT" };
    style.lineHeight = { value: t.lineHeight * 100, unit: "PERCENT" };
  }
}

// ---------------- Variables (spacing / radius) ----------------
function getOrCreateCollection(name) {
  const existing = figma.variables.getLocalVariableCollections().find(c => c.name === name);
  return existing || figma.variables.createVariableCollection(name);
}
function publishSpacing() {
  if (!tokens) return;
  const collection = getOrCreateCollection("Spacing");
  const modeId = collection.modes[0].modeId;
  const existingVars = figma.variables.getLocalVariables("FLOAT");
  tokens.spacing.forEach((val, i) => {
    const name = `sp-${i + 1}`;
    const existing = existingVars.find(v => v.name === name && v.variableCollectionId === collection.id);
    const v = existing || figma.variables.createVariable(name, collection, "FLOAT");
    v.setValueForMode(modeId, val);
  });
}
function publishRadius() {
  if (!tokens) return;
  const collection = getOrCreateCollection("Radius");
  const modeId = collection.modes[0].modeId;
  const existingVars = figma.variables.getLocalVariables("FLOAT");
  tokens.radius.forEach((val, i) => {
    const name = `r-${i + 1}`;
    const existing = existingVars.find(v => v.name === name && v.variableCollectionId === collection.id);
    const v = existing || figma.variables.createVariable(name, collection, "FLOAT");
    v.setValueForMode(modeId, val);
  });
}

// ---------------- Effect styles (shadow) ----------------
function publishShadow() {
  if (!tokens || !tokens.shadow || !tokens.shadow.length) return;
  tokens.shadow.forEach((shadowStr, i) => {
    const m = shadowStr.match(/0 (\d+)px (\d+)px rgba\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)/);
    if (!m) return;
    const [, y, blur, r, g, b, a] = m;
    const name = `shadow-${i + 1}`;
    const existing = figma.getLocalEffectStyles().find(s => s.name === name);
    const style = existing || figma.createEffectStyle();
    style.name = name;
    style.effects = [{
      type: "DROP_SHADOW",
      color: { r: parseInt(r) / 255, g: parseInt(g) / 255, b: parseInt(b) / 255, a: parseFloat(a) },
      offset: { x: 0, y: parseInt(y) },
      radius: parseInt(blur),
      visible: true,
      blendMode: "NORMAL",
    }];
  });
}

// ---------------- Components ----------------
function variantColor(name) {
  const n = name.toLowerCase();
  if (n.includes("primary")) return tokens.color.primary["600"];
  if (n.includes("secondary")) return tokens.color.secondary ? tokens.color.secondary["600"] : tokens.color.primary["600"];
  if (n.includes("success")) return "#16A34A";
  if (n.includes("warning")) return "#D97706";
  if (n.includes("error") || n.includes("destructive")) return "#DC2626";
  return tokens.color.grey["600"];
}
function midRadius() {
  const r = tokens.radius;
  return r[Math.floor(r.length / 2)] || 8;
}

async function getFonts() {
  const bold = await loadFontSafe(tokens.typography.font, "Bold");
  const regular = await loadFontSafe(tokens.typography.font, "Regular");
  return { bold, regular };
}

function makeText(str, font, size, color) {
  const t = figma.createText();
  t.fontName = font;
  t.characters = str;
  t.fontSize = size;
  t.fills = [{ type: "SOLID", color: hexToRgb01(color) }];
  return t;
}

async function getContainer() {
  const page = figma.currentPage;
  let container = page.findOne(n => n.type === "FRAME" && n.name === "🎨 Design System / Components");
  if (!container) {
    container = figma.createFrame();
    container.name = "🎨 Design System / Components";
    container.layoutMode = "VERTICAL";
    container.itemSpacing = 56;
    container.paddingLeft = container.paddingRight = container.paddingTop = container.paddingBottom = 56;
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "AUTO";
    container.fills = [{ type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.99 } }];
    container.x = 0;
    container.y = 0;
  }
  return container;
}
function addFamilySection(container, set) {
  set.layoutSizingHorizontal = "HUG";
  container.appendChild(set);
}

async function publishComponents() {
  if (!tokens) return;
  const { bold, regular } = await getFonts();
  const container = await getContainer();
  const c = tokens.components;

  if (c.button && c.button.include) container_append(container, await buildButtonSet(regular));
  if (c.input && c.input.include) container_append(container, await buildInputSet(regular));
  if (c.toggle && c.toggle.include) container_append(container, buildToggleSet());
  if (c.checkbox && c.checkbox.include) container_append(container, buildCheckboxSet(bold));
  if (c.radio && c.radio.include) container_append(container, buildRadioSet());
  if (c.tabs && c.tabs.include) container_append(container, buildTabsSet(regular));
  if (c.badge && c.badge.include) container_append(container, buildBadgeSet(bold));

  figma.viewport.scrollAndZoomIntoView([container]);
}
function container_append(container, set) {
  addFamilySection(container, set);
}

// -- Button --
async function buildButtonSet(font) {
  const variants = tokens.components.button.variants.split(",").map(s => s.trim()).filter(Boolean);
  const states = ["Default", "Hover", "Focus", "Disabled"];
  const r = midRadius();
  const nodes = [];
  for (const v of variants) {
    const base = variantColor(v);
    const outline = /outline|ghost/i.test(v);
    for (const state of states) {
      const comp = figma.createComponent();
      comp.name = `Variant=${v}, State=${state}`;
      comp.layoutMode = "HORIZONTAL";
      comp.primaryAxisSizingMode = "AUTO";
      comp.counterAxisSizingMode = "AUTO";
      comp.paddingLeft = comp.paddingRight = 20;
      comp.paddingTop = comp.paddingBottom = 10;
      comp.cornerRadius = r;
      comp.opacity = state === "Disabled" ? 0.4 : 1;
      let bg = outline ? null : base;
      let strokeColor = outline ? tokens.color.grey["300"] : null;
      let strokeWeight = 1.5;
      let textColor = outline ? "#18161F" : "#FFFFFF";
      if (state === "Hover") bg = outline ? tokens.color.grey["100"] : mixHex(base, "#000000", 0.15);
      if (state === "Focus") { strokeColor = base; strokeWeight = 2; }
      comp.fills = bg ? [{ type: "SOLID", color: hexToRgb01(bg) }] : [];
      if (strokeColor) { comp.strokes = [{ type: "SOLID", color: hexToRgb01(strokeColor) }]; comp.strokeWeight = strokeWeight; }
      comp.appendChild(makeText(v, font, 13, textColor));
      nodes.push(comp);
    }
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Button";
  return set;
}

// -- Input --
async function buildInputSet(font) {
  const states = ["Default", "Focus", "Filled", "Error", "Disabled"];
  const nodes = [];
  const r = Math.min(midRadius(), 12);
  for (const state of states) {
    const comp = figma.createComponent();
    comp.name = `State=${state}`;
    comp.resizeWithoutConstraints(180, 38);
    comp.cornerRadius = r;
    comp.fills = [{ type: "SOLID", color: hexToRgb01(state === "Disabled" ? tokens.color.grey["100"] : "#FFFFFF") }];
    const strokeColor = state === "Error" ? "#DC2626" : state === "Focus" ? tokens.color.primary["600"] : tokens.color.grey["300"];
    comp.strokes = [{ type: "SOLID", color: hexToRgb01(strokeColor) }];
    comp.strokeWeight = state === "Focus" ? 2 : 1.5;
    comp.opacity = state === "Disabled" ? 0.6 : 1;
    const label = makeText(state === "Filled" ? "Value" : "Placeholder", font, 13, tokens.color.grey["500"]);
    label.x = 12; label.y = 11;
    comp.appendChild(label);
    nodes.push(comp);
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Input";
  return set;
}

// -- Toggle --
function buildToggleSet() {
  const states = ["Off", "On", "Disabled"];
  const nodes = [];
  for (const state of states) {
    const comp = figma.createComponent();
    comp.name = `State=${state}`;
    comp.resizeWithoutConstraints(40, 22);
    comp.cornerRadius = 999;
    const on = state === "On";
    comp.fills = [{ type: "SOLID", color: hexToRgb01(on ? tokens.color.primary["600"] : tokens.color.grey["300"]) }];
    comp.opacity = state === "Disabled" ? 0.4 : 1;
    const thumb = figma.createEllipse();
    thumb.resize(16, 16);
    thumb.x = on ? 21 : 3;
    thumb.y = 3;
    thumb.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    comp.appendChild(thumb);
    nodes.push(comp);
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Toggle";
  return set;
}

// -- Checkbox --
function buildCheckboxSet(font) {
  const states = ["Unchecked", "Checked", "Indeterminate", "Disabled"];
  const nodes = [];
  for (const state of states) {
    const comp = figma.createComponent();
    comp.name = `State=${state}`;
    comp.resizeWithoutConstraints(20, 20);
    comp.cornerRadius = 5;
    const active = state === "Checked" || state === "Indeterminate";
    comp.fills = [{ type: "SOLID", color: hexToRgb01(active ? tokens.color.primary["600"] : "#FFFFFF") }];
    comp.strokes = [{ type: "SOLID", color: hexToRgb01(active ? tokens.color.primary["600"] : tokens.color.grey["300"]) }];
    comp.strokeWeight = 1.5;
    comp.opacity = state === "Disabled" ? 0.4 : 1;
    if (active) {
      const mark = makeText(state === "Checked" ? "✓" : "–", font, 12, "#FFFFFF");
      mark.x = 5; mark.y = 2;
      comp.appendChild(mark);
    }
    nodes.push(comp);
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Checkbox";
  return set;
}

// -- Radio --
function buildRadioSet() {
  const states = ["Unchecked", "Checked", "Disabled"];
  const nodes = [];
  for (const state of states) {
    const comp = figma.createComponent();
    comp.name = `State=${state}`;
    comp.resizeWithoutConstraints(20, 20);
    comp.cornerRadius = 999;
    comp.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    comp.strokes = [{ type: "SOLID", color: hexToRgb01(state === "Checked" ? tokens.color.primary["600"] : tokens.color.grey["300"]) }];
    comp.strokeWeight = 1.5;
    comp.opacity = state === "Disabled" ? 0.4 : 1;
    if (state === "Checked") {
      const dot = figma.createEllipse();
      dot.resize(10, 10);
      dot.x = 5; dot.y = 5;
      dot.fills = [{ type: "SOLID", color: hexToRgb01(tokens.color.primary["600"]) }];
      comp.appendChild(dot);
    }
    nodes.push(comp);
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Radio";
  return set;
}

// -- Tabs --
function buildTabsSet(font) {
  const states = ["Active", "Inactive", "Disabled"];
  const nodes = [];
  for (const state of states) {
    const comp = figma.createComponent();
    comp.name = `State=${state}`;
    comp.layoutMode = "HORIZONTAL";
    comp.primaryAxisSizingMode = "AUTO";
    comp.counterAxisSizingMode = "AUTO";
    comp.paddingLeft = comp.paddingRight = 16;
    comp.paddingTop = comp.paddingBottom = 8;
    comp.cornerRadius = 8;
    comp.fills = [{ type: "SOLID", color: hexToRgb01(state === "Active" ? "#FFFFFF" : "transparent" === "transparent" ? tokens.color.grey["100"] : tokens.color.grey["100"]) }];
    comp.opacity = state === "Disabled" ? 0.4 : 1;
    comp.appendChild(makeText("Tab", font, 13, state === "Active" ? "#18161F" : tokens.color.grey["600"]));
    nodes.push(comp);
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Tabs";
  return set;
}

// -- Badge --
function buildBadgeSet(font) {
  const variants = tokens.components.badge.variants.split(",").map(s => s.trim()).filter(Boolean);
  const nodes = [];
  for (const v of variants) {
    const base = variantColor(v);
    const comp = figma.createComponent();
    comp.name = `Variant=${v}`;
    comp.layoutMode = "HORIZONTAL";
    comp.primaryAxisSizingMode = "AUTO";
    comp.counterAxisSizingMode = "AUTO";
    comp.paddingLeft = comp.paddingRight = 10;
    comp.paddingTop = comp.paddingBottom = 4;
    comp.cornerRadius = 999;
    comp.fills = [{ type: "SOLID", color: hexToRgb01(mixHex(base, "#FFFFFF", 0.85)) }];
    comp.appendChild(makeText(v, font, 12, mixHex(base, "#000000", 0.1)));
    nodes.push(comp);
  }
  const set = figma.combineAsVariants(nodes, figma.currentPage);
  set.name = "Badge";
  return set;
}

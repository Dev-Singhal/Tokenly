# Tokenly — Figma Plugin

Fully standalone — all inputs live in the plugin now. No separate website step required.

## Install (local, unpublished plugin)
1. Open Figma desktop app.
2. Go to **Menu → Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` from this folder.
4. The plugin now appears under **Plugins → Development → Tokenly**.

## Use
1. Run the plugin. It opens on the **Color** tab.
2. Work through each tab (Color, Typography, Spacing, Radius, Shadow, Components), setting the inputs — every tab has a live preview that updates as you type.
3. Click that tab's **Publish** button whenever you're happy with it:
   - Color → creates Figma Variables (`Primary/600`, `Grey/300`, etc.) in a "Colors" collection
   - Typography → creates Text styles (`Text/body`, `Text/h1`, etc.) — loads your chosen font, falls back to Inter if it's not installed locally
   - Spacing / Radius → creates Figma Variables (`sp-1`, `r-1`, etc.) in their own collections
   - Shadow → creates Effect styles, one per step. Each step's X offset, Y offset, blur, spread, opacity, and color can be customized individually by clicking that step in the preview.
   - Components → builds full component sets (all variants × all states) onto the canvas inside a frame called **"🎨 Design System / Components"**

## Notes
- Re-publishing updates existing styles/variables/components by name rather than duplicating them, so it's safe to tweak an input and re-publish anytime.
- Each Publish button sends only the current values from the plugin's inputs at the moment you click it — there's no separate "save" step.
- Typography requires the font to be installed locally in Figma to render correctly; otherwise it silently falls back to Inter for the *style creation* (the style is still named correctly, but renders in Inter until the real font is installed and you reassign it).
- This plugin is unpublished/local — there's no App Store review needed to use it privately in your own files.

# Design System Specification: The Luminous Academy

## 1. Overview & Creative North Star
**Creative North Star: The Sunlit Studio**

This design system rejects the cluttered, "plastic" aesthetic of traditional K-12 software in favor of an editorial, high-end learning environment. We are building a "Sunlit Studio"—an interface that feels like a premium, airy physical classroom filled with natural light, high-quality paper, and clear glass.

To break the "template" look, we move away from rigid, boxy grids. Instead, we utilize **intentional asymmetry** and **tonal depth**. Elements should feel like they are floating in an organized, balanced space. By using overlapping surfaces and varying typography scales, we create a rhythmic cadence that guides a student’s focus without the need for heavy-handed structural lines.

---

## 2. Colors & Surface Philosophy

The color palette is rooted in a high-energy Primary Blue, balanced by a sophisticated spectrum of neutrals that mimic the behavior of light on white surfaces.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To define boundaries, designers must use background shifts or tonal transitions. For example, a sidebar should not be separated by a 1px line; instead, use `surface-container-low` for the sidebar against a `surface` background. This creates a "soft edge" that feels modern and less restrictive.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the `surface-container` tiers to define "importance" through depth:
- **Base Layer:** `surface` (#f5f7f9) – The expansive floor of the application.
- **Section Layer:** `surface-container-low` (#eef1f3) – Large content areas or sidebars.
- **Action Layer:** `surface-container-lowest` (#ffffff) – This is your primary card color. Placing a pure white card on a light gray background creates an immediate, high-contrast focal point.

### The "Glass & Gradient" Rule
To inject "visual soul," use **Glassmorphism** for floating elements (like navigation bars or hovering tooltips). Apply `surface` colors at 80% opacity with a `backdrop-blur` of 12px-20px.
**Signature Textures:** For primary CTAs and Hero sections, avoid flat fills. Use a subtle linear gradient from `primary` (#0050d4) to `primary_container` (#7b9cff) at a 135-degree angle to give components a tactile, premium glow.

---

## 3. Typography: The Lexend Scale

We use **Lexend** exclusively. Its geometric, sans-serif construction is designed specifically to reduce visual stress and improve reading speed, making it perfect for K-12.

* **Display (lg/md/sm):** Used for "Big Ideas" and welcome moments. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an editorial, high-end feel.
* **Headline (lg/md/sm):** Reserved for page titles. These should always be `on_surface` (#2c2f31) to ensure maximum contrast against the white backgrounds.
* **Title (lg/md/sm):** Used for card headers and subsection navigation.
* **Body (lg/md):** All instructional content. Use `body-lg` (1rem) for lesson text to ensure it feels accessible and "breezy."
* **Label (md/sm):** For micro-copy and tags. Use `on_surface_variant` (#595c5e) to create a clear secondary hierarchy.

---

## 4. Elevation & Depth

We achieve hierarchy through **Tonal Layering** and **Atmospheric Perspective** rather than traditional drop shadows.

### The Layering Principle
Depth is created by stacking. A `surface-container-lowest` (pure white) card sitting on a `surface-container-low` (light gray) background creates a "natural lift." This is our primary method of separation.

### Ambient Shadows
When an element must "float" (e.g., a modal or a primary action card), use **Ambient Shadows**:
- **Shadow Y-Offset:** 8px - 16px
- **Blur:** 32px - 48px
- **Opacity:** 4% - 6%
- **Color:** Use a tinted version of `on_surface` (e.g., `rgba(44, 47, 49, 0.06)`). Never use pure black for shadows.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., high-contrast mode), use a **Ghost Border**: `outline-variant` (#abadaf) at **15% opacity**. This provides a hint of structure without breaking the airy aesthetic.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`). Large corner radius (`full`). High-contrast `on_primary` text.
- **Secondary:** `surface-container-highest` background with `primary` text. No border.
- **Tertiary:** No background. `primary` text. Use for low-emphasis actions.

### Cards & Lists
- **Rule:** Forbid divider lines.
- **Execution:** Separate list items using standard vertical whitespace or a subtle background hover state using `surface-container-low`. Cards should use `surface-container-lowest` (#FFFFFF) with a moderate (`2`) corner radius.

### Input Fields
- **Style:** Use `surface-container-low` as the field background.
- **States:** On focus, the field should transition to `surface-container-lowest` (white) with a 2px `primary` ghost-border. This "glow" effect mimics a light turning on.

### Subject Chips
- Use `secondary_container` and `tertiary_container` for subject-specific tagging (e.g., Math, Science). These should be vibrant but use `on_container` text colors to ensure K-12 readability standards are met.

---

## 6. Do's and Don'ts

### Do
- **DO** use clean, balanced whitespace to maintain a rhythmic, organized flow.
- **DO** use `surface-container-lowest` (#FFFFFF) as your "hero" surface for content.
- **DO** lean into Lexend's larger scales for a friendly, optimistic voice.
- **DO** use "Glassmorphism" for navigation elements to keep the background visible.
- **DO** Use the Simplified Chinese language interface.

### Don't
- **DON'T** use 1px solid borders to separate content blocks.
- **DON'T** use harsh, dark grey shadows.
- **DON'T** use pure black (#000000) for text. Use `on_surface` (#2c2f31) for a softer, more premium high-contrast look.
- **DON'T** crowd the interface. If a screen feels busy, move secondary actions into a "More" menu or use tonal nesting to de-emphasize them.

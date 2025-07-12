# IITC Plugin: Microfield Checker

**Microfield Checker** is an IITC (Ingress Intel Total Conversion) plugin that checks microfield nesting based on a triangle of portals. It identifies potential nested microfields, computes nesting levels, and highlights missing fields to help optimize fielding strategies.

---

## 🔍 Application Scenarios

- Ideal for verifying **nearly-completed microfield**.
- Especially useful in **densely linked and portal-rich areas** where visual inspection becomes difficult.

---

## 📦 Features

- Select 3 linked portals as a base triangle.
- Automatically discover all portals nested within the triangle.
- Check if each nested portal forms valid microfields with all three triangle corners.
- Build nesting layers recursively.
- Visualize nesting levels with colored markers and labels.
- Highlight missing fields as semi-transparent red triangle overlays.
- Show detailed field count statistics in an alert report.

---

## 🧩 How It Works

1. You draw 3 **markers** using the **DrawTools** plugin to define the base triangle.
2. The plugin matches these markers to actual portals on the map.
3. It verifies whether the 3 portals form a fully linked triangle.
4. All other portals inside this triangle are analyzed recursively:
   - If a portal can link to all 3 points of a triangle, new nested triangles are created.
   - Each successful nesting increases the portal's level.
5. Missing fields (triangles not covered by an actual field) are detected and rendered.

---

## 📊 Output

After running the plugin, you'll see:

- Colored circular markers for nested portals, labeled by level.
- Red circular markers for portals that were inside the triangle but not used.
- Semi-transparent red triangle overlays showing **missing fields**.
- A popup summary with:
  - Total number of portals
  - Number of well-nested portals
  - Optimal field count
  - Theoretical and actual field count
  - Missing field count
  - List of all missing triangle coordinates

---

## ✅ Requirements

- **IITC CE** or compatible IITC build
- **DrawTools** plugin (required for placing markers)

---

## 🖱️ Usage

1. Open the Ingress Intel Map with IITC enabled.
2. Use the **DrawTools** plugin to place exactly **3 markers** around 3 portals you’ve linked.
3. Click the **"Check-Microfield"** button in the IITC toolbox.
4. Review the visual output and statistics.

---

## 🛠️ Limitations

- Markers must match exact portal positions (with small coordinate tolerance).
- All 3 base portals must be linked to each other.
- Does not auto-link or create fields; purely analytical.
- Field detection relies on portal and field data already loaded on the map.

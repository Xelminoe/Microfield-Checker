The Microfield Analyzer IITC plugin helps identify optimal microfielding structures within a triangular area. It detects nested portals inside a triangle formed by three linked portals, assigns them a microfield level, and displays the structure visually.

✅ Requirements
IITC (Ingress Intel Total Conversion) installed in your browser.

Draw Tools plugin enabled (included in IITC by default).

A region of the map with visible portals and links.

🧾 Installation
Save the full script (provided earlier) as a .user.js file.

Install it using a userscript manager like Tampermonkey or Violentmonkey.

Refresh the Ingress Intel map.

You will see a new “Microfield” button in the top-right IITC toolbox panel.

🧭 How to Use
Step 1: Place 3 Markers
Use the Draw Tools to place exactly 3 markers.

Each marker must be placed on an existing portal.

The 3 portals must be mutually linked (forming a triangle).

🔴 If you place more than 3 markers, or markers are not on portals, the script will terminate with a warning.

Step 2: Run the Script
Click the “Microfield” button in the IITC toolbox.

The script will:

Match the 3 markers to portals.

Validate that all 3 portals are mutually linked.

Assign them level 0.

Search for other portals inside the triangle that are linked to all 3.

Assign those portals level 1, then continue recursively.

Step 3: View the Results
Each portal in the structure will show its level:

Labeled with a number.

Colored based on level.

Portals inside the triangle that are not used in any nesting structure are shown as red dots.

🔍 Interpretation
Portals with higher levels are deeper inside the nested microfielding structure.

A portal at level 3 is inside a triangle whose vertices are at levels like 1, 2, 2, and linked to all of them.

Red-marked portals may indicate inefficiencies or missed linking opportunities.

🛑 Warnings & Edge Cases
Exact coordinate match is required between marker and portal. (Use "snap to portals" button of the Draw Tools)

Duplicate markers or markers on the same portal will cause the script to terminate.

Colinear markers will be warned about but accepted.

No live updates — links and portal changes after clicking the button are not tracked.

♻️ To Run Again
Clear the map or draw new markers.

Reload the page or refresh draw tools.

Click “Microfield” again to re-analyze.


// ==UserScript==
// @id           IITC-Microfield-Checker
// @name         Microfield Checker
// @author       Xelminoe
// @version      1.0.2
// @category     Info
// @description  Check optimal microfield inside a triangle.
// @match        https://intel.ingress.com/*
// @grant        none
// @downloadURL  https://raw.github.com/Xelminoe/Microfield-Checker/main/Microfield-Checker.user.js
// @updateURL    https://raw.github.com/Xelminoe/Microfield-Checker/main/Microfield-Checker.user.js
// @depend       Draw tools
// ==/UserScript==

(function () {
    function wrapper() {
        // Ensure plugin namespace exists
        if (typeof window.plugin !== 'function') window.plugin = () => {};

        const plugin = {};

        // Floating point tolerance (used in marker matching)
        plugin.TOLERANCE = 1e-5;

        // Generate a unique string key for a portal/point based on its coordinates
        plugin.key = function (p) {
            return `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
        };

        // Point-in-polygon test using ray-casting algorithm
        plugin.pnpoly = function (polygon, point) {
            let c = false;
            const n = polygon.length;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                if (
                    ((polygon[i].lat > point.lat) !== (polygon[j].lat > point.lat)) &&
                    (point.lng <
                        (polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat) /
                        (polygon[j].lat - polygon[i].lat) +
                        polygon[i].lng)
                ) {
                    c = !c;
                }
            }
            return c;
        };

        // Check if two portals are linked (exact coordinate match, no tolerance)
        plugin.portalsLinked = function (p1, p2) {
            return Object.values(window.links).some(link => {
                const [a, b] = link.getLatLngs();
                const same = (a, b, x, y) =>
                    a.lat === x.lat &&
                    a.lng === x.lng &&
                    b.lat === y.lat &&
                    b.lng === y.lng;
                return same(a, b, p1, p2) || same(b, a, p1, p2);
            });
        };

        // Main analysis function
        plugin.analyze = function () {
            const markers = [];

            // Collect user-drawn markers from drawTools
            window.plugin.drawTools.drawnItems.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    const { lat, lng } = layer.getLatLng();
                    markers.push({ lat, lng });
                }
            });

            // Ensure exactly 3 markers are placed
            if (markers.length !== 3) {
                alert(`Error: Expected exactly 3 markers, found ${markers.length}.`);
                return;
            }

            // Build a list of all loaded portals with coordinates
            const portalList = Object.values(window.portals).map(p => ({
                lat: p.getLatLng().lat,
                lng: p.getLatLng().lng,
                ref: p
            }));

            // Build a list of all fields with 3 anchor portals (triangle fields)
            const fieldList = Object.values(window.fields).map(f => {
                const points = f.options?.data?.points;
                if (!points || points.length !== 3) return null;

                return {
                    latlngs: points.map(pt => ({
                        lat: pt.latE6 / 1e6,
                        lng: pt.lngE6 / 1e6,
                    })),
                    ref: f
                };
            }).filter(f => f !== null);

            // Helper: check if a triangle matches any loaded field
            function matchField(triangle, fieldList) {
                const triCoords = triangle.map(p => `${p.lat},${p.lng}`);
                return fieldList.some(field => {
                    const fieldCoords = field.latlngs.map(p => `${p.lat},${p.lng}`);
                    return triCoords.every(coord => fieldCoords.includes(coord));
                });
            }

            // Helper: find the portal in portalList that matches a marker
            function matchMarker(marker) {
                return portalList.find(p =>
                    Math.abs(p.lat - marker.lat) < plugin.TOLERANCE &&
                    Math.abs(p.lng - marker.lng) < plugin.TOLERANCE
                );
            }

            // Match 3 drawn markers to real portals
            const triangle = markers.map(m => {
                const match = matchMarker(m);
                if (!match) {
                    alert(`Error: No exact portal found at ${m.lat}, ${m.lng}`);
                    throw new Error("Unmatched marker.");
                }
                return match;
            });

            const [A, B, C] = triangle;

            // Verify that the triangle is fully linked
            if (
                !plugin.portalsLinked(A, B) ||
                !plugin.portalsLinked(B, C) ||
                !plugin.portalsLinked(C, A)
            ) {
                alert("Error: The three portals are not all linked pairwise.");
                return;
            }

            // Initialize nesting level tracking
            const levelMap = new Map();
            levelMap.set(plugin.key(A), 0);
            levelMap.set(plugin.key(B), 0);
            levelMap.set(plugin.key(C), 0);

            // Identify all portals inside the triangle (excluding the vertices)
            const polygon = [A, B, C];
            const insidePortals = portalList.filter(p => plugin.pnpoly(polygon, p));
            const unmarked = insidePortals.filter(p => !levelMap.has(plugin.key(p)));

            // Begin BFS triangle expansion from initial triangle
            const queue = [{ points: [A, B, C], level: 0 }];
            const missingFields = [];

            while (queue.length > 0) {
                const tri = queue.shift();
                const [p1, p2, p3] = tri.points;

                // Record triangles that are not covered by existing fields
                if (!matchField([p1, p2, p3], fieldList)) {
                    missingFields.push({
                        points: [p1, p2, p3],
                        level: tri.level
                    });
                }

                // Determine next nesting level
                const l = Math.max(
                    levelMap.get(plugin.key(p1)),
                    levelMap.get(plugin.key(p2)),
                    levelMap.get(plugin.key(p3))
                ) + 1;

                // Attempt to add new portals inside the current triangle
                for (const portal of unmarked) {
                    const k = plugin.key(portal);
                    if (levelMap.has(k)) continue;
                    if (!plugin.pnpoly([p1, p2, p3], portal)) continue;

                    if (
                        plugin.portalsLinked(portal, p1) &&
                        plugin.portalsLinked(portal, p2) &&
                        plugin.portalsLinked(portal, p3)
                    ) {
                        levelMap.set(k, l);
                        queue.push({ points: [p1, p2, portal], level: l });
                        queue.push({ points: [p2, p3, portal], level: l });
                        queue.push({ points: [p3, p1, portal], level: l });
                    }
                }
            }

            // Draw level-labeled colored circles for all nested portals
            const COLORS = [
                '#000000', '#ffcc00', '#ffa500', '#ff6600', '#ff0000',
                '#ff00ff', '#cc00ff', '#9900ff', '#6600ff', '#3333ff',
                '#00ccff', '#00ffcc', '#00ff66', '#00ff00', '#66ff00',
                '#ccff00', '#ffff00'
            ];

            for (const [pos, lvl] of levelMap.entries()) {
                const [lat, lng] = pos.split(',').map(Number);
                const color = COLORS[lvl % COLORS.length];

                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 2
                }).addTo(map);

                const label = L.tooltip({
                    permanent: true,
                    direction: 'center',
                    className: 'mf-label'
                })
                    .setContent(`${lvl}`)
                    .setLatLng([lat, lng]);

                marker.bindTooltip(label);
            }

            // Mark un-nested portals inside the triangle with red circles
            for (const p of insidePortals) {
                if (!levelMap.has(plugin.key(p))) {
                    L.circleMarker([p.lat, p.lng], {
                        radius: 6,
                        color: 'red',
                        fillColor: 'red',
                        fillOpacity: 1,
                        weight: 2
                    }).addTo(map);
                }
            }

            // Draw semi-transparent red polygons for missing fields
            for (const tri of missingFields) {
                const latlngs = tri.points.map(p => [p.lat, p.lng]);

                const poly = L.geodesicPolygon(latlngs, {
                    color: 'red',
                    fillColor: 'red',
                    fillOpacity: 0.15,
                    weight: 1,
                    dashArray: '5,5',
                    interactive: false
                });

                poly.addTo(window.map);
            }

            console.log("Microfield Level Map:", levelMap);

            // Final report with stats and missing field summary
            const totalPortals = insidePortals.length + 3;
            const optimalFieldCount = insidePortals.length * 3 + 1;
            const theoryFieldCount = (levelMap.size - 3) * 3 + 1;
            const actualFieldCount = theoryFieldCount - missingFields.length;
            const missingFieldCount = missingFields.length;

            let missingText = "";
            if (missingFields.length > 0) {
                missingText = "\nMissing Fields:";
                missingFields.forEach((f, i) => {
                    const coords = f.points.map(p => `(${p.lat.toFixed(6)}, ${p.lng.toFixed(6)})`).join(" - ");
                    missingText += `\n${i + 1}. ${coords}`;
                });
            }

            alert(
                `Microfield Analysis Complete.\n` +
                `Total Portal Number: ${totalPortals}\n` +
                `Well-Nested Portals Number: ${levelMap.size}\n` +
                `Field Optimal Number: ${optimalFieldCount}\n` +
                `Well-Nested Field Theory Number: ${theoryFieldCount}\n` +
                `Well-Nested Field Actual Number: ${actualFieldCount}\n` +
                `Well-Nested Field Missing Number: ${missingFieldCount}` +
                missingText
            );
        };

        // Add a button to IITC toolbox to trigger analysis
        plugin.setup = function () {
            $('#toolbox').append(
                `<a onclick="window.plugin.microfieldAnalyzer.analyze()" title="Run microfield analysis">Check-Microfield</a>`
            );
        };

        // Register plugin with IITC
        window.plugin.microfieldAnalyzer = plugin;

        if (!window.bootPlugins) window.bootPlugins = [];
        window.bootPlugins.push(plugin.setup);

        // If IITC already booted, run setup immediately
        if (window.iitcLoaded) plugin.setup();
    }

    // Inject plugin into IITC context
    const script = document.createElement('script');
    script.appendChild(document.createTextNode('(' + wrapper + ')();'));
    (document.body || document.head || document.documentElement).appendChild(script);
})();

// ==UserScript==
// @name         Microfield Analyzer
// @version      1.0
// @category     Highlighter
// @description  Detect and visualize optimal microfield levels inside a drawn triangle.
// @match        https://intel.ingress.com/*
// @grant        none
// ==/UserScript==

(function () {
  function wrapper() {
    if (typeof window.plugin !== 'function') window.plugin = () => {};

    const plugin = {};

    plugin.TOLERANCE = 1e-8;

    plugin.key = function (p) {
      return `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    };

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

    plugin.portalsLinked = function (p1, p2) {
      return Object.values(window.links).some(link => {
        const [a, b] = link.getLatLngs();
        const same = (a, b, x, y) =>
          Math.abs(a.lat - x.lat) < plugin.TOLERANCE &&
          Math.abs(a.lng - x.lng) < plugin.TOLERANCE &&
          Math.abs(b.lat - y.lat) < plugin.TOLERANCE &&
          Math.abs(b.lng - y.lng) < plugin.TOLERANCE;
        return same(a, b, p1, p2) || same(b, a, p1, p2);
      });
    };

    plugin.analyze = function () {
      const markers = [];
      window.plugin.drawTools.drawnItems.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          const { lat, lng } = layer.getLatLng();
          markers.push({ lat, lng });
        }
      });

      if (markers.length !== 3) {
        alert(`Error: Expected exactly 3 markers, found ${markers.length}.`);
        return;
      }

      for (let i = 0; i < 3; ++i) {
        for (let j = i + 1; j < 3; ++j) {
          if (
            Math.abs(markers[i].lat - markers[j].lat) < plugin.TOLERANCE &&
            Math.abs(markers[i].lng - markers[j].lng) < plugin.TOLERANCE
          ) {
            alert("Error: Two markers are too close or duplicate.");
            return;
          }
        }
      }

      const portalList = Object.values(window.portals).map(p => ({
        lat: p.getLatLng().lat,
        lng: p.getLatLng().lng,
        ref: p
      }));

      function matchMarker(marker) {
        return portalList.find(p =>
          Math.abs(p.lat - marker.lat) < plugin.TOLERANCE &&
          Math.abs(p.lng - marker.lng) < plugin.TOLERANCE
        );
      }

      const triangle = markers.map(m => {
        const match = matchMarker(m);
        if (!match) {
          alert(`Error: No exact portal found at ${m.lat}, ${m.lng}`);
          throw new Error("Unmatched marker.");
        }
        return match;
      });

      const [A, B, C] = triangle;
      if (
        !plugin.portalsLinked(A, B) ||
        !plugin.portalsLinked(B, C) ||
        !plugin.portalsLinked(C, A)
      ) {
        alert("Error: The three portals are not all linked pairwise.");
        return;
      }

      const levelMap = new Map();
      levelMap.set(plugin.key(A), 0);
      levelMap.set(plugin.key(B), 0);
      levelMap.set(plugin.key(C), 0);

      const polygon = [A, B, C];
      const insidePortals = portalList.filter(p => plugin.pnpoly(polygon, p));
      const unmarked = insidePortals.filter(p => !levelMap.has(plugin.key(p)));

      const queue = [{ points: [A, B, C], level: 0 }];
      let added = true;

      while (added) {
        added = false;

        for (const tri of queue) {
          const [p1, p2, p3] = tri.points;
          const l = Math.max(
            levelMap.get(plugin.key(p1)),
            levelMap.get(plugin.key(p2)),
            levelMap.get(plugin.key(p3))
          ) + 1;

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
              added = true;
            }
          }
        }
      }

      // Draw markers
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

      console.log("Microfield Level Map:", levelMap);
      alert(`Microfielding complete.\nInside: ${insidePortals.length}, Marked: ${levelMap.size}`);
    };

    // UI button
    plugin.setup = function () {
      $('#toolbox').append(
        `<a onclick="window.plugin.microfieldAnalyzer.analyze()" title="Run microfield analysis">Microfield</a>`
      );
    };

    window.plugin.microfieldAnalyzer = plugin;

    if (window.iitcLoaded) {
      plugin.setup();
    } else {
      window.addHook('iitcLoaded', plugin.setup);
    }
  }

  const script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + wrapper + ')();'));
  (document.body || document.head || document.documentElement).appendChild(script);
})();

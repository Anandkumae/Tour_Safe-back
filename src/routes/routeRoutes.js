const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const RiskZone = require("../models/RiskZone");
const { distanceMeters } = require("../utils/geo");
const { predictRisk } = require("../services/mlRiskService");

const router = express.Router();

function riskColorFromScore(score) {
  if (score >= 5) return "red";
  if (score >= 2) return "yellow";
  return "green";
}

function mergeByColor(points, colors) {
  const segments = [];
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    const prevColor = colors[i - 1];
    const nextColor = colors[i];
    if (nextColor !== prevColor) {
      const coords = points.slice(start, i).map((p) => [p.lng, p.lat]);
      segments.push({ color: prevColor, coordinates: coords });
      start = i - 1;
    }
  }
  return segments.filter((s) => s.coordinates.length >= 2);
}

async function sampleRoutePoints({ origin, destination, count = 40, mapboxGeometry }) {
  if (Array.isArray(mapboxGeometry) && mapboxGeometry.length >= 2) {
    // Downsample large geometries to keep scoring fast.
    const step = Math.max(1, Math.floor(mapboxGeometry.length / count));
    const sampled = [];
    for (let i = 0; i < mapboxGeometry.length; i += step) {
      const [lng, lat] = mapboxGeometry[i];
      sampled.push({ lat, lng });
    }
    const last = mapboxGeometry[mapboxGeometry.length - 1];
    if (last) sampled.push({ lat: last[1], lng: last[0] });
    return sampled;
  }

  const points = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    points.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t
    });
  }
  return points;
}

function pointRiskScore(point, zones) {
  const nearby = zones.filter((z) => distanceMeters(point.lat, point.lng, z.lat, z.lng) <= z.radiusMeters);
  let score = 0;
  for (const z of nearby) {
    if (z.riskLevel === "high") score += 5;
    else if (z.riskLevel === "medium") score += 2;
    else score += 1;
  }
  return score;
}

router.post("/safe", auth, async (req, res) => {
  try {
    const { origin, destination } = req.body || {};
    if (!origin || !destination) {
      return res.status(400).json({ message: "origin and destination are required" });
    }

    const originLat = Number(origin.lat);
    const originLng = Number(origin.lng);
    const destLat = Number(destination.lat);
    const destLng = Number(destination.lng);

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng) || !Number.isFinite(destLat) || !Number.isFinite(destLng)) {
      return res.status(400).json({ message: "Invalid origin/destination coordinates" });
    }

    const zones = await RiskZone.find();

    // If MAPBOX_DIRECTIONS_TOKEN is set, fetch multiple route alternatives and pick safest.
    let candidateRoutes = [];
    if (process.env.MAPBOX_DIRECTIONS_TOKEN) {
      try {
        const token = process.env.MAPBOX_DIRECTIONS_TOKEN;
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${originLng},${originLat};${destLng},${destLat}?alternatives=true&geometries=geojson&overview=full&steps=false&access_token=${token}`;
        const { data } = await axios.get(url, { timeout: 5000 });
        candidateRoutes = (data?.routes || []).slice(0, 3).map((r, idx) => ({
          idx,
          geometry: r?.geometry?.coordinates || [],
          duration: r?.duration || null,
          distance: r?.distance || null
        }));
      } catch (_e) {
        candidateRoutes = [];
      }
    }

    if (!candidateRoutes.length) {
      candidateRoutes = [
        {
          idx: 0,
          geometry: null,
          duration: null,
          distance: null
        }
      ];
    }

    const scored = [];
    for (const route of candidateRoutes) {
      const routePoints = await sampleRoutePoints({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        count: 70,
        mapboxGeometry: route.geometry
      });

      const pointScores = routePoints.map((p) => pointRiskScore(p, zones));
      const pointColors = pointScores.map((s) => riskColorFromScore(s));
      const routeSegments = mergeByColor(routePoints, pointColors);
      const riskScore = pointScores.reduce((a, b) => a + b, 0) / Math.max(1, pointScores.length);

      scored.push({
        idx: route.idx,
        riskScore: Number(riskScore.toFixed(3)),
        duration: route.duration,
        distance: route.distance,
        routeSegments
      });
    }

    scored.sort((a, b) => a.riskScore - b.riskScore);
    const best = scored[0];

    // ML-based destination reassurance (single call, not per segment).
    const nearbyRisksAtDest = zones
      .filter((z) => distanceMeters(destLat, destLng, z.lat, z.lng) <= z.radiusMeters)
      .map((z) => ({ zone: z.name, riskLevel: z.riskLevel }));

    const predictedRisk = await predictRisk({
      latitude: destLat,
      longitude: destLng,
      time_of_day: new Date().getHours(),
      crime_rate: 4,
      lighting: 3,
      footfall: 5,
      previous_incidents: nearbyRisksAtDest.length
    });

    return res.json({
      routeSegments: best?.routeSegments || [],
      bestRiskScore: best?.riskScore ?? null,
      alternativeRoutes: scored,
      predictedRisk,
      nearbyRisksAtDest
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to compute safe route", error: err.message });
  }
});

module.exports = router;


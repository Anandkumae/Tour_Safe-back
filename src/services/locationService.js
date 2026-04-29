const RiskZone = require("../models/RiskZone");
const { distanceMeters } = require("../utils/geo");
const { predictRisk } = require("./mlRiskService");

async function evaluateLocationRisk(payload) {
  const { lat, lng } = payload;
  const zones = await RiskZone.find();
  const nearbyRisks = zones
    .filter((zone) => distanceMeters(lat, lng, zone.lat, zone.lng) <= zone.radiusMeters)
    .map((zone) => ({
      zone: zone.name,
      riskLevel: zone.riskLevel,
      message: `High-risk area ahead: ${zone.name} (after ${zone.activeAfterHour}:00)`
    }));

  const predictionFeatures = {
    latitude: lat,
    longitude: lng,
    time_of_day: Number(payload.time_of_day ?? new Date().getHours()),
    crime_rate: Number(payload.crime_rate ?? 4),
    lighting: Number(payload.lighting ?? 3),
    footfall: Number(payload.footfall ?? 5),
    previous_incidents: Number(payload.previous_incidents ?? nearbyRisks.length)
  };
  const predictedRisk = await predictRisk(predictionFeatures);
  return { nearbyRisks, predictedRisk };
}

function buildRouteSuggestion(predictedRisk, nearbyRisks) {
  if (nearbyRisks.some((r) => r.riskLevel === "high") || predictedRisk === "high") {
    return [
      { segment: "A-B", color: "red", note: "Avoid this street at night" },
      { segment: "B-C", color: "yellow", note: "Moderate caution advised" },
      { segment: "C-D", color: "green", note: "Safer alternate route" }
    ];
  }
  if (predictedRisk === "medium") {
    return [
      { segment: "A-B", color: "yellow", note: "Keep awareness high" },
      { segment: "B-C", color: "green", note: "Relatively safe" }
    ];
  }
  return [
    { segment: "A-B", color: "green", note: "Safe route recommended" },
    { segment: "B-C", color: "green", note: "Continue on this route" }
  ];
}

module.exports = { evaluateLocationRisk, buildRouteSuggestion };

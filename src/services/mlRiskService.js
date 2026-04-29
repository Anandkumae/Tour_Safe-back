const axios = require("axios");

function fallbackRiskScore(features) {
  const { crime_rate = 0, lighting = 3, footfall = 5, previous_incidents = 0, time_of_day = 12 } = features;
  const isNight = time_of_day >= 20 || time_of_day <= 5;
  const score = crime_rate * 2 + previous_incidents * 1.5 + (5 - lighting) * 1.5 + (isNight ? 3 : 0) - footfall * 0.5;
  return score >= 10 ? "high" : score >= 6 ? "medium" : "low";
}

async function predictRisk(features) {
  const mlUrl = process.env.ML_SERVICE_URL;
  if (!mlUrl) {
    return fallbackRiskScore(features);
  }

  try {
    const { data } = await axios.post(`${mlUrl}/predict`, features, { timeout: 3000 });
    return Number(data.risk) === 1 ? "high" : "low";
  } catch (_error) {
    return fallbackRiskScore(features);
  }
}

module.exports = { predictRisk };

// Haversine distance in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Tokenize and clean text
function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

// Jaccard similarity between two token sets
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Finds similar / duplicate complaints for a new submission or query
 * @param {object} newIssue { category_id, title, description, latitude, longitude }
 * @param {Array} existingComplaints Array of active/recent complaint rows
 * @param {number} threshold Min similarity score (0-1) to qualify as duplicate (default 0.45)
 */
function findDuplicates(newIssue, existingComplaints, threshold = 0.45) {
  const newTokens = tokenize(`${newIssue.title || ''} ${newIssue.description || ''}`);
  const matches = [];

  for (const existing of existingComplaints) {
    // Only compare complaints that are not closed or older than 90 days
    if (existing.status === 'CLOSED') continue;

    let score = 0;
    const reasons = [];

    // 1. Category match (Weight: 30%)
    const sameCategory = Number(newIssue.category_id) === Number(existing.category_id);
    if (sameCategory) {
      score += 0.3;
      reasons.push('Same civic issue category');
    }

    // 2. Proximity check (Weight: 35%)
    let distanceMeters = null;
    if (
      newIssue.latitude != null &&
      newIssue.longitude != null &&
      existing.latitude != null &&
      existing.longitude != null
    ) {
      distanceMeters = haversineDistance(
        newIssue.latitude,
        newIssue.longitude,
        existing.latitude,
        existing.longitude
      );

      if (distanceMeters <= 50) {
        score += 0.35;
        reasons.push(`Exact nearby location (${distanceMeters}m away)`);
      } else if (distanceMeters <= 200) {
        score += 0.28;
        reasons.push(`Very close proximity (${distanceMeters}m away)`);
      } else if (distanceMeters <= 500) {
        score += 0.18;
        reasons.push(`Same immediate neighbourhood (${distanceMeters}m away)`);
      }
    }

    // 3. Text description similarity (Weight: 35%)
    const existingTokens = tokenize(`${existing.title || ''} ${existing.description || ''}`);
    const textSim = jaccardSimilarity(newTokens, existingTokens);
    if (textSim > 0.15) {
      const textScore = Math.min(0.35, textSim * 0.5);
      score += textScore;
      reasons.push(`Matching keywords and description (${Math.round(textSim * 100)}% match)`);
    }

    const similarityPercentage = Math.round(score * 100);

    if (score >= threshold) {
      matches.push({
        complaint: existing,
        similarityScore: Number(score.toFixed(2)),
        similarityPercentage,
        distanceMeters,
        reasons,
      });
    }
  }

  // Sort descending by highest similarity score
  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}

module.exports = {
  haversineDistance,
  tokenize,
  jaccardSimilarity,
  findDuplicates,
};

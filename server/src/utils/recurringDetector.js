const { haversineDistance } = require('./duplicateDetector');

/**
 * Groups complaints by category and geo-spatial cluster (<= 350 meters)
 * Returns recurring issue hotspots with actionable recommendations for municipal leadership.
 */
function detectRecurringIssues(complaintsList, clusterRadiusMeters = 350, minClusterSize = 2) {
  const clusters = [];
  const processedIds = new Set();

  for (let i = 0; i < complaintsList.length; i++) {
    const root = complaintsList[i];
    if (processedIds.has(root.id)) continue;

    const clusterItems = [root];
    processedIds.add(root.id);

    for (let j = i + 1; j < complaintsList.length; j++) {
      const candidate = complaintsList[j];
      if (processedIds.has(candidate.id)) continue;

      // Must be same category
      if (root.category_id !== candidate.category_id) continue;

      let inSameZone = false;

      // Check geo proximity if coordinates exist
      if (
        root.latitude != null &&
        root.longitude != null &&
        candidate.latitude != null &&
        candidate.longitude != null
      ) {
        const dist = haversineDistance(
          root.latitude,
          root.longitude,
          candidate.latitude,
          candidate.longitude
        );
        if (dist <= clusterRadiusMeters) {
          inSameZone = true;
        }
      } else if (
        root.district &&
        candidate.district &&
        root.district.toLowerCase() === candidate.district.toLowerCase() &&
        root.landmark &&
        candidate.landmark &&
        root.landmark.toLowerCase().trim() === candidate.landmark.toLowerCase().trim()
      ) {
        // Fallback: exact landmark match within same district
        inSameZone = true;
      }

      if (inSameZone) {
        clusterItems.push(candidate);
        processedIds.add(candidate.id);
      }
    }

    if (clusterItems.length >= minClusterSize) {
      // Determine central coordinates and location name
      const validGeoItems = clusterItems.filter((c) => c.latitude != null && c.longitude != null);
      const avgLat = validGeoItems.length
        ? validGeoItems.reduce((acc, c) => acc + c.latitude, 0) / validGeoItems.length
        : root.latitude;
      const avgLng = validGeoItems.length
        ? validGeoItems.reduce((acc, c) => acc + c.longitude, 0) / validGeoItems.length
        : root.longitude;

      // Recommendation strategy based on category
      const catName = root.category_name || 'Civic Issue';
      let recommendedAction = 'Conduct root-cause municipal inspection and implement lasting capital improvements.';
      const catLower = catName.toLowerCase();
      if (catLower.includes('garbage')) {
        recommendedAction = 'Install permanent segregated waste dumpster, schedule twice-daily sanitation collection, and deploy CCTV surveillance to penalize illegal dumping.';
      } else if (catLower.includes('pothole') || catLower.includes('road')) {
        recommendedAction = 'Full asphalt resurfacing and stormwater drain gradient correction required instead of temporary cold-patching.';
      } else if (catLower.includes('water leakage')) {
        recommendedAction = 'Examine high-pressure pipeline integrity and replace aging ductile iron pipe section.';
      } else if (catLower.includes('drainage')) {
        recommendedAction = 'Heavy desilting of trunk storm drain and clear underground culvert blockages before monsoon.';
      } else if (catLower.includes('streetlight')) {
        recommendedAction = 'Replace degraded wiring feeder pillar and convert luminaires to surge-protected smart LED fixtures.';
      }

      clusters.push({
        id: `recurring-${root.category_id}-${clusters.length + 1}`,
        categoryId: root.category_id,
        categoryName: catName,
        district: root.district,
        approximateArea: root.landmark || root.address,
        latitude: avgLat,
        longitude: avgLng,
        totalComplaints: clusterItems.length,
        complaintIds: clusterItems.map((c) => c.complaint_code || c.id),
        resolvedCount: clusterItems.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
        activeCount: clusterItems.filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).length,
        latestReportedDate: clusterItems.reduce((latest, c) => (c.created_at > latest ? c.created_at : latest), clusterItems[0].created_at),
        recommendedAction,
      });
    }
  }

  return clusters.sort((a, b) => b.totalComplaints - a.totalComplaints);
}

module.exports = {
  detectRecurringIssues,
};

  const chartData = analyticsData.snapshots.map(snap => {
    const dateStr = new Date(snap.scrapeDate).toISOString().split('T')[0];
    const point = { date: dateStr };
    const catBreakdown = snap.priceAnalytics?.categoryBreakdown || {};
    
    if (selectedCategory === 'ALL') {
      let sum = 0, count = 0;
      Object.values(catBreakdown).forEach(c => {
        if (c.avgPrice) { sum += c.avgPrice; count++; }
      });
      point.avgPrice = count > 0 ? (sum / count) : 0;
    } else {
      point.avgPrice = catBreakdown[selectedCategory]?.avgPrice || 0;
    }
    return point;
  });

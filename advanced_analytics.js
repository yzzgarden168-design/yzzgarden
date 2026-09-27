// ==================== 高级效果可视化分析系统 ====================

// 效果数据存储
const effectData = {
    // 每日数据
    daily: [],
    // 每周数据
    weekly: [],
    // 每月数据
    monthly: [],
    // 关键词排名数据
    keywordRankings: [],
    // 平台效果数据
    platformEffects: {},
    // 转化漏斗数据
    conversionFunnel: {},
    // ROI数据
    roiData: [],
    // 竞品对比数据
    competitorData: []
};

// 初始化效果数据
function initializeEffectData() {
    const stored = localStorage.getItem('effectData');
    if (stored) {
        Object.assign(effectData, JSON.parse(stored));
    } else {
        // 生成初始模拟数据
        generateInitialEffectData();
        saveEffectData();
    }
}

// 生成初始模拟数据
function generateInitialEffectData() {
    const startDate = new Date('2026-04-03');
    const endDate = new Date('2026-04-17');
    const keywords = systemState.keywords || [];

    // 生成每日数据
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayProgress = (date - startDate) / (endDate - startDate);

        effectData.daily.push({
            date: date.toISOString().split('T')[0],
            exposure: Math.floor(5000 + dayProgress * 50000),
            impressions: Math.floor(3000 + dayProgress * 30000),
            clicks: Math.floor(200 + dayProgress * 2000),
            naturalTraffic: Math.floor(100 + dayProgress * 1000),
            avgRanking: Math.max(10, 10 - dayProgress * 5),
            conversionRate: 2 + dayProgress * 2.5,
            orders: Math.floor(5 + dayProgress * 20),
            revenue: Math.floor(200 + dayProgress * 800)
        });
    }

    // 生成关键词排名数据
    keywords.forEach(keyword => {
        const rankingHistory = [];
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dayProgress = (date - startDate) / (endDate - startDate);
            const initialRank = keyword.difficulty === 'low' ? 20 :
                               keyword.difficulty === 'medium' ? 30 : 40;

            rankingHistory.push({
                date: date.toISOString().split('T')[0],
                rank: Math.max(1, Math.round(initialRank - dayProgress * (initialRank - 5))),
                keyword: keyword.keyword,
                platform: keyword.platform
            });
        }
        effectData.keywordRankings.push({
            keyword: keyword.keyword,
            platform: keyword.platform,
            difficulty: keyword.difficulty,
            history: rankingHistory
        });
    });

    // 生成平台效果数据
    ['xiaohongshu', 'douyin', 'zhihu', 'tianmao'].forEach(platform => {
        effectData.platformEffects[platform] = {
            contentCount: Math.floor(10 + Math.random() * 20),
            totalViews: Math.floor(50000 + Math.random() * 100000),
            totalLikes: Math.floor(5000 + Math.random() * 10000),
            totalShares: Math.floor(1000 + Math.random() * 3000),
            totalComments: Math.floor(500 + Math.random() * 1500),
            avgEngagementRate: 5 + Math.random() * 10,
            conversionRate: 2 + Math.random() * 3,
            revenue: Math.floor(5000 + Math.random() * 15000)
        };
    });

    // 生成转化漏斗数据
    effectData.conversionFunnel = {
        stages: ['曝光', '浏览', '点击', '详情页', '加购', '下单', '付款'],
        values: [150000, 80000, 20000, 8000, 3000, 1500, 800],
        conversionRates: [0, 53.33, 25.0, 40.0, 37.5, 50.0, 53.33],
        stageMetrics: {
            exposure: { users: 150000, revenue: 0, cost: 5000 },
            view: { users: 80000, revenue: 0, cost: 3000 },
            click: { users: 20000, revenue: 0, cost: 8000 },
            detail: { users: 8000, revenue: 0, cost: 4000 },
            cart: { users: 3000, revenue: 0, cost: 2000 },
            order: { users: 1500, revenue: 75000, cost: 1000 },
            payment: { users: 800, revenue: 40000, cost: 500 }
        }
    };

    // 生成ROI数据
    for (let i = 0; i < 7; i++) {
        effectData.roiData.push({
            week: `第${i + 1}周`,
            investment: Math.floor(120000 + i * 5000),
            revenue: Math.floor(150000 + i * 20000),
            profit: Math.floor(30000 + i * 15000),
            roi: ((150000 + i * 20000) / (120000 + i * 5000) * 100 - 100).toFixed(2)
        });
    }

    // 生成竞品对比数据
    effectData.competitorData = [
        {
            name: '园之助',
            metrics: {
                keywordCoverage: 75,
                avgRanking: 8.5,
                contentCount: 50,
                totalRevenue: 98500,
                growthRate: 35
            }
        },
        {
            name: '竞争对手A',
            metrics: {
                keywordCoverage: 85,
                avgRanking: 6.2,
                contentCount: 120,
                totalRevenue: 150000,
                growthRate: 25
            }
        },
        {
            name: '竞争对手B',
            metrics: {
                keywordCoverage: 65,
                avgRanking: 12.3,
                contentCount: 35,
                totalRevenue: 65000,
                growthRate: 18
            }
        }
    ];
}

// 保存效果数据
function saveEffectData() {
    localStorage.setItem('effectData', JSON.stringify(effectData));
}

// 获取效果统计
function getEffectStats(timeRange = 'all') {
    const filteredData = filterDataByTimeRange(effectData.daily, timeRange);

    const stats = {
        timeRange,
        period: {
            start: filteredData[0]?.date || '',
            end: filteredData[filteredData.length - 1]?.date || ''
        },
        exposure: {
            total: filteredData.reduce((sum, d) => sum + d.exposure, 0),
            avg: filteredData.length > 0 ?
                Math.round(filteredData.reduce((sum, d) => sum + d.exposure, 0) / filteredData.length) : 0,
            growth: calculateGrowth(filteredData, 'exposure')
        },
        traffic: {
            total: filteredData.reduce((sum, d) => sum + d.naturalTraffic, 0),
            avg: filteredData.length > 0 ?
                Math.round(filteredData.reduce((sum, d) => sum + d.naturalTraffic, 0) / filteredData.length) : 0,
            growth: calculateGrowth(filteredData, 'naturalTraffic')
        },
        clicks: {
            total: filteredData.reduce((sum, d) => sum + d.clicks, 0),
            ctr: filteredData.reduce((sum, d) => sum + (d.clicks / d.impressions * 100), 0) / filteredData.length,
            growth: calculateGrowth(filteredData, 'clicks')
        },
        conversions: {
            totalOrders: filteredData.reduce((sum, d) => sum + d.orders, 0),
            totalRevenue: filteredData.reduce((sum, d) => sum + d.revenue, 0),
            avgConversionRate: filteredData.reduce((sum, d) => sum + d.conversionRate, 0) / filteredData.length,
            avgOrderValue: filteredData.reduce((sum, d) => sum + d.revenue, 0) /
                           Math.max(1, filteredData.reduce((sum, d) => sum + d.orders, 0)),
            growth: calculateGrowth(filteredData, 'revenue')
        },
        keywords: {
            total: effectData.keywordRankings.length,
            top10: effectData.keywordRankings.filter(k =>
                k.history[k.history.length - 1].rank <= 10
            ).length,
            top3: effectData.keywordRankings.filter(k =>
                k.history[k.history.length - 1].rank <= 3
            ).length,
            avgRanking: effectData.keywordRankings.length > 0 ?
                Math.round(effectData.keywordRankings.reduce((sum, k) =>
                    sum + k.history[k.history.length - 1].rank, 0) / effectData.keywordRankings.length) : 0
        },
        platforms: effectData.platformEffects
    };

    return stats;
}

// 根据时间范围过滤数据
function filterDataByTimeRange(data, timeRange) {
    const now = new Date();
    let startDate;

    if (timeRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
        return data; // 返回所有数据
    }

    return data.filter(d => new Date(d.date) >= startDate);
}

// 计算增长率
function calculateGrowth(data, field) {
    if (data.length < 2) return 0;

    const firstValue = data[0][field];
    const lastValue = data[data.length - 1][field];

    if (firstValue === 0) return 0;

    return ((lastValue - firstValue) / firstValue * 100).toFixed(2);
}

// 获取转化漏斗分析
function getConversionFunnelAnalysis() {
    const funnel = effectData.conversionFunnel;

    // 计算每个阶段的转化率和成本
    const stageAnalysis = [];
    for (let i = 0; i < funnel.stages.length; i++) {
        const stage = funnel.stages[i];
        const metrics = funnel.stageMetrics[stage.toLowerCase()];

        stageAnalysis.push({
            stage,
            users: metrics.users,
            revenue: metrics.revenue,
            cost: metrics.cost,
            conversionRate: funnel.conversionRates[i],
            costPerUser: metrics.users > 0 ? (metrics.cost / metrics.users).toFixed(2) : 0,
            revenuePerUser: metrics.users > 0 ? (metrics.revenue / metrics.users).toFixed(2) : 0
        });
    }

    // 计算整体转化率
    const overallConversionRate = (funnel.values[funnel.values.length - 1] / funnel.values[0] * 100).toFixed(2);

    // 计算总成本和总收入
    const totalCost = Object.values(funnel.stageMetrics).reduce((sum, m) => sum + m.cost, 0);
    const totalRevenue = Object.values(funnel.stageMetrics).reduce((sum, m) => sum + m.revenue, 0);

    return {
        funnel,
        stageAnalysis,
        overallConversionRate,
        totalCost,
        totalRevenue,
        roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost * 100).toFixed(2) : 0,
        profit: totalRevenue - totalCost
    };
}

// 获取ROI分析
function getROIAnalysis(timeRange = 'all') {
    const roiData = effectData.roiData;
    const filteredData = filterDataByTimeRange(roiData, timeRange);

    if (filteredData.length === 0) {
        return {
            totalInvestment: 0,
            totalRevenue: 0,
            totalProfit: 0,
            avgROI: 0,
            roiTrend: []
        };
    }

    const totalInvestment = filteredData.reduce((sum, d) => sum + d.investment, 0);
    const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
    const totalProfit = filteredData.reduce((sum, d) => sum + d.profit, 0);
    const avgROI = filteredData.reduce((sum, d) => sum + parseFloat(d.roi), 0) / filteredData.length;

    // ROI趋势分析
    const roiTrend = filteredData.map(d => ({
        period: d.week,
        investment: d.investment,
        revenue: d.revenue,
        profit: d.profit,
        roi: parseFloat(d.roi)
    }));

    return {
        totalInvestment,
        totalRevenue,
        totalProfit,
        avgROI,
        roiTrend,
        roiGrowth: filteredData.length > 1 ?
            ((parseFloat(filteredData[filteredData.length - 1].roi) - parseFloat(filteredData[0].roi)) /
             Math.abs(parseFloat(filteredData[0].roi)) * 100).toFixed(2) : 0
    };
}

// 获取关键词排名分析
function getKeywordRankingAnalysis() {
    const analysis = {
        total: effectData.keywordRankings.length,
        distribution: {
            top3: 0,
            top10: 0,
            top20: 0,
            top50: 0,
            top100: 0
        },
        byDifficulty: {
            low: { count: 0, avgRank: 0 },
            medium: { count: 0, avgRank: 0 },
            high: { count: 0, avgRank: 0 }
        },
        byPlatform: {},
        improvements: [],
        decliners: []
    };

    effectData.keywordRankings.forEach(keywordData => {
        const currentRank = keywordData.history[keywordData.history.length - 1].rank;
        const initialRank = keywordData.history[0].rank;

        // 分布统计
        if (currentRank <= 3) analysis.distribution.top3++;
        else if (currentRank <= 10) analysis.distribution.top10++;
        else if (currentRank <= 20) analysis.distribution.top20++;
        else if (currentRank <= 50) analysis.distribution.top50++;
        else analysis.distribution.top100++;

        // 难度统计
        const difficulty = keywordData.difficulty;
        if (!analysis.byDifficulty[difficulty]) {
            analysis.byDifficulty[difficulty] = { count: 0, avgRank: 0 };
        }
        analysis.byDifficulty[difficulty].count++;
        analysis.byDifficulty[difficulty].avgRank += currentRank;

        // 平台统计
        const platform = keywordData.platform;
        if (!analysis.byPlatform[platform]) {
            analysis.byPlatform[platform] = { count: 0, avgRank: 0 };
        }
        analysis.byPlatform[platform].count++;
        analysis.byPlatform[platform].avgRank += currentRank;

        // 变化趋势
        const change = initialRank - currentRank;
        if (change > 5) {
            analysis.improvements.push({
                keyword: keywordData.keyword,
                platform,
                initialRank,
                currentRank,
                change
            });
        } else if (change < -5) {
            analysis.decliners.push({
                keyword: keywordData.keyword,
                platform,
                initialRank,
                currentRank,
                change
            });
        }
    });

    // 计算平均排名
    ['low', 'medium', 'high'].forEach(difficulty => {
        if (analysis.byDifficulty[difficulty].count > 0) {
            analysis.byDifficulty[difficulty].avgRank =
                Math.round(analysis.byDifficulty[difficulty].avgRank / analysis.byDifficulty[difficulty].count);
        }
    });

    Object.keys(analysis.byPlatform).forEach(platform => {
        analysis.byPlatform[platform].avgRank =
            Math.round(analysis.byPlatform[platform].avgRank / analysis.byPlatform[platform].count);
    });

    // 排序改进和下降的关键词
    analysis.improvements.sort((a, b) => b.change - a.change);
    analysis.decliners.sort((a, b) => a.change - b.change);

    return analysis;
}

// 获取平台效果对比
function getPlatformEffectComparison() {
    const comparison = [];

    Object.entries(effectData.platformEffects).forEach(([platform, data]) => {
        const config = window.SmartDistributor?.platformConfig?.[platform];

        comparison.push({
            platform,
            name: config?.name || platform,
            icon: config?.icon || '📊',
            color: config?.color || '#000',
            metrics: {
                contentCount: data.contentCount,
                totalViews: data.totalViews,
                totalLikes: data.totalLikes,
                totalShares: data.totalShares,
                totalComments: data.totalComments,
                engagementRate: data.avgEngagementRate,
                conversionRate: data.conversionRate,
                revenue: data.revenue
            },
            performance: {
                viewPerContent: data.contentCount > 0 ?
                    Math.round(data.totalViews / data.contentCount) : 0,
                likePerView: data.totalViews > 0 ?
                    ((data.totalLikes / data.totalViews) * 100).toFixed(2) : 0,
                sharePerView: data.totalViews > 0 ?
                    ((data.totalShares / data.totalViews) * 100).toFixed(2) : 0,
                revenuePerView: data.totalViews > 0 ?
                    Math.round(data.revenue / data.totalViews) : 0,
                conversionValue: data.conversionRate * data.revenue
            },
            score: calculatePlatformEffectScore(data)
        });
    });

    return comparison.sort((a, b) => b.score - a.score);
}

// 计算平台效果得分
function calculatePlatformEffectScore(data) {
    return Math.round(
        data.contentCount * 1 +
        data.totalViews * 0.001 +
        data.totalLikes * 0.01 +
        data.totalShares * 0.05 +
        data.avgEngagementRate * 2 +
        data.conversionRate * 10 +
        data.revenue * 0.01
    );
}

// 获取竞品对比分析
function getCompetitorAnalysis() {
    const ourData = effectData.competitorData.find(c => c.name === '园之助');
    const competitors = effectData.competitorData.filter(c => c.name !== '园之助');

    const comparison = {
        ourCompany: ourData,
        competitors,
        analysis: {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: []
        }
    };

    if (ourData && competitors.length > 0) {
        const avgCompetitorMetrics = {
            keywordCoverage: competitors.reduce((sum, c) => sum + c.metrics.keywordCoverage, 0) / competitors.length,
            avgRanking: competitors.reduce((sum, c) => sum + c.metrics.avgRanking, 0) / competitors.length,
            contentCount: competitors.reduce((sum, c) => sum + c.metrics.contentCount, 0) / competitors.length,
            totalRevenue: competitors.reduce((sum, c) => sum + c.metrics.totalRevenue, 0) / competitors.length,
            growthRate: competitors.reduce((sum, c) => sum + c.metrics.growthRate, 0) / competitors.length
        };

        // 优势分析
        if (ourData.metrics.growthRate > avgCompetitorMetrics.growthRate) {
            comparison.analysis.strengths.push({
                metric: '增长率',
                value: ourData.metrics.growthRate,
                competitorAvg: avgCompetitorMetrics.growthRate,
                advantage: ourData.metrics.growthRate - avgCompetitorMetrics.growthRate
            });
        }

        // 劣势分析
        if (ourData.metrics.keywordCoverage < avgCompetitorMetrics.keywordCoverage) {
            comparison.analysis.weaknesses.push({
                metric: '关键词覆盖率',
                value: ourData.metrics.keywordCoverage,
                competitorAvg: avgCompetitorMetrics.keywordCoverage,
                gap: avgCompetitorMetrics.keywordCoverage - ourData.metrics.keywordCoverage
            });
        }

        if (ourData.metrics.contentCount < avgCompetitorMetrics.contentCount) {
            comparison.analysis.weaknesses.push({
                metric: '内容数量',
                value: ourData.metrics.contentCount,
                competitorAvg: avgCompetitorMetrics.contentCount,
                gap: avgCompetitorMetrics.contentCount - ourData.metrics.contentCount
            });
        }

        // 机会分析
        if (ourData.metrics.avgRanking > avgCompetitorMetrics.avgRanking) {
            comparison.analysis.opportunities.push({
                metric: '平均排名',
                value: ourData.metrics.avgRanking,
                competitorAvg: avgCompetitorMetrics.avgRanking,
                potential: ourData.metrics.avgRanking - avgCompetitorMetrics.avgRanking
            });
        }
    }

    return comparison;
}

// 获取预测数据
function getPredictionData(days = 30) {
    const lastDay = effectData.daily[effectData.daily.length - 1];
    if (!lastDay) return null;

    const predictions = [];
    let currentDate = new Date(lastDay.date);

    // 使用简单线性回归进行预测
    const dataLength = Math.min(effectData.daily.length, 7);
    const recentData = effectData.daily.slice(-dataLength);

    const trends = {};
    ['exposure', 'impressions', 'clicks', 'naturalTraffic', 'orders', 'revenue'].forEach(metric => {
        const x = recentData.map((_, i) => i);
        const y = recentData.map(d => d[metric]);
        const n = x.length;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        trends[metric] = { slope, intercept };
    });

    for (let i = 1; i <= days; i++) {
        currentDate.setDate(currentDate.getDate() + 1);

        predictions.push({
            date: currentDate.toISOString().split('T')[0],
            exposure: Math.max(0, Math.round(trends.exposure.slope * (dataLength + i) + trends.exposure.intercept)),
            impressions: Math.max(0, Math.round(trends.impressions.slope * (dataLength + i) + trends.impressions.intercept)),
            clicks: Math.max(0, Math.round(trends.clicks.slope * (dataLength + i) + trends.clicks.intercept)),
            naturalTraffic: Math.max(0, Math.round(trends.naturalTraffic.slope * (dataLength + i) + trends.naturalTraffic.intercept)),
            orders: Math.max(0, Math.round(trends.orders.slope * (dataLength + i) + trends.orders.intercept)),
            revenue: Math.max(0, Math.round(trends.revenue.slope * (dataLength + i) + trends.revenue.intercept))
        });
    }

    return predictions;
}

// 获取推荐行动
function getRecommendations() {
    const stats = getEffectStats();
    const keywordAnalysis = getKeywordRankingAnalysis();
    const platformComparison = getPlatformEffectComparison();
    const competitorAnalysis = getCompetitorAnalysis();

    const recommendations = [];

    // 关键词推荐
    if (keywordAnalysis.improvements.length < 5) {
        recommendations.push({
            type: 'keyword',
            priority: 'high',
            title: '加强关键词优化',
            description: '当前排名大幅提升的关键词较少，建议增加内容投入，提升更多关键词排名',
            action: '增加针对高难度关键词的优质内容产出'
        });
    }

    if (keywordAnalysis.avgRanking > 15) {
        recommendations.push({
            type: 'keyword',
            priority: 'medium',
            title: '提升平均排名',
            description: `当前平均排名为${keywordAnalysis.avgRanking}，目标为进入前10`,
            action: '优化现有内容，增加内链建设，提升页面权威性'
        });
    }

    // 平台推荐
    const bestPlatform = platformComparison[0];
    if (bestPlatform) {
        recommendations.push({
            type: 'platform',
            priority: 'high',
            title: `加大${bestPlatform.name}平台投入`,
            description: `${bestPlatform.name}平台表现最佳，效果得分${bestPlatform.score}，建议增加内容分发`,
            action: `增加${bestPlatform.name}平台内容发布频次，充分利用平台流量红利`
        });
    }

    const worstPlatform = platformComparison[platformComparison.length - 1];
    if (worstPlatform && worstPlatform.score < 100) {
        recommendations.push({
            type: 'platform',
            priority: 'low',
            title: `优化${worstPlatform.name}平台策略`,
            description: `${worstPlatform.name}平台效果不佳，需要调整策略或考虑减少投入`,
            action: '重新评估该平台的内容策略，或考虑暂停该平台的资源投入'
        });
    }

    // 转化率推荐
    if (stats.conversions.avgConversionRate < 4) {
        recommendations.push({
            type: 'conversion',
            priority: 'high',
            title: '提升转化率',
            description: `当前转化率为${stats.conversions.avgConversionRate.toFixed(2)}%，低于目标5%`,
            action: '优化商品详情页，增加信任背书，优化购买流程'
        });
    }

    // 竞品推荐
    if (competitorAnalysis.analysis.weaknesses.length > 0) {
        competitorAnalysis.analysis.weaknesses.forEach(weakness => {
            recommendations.push({
                type: 'competitor',
                priority: 'medium',
                title: `弥补${weakness.metric}差距`,
                description: `在${weakness.metric}方面落后竞争对手${weakness.gap.toFixed(0)}`,
                action: `分析竞争对手在${weakness.metric}方面的成功经验，制定改进计划`
            });
        });
    }

    return recommendations.sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
    });
}

// 添加今日数据
function addTodayData(data) {
    const today = new Date().toISOString().split('T')[0];

    // 检查是否已有今日数据
    const todayIndex = effectData.daily.findIndex(d => d.date === today);
    if (todayIndex >= 0) {
        effectData.daily[todayIndex] = { ...effectData.daily[todayIndex], ...data };
    } else {
        effectData.daily.push({
            date: today,
            ...data
        });
    }

    saveEffectData();
}

// 导出效果数据
function exportEffectData(format = 'json') {
    const data = {
        stats: getEffectStats(),
        funnel: getConversionFunnelAnalysis(),
        roi: getROIAnalysis(),
        keywords: getKeywordRankingAnalysis(),
        platforms: getPlatformEffectComparison(),
        competitors: getCompetitorAnalysis(),
        predictions: getPredictionData(30),
        recommendations: getRecommendations(),
        exportTime: new Date().toISOString()
    };

    if (format === 'json') {
        return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
        return convertToCSV(data);
    }
}

// 转换为CSV格式
function convertToCSV(data) {
    const lines = [];

    // 效果统计
    lines.push('效果统计');
    lines.push('指标,数值');
    lines.push(`曝光量,${data.stats.exposure.total}`);
    lines.push(`自然流量,${data.stats.traffic.total}`);
    lines.push(`点击量,${data.stats.clicks.total}`);
    lines.push(`订单数,${data.stats.conversions.totalOrders}`);
    lines.push(`收入,${data.stats.conversions.totalRevenue}`);

    return lines.join('\n');
}

// 初始化数据
initializeEffectData();

// 导出函数供其他模块使用
window.AdvancedAnalytics = {
    effectData,
    getEffectStats,
    getConversionFunnelAnalysis,
    getROIAnalysis,
    getKeywordRankingAnalysis,
    getPlatformEffectComparison,
    getCompetitorAnalysis,
    getPredictionData,
    getRecommendations,
    addTodayData,
    exportEffectData
};
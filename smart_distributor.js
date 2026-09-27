// ==================== 智能分发系统 ====================

// 分发平台配置
const platformConfig = {
    xiaohongshu: {
        name: '小红书',
        icon: '📱',
        color: '#FF2442',
        peakHours: ['08:00-09:00', '12:00-13:00', '19:00-21:00'],
        bestDays: [1, 2, 3, 6, 7], // 周一到周三，周六周日
        contentLength: { min: 300, max: 800 },
        maxTags: 10,
        imageRequirements: {
            count: { min: 3, max: 9 },
            ratio: '3:4',
            format: ['jpg', 'png', 'webp']
        },
        category: 'lifestyle',
        audience: '年轻女性、园艺爱好者、阳台种植用户'
    },
    douyin: {
        name: '抖音',
        icon: '🎵',
        color: '#000000',
        peakHours: ['06:00-08:00', '12:00-14:00', '18:00-23:00'],
        bestDays: [1, 2, 3, 4, 5, 6, 7], // 每天都适合
        contentLength: { min: 100, max: 300 },
        maxTags: 5,
        videoRequirements: {
            duration: { min: 15, max: 180 },
            ratio: ['9:16', '3:4'],
            format: ['mp4', 'mov']
        },
        category: 'lifestyle',
        audience: '年轻人、短视频用户、家庭用户'
    },
    zhihu: {
        name: '知乎',
        icon: '🧠',
        color: '#0084FF',
        peakHours: ['08:00-10:00', '21:00-23:00'],
        bestDays: [1, 2, 3, 6, 7],
        contentLength: { min: 800, max: 3000 },
        maxTags: 5,
        contentRequirements: {
            minImages: 2,
            minParagraphs: 5,
            structure: ['问题', '分析', '建议', '结论']
        },
        category: 'knowledge',
        audience: '专业人士、知识爱好者、选购决策用户'
    },
    tianmao: {
        name: '天猫',
        icon: '🛒',
        color: '#FF5000',
        peakHours: ['09:00-12:00', '19:00-22:00'],
        bestDays: [1, 2, 3, 4, 5, 6, 7],
        contentLength: { min: 200, max: 500 },
        maxTags: 3,
        contentRequirements: {
            minImages: 3,
            include: ['产品图', '细节图', '场景图']
        },
        category: 'ecommerce',
        audience: '购物用户、品牌搜索用户'
    },
    wechat: {
        name: '微信公众号',
        icon: '💬',
        color: '#07C160',
        peakHours: ['08:00-09:00', '21:00-23:00'],
        bestDays: [2, 3, 4, 5], // 周二到周五
        contentLength: { min: 1500, max: 5000 },
        maxTags: 5,
        contentRequirements: {
            minImages: 5,
            minSections: 6
        },
        category: 'content',
        audience: '订阅用户、深度阅读用户'
    }
};

// 分发策略配置
const distributionStrategy = {
    // 时间策略
    time: {
        // 黄金时间发布
        golden: (platform) => {
            const config = platformConfig[platform];
            if (!config || !config.peakHours) return [];

            const today = new Date().getDay();
            if (!config.bestDays.includes(today)) {
                return [];
            }

            return config.peakHours.map(hour => {
                const [start, end] = hour.split('-');
                const now = new Date();
                const [startHour, startMin] = start.split(':').map(Number);
                const [endHour, endMin] = end.split(':').map(Number);

                return {
                    platform,
                    time: hour,
                    priority: 'high',
                    reason: `平台${config.name}的黄金发布时间`
                };
            });
        },

        // 错峰发布
        staggered: (contentCount, platforms) => {
            const distribution = [];
            const interval = Math.floor(240 / contentCount); // 4小时内平均分布

            platforms.forEach((platform, index) => {
                const now = new Date();
                const publishTime = new Date(now.getTime() + (index * interval * 60000));

                distribution.push({
                    platform,
                    time: `${publishTime.getHours().toString().padStart(2, '0')}:${publishTime.getMinutes().toString().padStart(2, '0')}`,
                    priority: 'medium',
                    reason: '错峰发布，避免平台算法检测'
                });
            });

            return distribution;
        },

        // 智能推荐时间
        recommended: (platform, contentType) => {
            const config = platformConfig[platform];
            const now = new Date();
            const hour = now.getHours();

            // 内容类型优化
            const contentTimeMap = {
                'product_review': ['09:00-12:00', '19:00-21:00'],
                'tutorial': ['08:00-10:00', '14:00-16:00'],
                'story': ['21:00-23:00'],
                'comparison': ['10:00-12:00', '15:00-17:00'],
                'question': ['08:00-10:00', '21:00-22:00']
            };

            const recommendedHours = contentTimeMap[contentType] || config.peakHours;
            const currentMatch = recommendedHours.some(range => {
                const [start, end] = range.split('-');
                const [startHour] = start.split(':').map(Number);
                const [endHour] = end.split(':').map(Number);
                return hour >= startHour && hour < endHour;
            });

            if (currentMatch) {
                return {
                    platform,
                    time: `${hour.toString().padStart(2, '0')}:00`,
                    priority: 'high',
                    reason: '当前时间适合发布此类型内容'
                };
            }

            // 返回下一个推荐时间
            const nextTime = recommendedHours[0];
            return {
                platform,
                time: nextTime,
                priority: 'medium',
                reason: `下一个推荐发布时间：${nextTime}`
            };
        }
    },

    // 平台组合策略
    combination: {
        // 全平台覆盖
        full: (content) => {
            const platforms = Object.keys(platformConfig);
            return platforms.map(platform => ({
                platform,
                reason: '全平台覆盖策略',
                priority: getPlatformPriority(platform)
            }));
        },

        // 精准投放
        targeted: (content, targetAudience) => {
            const suitablePlatforms = [];

            Object.entries(platformConfig).forEach(([key, config]) => {
                if (config.audience.includes(targetAudience) ||
                    config.category === targetAudience) {
                    suitablePlatforms.push({
                        platform: key,
                        reason: `适合${targetAudience}用户群体`,
                        priority: 'high'
                    });
                }
            });

            return suitablePlatforms;
        },

        // 重点突破
        focus: (platform, content) => {
            return [{
                platform,
                reason: `重点突破${platformConfig[platform].name}平台`,
                priority: 'high'
            }];
        },

        // 协同发布
        collaborative: (primaryPlatform, secondaryPlatforms) => {
            const distribution = [];

            // 主平台优先
            distribution.push({
                platform: primaryPlatform,
                time: '优先发布',
                reason: '主要发布平台',
                priority: 'high'
            });

            // 次要平台跟进
            secondaryPlatforms.forEach((platform, index) => {
                distribution.push({
                    platform,
                    time: `+${(index + 1) * 2}小时`,
                    reason: '协同发布，扩大覆盖',
                    priority: 'medium'
                });
            });

            return distribution;
        }
    },

    // 内容优化策略
    content: {
        // 平台适配
        adapt: (content, platform) => {
            const config = platformConfig[platform];
            const adaptations = [];

            // 长度适配
            if (content.length > config.contentLength.max) {
                adaptations.push({
                    type: 'length',
                    action: 'reduce',
                    target: config.contentLength.max,
                    message: `内容长度超出${platform}平台限制，建议缩减至${config.contentLength.max}字`
                });
            } else if (content.length < config.contentLength.min) {
                adaptations.push({
                    type: 'length',
                    action: 'expand',
                    target: config.contentLength.min,
                    message: `内容长度低于${platform}平台推荐，建议扩展至${config.contentLength.min}字`
                });
            }

            // 标签适配
            if (content.tags && content.tags.length > config.maxTags) {
                adaptations.push({
                    type: 'tags',
                    action: 'reduce',
                    target: config.maxTags,
                    message: `标签数量超出${platform}平台限制，建议减少至${config.maxTags}个`
                });
            }

            // 图片适配
            if (config.imageRequirements && content.images) {
                if (content.images.length < config.imageRequirements.count.min) {
                    adaptations.push({
                        type: 'images',
                        action: 'add',
                        target: config.imageRequirements.count.min,
                        message: `${platform}平台建议至少${config.imageRequirements.count.min}张图片`
                    });
                }
            }

            return adaptations;
        },

        // 关键词优化
        optimizeKeywords: (keywords, platform) => {
            const platformKeywords = {
                xiaohongshu: ['种草', '测评', '推荐', '必入', '好物'],
                douyin: ['测评', '教程', '展示', '推荐'],
                zhihu: ['选购', '指南', '评价', '对比'],
                tianmao: ['包邮', '正品', '优惠', '限时'],
                wechat: ['深度', '详解', '攻略', '分享']
            };

            const platformSpecific = platformKeywords[platform] || [];
            const optimized = [...new Set([...keywords, ...platformSpecific])];

            return optimized.slice(0, platformConfig[platform].maxTags);
        }
    }
};

// 获取平台优先级
function getPlatformPriority(platform) {
    const priorities = {
        xiaohongshu: 'high',
        douyin: 'high',
        zhihu: 'medium',
        tianmao: 'high',
        wechat: 'medium'
    };
    return priorities[platform] || 'low';
}

// 分发历史记录
const distributionHistory = [];

// 分发任务管理
const distributionTasks = {
    pending: [],
    processing: [],
    completed: [],
    failed: []
};

// 创建分发任务
function createDistributionTask(content, platforms, strategy = 'golden') {
    const task = {
        id: Date.now(),
        contentId: content.id,
        contentTitle: content.generated ? content.generated.title : content.title,
        platforms: [],
        strategy: strategy,
        status: 'pending',
        createdAt: new Date().toISOString(),
        scheduledTimes: [],
        results: []
    };

    // 根据策略生成分发计划
    if (strategy === 'golden') {
        platforms.forEach(platform => {
            const timePlan = distributionStrategy.time.golden(platform);
            if (timePlan.length > 0) {
                task.scheduledTimes.push(...timePlan);
                task.platforms.push({
                    platform,
                    scheduledTime: timePlan[0].time,
                    priority: timePlan[0].priority,
                    reason: timePlan[0].reason
                });
            }
        });
    } else if (strategy === 'staggered') {
        const timePlan = distributionStrategy.time.staggered(platforms.length, platforms);
        timePlan.forEach((item, index) => {
            task.scheduledTimes.push(item);
            task.platforms.push({
                platform: platforms[index],
                scheduledTime: item.time,
                priority: item.priority,
                reason: item.reason
            });
        });
    } else if (strategy === 'recommended') {
        platforms.forEach(platform => {
            const contentType = content.metadata?.type || 'product_review';
            const timePlan = distributionStrategy.time.recommended(platform, contentType);
            task.scheduledTimes.push(timePlan);
            task.platforms.push({
                platform,
                scheduledTime: timePlan.time,
                priority: timePlan.priority,
                reason: timePlan.reason
            });
        });
    }

    distributionTasks.pending.push(task);
    saveDistributionTasks();

    return task;
}

// 执行分发任务
async function executeDistributionTask(taskId) {
    const taskIndex = distributionTasks.pending.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    const task = distributionTasks.pending.splice(taskIndex, 1)[0];
    task.status = 'processing';
    distributionTasks.processing.push(task);
    saveDistributionTasks();

    // 模拟分发过程
    for (const platformItem of task.platforms) {
        const platform = platformItem.platform;
        const config = platformConfig[platform];

        try {
            // 检查平台适配性
            const content = getContentById(task.contentId);
            if (content) {
                const adaptations = distributionStrategy.content.adapt(
                    content.generated || content,
                    platform
                );

                if (adaptations.some(a => a.type === 'length' && a.action === 'reduce' &&
                    content.length > config.contentLength.max)) {
                    throw new Error(`内容长度超出${config.name}平台限制`);
                }
            }

            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1500));

            const result = {
                platform,
                status: 'success',
                publishedAt: new Date().toISOString(),
                platformUrl: `https://${platform}.example.com/p/${taskId}`,
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 100),
                shares: Math.floor(Math.random() * 20),
                comments: Math.floor(Math.random() * 10)
            };

            task.results.push(result);

            // 添加到分发历史
            distributionHistory.push({
                taskId: task.id,
                contentTitle: task.contentTitle,
                platform,
                result,
                timestamp: result.publishedAt
            });

        } catch (error) {
            task.results.push({
                platform,
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    distributionTasks.completed.push(task);
    distributionTasks.processing = distributionTasks.processing.filter(t => t.id !== task.id);
    saveDistributionTasks();
    saveDistributionHistory();

    return task;
}

// 获取内容（模拟）
function getContentById(contentId) {
    // 从内容工作室获取内容
    if (window.ContentStudio && window.ContentStudio.contentQueue) {
        const allContents = [
            ...window.ContentStudio.contentQueue.pending,
            ...window.ContentStudio.contentQueue.processing,
            ...window.ContentStudio.contentQueue.completed
        ];
        return allContents.find(c => c.id === contentId);
    }
    return null;
}

// 获取分发统计
function getDistributionStats(timeRange = 'today') {
    const now = new Date();
    let startTime;

    if (timeRange === 'today') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'week') {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredHistory = distributionHistory.filter(record =>
        new Date(record.timestamp) >= startTime
    );

    const stats = {
        total: filteredHistory.length,
        byPlatform: {},
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0,
        successRate: 0
    };

    filteredHistory.forEach(record => {
        const platform = record.platform;
        if (!stats.byPlatform[platform]) {
            stats.byPlatform[platform] = {
                count: 0,
                views: 0,
                likes: 0,
                shares: 0,
                comments: 0
            };
        }

        stats.byPlatform[platform].count++;
        stats.byPlatform[platform].views += record.result.views;
        stats.byPlatform[platform].likes += record.result.likes;
        stats.byPlatform[platform].shares += record.result.shares;
        stats.byPlatform[platform].comments += record.result.comments;

        stats.totalViews += record.result.views;
        stats.totalLikes += record.result.likes;
        stats.totalShares += record.result.shares;
        stats.totalComments += record.result.comments;
    });

    const successfulCount = filteredHistory.filter(r => r.result.status === 'success').length;
    stats.successRate = stats.total > 0 ? (successfulCount / stats.total * 100) : 0;

    return stats;
}

// 获取最佳发布时间建议
function getBestPublishTime(platform, contentType = 'product_review') {
    const config = platformConfig[platform];
    if (!config) return null;

    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();

    // 检查今天是否适合发布
    if (config.bestDays.includes(today)) {
        // 检查当前是否在黄金时间
        const inGoldenHour = config.peakHours.some(hour => {
            const [start, end] = hour.split('-');
            const [startHour] = start.split(':').map(Number);
            const [endHour] = end.split(':').map(Number);
            return currentHour >= startHour && currentHour < endHour;
        });

        if (inGoldenHour) {
            return {
                platform,
                recommendation: '立即发布',
                time: `${currentHour.toString().padStart(2, '0')}:00`,
                reason: '当前处于黄金发布时间',
                urgency: 'high'
            };
        }

        // 找到下一个黄金时间
        const nextGoldenHour = config.peakHours.find(hour => {
            const [start] = hour.split('-').map(t => t.split(':')[0]);
            return parseInt(start) > currentHour;
        });

        if (nextGoldenHour) {
            return {
                platform,
                recommendation: '延后发布',
                time: nextGoldenHour,
                reason: '下一个黄金发布时间',
                urgency: 'medium'
            };
        }
    }

    // 找到下一个适合的日期
    const daysUntilNext = config.bestDays.filter(d => d > today).map(d => d - today);
    const nextDay = daysUntilNext.length > 0 ? daysUntilNext[0] :
        7 - today + config.bestDays[0];

    return {
        platform,
        recommendation: '预约发布',
        time: `${nextDay}天后 ${config.peakHours[0]}`,
        reason: `建议在${nextDay}天后的最佳发布时间发布`,
        urgency: 'low'
    };
}

// 获取平台对比分析
function getPlatformComparison() {
    const comparison = [];

    Object.entries(platformConfig).forEach(([key, config]) => {
        const stats = getDistributionStats('month').byPlatform[key] || {
            count: 0,
            views: 0,
            likes: 0,
            shares: 0,
            comments: 0
        };

        comparison.push({
            platform: key,
            name: config.name,
            icon: config.icon,
            color: config.color,
            stats: {
                publishedCount: stats.count,
                totalViews: stats.views,
                avgViews: stats.count > 0 ? Math.round(stats.views / stats.count) : 0,
                engagementRate: stats.count > 0 ?
                    ((stats.likes + stats.shares + stats.comments) / stats.views * 100).toFixed(2) : 0
            },
            features: {
                peakHours: config.peakHours,
                bestDays: config.bestDays,
                audience: config.audience,
                contentLength: config.contentLength
            },
            score: calculatePlatformScore(stats)
        });
    });

    return comparison.sort((a, b) => b.score - a.score);
}

// 计算平台综合得分
function calculatePlatformScore(stats) {
    if (stats.count === 0) return 0;

    const avgViews = stats.views / stats.count;
    const engagementRate = (stats.likes + stats.shares + stats.comments) / stats.views;

    // 综合得分 = 发布数量权重 + 平均浏览量权重 + 互动率权重
    return Math.round(
        stats.count * 1 +
        avgViews * 0.1 +
        engagementRate * 1000
    );
}

// 保存分发任务
function saveDistributionTasks() {
    localStorage.setItem('distributionTasks', JSON.stringify(distributionTasks));
}

// 加载分发任务
function loadDistributionTasks() {
    const saved = localStorage.getItem('distributionTasks');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(distributionTasks, parsed);
    }
}

// 保存分发历史
function saveDistributionHistory() {
    localStorage.setItem('distributionHistory', JSON.stringify(distributionHistory));
}

// 加载分发历史
function loadDistributionHistory() {
    const saved = localStorage.getItem('distributionHistory');
    if (saved) {
        distributionHistory.push(...JSON.parse(saved));
    }
}

// 初始化时加载数据
loadDistributionTasks();
loadDistributionHistory();

// 导出函数供其他模块使用
window.SmartDistributor = {
    platformConfig,
    distributionStrategy,
    distributionTasks,
    distributionHistory,
    createDistributionTask,
    executeDistributionTask,
    getDistributionStats,
    getBestPublishTime,
    getPlatformComparison,
    getPlatformPriority
};
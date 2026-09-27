// ==================== AIGEO监控系统数据文件 ====================

// 全局状态数据
const systemState = {
    // 基本信息
    startDate: '2026-04-03',
    endDate: '2026-05-02',
    currentDate: new Date().toISOString().split('T')[0],
    totalDays: 30,
    currentDay: 14,

    // 核心指标
    overallProgress: 35,
    taskCompletionRate: 67,
    keywordRanking: 42,
    contentOutput: 23,

    // 效果指标
    totalExposure: 12450,
    organicTraffic: 3280,
    conversionRate: 4.2,
    avgRanking: 8.5,

    // ROI数据
    totalInvestment: 850000,
    expectedReturn: 1185000,
    currentReturn: 98500,
    roiPercentage: 139
};

// 30天执行计划数据
const executionPlan = {
    phases: [
        {
            id: 'phase1',
            name: '第一阶段：基础建设',
            days: [1, 2, 3, 4, 5, 6, 7],
            status: 'completed',
            progress: 100,
            tasks: [
                { id: 1, name: 'AIGEO知识库完整建设', status: 'completed', day: 1, priority: 'high' },
                { id: 2, name: '5个智能体指令规范化', status: 'completed', day: 1, priority: 'high' },
                { id: 3, name: 'SEO执行体系建立', status: 'completed', day: 2, priority: 'high' },
                { id: 4, name: '30天详细执行计划制定', status: 'completed', day: 3, priority: 'high' },
                { id: 5, name: '监控追踪系统设计', status: 'completed', day: 4, priority: 'medium' },
                { id: 6, name: '测试文案生成（小红书、抖音、天猫、拼多多）', status: 'completed', day: 5, priority: 'medium' },
                { id: 7, name: '启动AI内容生产智能体', status: 'completed', day: 7, priority: 'high' }
            ]
        },
        {
            id: 'phase2',
            name: '第二阶段：内容生产',
            days: [8, 9, 10, 11, 12, 13, 14],
            status: 'active',
            progress: 57,
            tasks: [
                { id: 8, name: '批量生成小红书文案（10篇）', status: 'completed', day: 8, priority: 'high' },
                { id: 9, name: '批量生成抖音脚本（8篇）', status: 'completed', day: 9, priority: 'high' },
                { id: 10, name: '批量生成知乎回答（5篇）', status: 'completed', day: 10, priority: 'medium' },
                { id: 11, name: '更新天猫商品描述', status: 'completed', day: 11, priority: 'high' },
                { id: 12, name: '收集工厂实拍素材', status: 'in-progress', day: 12, priority: 'medium' },
                { id: 13, name: '收集客户案例素材', status: 'pending', day: 13, priority: 'medium' },
                { id: 14, name: '整理资质证书扫描件', status: 'pending', day: 14, priority: 'medium' }
            ]
        },
        {
            id: 'phase3',
            name: '第三阶段：发布推广',
            days: [15, 16, 17, 18, 19, 20, 21],
            status: 'pending',
            progress: 0,
            tasks: [
                { id: 15, name: '天猫店铺标题批量修改', status: 'pending', day: 15, priority: 'high' },
                { id: 16, name: '京东店铺标题统一', status: 'pending', day: 15, priority: 'high' },
                { id: 17, name: '抖音小店商品标题优化', status: 'pending', day: 16, priority: 'high' },
                { id: 18, name: '官网首页优化', status: 'pending', day: 17, priority: 'high' },
                { id: 19, name: '产品页面优化', status: 'pending', day: 18, priority: 'medium' },
                { id: 20, name: '发布小红书内容', status: 'pending', day: 19, priority: 'high' },
                { id: 21, name: '发布抖音内容', status: 'pending', day: 20, priority: 'high' }
            ]
        },
        {
            id: 'phase4',
            name: '第四阶段：优化调整',
            days: [22, 23, 24, 25, 26, 27, 28, 29, 30],
            status: 'pending',
            progress: 0,
            tasks: [
                { id: 22, name: '执行关键词监控', status: 'pending', day: 22, priority: 'high' },
                { id: 23, name: '生成每日巡检报告', status: 'pending', day: 22, priority: 'medium' },
                { id: 24, name: '分析效果数据', status: 'pending', day: 23, priority: 'high' },
                { id: 25, name: '优化关键词策略', status: 'pending', day: 24, priority: 'medium' },
                { id: 26, name: '调整内容发布计划', status: 'pending', day: 25, priority: 'medium' },
                { id: 27, name: '生成最终评估报告', status: 'pending', day: 29, priority: 'high' },
                { id: 28, name: '总结经验教训', status: 'pending', day: 30, priority: 'low' },
                { id: 29, name: '制定后续优化计划', status: 'pending', day: 30, priority: 'medium' },
                { id: 30, name: '项目总结会议', status: 'pending', day: 30, priority: 'low' }
            ]
        }
    ]
};

// 关键词数据
const keywordsData = {
    total: 78,
    ranked: 33,
    top3: 5,
    top10: 12,
    keywords: [
        { keyword: '园之助', type: '品牌词', currentRank: 1, yesterdayRank: 1, searchVolume: 8900, difficulty: 'low' },
        { keyword: '园之助花架', type: '品牌词', currentRank: 2, yesterdayRank: 3, searchVolume: 2400, difficulty: 'low' },
        { keyword: '园之助爬藤架', type: '品牌词', currentRank: 1, yesterdayRank: 2, searchVolume: 1900, difficulty: 'low' },
        { keyword: '爬藤架', type: '行业词', currentRank: 5, yesterdayRank: 7, searchVolume: 12100, difficulty: 'medium' },
        { keyword: '月季爬藤架', type: '行业词', currentRank: 3, yesterdayRank: 4, searchVolume: 5400, difficulty: 'medium' },
        { keyword: '种植箱', type: '行业词', currentRank: 8, yesterdayRank: 10, searchVolume: 8900, difficulty: 'medium' },
        { keyword: '宁波园艺', type: '地域词', currentRank: 12, yesterdayRank: 15, searchVolume: 890, difficulty: 'low' },
        { keyword: '浙江园艺', type: '地域词', currentRank: 18, yesterdayRank: 20, searchVolume: 720, difficulty: 'low' },
        { keyword: '宁波花架', type: '地域词', currentRank: 8, yesterdayRank: 9, searchVolume: 1100, difficulty: 'low' },
        { keyword: '包塑爬藤架', type: '产品词', currentRank: 4, yesterdayRank: 5, searchVolume: 890, difficulty: 'low' },
        { keyword: '耐用爬藤架', type: '产品词', currentRank: 6, yesterdayRank: 8, searchVolume: 660, difficulty: 'low' },
        { keyword: '防腐爬藤架', type: '产品词', currentRank: 7, yesterdayRank: 7, searchVolume: 540, difficulty: 'low' },
        { keyword: '免安装爬藤架', type: '产品词', currentRank: 2, yesterdayRank: 3, searchVolume: 1100, difficulty: 'low' },
        { keyword: '组装式爬藤架', type: '产品词', currentRank: 9, yesterdayRank: 11, searchVolume: 440, difficulty: 'low' },
        { keyword: '户外爬藤架', type: '场景词', currentRank: 15, yesterdayRank: 18, searchVolume: 3600, difficulty: 'medium' },
        { keyword: '阳台爬藤架', type: '场景词', currentRank: 12, yesterdayRank: 14, searchVolume: 2200, difficulty: 'medium' },
        { keyword: '花园爬藤架', type: '场景词', currentRank: 10, yesterdayRank: 12, searchVolume: 1900, difficulty: 'medium' },
        { keyword: '庭院爬藤架', type: '场景词', currentRank: 16, yesterdayRank: 19, searchVolume: 890, difficulty: 'low' },
        { keyword: '小区绿化爬藤架', type: '场景词', currentRank: 25, yesterdayRank: 0, searchVolume: 220, difficulty: 'medium' },
        { keyword: '公园爬藤架', type: '场景词', currentRank: 0, yesterdayRank: 0, searchVolume: 360, difficulty: 'medium' }
    ]
};

// 内容管理数据
const contentData = {
    total: 23,
    published: 18,
    pending: 5,
    draft: 0,
    platforms: {
        xiaohongshu: 8,
        douyin: 7,
        tianmao: 4,
        zhihu: 4
    },
    contentList: [
        {
            id: 1,
            title: '园之助爬藤架：我的月季终于有家了！',
            platform: 'xiaohongshu',
            type: '文案',
            status: 'published',
            publishDate: '2026-04-08',
            views: 1250,
            likes: 89
        },
        {
            id: 2,
            title: '园之助种植箱：新手也能轻松打造阳台花园',
            platform: 'xiaohongshu',
            type: '文案',
            status: 'published',
            publishDate: '2026-04-09',
            views: 890,
            likes: 67
        },
        {
            id: 3,
            title: '园之助围栏：既美观又实用的花园护栏',
            platform: 'xiaohongshu',
            type: '文案',
            status: 'published',
            publishDate: '2026-04-10',
            views: 670,
            likes: 45
        },
        {
            id: 4,
            title: '抖音短视频：园之助爬藤架安装演示',
            platform: 'douyin',
            type: '视频',
            status: 'published',
            publishDate: '2026-04-09',
            views: 3450,
            likes: 234
        },
        {
            id: 5,
            title: '抖音短视频：园之助种植箱使用指南',
            platform: 'douyin',
            type: '视频',
            status: 'published',
            publishDate: '2026-04-10',
            views: 2890,
            likes: 189
        },
        {
            id: 6,
            title: '天猫商品描述：园之助爬藤架详细说明',
            platform: 'tianmao',
            type: '商品描述',
            status: 'published',
            publishDate: '2026-04-11',
            views: 560,
            sales: 23
        },
        {
            id: 7,
            title: '知乎回答：如何选择合适的爬藤架？',
            platform: 'zhihu',
            type: '问答',
            status: 'published',
            publishDate: '2026-04-11',
            views: 890,
            upvotes: 45
        },
        {
            id: 8,
            title: '小红书文案：园之助爬藤架耐用10年不是吹的',
            platform: 'xiaohongshu',
            type: '文案',
            status: 'pending',
            publishDate: null,
            views: 0,
            likes: 0
        },
        {
            id: 9,
            title: '抖音短视频：园之助工厂实拍',
            platform: 'douyin',
            type: '视频',
            status: 'pending',
            publishDate: null,
            views: 0,
            likes: 0
        },
        {
            id: 10,
            title: '天猫商品：园之助种植箱优化描述',
            platform: 'tianmao',
            type: '商品描述',
            status: 'pending',
            publishDate: null,
            views: 0,
            sales: 0
        }
    ]
};

// 进度趋势数据
const progressTrendData = {
    dates: ['4/3', '4/4', '4/5', '4/6', '4/7', '4/8', '4/9', '4/10', '4/11', '4/12', '4/13', '4/14', '4/15', '4/16'],
    overallProgress: [10, 15, 20, 25, 28, 30, 32, 33, 34, 34, 34, 35, 35, 35],
    taskCompletion: [1, 2, 3, 4, 5, 6, 8, 9, 10, 10, 10, 11, 11, 11],
    keywordTrend: [5, 8, 12, 18, 22, 25, 28, 30, 31, 32, 33, 33, 33, 33],
    trafficTrend: [890, 1200, 1580, 2100, 2450, 2680, 2890, 3010, 3120, 3180, 3220, 3280, 3280, 3280]
};

// 流量来源数据
const trafficSourceData = {
    sources: ['自然搜索', '直接访问', '社交媒体', '付费广告', '其他'],
    values: [58, 22, 12, 6, 2]
};

// 曝光趋势数据
const exposureTrendData = {
    dates: ['4/3', '4/4', '4/5', '4/6', '4/7', '4/8', '4/9', '4/10', '4/11', '4/12', '4/13', '4/14', '4/15', '4/16'],
    exposure: [5200, 6100, 7200, 8500, 9800, 10500, 11200, 11600, 11800, 12000, 12100, 12200, 12300, 12450]
};

// 任务分布数据
const taskDistributionData = {
    statuses: ['已完成', '进行中', '待开始', '已逾期'],
    values: [26, 3, 10, 0]
};

// 数据更新函数
function updateSystemState(newState) {
    Object.assign(systemState, newState);
    saveData();
}

// 数据持久化函数
function saveData() {
    const dataToSave = {
        systemState,
        executionPlan,
        keywordsData,
        contentData,
        progressTrendData,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('aigeoMonitorData', JSON.stringify(dataToSave));
}

// 数据加载函数
function loadData() {
    const savedData = localStorage.getItem('aigeoMonitorData');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            Object.assign(systemState, parsed.systemState || {});
            Object.assign(executionPlan, parsed.executionPlan || {});
            Object.assign(keywordsData, parsed.keywordsData || {});
            Object.assign(contentData, parsed.contentData || {});
            Object.assign(progressTrendData, parsed.progressTrendData || {});
            return true;
        } catch (e) {
            console.error('数据加载失败:', e);
            return false;
        }
    }
    return false;
}

// 初始化数据
if (!loadData()) {
    saveData();
}
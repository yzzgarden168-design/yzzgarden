// ==================== AIGEO监控系统应用逻辑 ====================

// 全局变量
let charts = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    initializeNavigation();
    initializeCharts();
    updateCurrentTime();
    updateDashboard();
    renderTasks();
    renderKeywords();
    renderContentList();
    renderCalendar();

    // 设置定时器
    setInterval(updateCurrentTime, 1000);
    setInterval(refreshData, 300000); // 每5分钟刷新数据
}

// 更新当前时间
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    document.getElementById('currentTime').textContent = timeString;
}

// 初始化导航
function initializeNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有激活状态
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // 激活当前标签
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // 重新初始化图表（解决切换标签后图表不显示的问题）
            if (charts[tabId]) {
                Object.values(charts[tabId]).forEach(chart => chart.resize());
            }
        });
    });
}

// 初始化所有图表
function initializeCharts() {
    // 进度趋势图
    const progressCtx = document.getElementById('progressTrendChart').getContext('2d');
    charts.overview = charts.overview || {};
    charts.overview.progressTrend = new Chart(progressCtx, {
        type: 'line',
        data: {
            labels: progressTrendData.dates,
            datasets: [{
                label: '总体进度 (%)',
                data: progressTrendData.overallProgress,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // 任务分布图
    const taskCtx = document.getElementById('taskDistributionChart').getContext('2d');
    charts.overview.taskDistribution = new Chart(taskCtx, {
        type: 'doughnut',
        data: {
            labels: taskDistributionData.statuses,
            datasets: [{
                data: taskDistributionData.values,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });

    // 关键词排名变化
    const keywordCtx = document.getElementById('keywordTrendChart').getContext('2d');
    charts.overview.keywordTrend = new Chart(keywordCtx, {
        type: 'bar',
        data: {
            labels: progressTrendData.dates,
            datasets: [{
                label: '有排名关键词数量',
                data: progressTrendData.keywordTrend,
                backgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 流量变化趋势
    const trafficCtx = document.getElementById('trafficTrendChart').getContext('2d');
    charts.overview.trafficTrend = new Chart(trafficCtx, {
        type: 'line',
        data: {
            labels: progressTrendData.dates,
            datasets: [{
                label: '自然搜索流量',
                data: progressTrendData.trafficTrend,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 曝光量趋势图
    const exposureCtx = document.getElementById('exposureTrendChart').getContext('2d');
    charts.effects = charts.effects || {};
    charts.effects.exposureTrend = new Chart(exposureCtx, {
        type: 'line',
        data: {
            labels: exposureTrendData.dates,
            datasets: [{
                label: '曝光量',
                data: exposureTrendData.exposure,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 流量来源分析图
    const trafficSourceCtx = document.getElementById('trafficSourceChart').getContext('2d');
    charts.effects.trafficSource = new Chart(trafficSourceCtx, {
        type: 'pie',
        data: {
            labels: trafficSourceData.sources,
            datasets: [{
                data: trafficSourceData.values,
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#64748b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });

    // 平台内容分布图
    const platformCtx = document.getElementById('platformDistributionChart').getContext('2d');
    charts.content = charts.content || {};
    charts.content.platformDistribution = new Chart(platformCtx, {
        type: 'bar',
        data: {
            labels: ['小红书', '抖音', '天猫', '知乎'],
            datasets: [{
                label: '内容数量',
                data: [contentData.platforms.xiaohongshu, contentData.platforms.douyin,
                       contentData.platforms.tianmao, contentData.platforms.zhihu],
                backgroundColor: ['#ff2442', '#000000', '#ff0036', '#0084ff']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 更新仪表板
function updateDashboard() {
    // 更新核心指标
    document.getElementById('overallProgress').textContent = systemState.overallProgress + '%';
    document.getElementById('taskCompletionRate').textContent = systemState.taskCompletionRate + '%';
    document.getElementById('keywordRanking').textContent = systemState.keywordRanking + '%';
    document.getElementById('contentOutput').textContent = systemState.contentOutput + '篇';

    // 更新进度条
    const progressBars = document.querySelectorAll('.card .progress-fill');
    progressBars[0].style.width = systemState.overallProgress + '%';
    progressBars[1].style.width = systemState.taskCompletionRate + '%';
    progressBars[2].style.width = systemState.keywordRanking + '%';
    progressBars[3].style.width = (systemState.contentOutput / 50 * 100) + '%';

    // 更新效果指标
    document.getElementById('totalExposure').textContent = systemState.totalExposure.toLocaleString();
    document.getElementById('organicTraffic').textContent = systemState.organicTraffic.toLocaleString();
    document.getElementById('conversionRate').textContent = systemState.conversionRate + '%';
    document.getElementById('avgRanking').textContent = systemState.avgRanking;

    // 更新关键词统计
    document.getElementById('totalKeywords').textContent = keywordsData.total;
    document.getElementById('rankedKeywords').textContent = keywordsData.ranked;
    document.getElementById('top3Keywords').textContent = keywordsData.top3;
    document.getElementById('top10Keywords').textContent = keywordsData.top10;

    // 更新内容统计
    document.getElementById('totalContent').textContent = contentData.total;
    document.getElementById('publishedContent').textContent = contentData.published;
    document.getElementById('pendingContent').textContent = contentData.pending;
    document.getElementById('draftContent').textContent = contentData.draft;
}

// 渲染任务列表
function renderTasks(filter = 'all') {
    const taskList = document.getElementById('taskList');
    let tasks = [];

    // 收集所有阶段的任务
    executionPlan.phases.forEach(phase => {
        phase.tasks.forEach(task => {
            tasks.push({
                ...task,
                phase: phase.name
            });
        });
    });

    // 根据筛选条件过滤任务
    if (filter !== 'all') {
        tasks = tasks.filter(task => task.status === filter);
    }

    // 生成任务列表HTML
    taskList.innerHTML = tasks.map(task => `
        <div class="task-item">
            <div class="task-info">
                <div class="task-title">${task.name}</div>
                <div class="task-meta">
                    <span>Day ${task.day}</span>
                    <span>${task.phase}</span>
                    <span>优先级: ${getPriorityLabel(task.priority)}</span>
                </div>
            </div>
            <span class="task-status ${task.status}">${getStatusLabel(task.status)}</span>
            <div class="task-actions">
                <button onclick="markTaskCompleted(${task.id})">完成</button>
                <button onclick="viewTaskDetails(${task.id})">详情</button>
            </div>
        </div>
    `).join('');

    // 初始化任务筛选按钮
    initializeTaskFilters();
}

// 初始化任务筛选按钮
function initializeTaskFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            renderTasks(filter);
        });
    });
}

// 渲染关键词表格
function renderKeywords() {
    const tableBody = document.getElementById('keywordTableBody');
    tableBody.innerHTML = keywordsData.keywords.map(kw => {
        const change = kw.yesterdayRank > 0 ? kw.currentRank - kw.yesterdayRank : 0;
        const trendClass = change > 0 ? 'trend-up' : (change < 0 ? 'trend-down' : 'trend-flat');
        const changeIcon = change > 0 ? '↑' : (change < 0 ? '↓' : '-');
        const changeText = kw.yesterdayRank > 0 ? `${changeIcon} ${Math.abs(change)}` : '-';

        return `
            <tr>
                <td>${kw.keyword}</td>
                <td>${getTypeLabel(kw.type)}</td>
                <td>${kw.currentRank > 0 ? kw.currentRank : '-'}</td>
                <td>${kw.yesterdayRank > 0 ? kw.yesterdayRank : '-'}</td>
                <td class="${trendClass}">${changeText}</td>
                <td>${kw.searchVolume.toLocaleString()}</td>
                <td>${getDifficultyLabel(kw.difficulty)}</td>
                <td>
                    <button onclick="trackKeyword('${kw.keyword}')">追踪</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 渲染内容列表
function renderContentList() {
    const contentList = document.getElementById('contentList');
    contentList.innerHTML = contentData.contentList.map(content => `
        <div class="content-item">
            <div>
                <div class="content-item-title">${content.title}</div>
                <div class="content-item-meta">
                    <span>${getPlatformLabel(content.platform)}</span>
                    <span>${content.type}</span>
                    <span>发布日期: ${content.publishDate || '待发布'}</span>
                    <span>浏览: ${content.views}</span>
                </div>
            </div>
            <span class="content-item-status ${content.status}">${getStatusLabel(content.status)}</span>
        </div>
    `).join('');
}

// 渲染日历
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    let html = '';

    for (let i = 1; i <= systemState.totalDays; i++) {
        const date = new Date(systemState.startDate);
        date.setDate(date.getDate() + i - 1);
        const dateStr = date.toISOString().split('T')[0];

        // 确定日期状态
        let dayClass = 'calendar-day ';
        if (i < systemState.currentDay) {
            dayClass += 'completed';
        } else if (i === systemState.currentDay) {
            dayClass += 'active';
        } else {
            dayClass += 'future';
        }

        // 确定所属阶段
        let phase = '';
        if (i <= 7) phase = '第一阶段';
        else if (i <= 14) phase = '第二阶段';
        else if (i <= 21) phase = '第三阶段';
        else phase = '第四阶段';

        html += `
            <div class="${dayClass}">
                <div class="calendar-day-number">Day ${i}</div>
                <div class="calendar-day-status">${phase}</div>
            </div>
        `;
    }

    calendarGrid.innerHTML = html;
}

// 辅助函数
function getPriorityLabel(priority) {
    const labels = {
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return labels[priority] || priority;
}

function getStatusLabel(status) {
    const labels = {
        'completed': '已完成',
        'in-progress': '进行中',
        'pending': '待开始',
        'overdue': '已逾期',
        'published': '已发布',
        'draft': '草稿'
    };
    return labels[status] || status;
}

function getTypeLabel(type) {
    const labels = {
        'brand': '品牌词',
        'industry': '行业词',
        'regional': '地域词',
        'product': '产品词',
        'scenario': '场景词',
        '品牌词': '品牌词',
        '行业词': '行业词',
        '地域词': '地域词',
        '产品词': '产品词',
        '场景词': '场景词'
    };
    return labels[type] || type;
}

function getDifficultyLabel(difficulty) {
    const labels = {
        'low': '低',
        'medium': '中',
        'high': '高'
    };
    return labels[difficulty] || difficulty;
}

function getPlatformLabel(platform) {
    const labels = {
        'xiaohongshu': '小红书',
        'douyin': '抖音',
        'tianmao': '天猫',
        'zhihu': '知乎',
        'taobao': '淘宝',
        'jd': '京东'
    };
    return labels[platform] || platform;
}

// 交互函数
function showAddTask() {
    document.getElementById('addTaskModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function markTaskCompleted(taskId) {
    // 更新任务状态
    executionPlan.phases.forEach(phase => {
        phase.tasks.forEach(task => {
            if (task.id === taskId) {
                task.status = 'completed';
            }
        });
    });

    // 重新计算进度
    recalculateProgress();

    // 更新显示
    renderTasks();
    updateDashboard();

    // 保存数据
    saveData();

    // 显示提示
    alert('任务已标记为完成！');
}

function recalculateProgress() {
    let totalTasks = 0;
    let completedTasks = 0;

    executionPlan.phases.forEach(phase => {
        phase.tasks.forEach(task => {
            totalTasks++;
            if (task.status === 'completed') {
                completedTasks++;
            }
        });
    });

    systemState.taskCompletionRate = Math.round((completedTasks / totalTasks) * 100);
    systemState.overallProgress = Math.round(systemState.taskCompletionRate * 0.5 + systemState.keywordRanking * 0.3 + (systemState.contentOutput / 50 * 100) * 0.2);

    // 更新进度趋势数据
    const today = new Date().toISOString().split('T')[0];
    progressTrendData.overallProgress.push(systemState.overallProgress);
    progressTrendData.taskCompletion.push(completedTasks);
    progressTrendData.dates.push(today.substring(5, 10));
}

function viewTaskDetails(taskId) {
    // 查找任务
    let task = null;
    executionPlan.phases.forEach(phase => {
        const found = phase.tasks.find(t => t.id === taskId);
        if (found) {
            task = { ...found, phase: phase.name };
        }
    });

    if (task) {
        const detailsContent = document.getElementById('detailsContent');
        detailsContent.innerHTML = `
            <h4>任务详情</h4>
            <div style="margin-top: 16px;">
                <p><strong>任务名称：</strong>${task.name}</p>
                <p><strong>所属阶段：</strong>${task.phase}</p>
                <p><strong>执行日期：</strong>Day ${task.day}</p>
                <p><strong>优先级：</strong>${getPriorityLabel(task.priority)}</p>
                <p><strong>状态：</strong>${getStatusLabel(task.status)}</p>
            </div>
        `;
        document.getElementById('detailsModal').classList.add('active');
    }
}

function refreshData() {
    // 模拟数据刷新
    updateDashboard();
    renderTasks();
    renderKeywords();
    renderContentList();

    // 显示刷新提示
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ 已刷新';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function exportReport() {
    // 生成报告内容
    const reportContent = `
园之助AIGEO监控系统报告
生成时间: ${new Date().toLocaleString('zh-CN')}

=== 核心指标 ===
总体进度: ${systemState.overallProgress}%
任务完成率: ${systemState.taskCompletionRate}%
关键词排名: ${systemState.keywordRanking}%
内容产出: ${systemState.contentOutput}篇

=== 效果指标 ===
关键词总曝光量: ${systemState.totalExposure.toLocaleString()}
自然搜索流量: ${systemState.organicTraffic.toLocaleString()}
转化率: ${systemState.conversionRate}%
平均排名位置: ${systemState.avgRanking}

=== ROI分析 ===
总投入成本: ¥${systemState.totalInvestment.toLocaleString()}
预期收益: ¥${systemState.expectedReturn.toLocaleString()}
当前已产生收益: ¥${systemState.currentReturn.toLocaleString()}
投资回报率: ${systemState.roiPercentage}%

=== 任务进度 ===
${executionPlan.phases.map(phase => `
${phase.name}: ${phase.progress}%
${phase.tasks.map(task => `  [${getStatusLabel(task.status)}] ${task.name}`).join('\n')}
`).join('\n')}
    `.trim();

    // 创建下载链接
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `园之助AIGEO报告_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function runSEOCheck() {
    alert('正在运行SEO检查...\n\n这是一个模拟功能，实际部署时需要集成真实的SEO检查API。');
}

function generateContent() {
    alert('正在启动AI内容生成...\n\n这是一个模拟功能，实际部署时需要集成AI内容生成API。');
}

function viewDetails() {
    alert('详情查看功能正在开发中...');
}

function addKeyword() {
    const keyword = prompt('请输入要添加的关键词:');
    if (keyword) {
        keywordsData.keywords.push({
            keyword: keyword,
            type: 'industry',
            currentRank: 0,
            yesterdayRank: 0,
            searchVolume: Math.floor(Math.random() * 1000),
            difficulty: 'medium'
        });
        keywordsData.total++;
        renderKeywords();
        updateDashboard();
        saveData();
    }
}

function refreshRankings() {
    alert('正在刷新关键词排名...\n\n这是一个模拟功能，实际部署时需要集成关键词排名查询API。');
}

function trackKeyword(keyword) {
    alert(`已开始追踪关键词: ${keyword}\n\n排名变化将自动记录到监控系统中。`);
}

function generateNewContent() {
    alert('正在生成新内容...\n\n这是一个模拟功能，实际部署时需要集成AI内容生成API。');
}

function batchPublish() {
    alert('批量发布功能正在开发中...');
}

function filterProgress() {
    const filter = document.getElementById('progressFilter').value;
    // 这里可以添加筛选逻辑
    console.log('筛选进度:', filter);
}

function updateEffectMetrics() {
    const timeRange = document.getElementById('timeRange').value;
    console.log('更新效果指标，时间范围:', timeRange);
    // 这里可以添加根据时间范围更新指标的逻辑
}

function exportTasks() {
    // 导出任务列表
    const tasks = [];
    executionPlan.phases.forEach(phase => {
        phase.tasks.forEach(task => {
            tasks.push({
                任务名称: task.name,
                阶段: phase.name,
                执行日期: `Day ${task.day}`,
                优先级: getPriorityLabel(task.priority),
                状态: getStatusLabel(task.status)
            });
        });
    });

    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `园之助AIGEO任务列表_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 表单提交处理
document.getElementById('addTaskForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const taskName = document.getElementById('taskName').value;
    const taskPhase = document.getElementById('taskPhase').value;
    const taskPriority = document.getElementById('taskPriority').value;
    const taskDeadline = document.getElementById('taskDeadline').value;
    const taskDescription = document.getElementById('taskDescription').value;

    // 计算任务日期
    const deadline = new Date(taskDeadline);
    const start = new Date(systemState.startDate);
    const day = Math.ceil((deadline - start) / (1000 * 60 * 60 * 24)) + 1;

    // 添加新任务
    const newTask = {
        id: Date.now(),
        name: taskName,
        status: 'pending',
        day: day,
        priority: taskPriority
    };

    // 添加到相应阶段
    const phase = executionPlan.phases.find(p => p.id === taskPhase);
    if (phase) {
        phase.tasks.push(newTask);
    }

    // 更新显示
    renderTasks();
    recalculateProgress();
    saveData();

    // 关闭模态框并重置表单
    closeModal('addTaskModal');
    this.reset();

    alert('任务添加成功！');
});
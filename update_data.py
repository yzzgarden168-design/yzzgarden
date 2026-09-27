"""
园之助AIGEO监控系统 - 数据更新脚本
用于模拟AIGEO执行过程中的数据变化
"""

import json
import random
from datetime import datetime, timedelta

class AIGEODataUpdater:
    def __init__(self):
        self.current_date = datetime.now()
        self.start_date = datetime(2026, 4, 3)
        self.day_number = (self.current_date - self.start_date).days + 1

    def generate_progress_trend(self):
        """生成进度趋势数据"""
        dates = []
        overall_progress = []
        task_completion = []
        keyword_trend = []
        traffic_trend = []

        for i in range(14):
            date = self.start_date + timedelta(days=i)
            dates.append(date.strftime('%m/%d'))

            # 模拟总体进度增长
            base_progress = min(35 + i * 3, 100)
            overall_progress.append(base_progress)

            # 模拟任务完成数量
            task_completion.append(min(11 + i // 2, 39))

            # 模拟关键词排名增长
            keyword_trend.append(min(33 + i // 2, 78))

            # 模拟流量增长
            base_traffic = 3280
            traffic_variation = random.randint(-100, 200)
            traffic_trend.append(base_traffic + i * 150 + traffic_variation)

        return {
            'dates': dates,
            'overallProgress': overall_progress,
            'taskCompletion': task_completion,
            'keywordTrend': keyword_trend,
            'trafficTrend': traffic_trend
        }

    def generate_exposure_trend(self):
        """生成曝光量趋势数据"""
        dates = []
        exposure = []

        for i in range(14):
            date = self.start_date + timedelta(days=i)
            dates.append(date.strftime('%m/%d'))

            # 模拟曝光量增长
            base_exposure = 12450
            daily_growth = random.randint(200, 500)
            exposure.append(base_exposure + i * daily_growth)

        return {
            'dates': dates,
            'exposure': exposure
        }

    def generate_keyword_data(self):
        """生成关键词数据"""
        keyword_types = ['品牌词', '行业词', '地域词', '产品词', '场景词']
        difficulties = ['low', 'medium', 'high']

        keywords = [
            {'keyword': '园之助', 'type': '品牌词', 'currentRank': 1, 'yesterdayRank': 1, 'searchVolume': 8900, 'difficulty': 'low'},
            {'keyword': '园之助花架', 'type': '品牌词', 'currentRank': 2, 'yesterdayRank': 3, 'searchVolume': 2400, 'difficulty': 'low'},
            {'keyword': '园之助爬藤架', 'type': '品牌词', 'currentRank': 1, 'yesterdayRank': 2, 'searchVolume': 1900, 'difficulty': 'low'},
        ]

        # 生成更多关键词
        for i in range(17):
            keywords.append({
                'keyword': f'示例关键词{i+4}',
                'type': random.choice(keyword_types),
                'currentRank': random.randint(0, 50) if random.random() > 0.3 else 0,
                'yesterdayRank': random.randint(0, 50) if random.random() > 0.3 else 0,
                'searchVolume': random.randint(100, 5000),
                'difficulty': random.choice(difficulties)
            })

        return {
            'total': len(keywords),
            'ranked': sum(1 for k in keywords if k['currentRank'] > 0),
            'top3': sum(1 for k in keywords if 1 <= k['currentRank'] <= 3),
            'top10': sum(1 for k in keywords if 1 <= k['currentRank'] <= 10),
            'keywords': keywords
        }

    def generate_content_data(self):
        """生成内容数据"""
        platforms = ['xiaohongshu', 'douyin', 'tianmao', 'zhihu']
        content_types = ['文案', '视频', '商品描述', '问答']
        statuses = ['published', 'published', 'published', 'pending']

        contents = []
        for i in range(10):
            publish_date = (self.start_date + timedelta(days=random.randint(1, 14))).strftime('%Y-%m-%d') if random.random() > 0.4 else None

            contents.append({
                'id': i + 1,
                'title': f'园之助AIGEO优化示例内容 {i+1}',
                'platform': random.choice(platforms),
                'type': random.choice(content_types),
                'status': random.choice(statuses),
                'publishDate': publish_date,
                'views': random.randint(500, 5000) if publish_date else 0,
                'likes': random.randint(50, 500) if publish_date else 0
            })

        return {
            'total': len(contents),
            'published': sum(1 for c in contents if c['status'] == 'published'),
            'pending': sum(1 for c in contents if c['status'] == 'pending'),
            'draft': sum(1 for c in contents if c['status'] == 'draft'),
            'platforms': {
                'xiaohongshu': sum(1 for c in contents if c['platform'] == 'xiaohongshu'),
                'douyin': sum(1 for c in contents if c['platform'] == 'douyin'),
                'tianmao': sum(1 for c in contents if c['platform'] == 'tianmao'),
                'zhihu': sum(1 for c in contents if c['platform'] == 'zhihu')
            },
            'contentList': contents
        }

    def generate_system_state(self):
        """生成系统状态数据"""
        return {
            'startDate': '2026-04-03',
            'endDate': '2026-05-02',
            'currentDate': self.current_date.strftime('%Y-%m-%d'),
            'totalDays': 30,
            'currentDay': self.day_number,
            'overallProgress': 35,
            'taskCompletionRate': 67,
            'keywordRanking': 42,
            'contentOutput': 23,
            'totalExposure': 12450,
            'organicTraffic': 3280,
            'conversionRate': 4.2,
            'avgRanking': 8.5,
            'totalInvestment': 850000,
            'expectedReturn': 1185000,
            'currentReturn': 98500,
            'roiPercentage': 139
        }

    def update_data_file(self, output_file='data.js'):
        """更新数据文件"""
        # 生成各类数据
        system_state = self.generate_system_state()
        progress_trend = self.generate_progress_trend()
        exposure_trend = self.generate_exposure_trend()
        keyword_data = self.generate_keyword_data()
        content_data = self.generate_content_data()

        # 生成完整的JavaScript数据文件
        data_js = f"""// ==================== AIGEO监控系统数据文件 ====================
// 数据更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

// 全局状态数据
const systemState = {json.dumps(system_state, ensure_ascii=False, indent=4)};

// 进度趋势数据
const progressTrendData = {json.dumps(progress_trend, ensure_ascii=False, indent=4)};

// 曝光趋势数据
const exposureTrendData = {json.dumps(exposure_trend, ensure_ascii=False, indent=4)};

// 关键词数据
const keywordsData = {json.dumps(keyword_data, ensure_ascii=False, indent=4)};

// 内容管理数据
const contentData = {json.dumps(content_data, ensure_ascii=False, indent=4)};

// 任务分布数据
const taskDistributionData = {{
    'statuses': ['已完成', '进行中', '待开始', '已逾期'],
    'values': [26, 3, 10, 0]
}};

// 流量来源数据
const trafficSourceData = {{
    'sources': ['自然搜索', '直接访问', '社交媒体', '付费广告', '其他'],
    'values': [58, 22, 12, 6, 2]
}};

// 数据持久化函数
function saveData() {{
    const dataToSave = {{
        systemState,
        progressTrendData,
        exposureTrendData,
        keywordsData,
        contentData,
        taskDistributionData,
        trafficSourceData,
        lastUpdated: new Date().toISOString()
    }};
    localStorage.setItem('aigeoMonitorData', JSON.stringify(dataToSave));
    console.log('数据已保存到 localStorage');
}}

// 数据加载函数
function loadData() {{
    const savedData = localStorage.getItem('aigeoMonitorData');
    if (savedData) {{
        try {{
            const parsed = JSON.parse(savedData);
            Object.assign(systemState, parsed.systemState || {{}});
            Object.assign(progressTrendData, parsed.progressTrendData || {{}});
            Object.assign(exposureTrendData, parsed.exposureTrendData || {{}});
            Object.assign(keywordsData, parsed.keywordsData || {{}});
            Object.assign(contentData, parsed.contentData || {{}});
            return true;
        }} catch (e) {{
            console.error('数据加载失败:', e);
            return false;
        }}
    }}
    return false;
}}

// 初始化数据
if (!loadData()) {{
    saveData();
    console.log('初始化数据完成');
}}
"""

        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(data_js)

        print(f"✅ 数据文件已更新: {output_file}")
        print(f"📅 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📊 当前执行天数: {self.day_number}/30")

        return True

    def generate_daily_report(self):
        """生成每日报告"""
        report = f"""
园之助AIGEO监控系统 - 每日报告
===================================
报告时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
执行天数: {self.day_number}/30

核心指标
-----------------------------------
总体进度: 35%
任务完成率: 67% (26/39)
关键词排名率: 42% (33/78)
内容产出: 23篇

效果指标
-----------------------------------
关键词总曝光量: 12,450
自然搜索流量: 3,280
转化率: 4.2%
平均排名位置: 8.5

ROI分析
-----------------------------------
总投入成本: ¥850,000
预期收益: ¥1,185,000
当前已产生收益: ¥98,500
投资回报率: 139%

今日重点工作
-----------------------------------
1. 继续收集工厂实拍素材
2. 收集客户案例素材
3. 整理资质证书扫描件
4. 启动电商平台优化

明日计划
-----------------------------------
1. 完成素材收集工作
2. 开始天猫店铺标题优化
3. 京东店铺标题统一
4. 执行关键词监控

===================================
报告生成完成
"""
        return report

if __name__ == '__main__':
    print("🌳 园之助AIGEO监控系统 - 数据更新工具")
    print("=" * 50)
    print()

    updater = AIGEODataUpdater()

    # 更新数据文件
    updater.update_data_file()

    print()
    # 生成每日报告
    report = updater.generate_daily_report()
    print(report)

    # 保存报告到文件
    report_file = f"每日报告_{datetime.now().strftime('%Y%m%d')}.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"📄 每日报告已保存: {report_file}")
    print()
    print("✅ 数据更新完成！")
    print("💡 提示：刷新浏览器页面以查看最新数据")
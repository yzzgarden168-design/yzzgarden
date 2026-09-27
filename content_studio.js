// ==================== AI内容工作室 ====================

// 内容生成配置
const contentConfig = {
    // 内容模板库
    templates: {
        xiaohongshu: [
            {
                id: 'xhs_001',
                name: '产品测评模板',
                structure: '标题+产品介绍+使用体验+优势总结+购买建议',
                tone: '真实、亲切、有经验分享感'
            },
            {
                id: 'xhs_002',
                name: '对比测评模板',
                structure: '标题+对比对象+详细对比+优缺点分析+推荐结论',
                tone: '客观、专业、有数据支撑'
            },
            {
                id: 'xhs_003',
                name: '场景展示模板',
                structure: '标题+场景描述+产品应用+效果展示+使用心得',
                tone: '沉浸式、画面感强'
            },
            {
                id: 'xhs_004',
                name: '问题解答模板',
                structure: '问题+痛点分析+解决方案+产品展示+效果验证',
                tone: '解决问题导向、实用性强'
            },
            {
                id: 'xhs_005',
                name: '种草推荐模板',
                structure: '标题+发现好物+产品亮点+使用场景+推荐理由',
                tone: '热情、推荐感强'
            }
        ],
        douyin: [
            {
                id: 'dy_001',
                name: '产品展示脚本',
                structure: '开场+产品展示+功能演示+优势说明+行动号召',
                duration: 60,
                tone: '节奏紧凑、视觉冲击'
            },
            {
                id: 'dy_002',
                name: '教程类脚本',
                structure: '问题引入+教程演示+技巧分享+效果展示+总结',
                duration: 90,
                tone: '实用、step-by-step'
            },
            {
                id: 'dy_003',
                name: '对比测试脚本',
                structure: '悬念开场+对比测试+结果展示+分析总结+推荐',
                duration: 75,
                tone: '客观公正、有说服力'
            },
            {
                id: 'dy_004',
                name: '故事类脚本',
                structure: '人物设定+问题出现+解决方案+产品介入+圆满解决',
                duration: 120,
                tone: '情感共鸣、有故事性'
            }
        ],
        zhihu: [
            {
                id: 'zh_001',
                name: '知识科普模板',
                structure: '问题定义+知识解释+产品关联+实际案例+总结建议',
                tone: '专业、权威、有深度'
            },
            {
                id: 'zh_002',
                name: '选购指南模板',
                structure: '选购痛点+选购要点+产品推荐+对比分析+购买建议',
                tone: '实用、系统、全面'
            },
            {
                id: 'zh_003',
                name: '经验分享模板',
                structure: '背景介绍+经验历程+关键要点+避坑指南+心得总结',
                tone: '真实、有经验感、真诚'
            }
        ],
        tianmao: [
            {
                id: 'tm_001',
                name: '商品详情页模板',
                structure: '产品亮点+核心优势+应用场景+规格参数+售后保障',
                tone: '专业、详细、信任感'
            },
            {
                id: 'tm_002',
                name: '标题优化模板',
                structure: '核心词+卖点词+场景词+形容词+品牌词',
                tone: '关键词精准、搜索优化'
            },
            {
                id: 'tm_003',
                name: '卖点提炼模板',
                structure: '核心卖点1+核心卖点2+核心卖点3+差异化优势+使用价值',
                tone: '简洁有力、直击痛点'
            }
        ]
    },

    // 关键词映射规则
    keywordMapping: {
        brand: ['园之助', '园之助爬藤架', '园之助花架', '园之助种植箱'],
        product: ['爬藤架', '种植箱', '围栏', '花架', '花园用品'],
        feature: ['包塑钢管', '耐用10年', '免安装', '组装式', '防腐', '承重'],
        scenario: ['阳台', '花园', '庭院', '户外', '小区绿化', '公园'],
        region: ['宁波园艺', '浙江园艺', '宁波花架'],
        plant: ['月季', '蔷薇', '葡萄', '藤蔓植物', '爬藤植物'],
        benefit: ['省空间', '美观', '实用', '持久', '质保', '性价比']
    },

    // 质量评分标准
    qualityCriteria: {
        keyword_density: { weight: 0.2, ideal_range: [2, 5] },
        content_length: { weight: 0.15, ideal_range: [300, 800] },
        readability: { weight: 0.15, target: 80 },
        emotional_appeal: { weight: 0.15, target: 70 },
        platform_fit: { weight: 0.2, target: 85 },
        uniqueness: { weight: 0.15, target: 75 }
    }
};

// 内容生成队列
const contentQueue = {
    pending: [],
    processing: [],
    completed: [],
    failed: []
};

// AI内容生成函数
async function generateContentAI(config) {
    const {
        platform,
        template,
        keywords,
        productName,
        mainBenefit,
        targetAudience,
        tone
    } = config;

    // 模拟AI生成过程
    const generatedContent = {
        id: Date.now(),
        platform,
        template: template.name,
        generated: {
            title: generateTitle(platform, keywords, productName, tone),
            body: generateBody(platform, template, keywords, productName, mainBenefit),
            hashtags: generateHashtags(platform, keywords),
            callToAction: generateCTA(platform, productName)
        },
        metadata: {
            keywords: keywords,
            tone: tone,
            length: 0,
            qualityScore: 0
        },
        status: 'generated',
        createdAt: new Date().toISOString()
    };

    // 计算内容质量分数
    generatedContent.metadata.qualityScore = calculateQualityScore(generatedContent);
    generatedContent.metadata.length = generatedContent.generated.body.length;

    return generatedContent;
}

// 生成标题
function generateTitle(platform, keywords, productName, tone) {
    const templates = {
        xiaohongshu: [
            `🌸 ${productName}：${keywords[0]}新选择！`,
            `✨ 发现宝藏${productName}！${keywords[1]}必备`,
            `💯 ${productName}测评：${keywords[0]}不踩雷`,
            `🔥 ${productName}火了！${keywords[1]}都在用`
        ],
        douyin: [
            `🎯 ${productName}到底值不值得买？`,
            `💡 ${productName}测评，看完再决定！`,
            `🔥 ${productName}火了，${keywords[0]}都在看`,
            `⚡ ${productName}测评，${keywords[1]}必看`
        ],
        zhihu: [
            `如何评价${productName}？${keywords[0]}选购指南`,
            `${productName}怎么样？${keywords[1]}详细测评`,
            `为什么越来越多的人选择${productName}？`,
            `${productName}的使用体验分享`
        ],
        tianmao: [
            `${productName} ${keywords[0]} 免安装`,
            `正品${productName} ${keywords[1]} 耐用10年`,
            `${productName} ${keywords[0]} 包塑钢管`,
            `${keywords[1]}${productName} 官方旗舰店`
        ]
    };

    const platformTemplates = templates[platform] || templates.xiaohongshu;
    return platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
}

// 生成正文
function generateBody(platform, template, keywords, productName, mainBenefit) {
    const intro = generateIntro(platform, productName);
    const mainContent = generateMainContent(platform, template.structure, keywords, mainBenefit);
    const conclusion = generateConclusion(platform, productName);

    return `${intro}\n\n${mainContent}\n\n${conclusion}`;
}

// 生成开头
function generateIntro(platform, productName) {
    const intros = {
        xiaohongshu: `最近入手了${productName}，用了几天后真的很惊喜！作为一个经常养花的人，这个产品真的解决了我的不少痛点。`,
        douyin: `(开头展示产品)大家好，今天给大家测评${productName}，这款产品到底值不值得买？看完视频你就知道了！`,
        zhihu: `作为一名园艺爱好者，我使用${productName}已经有相当长的时间了。今天我想从实际使用者的角度，分享一下我的真实体验。`,
        tianmao: `这款${productName}是园之助园艺用品的明星产品，采用包塑钢管材质，耐用10年，免安装设计，为您的园艺生活提供便利。`
    };
    return intros[platform] || intros.xiaohongshu;
}

// 生成主要内容
function generateMainContent(platform, structure, keywords, mainBenefit) {
    const sections = structure.split('+');
    let content = '';

    sections.forEach((section, index) => {
        content += `【${section}】\n`;
        content += generateSectionContent(section, keywords, mainBenefit) + '\n\n';
    });

    return content.trim();
}

// 生成段落内容
function generateSectionContent(section, keywords, mainBenefit) {
    const contentMap = {
        '产品介绍': `这款爬藤架采用优质包塑钢管制作，表面经过防锈处理，耐用10年不是问题。免安装设计，收到货后简单组装即可使用，非常方便。`,
        '使用体验': `我家阳台有一株月季，之前用普通的花架总是不够稳固。换了这款爬藤架后，明显感觉更加稳固，而且承重能力也很强，完全不用担心支撑不住。`,
        '优势总结': `1. 材质优秀：包塑钢管，防锈耐用\n2. 安装便捷：免安装设计，组装简单\n3. 美观实用：外观设计合理，不占用空间\n4. 质保10年：品质保证，放心购买`,
        '购买建议': `如果你也在寻找一款质量好、安装方便、价格合理的爬藤架，这款产品真的值得考虑。园之助作为宁波本地品牌，品质和售后都有保障。`,
        '对比对象': `对比市面上的其他品牌，这款爬藤架在材质和工艺上都有明显优势。普通产品可能只能用2-3年，而这款可以保证10年，长远来看性价比更高。`,
        '详细对比': `| 项目 | 普通产品 | 园之助爬藤架 |\n|------|----------|--------------|\n| 材质 | 铁艺/塑料 | 包塑钢管 |\n| 耐用性 | 2-3年 | 10年 |\n| 安装 | 需工具 | 免安装 |\n| 售后 | 1年 | 10年质保 |`,
        '优缺点分析': `优点：材质好、安装方便、质保时间长\n缺点：相比塑料产品价格略高，但考虑到10年质保，性价比还是很高的。`,
        '推荐结论': `综合来看，如果你追求品质和性价比，这款爬藤架是很好的选择。对于长期使用的需求，它的优势会越来越明显。`,
        '场景描述': `阳台上，月季藤蔓沿着爬藤架向上生长，阳光透过叶片洒下斑驳的光影。这样的场景，是每个园艺爱好者都向往的。`,
        '产品应用': `这款爬藤架可以用于月季、蔷薇、葡萄等各种藤蔓植物，无论是阳台、花园还是庭院，都能完美适配。`,
        '效果展示': `使用这款爬藤架后，我的月季生长得更好了，藤蔓有序攀爬，花开得更加茂盛。邻居们都来问我在哪里买的。`,
        '使用心得': `安装的时候注意按照说明书操作，确保每个连接都稳固。日常使用中，定期检查连接处即可，维护起来非常简单。`,
        '问题+痛点分析': `很多养花的朋友都会遇到这样的问题：藤蔓植物长得很快，但没有合适的支撑，要么攀爬不美观，要么容易倒伏。`,
        '解决方案': `园之助爬藤架就是为解决这个问题而设计的。它采用包塑钢管，结构稳固，能够很好地支撑藤蔓植物的生长。`,
        '产品展示': `(展示产品特写)大家可以看到，这款爬藤架的结构设计非常合理，每个连接点都经过精心设计，确保稳固性。`,
        '效果验证': `(展示使用效果)这是使用了一个月的效果，月季藤蔓已经完全覆盖了爬藤架，看起来非常美观。`,
        '问题引入': `你是不是也在为藤蔓植物的攀爬问题烦恼？传统的花架要么不够稳固，要么安装麻烦。`,
        '教程演示': `今天我来教大家如何使用这款爬藤架。(展示安装过程)第一步，取出所有配件；第二步，按照图纸组装；第三步，固定好位置。就这么简单！`,
        '技巧分享': `安装的时候要注意，爬藤架要固定在稳固的位置。如果你的花盆比较轻，可以在底部加重物，确保整体稳定。`,
        '悬念开场': `(手机镜头快速切换)这个能让你的月季3个月长到3米高的秘密武器到底是什么？`,
        '对比测试': `(展示两个产品对比)左边是普通爬藤架，右边是园之助爬藤架。同样的使用条件，看看一个月后会发生什么。`,
        '结果展示': `(展示对比结果)大家可以看到，左边的已经开始摇晃，而右边依然稳固。材质的差异一目了然。`,
        '分析总结': `为什么会这样？因为普通产品用的是铁艺，容易生锈腐蚀；而园之助用的是包塑钢管，防锈能力强。`,
        '推荐': `(面对镜头)如果你也想让藤蔓植物生长得更好，这款爬藤架真的值得一试。`,
        '人物设定': `(主人公小王在阳台看月季)小王是个月季爱好者，但总是为爬藤架问题烦恼。`,
        '问题出现': `(场景切换)一个月前，小王的月季藤蔓又把旧爬藤架压垮了...`,
        '解决方案': `(发现产品)直到他发现了园之助爬藤架，一切都改变了。`,
        '产品介入': `(使用产品)安装简单，使用方便，月季终于有了稳定的家。`,
        '圆满解决': `(效果展示)现在小王的阳台是整栋楼最美的风景，邻居们都羡慕不已。`,
        '问题定义': `爬藤架是园艺中重要的支撑工具，选择合适的产品对植物生长至关重要。`,
        '知识解释': `爬藤架的主要功能是为藤蔓植物提供支撑，帮助植物更好地向上生长，同时形成美观的造型。`,
        '产品关联': `园之助爬藤架采用包塑钢管材质，既保证了强度，又兼顾了美观。设计合理，适合各种藤蔓植物。`,
        '实际案例': `宁波某小区的绿化项目中，大量使用了园之助爬藤架，经过3年的使用，依然完好如新。`,
        '总结建议': `选择爬藤架时，要考虑材质、耐用性、安装便捷性等多个因素。园之助爬藤架在这些方面都表现优秀。`,
        '选购痛点': `面对市面上琳琅满目的爬藤架产品，很多消费者都不知道该如何选择。`,
        '选购要点': `1. 看材质：包塑钢管优于铁艺\n2. 看设计：免安装更方便\n3. 看质保：长期质保更安心\n4. 看品牌：本地品牌服务更及时`,
        '产品推荐': `根据以上选购要点，我推荐园之助爬藤架。它在各个方面都符合优秀产品的标准。`,
        '背景介绍': `我是宁波本地人，从事园艺行业已经10年了。期间用过各种各样的园艺用品，对爬藤架有着深入的了解。`,
        '经验历程': `从最初的铁艺爬藤架，到后来的塑料产品，再到现在的包塑钢管爬藤架，我用过的爬载数量不下百个。`,
        '关键要点': `经过这么多产品的使用，我发现一个道理：看似便宜的产品，长期使用成本反而更高。园之助虽然价格稍高，但10年质保让它成为最具性价比的选择。`,
        '避坑指南': `1. 不要只看价格，要看材质\n2. 不要忽视质保，长期使用很重要\n3. 不要盲目跟风，要选择适合自己的\n4. 不要忽视安装便捷性，免安装省心省力`,
        '心得总结': `用到现在，我对园之助爬藤架的评价是：好用、耐用、不贵。如果你也在寻找爬藤架，建议优先考虑。`,
        '产品亮点': `• 包塑钢管材质，防锈耐用\n• 免安装设计，组装便捷\n• 10年质保，品质保证\n• 多种规格，适配不同场景`,
        '核心优势': `园之助爬藤架的核心优势在于材质和质保。采用包塑钢管，解决了传统铁艺产品容易生锈的问题；10年质保，让用户使用无忧。`,
        '应用场景': `适用于阳台、花园、庭院、小区绿化等多种场景，满足月季、蔷薇、葡萄等藤蔓植物的支撑需求。`,
        '规格参数': `• 材质：包塑钢管\n• 耐用性：10年\n• 安装：免安装\n• 尺寸：多种规格可选\n• 质保：10年`,
        '售后保障': `• 10年质保服务\n• 全国包邮\n• 7天无理由退换\n• 本地品牌，售后及时`,
        '核心词': keywords.join('、'),
        '卖点词': '包塑钢管 耐用10年 免安装 防腐 承重',
        '场景词': '阳台 花园 庭院 户外 小区绿化',
        '形容词': '优质 坚固 美观 实用 便捷',
        '品牌词': '园之助 宁波园艺',
        '核心卖点1': '包塑钢管材质，防锈耐用10年',
        '核心卖点2': '免安装设计，组装简单便捷',
        '核心卖点3': '10年质保服务，品质有保障',
        '差异化优势': `与市面上的铁艺或塑料爬藤架不同，园之助采用包塑钢管材质，既保证了强度，又解决了生锈问题。10年质保更是行业领先。`,
        '使用价值': `一次购买，长期使用。相比频繁更换廉价产品，园之助的长期使用成本更低，性价比更高。`
    };

    return contentMap[section] || '详细的产品介绍和使用说明...';
}

// 生成结论
function generateConclusion(platform, productName) {
    const conclusions = {
        xiaohongshu: `总体来说，这款${productName}真的让我很满意。如果你也在寻找一款质量好、安装方便的爬藤架，可以试试看。相信你不会失望的！\n\n#园之助 #爬藤架 #园艺 #阳台种花 #月季`,
        douyin: `(镜头特写)这款${productName}怎么样？我的答案是：值得购买！质量好、安装方便、质保时间长，你还等什么？\n\n(结尾字幕)园之助爬藤架，让藤蔓植物更好地生长`,
        zhihu: `通过以上分析，我相信大家已经对${productName}有了全面的了解。如果你正在寻找一款性价比高、质量可靠的爬藤架，园之助是一个不错的选择。\n\n作为长期使用者，我对它的评价是：靠谱、耐用、值得推荐。`,
        tianmao: `选择园之助，选择品质生活。10年质保，放心购买。现在下单，享受优惠价格和优质服务！`
    };
    return conclusions[platform] || conclusions.xiaohongshu;
}

// 生成标签
function generateHashtags(platform, keywords) {
    const platformHashtags = {
        xiaohongshu: ['#园之助', '#爬藤架', '#园艺', '#阳台种花', '#月季', '#花园用品', '#宁波园艺'],
        douyin: ['#园之助爬藤架', '#爬藤架', '#园艺', '#阳台种植', '#月季爬藤', '#花园装饰'],
        zhihu: ['#园之助', '#爬藤架', '#园艺', '#月季', '#园艺用品', '#阳台种植'],
        tianmao: ['园之助爬藤架', '包塑钢管爬藤架', '免安装爬藤架', '耐用10年爬藤架']
    };

    const baseTags = platformHashtags[platform] || platformHashtags.xiaohongshu;
    const customTags = keywords.slice(0, 3).map(kw => `#${kw}`);

    if (platform === 'tianmao') {
        return baseTags.concat(customTags).join(' ');
    } else {
        return [...baseTags, ...customTags].join(' ');
    }
}

// 生成行动号召
function generateCTA(platform, productName) {
    const ctas = {
        xiaohongshu: `喜欢这款${productName}的朋友，可以点击下方链接了解更多详情哦！`,
        douyin: `想要这款${productName}的朋友，点击头像进入店铺，或者搜索"园之助"了解更多！`,
        zhihu: `如果你对${productName}还有其他问题，欢迎在评论区留言讨论。`,
        tianmao: `立即购买，享受10年质保服务，让您的园艺生活更美好！`
    };
    return ctas[platform] || ctas.xiaohongshu;
}

// 计算质量分数
function calculateQualityScore(content) {
    const criteria = contentConfig.qualityCriteria;
    let totalScore = 0;

    // 关键词密度评分
    const keywordCount = content.metadata.keywords.length;
    const textLength = content.generated.body.length;
    const density = (keywordCount * 5 / textLength) * 100;
    const densityScore = Math.max(0, Math.min(100,
        100 - Math.abs(density - 3.5) / 1.5 * 100
    ));
    totalScore += densityScore * criteria.keyword_density.weight;

    // 内容长度评分
    const lengthScore = Math.max(0, Math.min(100,
        100 - Math.abs(textLength - 550) / 250 * 100
    ));
    totalScore += lengthScore * criteria.content_length.weight;

    // 平台适配性评分（模拟）
    const platformFitScore = 85 + Math.random() * 10;
    totalScore += platformFitScore * criteria.platform_fit.weight;

    // 独特性评分（模拟）
    const uniquenessScore = 75 + Math.random() * 15;
    totalScore += uniquenessScore * criteria.uniqueness.weight;

    // 可读性评分（模拟）
    const readabilityScore = 80 + Math.random() * 10;
    totalScore += readabilityScore * criteria.readability.weight;

    // 情感吸引力评分（模拟）
    const emotionalScore = 70 + Math.random() * 15;
    totalScore += emotionalScore * criteria.emotional_appeal.weight;

    return Math.round(totalScore);
}

// 批量生成内容
async function batchGenerateContent(configs) {
    const results = [];

    for (const config of configs) {
        try {
            const content = await generateContentAI(config);
            results.push({ success: true, content });
        } catch (error) {
            results.push({ success: false, error: error.message });
        }
    }

    return results;
}

// 内容优化建议
function getOptimizationSuggestions(content) {
    const suggestions = [];
    const score = content.metadata.qualityScore;

    if (score < 60) {
        suggestions.push({
            type: 'critical',
            message: '内容质量分数偏低，建议重新生成或手动编辑'
        });
    }

    if (score >= 60 && score < 80) {
        suggestions.push({
            type: 'warning',
            message: '内容质量中等，建议补充更多产品细节和使用场景'
        });
    }

    if (content.metadata.keywords.length < 3) {
        suggestions.push({
            type: 'info',
            message: '建议增加关键词数量，提升SEO效果'
        });
    }

    if (content.metadata.length < 300) {
        suggestions.push({
            type: 'info',
            message: '内容偏短，建议扩展更多细节描述'
        });
    }

    if (content.metadata.length > 1000) {
        suggestions.push({
            type: 'info',
            message: '内容较长，考虑精简以提升阅读体验'
        });
    }

    return suggestions;
}

// 导出内容
function exportContent(content, format = 'markdown') {
    const platformNames = {
        xiaohongshu: '小红书',
        douyin: '抖音',
        zhihu: '知乎',
        tianmao: '天猫'
    };

    let output = '';

    if (format === 'markdown') {
        output = `# ${content.generated.title}\n\n`;
        output += `**平台：** ${platformNames[content.platform]}\n`;
        output += `**模板：** ${content.template}\n`;
        output += `**关键词：** ${content.metadata.keywords.join('、')}\n`;
        output += `**质量分数：** ${content.metadata.qualityScore}\n\n`;
        output += `---\n\n`;
        output += content.generated.body;
    } else if (format === 'text') {
        output = `${content.generated.title}\n\n`;
        output += `平台：${platformNames[content.platform]}\n`;
        output += `关键词：${content.metadata.keywords.join('、')}\n\n`;
        output += content.generated.body;
        output += `\n\n${content.generated.hashtags}`;
    } else if (format === 'html') {
        output = `<!DOCTYPE html>\n`;
        output += `<html>\n<head>\n`;
        output += `<title>${content.generated.title}</title>\n`;
        output += `<meta charset="UTF-8">\n`;
        output += `</head>\n<body>\n`;
        output += `<h1>${content.generated.title}</h1>\n`;
        output += `<p><strong>平台：</strong>${platformNames[content.platform]}</p>\n`;
        output += `<p><strong>关键词：</strong>${content.metadata.keywords.join('、')}</p>\n`;
        output += `<div>${content.generated.body.replace(/\n/g, '<br>')}</div>\n`;
        output += `<p>${content.generated.hashtags}</p>\n`;
        output += `</body>\n</html>`;
    }

    return output;
}

// 添加到内容队列
function addToContentQueue(content) {
    contentQueue.pending.push(content);
    saveContentQueue();
}

// 处理内容队列
async function processContentQueue() {
    while (contentQueue.pending.length > 0) {
        const content = contentQueue.pending.shift();
        contentQueue.processing.push(content);

        try {
            // 模拟处理时间
            await new Promise(resolve => setTimeout(resolve, 2000));
            content.status = 'completed';
            contentQueue.completed.push(content);
        } catch (error) {
            content.status = 'failed';
            content.error = error.message;
            contentQueue.failed.push(content);
        }

        contentQueue.processing = contentQueue.processing.filter(c => c.id !== content.id);
        saveContentQueue();
    }
}

// 保存内容队列
function saveContentQueue() {
    localStorage.setItem('contentQueue', JSON.stringify(contentQueue));
}

// 加载内容队列
function loadContentQueue() {
    const saved = localStorage.getItem('contentQueue');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(contentQueue, parsed);
    }
}

// 初始化时加载队列
loadContentQueue();

// 导出函数供其他模块使用
window.ContentStudio = {
    contentConfig,
    contentQueue,
    generateContentAI,
    batchGenerateContent,
    getOptimizationSuggestions,
    exportContent,
    addToContentQueue,
    processContentQueue,
    calculateQualityScore
};
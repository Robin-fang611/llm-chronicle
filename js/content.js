/**
 * content.js —— v3.3 全部叙事内容（数据层，无逻辑）
 * 命名空间：window.Content
 * 来源：《策划案-v3.md》v3.3（纯策划版），逐字照录。
 *
 * 结构约定：
 *   - openings["Y-A"]：开局独白
 *   - q1["Y-A"] / q2["Y-A"]：题面 { scene, opt }，opt = 选项库键（S1/S2/S3）
 *   - optLib.q1 / optLib.q2：选项库（按年龄档）
 *   - era.D3..D9：时代节点题
 *   - breaking.b1..b6：号外事件
 *   - endings.A..I + normal：结局（含判定规则）
 *   - personality：4 维 + 16 型
 */
(function (global) {
  'use strict';

  var Content = {};
  Content.START_YEAR = 2017;
  Content.AGE_BANDS = [18, 22, 25];

  /* 年龄档 → 选项库键（策划案 v5 §4.4）：18=大学线 S1 / 22=工作线 S2 / 25=跳槽线 S3 */
  Content.optKeyForAge = function (A) {
    if (A <= 18) return "S1";
    if (A <= 22) return "S2";
    return "S3";
  };
  Content.bandForAge = Content.optKeyForAge;

  Content.bandTitle = function (A) {
    if (A === 18) return "18 岁 · 大一开始";
    if (A === 22) return "22 岁 · 工作开始";
    return "25 岁 · 跳槽转型";
  };

  /* ============================ 3. 开局独白（3 条，按年龄档） ============================ */
  Content.openings = {
    "18": "2017 年，18 岁的你。军训刚结束，专业还没定，宿舍铺位的味道还没闻熟。AlphaGo 赢完李世石一年，「人工智能」还只是新闻里的词。你有一整段大学时光可以挥霍，还不知道它会是什么。",
    "22": "2017 年，22 岁的你。毕业散伙饭刚吃完，你租了间 8 平米的隔断房，正式成为社会人。AlphaGo 赢完李世石一年，「人工智能」还只是新闻里的词。你的第一份工作，会跟它有关。",
    "25": "2017 年，25 岁的你。工作第三年，工资涨过两次，也没涨出个未来。猎头开始打电话，妈开始催婚。AlphaGo 赢完李世石一年——你听说 AI 很火，但那跟你没关系。你想的是：要不要跳槽。"
  };

  /* ============================ 4.1 生活题题面（三档 × 三年 = 9 条） ============================ */
  Content.life = {
    "2017": {
      "18": "你大一，军训刚结束，专业还没定。系里传说「转 CS 保真香」，隔壁宿舍已经开始刷题了。你妈说「学个有用的」，你爸没说话。",
      "22": "你刚毕业，手里两个 offer：一个钱多的民营，一个稳的国企。你爸说「选稳的」，你妈没说话。你租的房下个月才空出来。",
      "25": "你工作第三年，猎头第一次打电话来，你妈第一次催婚。你把辞职信打了三遍又删掉。你听说风口行业薪资翻倍——但你不确定自己是不是那块料。"
    },
    "2018": {
      "18": "你大二，课不多，奖学金差一个名次。同学里有忙着刷题转 CS 的，有每天泡图书馆的，有你这种先看看的。你妈第三次在电话里问「以后怎么办」。",
      "22": "你工作第二年，工资 6000，房租 2300。同事跳槽去了「大数据」公司工资翻倍。你开始算：这样下去什么时候是个头。",
      "25": "你转型第一年——新公司、新行业、新同事，你第一次觉得自己像应届生。夜里你刷到老同事的升职朋友圈，心里咯噔一下。"
    },
    "2021": {
      "18": "你大四，毕业季。投了 30 家回了 5 家，手里 offer：一个钱多的互联网，一个稳的国企，还有一份家里的安排。你妈说「回来吧」，你说「再看一年」。",
      "22": "你工作第五年，部门换了三个领导，最好的朋友被裁后去了新公司。他问你「你还要留在原地吗」。你开始刷招聘软件，第一次看「AI 训练师」岗位。",
      "25": "你工作第七年，工资涨过一次，人没涨。你重新开始想：打工到 35 岁还是这样吗？你手里攒了 12 万——够不够干点别的。"
    }
  };
  /* ============================ 4.4 生活题选项库（按档位固定，三口共用） ============================ */
  /* effect: 资源变化；tend: 倾向分；flag: 关键标记（同 v4 语义）
     权威规则：S1/S2/S3 的 A/B/C 选项文字、效果、倾向、flag 全档三年固定，
     题面场景随年份（Content.life），选项库不随年份变化（策划案 v5 §4.4）。 */
  Content.lifeOptLib = {
    S1: [
      { label: "计算机：听说能挣大钱", effect: { skill: 15, network: 4, mind: -5 }, tend: { 技术红利: 4 }, flag: "choseCS",
        echo: "AlphaGo 赢完李世石一年后，「人工智能」四个字第一次走进中国家庭的饭桌。", life: "你妈说「学计算机啊，将来给人修电脑」" },
      { label: "新闻/中文/绘画：我想做喜欢的事", effect: { skill: 8, mind: 3 }, tend: { 清醒打工人: 1 },
        echo: "那年自媒体正当时，纸媒在转型——喜欢的事，开始变得不那么安稳。", life: "你 18 岁写的文，是你大学里最高光的时刻" },
      { label: "没想好，先混着", effect: { mind: 4, skill: -2 }, tend: { 数字隐士: 1 },
        echo: "很多人都是这样的。18 岁本来就不知道自己要什么。", life: "你开学第 3 周，开始逃了高数" }
    ],
    S2: [
      { label: "进大厂，哪怕 996", effect: { deposit: 8, skill: 18, mind: -8 }, tend: { 技术红利: 4, 清醒打工人: 1 },
        echo: "那几年大厂校招是「上岸」的同义词。", life: "你第一次赶早高峰地铁，被人流推着走，想「这就是长大」" },
      { label: "考公考编，图个安稳", effect: { deposit: 3, mind: 6, skill: 2 }, tend: { 数字隐士: 2 }, flag: "steady",
        echo: "考公报名人数年年破纪录，人人都在找「稳」。", life: "你妈终于满意了，那是她三年里第一次不唠叨你" },
      { label: "先活着：找份能养自己的活", effect: { deposit: 2, skill: 6, network: 3, mind: 2 }, tend: { 清醒打工人: 2, 浪里掌舵: 1 },
        echo: "小公司活下来的人，后来很多都赶上了 AI 潮的第一波。", life: "你入职第一天，老板给了你一台 5 年前的本" }
    ],
    S3: [
      { label: "跳槽去风口：趁我还年轻", effect: { deposit: 10, skill: 12, mind: -6 }, tend: { 技术红利: 3 }, flag: "jump",
        echo: "那年风口行业的薪资比这里高一倍。", life: "你走那天，只跟一个同事吃了饭" },
      { label: "稳住：把手上事做到极致", effect: { deposit: 4, skill: 10, mind: 2 }, tend: { 清醒打工人: 2 },
        echo: "深耕的人后来发现，AI 时代最缺的不是会用 AI 的人，是懂行的人。", life: "你被评了年度优秀员工，奖杯放在柜子里吃灰" },
      { label: "不干了，搞副业", effect: { deposit: -5, skill: 8, network: 5, mind: 8 }, tend: { 一人公司: 4 }, flag: "bareQuit",
        echo: "那年「裸辞搞副业」的笔记在小红书出了无数爆款。", life: "你算了 30 遍存款，才敢按发送键" }
    ]
  };

  /* ============================ 6. 时代节点题库 ============================ */
  Content.era = {
    D3: {
      id: "D3", title: "第一次强烈感觉到「什么在替我刷手机」",
      scene: "你在短视频刷了 3 小时，抬头是 12 点。它永远推得比你自己还懂你。",
      opts: [
        { label: "卸载，戒了", effect: { mind: 8, network: 2 }, tend: { 数字隐士: 2, 浪里掌舵: 2 },
          echo: "那年「算法成瘾」上了热搜。", life: "第三天你装回来了，但把限时调成了 20 分钟" },
        { label: "不管，刷就刷了", effect: { mind: -4, network: -1 }, tend: { 茧房: 2 },
          echo: "短视频日均使用时长悄悄涨到了 2 小时以上。", life: "你妈用抖音学会了红烧肉，你爸看了三年横店剧" },
        { label: "研究它为什么懂我", effect: { skill: 10, mind: -3, network: 3 }, tend: { 上岸教练: 2, 一人公司: 2 },
          echo: "那年「内容创作者」开始流行。", life: "你发的第一条笔记涨了 200 粉，高兴了一整天" }
      ]
    },
    D4: {
      id: "D4", title: "你的公司开始讲「AI 提效」",
      scene: "老板在全员会上放 PPT：「今年全面拥抱 AI。」会后，旁边工位的人说：「以后写报告的岗位，还要不要了？」",
      opts: [
        { label: "主动学，成为组里「会用」的那个", effect: { skill: 15, network: 4, mind: 2, aiDep: 10 }, tend: { 上岸教练: 3, 清醒打工人: 2 }, flag: "aiSkill",
          echo: "2024 年「AI 提效」成了所有大厂的年度词。", life: "你成了「用得好」的那个，老板点名你，你有点高兴又有点慌" },
        { label: "不学，我觉得机器做不了我的活", effect: { skill: 2, mind: -6 }, tend: { 数字隐士: 1 },
          echo: "2024 年中，第一批「AI 替代」的新闻密集出现。", life: "你没太在意，直到隔壁组裁了两个人" },
        { label: "跳槽去一家 AI 公司", effect: { deposit: 8, skill: 12, network: 8, mind: -6 }, tend: { 技术红利: 3 }, flag: "jump",
          echo: "2023-2024 年 AI 公司招人价格翻倍。", life: "新公司的工牌你发在了朋友圈" }
      ]
    },
    D4b: {
      id: "D4b", title: "疫情那两年，你待在家里",
      scene: "你妈开始天天给你做饭，你开始一天只出一次门。世界按下暂停键，你在家里刷完了两年电视剧。",
      opts: [
        { label: "停下来想了很久：我到底要什么", effect: { mind: 6, skill: 6 }, tend: { 清醒打工人: 2, 数字隐士: 1 },
          echo: "2020 年疫情让很多人第一次认真想「工作到底为了什么」。", life: "你写在日记里的话，三年后你早忘了，但方向没忘" },
        { label: "用这段时间学了个新东西", effect: { skill: 12, deposit: -2, mind: 3 }, tend: { 技术红利: 2, 上岸教练: 1 }, flag: "aiSkill",
          echo: "疫情催生了全民网课，也催生了「副业经济」。", life: "你那门课的合格率 60%，你是剩下的一半" },
        { label: "啥都没干，就躺着", effect: { mind: -4, skill: -2 }, tend: { 茧房: 2 },
          echo: "很多人都是这样过来的。", life: "你妈说「每天看你躺着，我都心慌」" }
      ]
    },
    D5: {
      id: "D5", title: "裁员/优化潮，轮到我了",
      scene: "周一例会。人力跟着老板进来。你没有被点名，但你最好的朋友在里面，他问你：「你说我还能干什么？」",
      opts: [
        { label: "陪他喝了一场，然后一起学新东西", effect: { skill: 8, network: 10, mind: 4 }, tend: { 浪里掌舵: 3, 上岸教练: 2 }, flag: "taughtAI",
          echo: "2024 年「35 岁焦虑」与「AI 焦虑」叠成同一种东西。", life: "你们一起报的课，他坚持完了，靠那 12 节课去了新公司" },
        { label: "先保住自己，把数据做得漂亮", effect: { deposit: 5, mind: -6, network: -4 }, tend: { 清醒打工人: 1 },
          echo: "那年「内卷」和「裁员」是同一枚硬币。", life: "年底你拿了 A，一张都没敢发朋友圈" },
        { label: "反正也这样了，辞职搞副业", effect: { deposit: -6, mind: 10, skill: 5 }, tend: { 一人公司: 4 }, flag: "bareQuit",
          echo: "2024 年「裸辞搞副业」笔记频出爆款。", life: "你辞职前，算了三十遍存款" }
      ]
    },
    D6: {
      id: "D6", title: "人生重算账",
      scene: "房租快到期，爸妈在催，同事在跳。你看着手机上那个越来越聪明的 AI，想：我这一生，就这一种活法吗？",
      opts: [
        { label: "咬死这条路：上班 + 副业双线", effect: { skill: 10, deposit: 8, mind: -4 }, tend: { 一人公司: 3 },
          echo: "「一人公司」正在成为真赛道：AI + 一个人 = 一家公司。", life: "副业收入第一次盖过工资那天，你把工资条设为仅自己可见" },
        { label: "回小城/考编，把人生存量变现", effect: { deposit: 6, mind: 10, skill: 2, network: -6 }, tend: { 数字隐士: 3, 浪里掌舵: 1 }, flag: "backSmallCity",
          echo: "小城生活成了新的流量密码。", life: "你妈很高兴。你第一次在周四下午睡满了 8 小时" },
        { label: "把自己卖给 AI 浪潮，赌下一轮", effect: { deposit: 12, skill: 15, mind: -8 }, tend: { 技术红利: 3 }, flag: "jump",
          echo: "AI 公司薪资仍在涨，但「35 岁」的坎也在。", life: "你加入的公司平均年龄 27 岁，你心跳了一下" }
      ]
    },
    D7: {
      id: "D7", title: "AI 学会「思考」了",
      scene: "全家都在转 DeepSeek。你爸第一次问你：「这东西以后能替你写报告？」你愣了一下——那年你才发现，你早就在用，但从没想过「以后」。",
      opts: [
        { label: "给自己报课，把它从「工具」学成「手艺」", effect: { skill: 12, deposit: -4, mind: -2, aiDep: 8 }, tend: { 上岸教练: 3, 技术红利: 1 }, flag: "aiSkill",
          echo: "2025.01 R1 开源，训练成本约 29 万美元。", life: "你那门课的学员平均 31 岁，聊最多的不是作业，是「我还来得及吗」" },
        { label: "不折腾了，把生活过明白", effect: { mind: 8, skill: 2, network: 2 }, tend: { 数字隐士: 2, 清醒打工人: 2 },
          echo: "2025 年「反焦虑」成了另一股主流。", life: "你开始周末爬山，手机丢在家里" },
        { label: "找能拉我一把的人", effect: { network: 12, skill: 6, mind: 2 }, tend: { 浪里掌舵: 2 },
          echo: "2025 年「人脉」突然值钱——光有信息差，不如有「能告诉你怎么用 AI 的人」。", life: "第一顿饭请的是当年一起被裁的老同事，他后来教了你三个月" }
      ]
    },
    D8: {
      id: "D8", title: "最后一个风口：AI 带着钱来了",
      scene: "你 {AGE} 岁。身边有人靠 AI + 做号月入五万，有人的工位被 AI 顶了。你连着三天刷到「AI 元年，最后一波」。",
      opts: [
        { label: "上车：拿存款换名额，去学+去干", effect: { deposit: -8, skill: 15, mind: -4 }, tend: { 技术红利: 3, 一人公司: 2 }, flag: "aiSkill",
          echo: "2026 年「用 AI 做生意」成了新一年的口号。", life: "你交学费的手有点抖——那是你这些年最贵的一次冲动" },
        { label: "不上车：当最后一轮的风口是噪音", effect: { mind: 6, deposit: 2 }, tend: { 数字隐士: 2, 清醒打工人: 2 },
          echo: "每一轮风口都会过去，但每一轮都长出了新东西。", life: "你朋友圈有人晒 AI 副业收入，你点了个赞，没再说什么" },
        { label: "拉上三个靠谱的人，合伙认真干", effect: { deposit: -3, network: 12, skill: 10 }, tend: { 一人公司: 3, 浪里掌舵: 1 }, flag: "jump",
          echo: "2026 年「AI 合伙创业」成了新词——一个人干不成的事，三个人可以。", life: "你们第一个月的账，是你在 Excel 里手写的" }
      ]
    },
    D9: {
      id: "D9", title: "最后一刻：跟当年的自己打个招呼",
      scene: "你刷到自己的老照片。那年 {START_AGE} 岁的你，不知道未来会这样。页面弹出一句话：「那年你的选择，已经把你带到这里了。」",
      opts: [
        { label: "跟当年的我说：我过得还行", effect: { mind: 6 }, tend: { __all: 1 },
          echo: "2017-2026，AI 从论文变成了你我手机里的日常。", life: "你换了 4 份工作、搬了 3 次家、认识了一百多个人" },
        { label: "问问自己：如果重来一次呢", effect: { mind: -3, skill: 4 }, tend: { 清醒打工人: 1 },
          echo: "重来一次也不会不同——因为当年的你，还不知道什么是 AI。", life: "但你学会了「现在开始也不晚」" },
        { label: "没什么可说的，往前看", effect: { mind: 3, deposit: 2 }, tend: { 浪里掌舵: 1 },
          echo: "这些年，你亲手把 AI 从「新闻」用成了「工具」，又从「工具」用成了「手艺」。", life: "你关掉相册，去阳台浇了花" }
      ]
    }
  };

  /* ============================ 6.3 号外事件（6 种） ============================ */
  /* 排期由 logic.buildPlan 按策划案 v4 §6.0 表决定；yearLabel 仅展示 */
  Content.breaking = {
    b1: {
      id: "b1", variant: "m3", yearLabel: "2022.11",
      kicker: "号外 · BREAKING", title: "那个聊天机器人爆了",
      sub: "某公司发布聊天产品，5 天 100 万人用。你同事转给你：这个真的会说话。",
      opts: [
        { label: "立刻试用：帮我写个东西试试", effect: { skill: 8, mind: -3, aiDep: 8 }, tend: { 上岸教练: 1 },
          echo: "你第一次跟它聊了十分钟。", life: "你发现它接话比你还快" },
        { label: "看个热闹：跟我有什么关系", effect: { mind: 4, skill: 1 }, tend: { 数字隐士: 1 },
          echo: "你划走了。", life: "三个月后你又装了回来" }
      ],
    },
    b2: {
      id: "b2", variant: "m2", yearLabel: "2023.5",
      kicker: "号外 · BREAKING", title: "有人被 AI 电话骗了",
      sub: "反诈中心给你打电话：你妈最近接了很多陌生号码，有一段声音跟你一模一样。",
      opts: [
        { label: "立刻视频确认，给她装防骗 App，教她一晚", effect: { mind: 5, network: 6 }, tend: { 浪里掌舵: 1 }, flag: "antiScam",
          echo: "你妈学会了挂断可疑电话。", life: "她后来还提醒了小区里三个老人" },
        { label: "说句「你们注意点」，然后忙你的", effect: { network: -2, mind: -2 }, flag: "scamRisk",
          echo: "你没当回事。", life: "你转头就去忙工作了" },
        { label: "不可能，谁这么邪门", effect: { mind: -2 }, flag: "scamRisk",
          echo: "你觉得是谣言。", life: "你没放在心上" }
      ],
    },
    b3: {
      id: "b3", variant: "m4", yearLabel: "2024",
      kicker: "号外 · BREAKING", title: "AI 面试官上岗",
      sub: "你投的简历，第一关都不是人看的了。",
      opts: [
        { label: "学：把简历改成「AI 好筛选」的样子", effect: { skill: 8, mind: -3 }, tend: { 技术红利: 1 },
          echo: "你研究了一晚上 JD 关键词。", life: "下一次面试，你过了初筛" },
        { label: "怼：面试官不是人，我不去", effect: { mind: 3, skill: 1 }, tend: { 数字隐士: 1 },
          echo: "你关掉了招聘软件。", life: "你决定慢慢来" },
        { label: "先等等，看别人怎么搞", effect: { network: 3, mind: -1 }, tend: { 浪里掌舵: 1 },
          echo: "你观望了一阵。", life: "你同学先踩了坑，你避开了" }
      ],
    },
    b4: {
      id: "b4", variant: "m3", yearLabel: "2025",
      kicker: "号外 · BREAKING", title: "你被 AI 换脸/网暴了",
      sub: "朋友发来一段视频：脸是你的，话不是你说的。",
      opts: [
        { label: "报警+澄清：绝不能让它传下去", effect: { mind: 4, network: 4 }, tend: { 浪里掌舵: 1 }, flag: "antiDeepfake",
          echo: "你第一时间留了证据。", life: "第二天平台下架了那段视频" },
        { label: "删掉就当没看见", effect: { mind: -6 }, tend: { 茧房: 1 }, flag: "deepfakeJam",
          echo: "你假装没事。", life: "那周你半夜还会惊醒" },
        { label: "做成自己的乐子：我把自己先玩进笑点", effect: { mind: 3, network: 2 }, tend: { 一人公司: 1 },
          echo: "你做了个鬼畜视频回应。", life: "评论区都在帮你说话" }
      ],
    },
    b5: {
      id: "b5", variant: "m1", yearLabel: "2025.01",
      kicker: "号外 · BREAKING", title: "AI 开始「思考」了",
      sub: "DeepSeek 刷屏。全家人都在问：它怎么会这么想？",
      opts: [
        { label: "给自己报课，把它从工具学成手艺", effect: { skill: 12, deposit: -4, mind: -2, aiDep: 8 }, tend: { 上岸教练: 2, 技术红利: 1 }, flag: "aiSkill",
          echo: "你报了那门爆款课。", life: "你第一次跟 AI 聊「为什么」而不是「怎么做」" },
        { label: "不折腾了，把生活过明白", effect: { mind: 8, skill: 2, network: 2 }, tend: { 数字隐士: 2, 清醒打工人: 1 },
          echo: "你关掉了热搜。", life: "你周末去爬了山" },
        { label: "找能拉我一把的人", effect: { network: 12, skill: 6, mind: 2 }, tend: { 浪里掌舵: 2 },
          echo: "你约了老同事吃饭。", life: "他教了你三个月" }
      ],
    },
    b6: {
      id: "b6", variant: "m2", yearLabel: "2024.9",
      kicker: "号外 · BREAKING", title: "你的工位被 AI 顶替了",
      sub: "公司宣布：新来的 AI 系统一个月后上岗，你先「协助」它。",
      opts: [
        { label: "抢先学会它：把自己变成「会用的人」", effect: { skill: 10, aiDep: 10 }, tend: { 上岸教练: 2, 清醒打工人: 1 }, flag: "aiSkill",
          echo: "你成了组里最懂它的人。", life: "老板开始依赖你" },
        { label: "找老板谈：给我三个月，我能证明我不可替代", effect: { mind: 4, network: -2 }, tend: { 清醒打工人: 1 },
          echo: "你写了份方案。", life: "老板答应再看你一阵" },
        { label: "骑驴找马：白天上班，晚上投简历", effect: { network: 3, deposit: 2 }, tend: { 浪里掌舵: 1 }, flag: "jump",
          echo: "你悄悄更新了简历。", life: "两个月后你面了三家" }
      ],
    }
  };

  /* ============================ 8. 结局系统（10 活法） ============================ */
  /* judge: { aiDep_max, mind_min, skill_min, deposit_min, lows_min, flags:[...], notFlags:[...] }
     判定顺序：先 G/H/I（失败），再 A-F（鲜活，按倾向分），最后 normal。 */
  Content.endings = {
    A: {
      key: "A", name: "清醒打工人型", archive: "清醒打工人",
      bio: "你今年 {AGE} 岁，还在上班。工资涨了一半，工作被 AI 压短了 40%。\n剩下的时间，你学完了那门拖了三年的插画课，周末教社区的孩子们画画——不收钱，你说「图个高兴」。\n你没暴富，也没失业。2026 年你活得挺像样。",
      judge: { aiDep_max: 35, mind_min: 58, skill_min: 52 }, tendency: "清醒打工人"
    },
    B: {
      key: "B", name: "一人公司型", archive: "一人公司",
      bio: "{裸辞那年} 你辞了职。没有老板，没有同事，没有工位。\n你一个人 + 一台电脑 + 一个 AI，接稿、做号、卖课。\n收入起起伏伏，但你再也不用 9 点前到公司了。\n2026 年你有一百多个老客户，和一间 12 平米的出租屋。\n你说：这是我这辈子做过最对的决定。",
      judge: { aiDep_min: 26, skill_min: 60, deposit_min: 4, flags: ["bareQuit"] }, tendency: "一人公司"
    },
    C: {
      key: "C", name: "上岸教练型", archive: "上岸教练",
      bio: "{被优化那年} 你被优化过一次。那是你人生最慌的三个月。\n但你没沉下去：你把「怎么用 AI」练成了吃饭的手艺，然后你开始教别人——同事、前同事、网上的陌生人。\n2026 年你有 8000 个学员，每周上一次直播课。\n你说：感谢那年被裁。现在轮到我把「来得及」教给别人了。",
      judge: { skill_min: 65, network_min: 55, flags: ["taughtAI"] }, tendency: "上岸教练"
    },
    D: {
      key: "D", name: "技术红利型", archive: "技术红利",
      bio: "{开局那年} 你选了计算机。后来你有了首付，2026 年你在谈「要不要接那个 offer」。\n你的学费没白交——但你每晚睡前都会搜一次「35 岁」。\n吃到红利的人，最怕它停。档案会告诉你：红利可能停，但你当年赌的那次，赌对了。",
      judge: { deposit_min: 25, skill_min: 60, flags: ["choseCS"] }, tendency: "技术红利"
    },
    E: {
      key: "E", name: "数字隐士型", archive: "数字隐士",
      bio: "2026 年你在小城。工资不高，但五点半下班。\n你不跟 AI 卷，也不跟人卷。你用 AI 接点散活补贴家用，剩下时间浇花、爬山、陪父母。\n你妈说「还是回来好」。你说：是我把日子找回来了。",
      judge: { mind_min: 65, flags: ["backSmallCity"] }, tendency: "数字隐士"
    },
    F: {
      key: "F", name: "浪里掌舵型", archive: "浪里掌舵",
      bio: "这些年你被裁过两次，搬了四次家，哭过很多回。\n但每一次你都站起来：第一次学了个手艺，第二次攒下了一年生活费，第三次你把同龄人熬成了朋友。\n2026 年你没有大富大贵，但你有一身本事、一群过命的工友和一个不再害怕明天的自己。",
      judge: { lows_min: 1, skill_min: 50, mind_min: 45 }, tendency: "浪里掌舵"
    },
    G: {
      key: "G", name: "被浪吞型", archive: "被浪吞", warn: true,
      bio: "你的技能没跟上，AI 依赖度却拉满了。\n{裁员那年} 公司把你裁了。投了 60 份简历，第一关全是 AI 筛掉的。\n你开始刷短视频，一刷就是一天——因为只有算法还认识你。",
      judge: { fail: true, aiDep_min: 22, skill_max: 65, network_min: 36 }, tendency: null
    },
    H: {
      key: "H", name: "反诈受害者型", archive: "反诈受害者", warn: true,
      bio: "{2023 那年前后} 你没当回事。后来你妈接到那段声音和你一模一样的电话，转了 18 万。\n你挂了电话，第一次在爸妈面前没哭出来。\n那天晚上你把手机安上「反诈 App」，太迟的第二天。",
      judge: { fail: true, aiDep_min: 26, flags: ["scamRisk"], notFlags: ["antiScam"] }, tendency: null
    },
    I: {
      key: "I", name: "茧房型", archive: "茧房", warn: true,
      bio: "这些年你刷了 8000 小时的短视频。你不是刷不动，你是被喂到了今天：推荐的都懂你，懂你的都不推荐了。\n2026 年你妈问你最近在忙什么，你说「在看东西」。\n你确实在看。只是东西，一直在看你。",
      judge: { fail: true, aiDep_min: 25, skill_max: 60, network_max: 35 }, tendency: null
    },
    normal: {
      key: "normal", name: "普通人的十年", archive: "普通人",
      bio: "这些年过去了。你没被 AI 改变，你也没改变 AI。\n2026 年你是个普通人，过着普通的日子，账上有余钱，身边有人。\n这也是一种活法。绝大多数人，都是这么活的。",
      judge: {}, tendency: null
    }
  };

  /* ============================ 9. 人格标签体系（4 维 16 型） ============================ */
  Content.personality = {
    dims: [
      { key: "AR", name: "你在 AI 面前的姿态", pos: "A", posName: "拥抱", neg: "R", negName: "抵抗",
        rule: "AI 依赖度 ≥ 50 → A；否则 R" },
      { key: "GS", name: "你面对人生的策略", pos: "G", posName: "敢闯", neg: "S", posName: "求稳",
        rule: "裸辞过 / 跳槽 ≥ 2 → G；考编、回小城、稳稳上班 → S" },
      { key: "TP", name: "你赖以吃饭的武器", pos: "T", posName: "技术", neg: "P", posName: "通才",
        rule: "把 AI 学成手艺、选过计算机 → T；教人、组团、做内容、靠人脉 → P" },
      { key: "IO", name: "你汲取能量的方向", pos: "O", posName: "向外", neg: "I", posName: "向内",
        rule: "人脉 > 技能 → O；独处修行、自律、放下 → I" }
    ],
    types: [
      { code: "AGTI", name: "弄潮儿", portrait: "风口来了，你是第一个跳上去的人", living: "一人公司 / 技术红利" },
      { code: "AGTO", name: "领航员", portrait: "自己先上船，再喊大家上船", living: "上岸教练" },
      { code: "AGPI", name: "手工匠", portrait: "把 AI 练成手艺的人，不关心风口", living: "一人公司 / 清醒打工人" },
      { code: "AGPO", name: "布道者", portrait: "你学得最快，然后恨不得教会所有人", living: "上岸教练" },
      { code: "ASTI", name: "扫地僧", portrait: "稳稳地强，强得别人都不知道", living: "清醒打工人" },
      { code: "ASTO", name: "大家长", portrait: "你用稳，把一家人稳稳托住", living: "清醒打工人" },
      { code: "ASPI", name: "人间清醒", portrait: "不卷不躺，把日子过成自己的", living: "清醒打工人 / 数字隐士" },
      { code: "ASPO", name: "镇店之宝", portrait: "你在，团队就稳了", living: "清醒打工人 / 浪里掌舵" },
      { code: "RGTI", name: "独行侠", portrait: "你不信风口，你信自己", living: "数字隐士" },
      { code: "RGTO", name: "孤狼", portrait: "一个人干完了三个人的事", living: "浪里掌舵" },
      { code: "RGPI", name: "逆行者", portrait: "你拒绝 AI，但用通才手艺闯出了自己的路", living: "数字隐士 / 浪里掌舵", rare: true },
      { code: "RGPO", name: "野路子", portrait: "不合群的人，走了一条没标签的路", living: "普通人（隐藏）", rare: true },
      { code: "RSTI", name: "守拙者", portrait: "你不追风口也不怕 AI，把手艺磨成了别人替代不了的功夫", living: "清醒打工人 / 数字隐士" },
      { code: "RSTO", name: "稳压舱", portrait: "你用稳和本事，把身边人稳稳托住", living: "清醒打工人 / 浪里掌舵" },
      { code: "RSPI", name: "岁月静好", portrait: "你的目标不是赢，是活着", living: "数字隐士 / 普通型" },
      { code: "RSPO", name: "定海神针", portrait: "你不动，周围就不会乱", living: "普通型" }
    ],
    rare: {
      RGPI: { resistAI: true, skill_min: 70, bareQuit: true, network_lt_skill: true },
      RGPO: { resistAI: true, bareQuit: true }
    }
  };

  /* ============================ 资源元信息 ============================ */
  Content.resMeta = {
    deposit: { key: "deposit", name: "存款", unit: " 万", visible: true, fmt: "money" },
    skill:   { key: "skill", name: "技能", unit: "", visible: true, fmt: "point" },
    network: { key: "network", name: "人脉", unit: "", visible: true, fmt: "point" },
    mind:    { key: "mind", name: "心态", unit: "", visible: true, fmt: "point" }
  };

  global.Content = Content;
  if (typeof module !== 'undefined' && module.exports) module.exports = Content;
})(typeof window !== 'undefined' ? window : globalThis);

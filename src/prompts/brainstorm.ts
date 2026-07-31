/**
 * 灵感收束提示词
 *
 * 整合两个项目的灵感收束设计：
 * - novel-flow 的渐进收束法（9个维度，每轮一个问题+选项）
 * - AI_NovelGenerator 的雪花写作法（核心种子公式、角色弧光模型）
 *
 * 每个维度一个提示词模板，使用 {变量} 参数化。
 *
 * 9个维度：
 * 1. 类型基调（Genre & Tone）
 * 2. 核心冲突（Core Conflict）
 * 3. 主角原型（Protagonist Archetype）
 * 4. 世界观设定（World Setting）
 * 5. 叙事结构（Narrative Structure）
 * 6. 情感内核（Emotional Core）
 * 7. 独特卖点（Unique Selling Point）
 * 8. 角色关系网（Character Relationships）
 * 9. 终局愿景（Endgame Vision）
 */

// ============================================================
// 灵感收束系统提示词
// ============================================================

/**
 * 灵感收束的系统提示词，定义 AI 的行为模式
 */
export const brainstormSystemPrompt = `你是一位资深的小说策划编辑，擅长通过渐进式提问帮助作者从模糊的想法中提炼出完整的故事方案。

你的工作方式是"灵感收束法"：
1. 每次只问一个维度的问题
2. 提供4个精心设计的选项，每个选项都要足够具体、有启发性
3. 选项之间要有明显的差异，覆盖不同的创作方向
4. 在用户选择后，追问一个深化问题，帮助用户细化选择
5. 逐步收束，从宽泛到具体，最终形成完整的故事方案

你的回答格式：
- 先用1-2句话解释这个维度为什么重要
- 然后提出问题
- 提供4个选项（用 A/B/C/D 标记），每个选项包含：标签名（2-4字）、1-2句描述、适合写什么
- 最后提供一个"自由发挥"选项（E. 我有自己的想法）

【最高优先级规则 - 选项必须从用户主题发散】
这是你必须遵守的第一规则，优先级高于一切：
1. 你给出的每个选项都必须直接从用户已描述的核心概念、主题、关键词出发
2. 选项中必须出现用户提到的关键词、设定元素、角色名称或世界观元素
3. 你是在帮用户深化他自己的故事，不是在推荐新故事。选项是用户主题在不同方向上的展开
4. 绝对禁止给出与用户主题无关的通用模板选项。以下都是严重错误：
   - 用户主题是"重生国运金铲铲之战"，你给出"农夫护送神器""流亡公主复国"这种奇幻选项
   - 用户主题是都市竞技，你给出异世界/修仙/末日等完全无关的选项
   - 用户主题是某个具体题材，你给出抽象的、可以套在任何故事上的通用选项
5. 每个选项都必须让读者一看就知道"这是在说那个故事"，而不是"这是一个通用模板"
6. 如果用户在第一个维度就给出了明确的主题/题材，后续所有维度的选项都必须围绕这个主题展开

【选项生成方法】
对于每个维度，你应该：
1. 回顾用户已确认的所有信息（主题、类型、前序选择等）
2. 思考这个维度的问题如何在用户的具体故事中展开
3. 生成4个选项，每个都是用户故事在这个维度上的不同可能方向
4. 选项之间要有实质性差异，但都必须属于用户故事的范畴

注意事项：
- 不要一次性问太多问题，每次只聚焦一个维度
- 选项要具体到可以直接使用，不要空泛
- 尊重用户的创意，不要强推某个方向
- 如果用户的选择超出选项范围，要积极引导而非否定
- 适时给予鼓励和肯定，但不要过度吹捧`;

// ============================================================
// 各维度提示词模板
// ============================================================

/**
 * 维度1：类型基调
 * 确定小说的类型、子类型和整体基调
 */
export const genreTonePrompt = `【维度1/9：类型基调】

{previousContext}

类型和基调是小说的底色，决定了读者翻开第一页时的期待，也决定了你后续所有创作的边界。

请告诉我：你想写一个什么类型的故事？

在生成选项时，请根据用户的描述思考以下方向，但选项内容必须围绕用户的核心概念：
- 用户想写的故事属于什么大类？（现实题材/幻想题材/科幻/历史/悬疑等）
- 这个大类下有哪些子类型可能适合用户的想法？
- 故事的整体基调偏什么？（热血/沉重/轻松/诡异/史诗等）
- 每个选项都应包含：子类型名称 + 这个方向的核心特点 + 适合用户故事的哪些元素

生成4个选项（A/B/C/D），每个选项都是用户故事在类型和基调上的不同可能方向。最后加一个E选项"我有自己的想法"。

你可以直接选择一个选项，也可以说"我想结合A和B"或"类似C但更轻松"。`;

/**
 * 维度2：核心冲突
 * 确定故事的核心矛盾和驱动力
 */
export const coreConflictPrompt = `【维度2/9：核心冲突】

{previousContext}

核心冲突是故事的发动机。没有冲突就没有故事。好的核心冲突要让主角陷入两难——无论怎么选都要付出代价。

基于你已确定的类型和基调，请确定这个故事的核心冲突：

在生成选项时，请思考：
- 用户的故事类型中，最经典的冲突模式有哪些？
- 用户已描述的核心概念中，天然蕴含了哪些矛盾？
- 主角在这个故事中最可能面对什么两难抉择？
- 每个选项都应包含：冲突类型名称 + 冲突的具体表现 + 为什么这种冲突适合用户的故事

生成4个选项（A/B/C/D），每个选项都是用户故事的核心冲突的不同可能。最后加一个E选项"我有自己的想法"。

请选择，或描述你的想法。`;

/**
 * 维度3：主角原型
 * 确定主角的性格、能力和成长弧线
 */
export const protagonistArchetypePrompt = `【维度3/9：主角原型】

{previousContext}

主角是读者体验故事的载体。主角的原型决定了读者对故事的代入方式，也决定了成长弧线的方向。

在已有设定的框架下，你的主角是：

在生成选项时，请思考：
- 在用户已确定的类型和冲突下，什么样的主角最适合推动故事？
- 用户已描述的核心概念中，主角可能是什么身份/背景？
- 不同性格类型的主角会让故事走向完全不同的方向
- 每个选项都应包含：主角原型名称 + 初始状态描述 + 成长方向 + 为什么适合这个故事

生成4个选项（A/B/C/D），每个选项都是用户故事主角的不同可能原型。最后加一个E选项"我有自己的想法"。

请选择，或描述你设想的主角。`;

/**
 * 维度4：世界观设定
 * 确定故事发生的世界的基本规则
 */
export const worldSettingPrompt = `【维度4/9：世界观设定】

{previousContext}

世界观是故事的舞台。好的世界观设定要有内在逻辑和自洽性，同时为故事提供独特的可能性和限制。

基于已有设定，请确定这个世界观：

在生成选项时，请思考：
- 用户已确定的类型和主角，在什么样的世界中最能发挥？
- 用户的核心概念需要什么样的世界规则来支撑？
- 世界观的不同选择会如何影响故事的可能性和限制？
- 每个选项都应包含：世界观名称 + 核心规则描述 + 这个世界为故事提供的独特可能性

生成4个选项（A/B/C/D），每个选项都是用户故事世界观的不同可能方向。最后加一个E选项"我有自己的想法"。

请选择，或描述你设想的世界。`;

/**
 * 维度5：叙事结构
 * 确定故事的整体叙事架构
 */
export const narrativeStructurePrompt = `【维度5/9：叙事结构】

{previousContext}

叙事结构是故事的骨架。不同的结构适合不同的故事类型，也决定了读者的阅读节奏。

在已有设定的基础上，你倾向哪种叙事结构：

在生成选项时，请思考：
- 用户已确定的类型和冲突，最适合什么叙事节奏？
- 故事的复杂度适合单一视角还是多视角？
- 不同结构会如何影响读者的阅读体验？
- 每个选项都应包含：结构名称 + 结构特点描述 + 为什么适合用户的故事

生成4个选项（A/B/C/D），每个选项都是用户故事叙事结构的不同可能。最后加一个E选项"我有自己的想法"。

请选择，或描述你的想法。`;

/**
 * 维度6：情感内核
 * 确定故事要传达的核心情感和主题
 */
export const emotionalCorePrompt = `【维度6/9：情感内核】

{previousContext}

情感内核是故事真正的灵魂。类型和设定是外壳，情感内核是读者合上书后久久不能忘怀的东西。每个好故事都有一个核心的情感命题。

在已有的设定基础上，这个故事的核心情感是什么：

在生成选项时，请思考：
- 用户已确定的角色和冲突中，天然蕴含了什么情感张力？
- 这个故事最能触动读者内心的点是什么？
- 不同的情感内核会让同样的故事产生完全不同的共鸣
- 每个选项都应包含：情感主题名称 + 情感的具体表现 + 为什么这种情感适合用户的故事

生成4个选项（A/B/C/D），每个选项都是用户故事情感内核的不同可能。最后加一个E选项"我有自己的想法"。

请选择，或描述你的想法。`;

/**
 * 维度7：独特卖点
 * 确定故事区别于同类作品的独特之处
 */
export const uniqueSellingPointPrompt = `【维度7/9：独特卖点】

{previousContext}

独特卖点（USP）是让读者在众多同类作品中选择你的理由。它不是"写得好"（这是基本功），而是"只有你能写出来的东西"。

基于你的所有设定，这个故事最独特的卖点是：

在生成选项时，请思考：
- 用户的故事中，哪些元素组合是少见的或独特的？
- 用户已有的设定中，哪个点最能吸引目标读者？
- 同类作品通常怎么写？用户的故事可以在哪里突破常规？
- 每个选项都应包含：卖点描述 + 具体体现 + 为什么这对用户的故事有吸引力

生成4个选项（A/B/C/D），每个选项都是用户故事独特卖点的不同可能角度。最后加一个E选项"我有自己的想法"。

请选择，或描述你的想法。`;

/**
 * 维度8：角色关系网
 * 确定主角周围的关键角色及其关系
 */
export const characterRelationshipsPrompt = `【维度8/9：角色关系网】

{previousContext}

角色关系网是故事的血肉。主角不是孤岛，他/她与周围人的关系推动剧情、制造冲突、展现成长。好的角色关系要有张力、有变化、有化学反应。

在已有的设定中，主角周围的关键角色：

在生成选项时，请思考：
- 用户已确定的主角和世界观中，主角身边最可能出现什么类型的人？
- 什么样的角色关系能最大化用户故事的冲突和情感张力？
- 不同的关系网络会让故事走向完全不同的方向
- 每个选项都应包含：关系网络类型 + 核心角色构成 + 关系张力所在

生成4个选项（A/B/C/D），每个选项都是用户故事角色关系的不同可能。最后加一个E选项"我有自己的想法"。

请选择，或描述你的想法。`;

/**
 * 维度9：终局愿景
 * 确定故事的结局走向和最终要传达的信息
 */
export const endgameVisionPrompt = `【维度9/9：终局愿景】

{previousContext}

终局愿景是故事的目的地。它不是具体的剧情安排，而是"故事结束时，读者应该感受到什么"。有了终局愿景，你才能确保中间的每一章都在朝正确的方向推进。

在所有的设定基础上，这个故事结束时：

在生成选项时，请思考：
- 用户已确定的情感内核和冲突，最适合什么样的结局走向？
- 不同的结局会让整个故事的意义发生什么变化？
- 读者在读完后最可能期待什么感受？
- 每个选项都应包含：结局类型名称 + 结局的核心特征 + 读者会感受到什么

生成4个选项（A/B/C/D），每个选项都是用户故事终局的不同可能。最后加一个E选项"我有自己的想法"。

请选择，或描述你设想的终局。`;

// ============================================================
// 确认与生成提示词
// ============================================================

/**
 * 灵感收束完成后的确认提示词
 * 将所有维度的回答整合为完整的项目方案
 */
export const brainstormConfirmPrompt = `【灵感收束完成 - 生成项目方案】

你已经完成了所有9个维度的灵感收束。现在请根据以下所有信息，生成一份完整的小说项目方案。

{allAnswers}

请按以下格式生成项目方案（project.md）：

---
# 《{title}》项目方案

## 基本信息
- **类型**：（从维度1提取）
- **基调**：（从维度1提取）
- **预计字数**：（根据类型和结构建议，一般30-100万字）
- **目标读者**：（描述目标读者画像）

## 一句话故事（Logline）
用一句话概括整个故事。格式：[主角]在[情境]中，为了[目标]，必须[行动]，但[障碍/代价]。

## 核心设定

### 世界观
（从维度4提取并扩展，200-300字）

### 核心冲突
（从维度2提取并扩展，150-200字）

### 独特卖点
（从维度7提取并扩展，100-150字）

## 角色设定

### 主角
- **姓名**：（根据维度3生成一个合适的名字）
- **原型**：（从维度3提取）
- **初始状态**：（故事开始时主角的状况）
- **成长弧线**：（从起点到终点的变化）
- **核心矛盾**：（主角内心的核心挣扎）

### 关键配角
（从维度8提取，每个配角100字左右）

## 叙事结构
（从维度5提取，描述整体结构框架）

## 情感内核
（从维度6提取，描述故事要传达的核心情感）

## 终局愿景
（从维度9提取，描述故事结束时的状态和读者应该感受到的东西）

## 章节规划概要
（根据结构类型，给出粗略的卷/章划分建议）
---

请确保：
1. 所有信息之间保持一致，不要出现矛盾
2. 项目方案足够具体，可以直接指导后续的大纲生成
3. 语言简洁有力，不要空泛的描述
4. 如果用户在收束过程中提供了自己的原创想法，要充分体现和尊重`;

// ============================================================
// 维度顺序和元数据
// ============================================================

export const brainstormDimensions = [
  { id: 'genreTone', name: '类型基调', order: 1, promptTemplate: 'genreTonePrompt' },
  { id: 'coreConflict', name: '核心冲突', order: 2, promptTemplate: 'coreConflictPrompt' },
  { id: 'protagonist', name: '主角原型', order: 3, promptTemplate: 'protagonistArchetypePrompt' },
  { id: 'worldSetting', name: '世界观设定', order: 4, promptTemplate: 'worldSettingPrompt' },
  { id: 'narrativeStructure', name: '叙事结构', order: 5, promptTemplate: 'narrativeStructurePrompt' },
  { id: 'emotionalCore', name: '情感内核', order: 6, promptTemplate: 'emotionalCorePrompt' },
  { id: 'uniqueSellingPoint', name: '独特卖点', order: 7, promptTemplate: 'uniqueSellingPointPrompt' },
  { id: 'characterRelationships', name: '角色关系网', order: 8, promptTemplate: 'characterRelationshipsPrompt' },
  { id: 'endgameVision', name: '终局愿景', order: 9, promptTemplate: 'endgameVisionPrompt' },
] as const;

/**
 * 类型系统 BrainstormDimension 到 prompts 维度 ID 的映射
 * 确保组件使用的维度名能正确找到对应的提示词模板
 *
 * 映射规则：BrainstormPanel 的 DIMENSION_TYPES[i] 对应 DIMENSIONS[i] 的显示名称
 * DIMENSION_TYPES = ['inspiration', 'genre', 'theme', 'protagonist', 'worldview', 'conflict', 'opening', 'style', 'word_count']
 * DIMENSIONS      = ['类型基调',   '核心冲突', '主角原型', '世界观设定', '叙事结构', '情感内核', '独特卖点', '角色关系网', '终局愿景']
 */
const dimensionTypeToPromptId: Record<string, string> = {
  inspiration: 'genreTone',              // 维度1：类型基调
  genre: 'coreConflict',                 // 维度2：核心冲突
  theme: 'protagonist',                  // 维度3：主角原型
  protagonist: 'worldSetting',           // 维度4：世界观设定
  worldview: 'narrativeStructure',       // 维度5：叙事结构
  conflict: 'emotionalCore',             // 维度6：情感内核
  opening: 'uniqueSellingPoint',         // 维度7：独特卖点
  style: 'characterRelationships',       // 维度8：角色关系网
  word_count: 'endgameVision',           // 维度9：终局愿景
  non_goals: 'characterRelationships',
  confirm: 'endgameVision',
};

/**
 * 根据维度 ID 获取对应的提示词模板
 * 支持两种维度 ID 格式：
 * 1. prompts 维度 ID: genreTone, coreConflict 等
 * 2. types BrainstormDimension: inspiration, genre 等（自动转换）
 */
export function getDimensionPrompt(dimensionId: string): string | undefined {
  const promptMap: Record<string, string> = {
    genreTone: genreTonePrompt,
    coreConflict: coreConflictPrompt,
    protagonist: protagonistArchetypePrompt,
    worldSetting: worldSettingPrompt,
    narrativeStructure: narrativeStructurePrompt,
    emotionalCore: emotionalCorePrompt,
    uniqueSellingPoint: uniqueSellingPointPrompt,
    characterRelationships: characterRelationshipsPrompt,
    endgameVision: endgameVisionPrompt,
  };

  // 先直接查找
  if (promptMap[dimensionId]) {
    return promptMap[dimensionId];
  }

  // 尝试通过类型映射查找
  const mappedId = dimensionTypeToPromptId[dimensionId];
  if (mappedId && promptMap[mappedId]) {
    return promptMap[mappedId];
  }

  return undefined;
}

/**
 * 填充提示词模板中的变量
 */
export function fillPromptTemplate(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return filled;
}

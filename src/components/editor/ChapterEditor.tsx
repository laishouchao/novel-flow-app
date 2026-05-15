import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Eye,
  Columns,
  Pencil,
  Wand2,
  ShieldCheck,
  Sparkles,
  Minimize2,
  Maximize2,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Bot,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import Button from '../common/Button';

type ViewMode = 'edit' | 'preview' | 'compare';
type AIAction = 'draft' | 'review' | 'deai' | 'expand' | 'condense';

interface ChapterEditorProps {
  chapterTitle?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  onAIAction?: (action: AIAction, prompt: string) => void;
}

const aiActions: { key: AIAction; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'draft', label: '生成草稿', icon: <Wand2 size={16} />, desc: '根据大纲生成章节草稿' },
  { key: 'review', label: '审查章节', icon: <ShieldCheck size={16} />, desc: 'AI审查当前章节' },
  { key: 'deai', label: '去AI味', icon: <Sparkles size={16} />, desc: '去除AI生成的痕迹' },
  { key: 'expand', label: '扩写', icon: <Maximize2 size={16} />, desc: '扩展当前内容' },
  { key: 'condense', label: '缩写', icon: <Minimize2 size={16} />, desc: '精简当前内容' },
];

const defaultPromptTemplates: Record<AIAction, string> = {
  draft: '请根据以下大纲生成章节草稿，保持与前文的连贯性，注意人物性格的一致性。',
  review: '请审查以下章节内容，检查逻辑连贯性、人物行为合理性、伏笔一致性。',
  deai: '请对以下文本进行"去AI味"处理，使其更加自然、有人的写作风格特征。',
  expand: '请扩写以下内容，增加细节描写、环境渲染和人物心理活动。',
  condense: '请精简以下内容，保留核心情节和关键信息，去除冗余描写。',
};

/** 统计中文字数 */
function countChineseChars(text: string): number {
  // 统计中文字符 + 英文单词数
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return chineseChars + englishWords;
}

const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapterTitle = '第一章 命运的齿轮',
  initialContent = '',
  onSave,
  onAIAction,
}) => {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [promptText, setPromptText] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = countChineseChars(content);

  // 自动保存模拟
  useEffect(() => {
    if (content) {
      const timer = setTimeout(() => {
        setSaved(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [content]);

  const handleSave = () => {
    onSave?.(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectAction = (action: AIAction) => {
    setSelectedAction(action);
    setPromptText(defaultPromptTemplates[action]);
    setAiOutput('');
  };

  const handleGenerate = () => {
    if (!selectedAction || isGenerating) return;
    setIsGenerating(true);
    setAiOutput('');

    // 模拟流式输出
    const sampleTexts: Record<AIAction, string> = {
      draft: `夜色如墨，月光透过云层的缝隙洒落在古老的石板路上。\n\n林远站在巷口，目光深邃地望着远处的灯火。他的手指不自觉地摩挲着口袋里那枚冰凉的铜钥匙——这是父亲临终前交给他的唯一遗物。\n\n"你终有一天会找到那扇门。"父亲的声音仿佛还在耳边回响。\n\n他深吸一口气，迈步走进了夜色之中。身后的影子被路灯拉得很长，像是一条通往未知世界的道路。\n\n巷子深处传来若有若无的钟声，那声音不像是来自任何一座教堂，更像是来自地底深处——来自那扇传说中的门。`,
      review: `## 审查结果\n\n### 整体评价\n章节整体流畅，情节推进合理。\n\n### 发现的问题\n1. **第2段**：人物心理描写可以更深入\n2. **第4段**："像是一条通往未知世界的道路" 比喻略显陈旧\n3. **伏笔检查**：铜钥匙的伏笔已正确埋设\n\n### 建议修改\n- 增加环境感官描写（声音、气味）\n- 强化主角内心的矛盾感`,
      deai: `处理完成。主要修改：\n1. 调整了部分过于工整的排比句式\n2. 增加了口语化的过渡词\n3. 打破了部分过于对称的段落结构\n4. 添加了一些"不完美"的表达，增加真实感`,
      expand: `（扩写后的内容将在这里显示...）\n\n夜色如墨，浓稠得几乎能用手掬起。月亮被层层叠叠的乌云遮蔽，只在云层的缝隙间偶尔泄露出一缕惨白的月光，像是谁在深空中划了一道细小的伤口。\n\n林远站在巷口，风裹挟着初秋的凉意拂过他的面颊。他的目光深邃而复杂，穿过层层叠叠的屋顶，落在远处那条灯火通明的长街上。那里有酒馆的喧嚣，有行人的笑语，有属于这个世界的烟火气——而这一切，似乎都与他无关了。\n\n他的手指不自觉地摩挲着口袋里那枚冰凉的铜钥匙。钥匙的表面已经被岁月打磨得光滑，但上面的纹路依然清晰可辨——那是一个他从未见过的符号，像是某种古老的文字，又像是某种神秘的图腾。`,
      condense: `（缩写后的内容将在这里显示...）\n\n夜色中，林远站在巷口，手握父亲遗留给他的铜钥匙。回忆起父亲临终前的话——"你终有一天会找到那扇门"——他深吸一口气，走进了夜色。巷子深处传来神秘的钟声，仿佛来自地底。`,
    };

    const fullText = sampleTexts[selectedAction];
    let index = 0;

    const streamInterval = setInterval(() => {
      if (index < fullText.length) {
        setAiOutput((prev) => prev + fullText[index]);
        index++;
      } else {
        clearInterval(streamInterval);
        setIsGenerating(false);
      }
    }, 30);

    onAIAction?.(selectedAction, promptText);
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(aiOutput);
  };

  const handleInsertOutput = () => {
    setContent((prev) => prev + '\n\n' + aiOutput);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-slate-900">
            {chapterTitle}
          </h2>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="font-mono">{wordCount.toLocaleString()}</span>
            <span>字</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Pencil size={13} />
              编辑
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Eye size={13} />
              预览
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'compare' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Columns size={13} />
              对比
            </button>
          </div>

          {/* AI面板切换 */}
          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`
              p-2 rounded-lg transition-colors
              ${aiPanelOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}
            `}
            title={aiPanelOpen ? '收起AI面板' : '展开AI面板'}
          >
            {aiPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>

          {/* 保存按钮 */}
          <Button
            variant="primary"
            size="sm"
            icon={saved ? <Check size={16} /> : <Save size={16} />}
            onClick={handleSave}
            className={saved ? '!bg-emerald-600 hover:!bg-emerald-700' : ''}
          >
            {saved ? '已保存' : '保存'}
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑区域 */}
        <div className="flex-1 flex flex-col">
          {viewMode === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="开始写作..."
              className="
                flex-1 w-full px-8 py-6 text-base leading-[1.8] text-slate-800
                resize-none focus:outline-none
                placeholder:text-slate-300
                font-serif
              "
            />
          ) : viewMode === 'preview' ? (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="prose prose-slate max-w-none">
                {content.split('\n').map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-base leading-[1.8] text-slate-800 mb-4 font-serif"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            /* 对比视图 */
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 border-r border-slate-200">
                <div className="text-xs font-medium text-slate-400 mb-3 uppercase">
                  原文
                </div>
                <div className="text-sm leading-[1.8] text-slate-600 font-serif whitespace-pre-wrap">
                  {content || '暂无内容'}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="text-xs font-medium text-blue-400 mb-3 uppercase">
                  AI 输出
                </div>
                <div className="text-sm leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                  {aiOutput || '暂无AI输出'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI助手面板 */}
        {aiPanelOpen && (
          <div className="w-80 shrink-0 border-l border-slate-200 flex flex-col bg-slate-50/50">
            {/* AI操作按钮 */}
            <div className="p-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-slate-700">AI 助手</span>
              </div>
              <div className="space-y-1">
                {aiActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleSelectAction(action.key)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors
                      ${
                        selectedAction === action.key
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100'
                      }
                    `}
                  >
                    <span className={selectedAction === action.key ? 'text-blue-600' : 'text-slate-400'}>
                      {action.icon}
                    </span>
                    <div>
                      <div className="font-medium">{action.label}</div>
                      <div className="text-[11px] text-slate-400">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 提示词编辑 */}
            {selectedAction && (
              <div className="p-3 border-b border-slate-200">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  提示词（可编辑）
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={4}
                  className="
                    w-full px-3 py-2 rounded-lg border border-slate-200 text-xs
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white text-slate-700 leading-relaxed
                  "
                />
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleGenerate}
                  loading={isGenerating}
                  icon={<Send size={14} />}
                >
                  {isGenerating ? '生成中...' : '开始生成'}
                </Button>
              </div>
            )}

            {/* AI输出区域 */}
            <div className="flex-1 overflow-y-auto p-3">
              {aiOutput ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">输出结果</span>
                    <div className="flex gap-1">
                      <button
                        onClick={handleCopyOutput}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="复制"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={handleInsertOutput}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="插入到编辑器"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-200">
                    {aiOutput}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot size={32} className="text-slate-200 mb-3" />
                  <p className="text-xs text-slate-400">
                    选择一个AI操作开始
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterEditor;

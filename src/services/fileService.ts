// ============================================================================
// Novel Flow - 文件系统服务
// ============================================================================
// 使用 Tauri FS API 实现项目数据的磁盘持久化
// 项目结构：
//   {storagePath}/
//     project.json          - 项目元数据
//     chapters/
//       001_章节标题.md      - 章节内容
//       002_章节标题.md
//     characters/
//       角色名.md            - 角色设定
// ============================================================================

import type { NovelProject, Volume, Chapter, Character, BrainstormMessage, GlobalSummary } from '../types';

/** 项目文件结构 */
export interface ProjectFileData {
  project: NovelProject;
  volumes: Volume[];
  chapters: Chapter[];
  characters: Character[];
  brainstormMessages: BrainstormMessage[];
  globalSummary: GlobalSummary | null;
}

/** 安全的文件名（移除非法字符） */
function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'unnamed';
}

// Tauri FS API 封装（延迟加载，兼容非 Tauri 环境）
async function getFs() {
  return await import('@tauri-apps/api/fs');
}

async function getPath() {
  return await import('@tauri-apps/api/path');
}

/** 检查文件/目录是否存在 */
async function pathExists(path: string): Promise<boolean> {
  try {
    const { exists } = await getFs();
    return await exists(path);
  } catch {
    return false;
  }
}

/** 创建目录（递归） */
async function ensureDir(path: string): Promise<void> {
  const { createDir } = await getFs();
  await createDir(path, { recursive: true });
}

/** 读取文本文件 */
async function readTextFile(path: string): Promise<string> {
  const { readTextFile: fsRead } = await getFs();
  return await fsRead(path);
}

/** 写入文本文件 */
async function writeTextFile(path: string, contents: string): Promise<void> {
  const { writeTextFile: fsWrite } = await getFs();
  await fsWrite(path, contents);
}

/** 连接路径 */
async function joinPath(...paths: string[]): Promise<string> {
  try {
    const { join } = await getPath();
    return await join(...paths);
  } catch {
    // 简单的路径拼接回退
    return paths.join('/').replace(/\/+/g, '/');
  }
}

// ============================================================================
// 公开 API
// ============================================================================

/**
 * 选择项目存储文件夹
 * @returns 选中的文件夹路径，或 null（用户取消）
 */
export async function selectProjectFolder(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/api/dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择项目存储位置',
      defaultPath: undefined,
    });
    if (selected && typeof selected === 'string') {
      return selected;
    }
    return null;
  } catch (e) {
    console.error('[FileService] 选择文件夹失败:', e);
    return null;
  }
}

/**
 * 保存项目到文件系统
 * @param storagePath 项目存储根目录
 * @param data 项目完整数据
 */
export async function saveProjectToDisk(storagePath: string, data: ProjectFileData): Promise<void> {
  const { project, volumes, chapters, characters, brainstormMessages, globalSummary } = data;

  // 确保目录存在
  await ensureDir(storagePath);
  const chaptersDir = await joinPath(storagePath, 'chapters');
  await ensureDir(chaptersDir);
  const charactersDir = await joinPath(storagePath, 'characters');
  await ensureDir(charactersDir);

  // 保存 project.json（项目元数据 + 卷 + 角色 + 灵感收束）
  const projectData = {
    ...project,
    volumes,
    characters,
    brainstormMessages,
    globalSummary,
    // 章节只保存索引信息，内容单独存文件
    chapterIndex: chapters.map(ch => ({
      id: ch.id,
      volumeNumber: ch.volumeNumber,
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      status: ch.status,
      wordCount: ch.wordCount,
      fileName: `${String(ch.chapterNumber).padStart(3, '0')}_${safeFileName(ch.title)}.md`,
    })),
  };
  const projectJson = JSON.stringify(projectData, null, 2);
  const projectPath = await joinPath(storagePath, 'project.json');
  await writeTextFile(projectPath, projectJson);

  // 保存每个章节为独立 .md 文件
  for (const ch of chapters) {
    const fileName = `${String(ch.chapterNumber).padStart(3, '0')}_${safeFileName(ch.title)}.md`;
    const filePath = await joinPath(chaptersDir, fileName);

    // 构建章节 Markdown（含 YAML frontmatter）
    const content = ch.draftContent || ch.finalContent || '';
    const frontmatter = [
      '---',
      `id: ${ch.id}`,
      `title: "${ch.title}"`,
      `volume: ${ch.volumeNumber}`,
      `chapter: ${ch.chapterNumber}`,
      `status: ${ch.status}`,
      `wordCount: ${ch.wordCount}`,
      `structureTag: ${ch.structureTag}`,
      ch.foreshadowing ? `foreshadowing: "${ch.foreshadowing}"` : null,
      ch.summary ? `summary: "${ch.summary.replace(/"/g, '\\"')}"` : null,
      '---',
      '',
    ].filter(Boolean).join('\n');

    await writeTextFile(filePath, frontmatter + content);
  }

  // 保存角色文件
  for (const char of characters) {
    const fileName = `${safeFileName(char.name)}.md`;
    const filePath = await joinPath(charactersDir, fileName);

    const charContent = [
      `# ${char.name}`,
      '',
      `**角色定位**: ${char.role}`,
      `**驱动力**: ${char.drive}`,
      `**恐惧**: ${char.fear}`,
      `**特征**: ${char.trait}`,
      '',
      `## 背景故事`,
      '',
      char.backstory || '待补充',
      '',
      `## 角色弧光`,
      '',
      `- 表面追求: ${char.surfaceGoal}`,
      `- 深层渴望: ${char.deepDesire}`,
      `- 灵魂需求: ${char.soulNeed}`,
      '',
    ].join('\n');

    await writeTextFile(filePath, charContent);
  }
}

/**
 * 从文件系统加载项目
 * @param storagePath 项目存储根目录
 * @returns 项目数据，或 null（加载失败）
 */
export async function loadProjectFromDisk(storagePath: string): Promise<ProjectFileData | null> {
  try {
    const projectPath = await joinPath(storagePath, 'project.json');
    const exists = await pathExists(projectPath);
    if (!exists) return null;

    const projectJson = await readTextFile(projectPath);
    const saved = JSON.parse(projectJson);

    // 重建 chapters：优先从 .md 文件读取内容
    const chapters: Chapter[] = [];
    const chaptersDir = await joinPath(storagePath, 'chapters');

    if (saved.chapterIndex && Array.isArray(saved.chapterIndex)) {
      for (const chInfo of saved.chapterIndex) {
        const filePath = await joinPath(chaptersDir, chInfo.fileName);
        let draftContent = '';
        try {
          if (await pathExists(filePath)) {
            const fileContent = await readTextFile(filePath);
            // 去掉 YAML frontmatter
            const fmEnd = fileContent.indexOf('---', 3);
            draftContent = fmEnd > 0 ? fileContent.substring(fmEnd + 3).trim() : fileContent;
          }
        } catch {
          // 文件读取失败，使用空内容
        }

        chapters.push({
          id: chInfo.id,
          projectId: saved.id,
          volumeId: `vol-${saved.id}-${chInfo.volumeNumber}`,
          volumeNumber: chInfo.volumeNumber,
          chapterNumber: chInfo.chapterNumber,
          title: chInfo.title,
          task: '',
          structureTag: chInfo.structureTag || 'setup',
          status: chInfo.status || 'pending',
          reviewRound: 0,
          canonChanged: false,
          suspenseLevel: 0,
          plotTwistLevel: 0,
          foreshadowing: chInfo.foreshadowing || '',
          draftContent,
          finalContent: '',
          wordCount: chInfo.wordCount || 0,
          summary: chInfo.summary || '',
          reviewNotes: '',
          finalSummary: '',
          createdAt: saved.updatedAt || new Date().toISOString(),
          updatedAt: saved.updatedAt || new Date().toISOString(),
        });
      }
    }

    // 重建 volumes
    const volumes: Volume[] = (saved.volumes || []).map((v: Volume) => ({
      ...v,
      projectId: saved.id,
    }));

    // 重建 characters
    const characters: Character[] = (saved.characters || []).map((c: Character) => ({
      ...c,
      projectId: saved.id,
    }));

    return {
      project: {
        ...saved,
        canonLog: saved.canonLog || [],
      } as NovelProject,
      volumes,
      chapters,
      characters,
      brainstormMessages: saved.brainstormMessages || [],
      globalSummary: saved.globalSummary || null,
    };
  } catch (e) {
    console.error('[FileService] 从磁盘加载项目失败:', e);
    return null;
  }
}

/**
 * 检查项目存储目录是否有数据
 */
export async function hasProjectData(storagePath: string): Promise<boolean> {
  try {
    const projectPath = await joinPath(storagePath, 'project.json');
    return await pathExists(projectPath);
  } catch {
    return false;
  }
}

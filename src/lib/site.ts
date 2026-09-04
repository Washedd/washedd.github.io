import { getCollection } from 'astro:content';
import { fetchRepoStats } from './github';
import { SITE } from './types';
import type { FsDir, FsNode, SitePayload } from './types';

function file(content: string, href?: string): FsNode {
  return href ? { kind: 'file', content, href } : { kind: 'file', content };
}

function dir(children: Record<string, FsNode>): FsDir {
  return { kind: 'dir', children };
}

function collectionBody(entry: { body?: string }): string {
  if (typeof entry.body !== 'string') {
    return '';
  }
  return entry.body.replace(/\r\n/g, '\n').trim();
}

export async function buildSitePayload(): Promise<SitePayload> {
  const pages = await getCollection('pages');
  const projects = await getCollection('projects');

  const about = pages.find((entry) => entry.id === 'about');
  const contact = pages.find((entry) => entry.id === 'contact');
  const aboutBody = about ? collectionBody(about) : '';
  const contactBody = contact ? collectionBody(contact) : '';

  const projectChildren: Record<string, FsNode> = {};
  for (const project of projects) {
    const stats = await fetchRepoStats(project.data.repo);
    const language = stats?.language ?? project.data.language ?? 'unknown';
    const stars = stats?.stars ?? 0;
    const href = `https://github.com/${project.data.repo}`;
    const meta = [
      `# ${project.data.title}`,
      '',
      collectionBody(project),
      '',
      `# github`,
      `repo: ${project.data.repo}`,
      `language: ${language}`,
      `stars: ${stars}`,
      `url: ${href}`,
    ].join('\n');
    projectChildren[`${project.id}.md`] = file(meta, href);
  }

  const fs = dir({
    'about.md': file(
      about ? `# ${about.data.title}\n\n${aboutBody}` : '# About\n',
      '/about',
    ),
    'contact.md': file(
      contact ? `# ${contact.data.title}\n\n${contactBody}` : '# Contact\n',
      '/contact',
    ),
    projects: dir(projectChildren),
    socials: dir({
      'github.url': file(
        `[InternetShortcut]\nURL=${SITE.github}\n`,
        SITE.github,
      ),
      'linkedin.url': file(
        `[InternetShortcut]\nURL=${SITE.linkedin}\n`,
        SITE.linkedin,
      ),
    }),
  });

  return {
    user: SITE.user,
    host: SITE.host,
    home: '~',
    domain: SITE.domain,
    name: SITE.name,
    role: SITE.role,
    github: SITE.github,
    linkedin: SITE.linkedin,
    routes: {
      home: '/',
      about: '/about',
      projects: '/projects',
      contact: '/contact',
    },
    fs,
  };
}

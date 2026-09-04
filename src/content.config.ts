import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    repo: z.string().optional(),
    private: z.boolean().default(false),
    collaboration: z.boolean().default(false),
    featured: z.boolean().default(false),
    category: z.string(),
    tags: z.array(z.string()),
    language: z.string().optional(),
    homepage: z.string().url().optional(),
  }),
});

export const collections = { pages, projects };

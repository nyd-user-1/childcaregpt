import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

// Server-only blog loader. Reads frontmatter from src/app/blog/posts/*.mdx for
// listings (hub, prev/next). The post BODY is rendered by dynamically importing
// the .mdx file in the [slug] page, so inline React components keep working.

const POSTS_DIR = path.join(process.cwd(), 'src/app/blog/posts')

export type PostMeta = {
  slug: string
  title: string
  summary: string
  category: string        // e.g. "Costs", "Subsidies", "Getting Started"
  publishedAt: string     // ISO date
  author?: string
  readingMinutes: number
}

function parseFile(file: string): PostMeta {
  const slug = file.replace(/\.mdx?$/, '')
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
  const { data, content } = matter(raw)
  return {
    slug,
    title: data.title ?? slug,
    summary: data.summary ?? '',
    category: data.category ?? 'Guides',
    publishedAt: data.publishedAt ?? '',
    author: data.author,
    readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
  }
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs
    .readdirSync(POSTS_DIR)
    .filter(f => /\.mdx?$/.test(f))
    .map(parseFile)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
}

export function getPostMeta(slug: string): PostMeta | null {
  const file = ['.mdx', '.md'].map(ext => `${slug}${ext}`).find(f => fs.existsSync(path.join(POSTS_DIR, f)))
  return file ? parseFile(file) : null
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

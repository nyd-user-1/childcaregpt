import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { getAllPosts, getPostMeta, formatDate } from '@/lib/blog'

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

const CATEGORY_COLOR: Record<string, string> = {
  Costs: '#b5734e', Subsidies: '#2f6d6a', Eligibility: '#3f6184',
  'Getting Started': '#c9a15e', Guides: '#8a6d9c',
}
const catColor = (c: string) => CATEGORY_COLOR[c] ?? 'var(--paper-accent)'

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meta = getPostMeta(slug)
  if (!meta) return { title: 'Guide · ChildcareGPT' }
  return {
    title: `${meta.title} · ChildcareGPT`,
    description: meta.summary,
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meta = getPostMeta(slug)
  if (!meta) notFound()

  // Body: dynamic import of the compiled MDX so inline React components render.
  let Post: React.ComponentType
  try {
    Post = (await import(`../posts/${slug}.mdx`)).default
  } catch {
    notFound()
  }

  // Prev/next within the (newest-first) list.
  const posts = getAllPosts()
  const idx = posts.findIndex(p => p.slug === slug)
  const newer = idx > 0 ? posts[idx - 1] : null
  const older = idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <article className="mx-auto max-w-[680px] px-6 sm:px-8 pt-10 sm:pt-14 pb-24">

          {/* Back */}
          <Link href="/blog" className="paper-rise inline-flex items-center gap-1.5 text-[12.5px] text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-accent)]" style={{ ...SANS, animationDelay: '0ms' }}>
            <ArrowLeft className="h-3.5 w-3.5" /> All guides
          </Link>

          {/* Dateline */}
          <div className="paper-rise mt-8 flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-[0.18em]" style={{ ...SANS, animationDelay: '40ms' }}>
            <span style={{ color: catColor(meta.category), fontWeight: 600 }}>{meta.category}</span>
            <span className="text-[var(--paper-rule)]">·</span>
            <span className="text-[var(--paper-faint)]">{formatDate(meta.publishedAt)}</span>
            <span className="text-[var(--paper-rule)]">·</span>
            <span className="flex items-center gap-1 text-[var(--paper-faint)]"><Clock className="h-3 w-3" />{meta.readingMinutes} min read</span>
          </div>

          {/* Title + summary */}
          <h1 className="paper-rise mt-4 leading-[1.08]" style={{ ...SERIF, animationDelay: '90ms', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 500, letterSpacing: '-0.02em' }}>
            {meta.title}
          </h1>
          <p className="paper-rise mt-5 text-[18px] leading-[1.6] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '140ms', fontStyle: 'italic' }}>
            {meta.summary}
          </p>

          <hr className="paper-rise mt-8 mb-2 border-0 border-t border-[var(--paper-rule)]" style={{ animationDelay: '180ms' }} />

          {/* MDX body */}
          <div className="paper-rise" style={{ animationDelay: '220ms' }}>
            <Post />
          </div>

          {/* Footer nav */}
          <nav className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--paper-rule)] pt-8">
            {older ? (
              <Link href={`/blog/${older.slug}`} className="group/nav flex flex-col rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-4 transition-colors hover:border-[var(--paper-accent)]">
                <span className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}><ArrowLeft className="h-3 w-3" /> Older</span>
                <span className="mt-1.5 text-[14.5px] leading-snug" style={{ ...SERIF, fontWeight: 500 }}>{older.title}</span>
              </Link>
            ) : <span />}
            {newer ? (
              <Link href={`/blog/${newer.slug}`} className="group/nav flex flex-col items-end rounded-xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-4 text-right transition-colors hover:border-[var(--paper-accent)]">
                <span className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>Newer <ArrowRight className="h-3 w-3" /></span>
                <span className="mt-1.5 text-[14.5px] leading-snug" style={{ ...SERIF, fontWeight: 500 }}>{newer.title}</span>
              </Link>
            ) : <span />}
          </nav>
        </article>
      </div>
    </AppLayout>
  )
}

import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'
import { getAllPosts, formatDate, type PostMeta } from '@/lib/blog'
import { ArrowRight, Clock } from 'lucide-react'

export const metadata = {
  title: 'Guides · ChildcareGPT',
  description: 'Plain-English guides to New York child care — costs, subsidies, eligibility, and how to find care you can afford.',
}

const SERIF: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }
const SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }

// Warm category accents — reuse the program-type palette feel.
const CATEGORY_COLOR: Record<string, string> = {
  Costs: '#b5734e',
  Subsidies: '#2f6d6a',
  Eligibility: '#3f6184',
  'Getting Started': '#c9a15e',
  Guides: '#8a6d9c',
}
const catColor = (c: string) => CATEGORY_COLOR[c] ?? 'var(--paper-accent)'

function Kicker({ post }: { post: PostMeta }) {
  return (
    <span className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em]" style={SANS}>
      <span style={{ color: catColor(post.category), fontWeight: 600 }}>{post.category}</span>
      <span className="text-[var(--paper-rule)]">·</span>
      <span className="text-[var(--paper-faint)]">{formatDate(post.publishedAt)}</span>
      <span className="text-[var(--paper-rule)]">·</span>
      <span className="flex items-center gap-1 text-[var(--paper-faint)]">
        <Clock className="h-3 w-3" />{post.readingMinutes} min
      </span>
    </span>
  )
}

export default function BlogHubPage() {
  const posts = getAllPosts()
  const [featured, ...rest] = posts

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: 'var(--paper)', color: 'var(--paper-text)' }}>
        <div className="mx-auto max-w-5xl px-6 sm:px-10 md:px-14 pt-12 sm:pt-16 pb-20">

          {/* Masthead */}
          <p className="paper-rise text-[11px] uppercase tracking-[0.28em] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '0ms' }}>
            ChildcareGPT · Guides
          </p>
          <h1
            className="paper-rise mt-4 leading-[1.04]"
            style={{ ...SERIF, animationDelay: '60ms', fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Child care in New York,
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--paper-accent)' }}>explained simply.</span>
          </h1>
          <p className="paper-rise mt-6 max-w-[54ch] text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '120ms', fontSize: 'clamp(1.05rem, 1.6vw, 1.2rem)', lineHeight: 1.6 }}>
            Plain-English guides to costs, subsidies, and finding care — written for parents,
            not bureaucrats.
          </p>

          {posts.length === 0 ? (
            <p className="paper-rise mt-16 text-[var(--paper-muted)]" style={{ ...SERIF, animationDelay: '180ms' }}>
              No guides yet — check back soon.
            </p>
          ) : (
            <>
              {/* Featured (newest) */}
              {featured && (
                <Link
                  href={`/blog/${featured.slug}`}
                  className="paper-rise group/feat mt-12 block rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-7 sm:p-9 transition-colors hover:border-[var(--paper-accent)]"
                  style={{ animationDelay: '180ms' }}
                >
                  <Kicker post={featured} />
                  <h2
                    className="mt-4 max-w-[20ch] leading-[1.1]"
                    style={{ ...SERIF, fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', fontWeight: 500, letterSpacing: '-0.015em' }}
                  >
                    {featured.title}
                  </h2>
                  <p className="mt-3 max-w-[62ch] text-[15.5px] leading-[1.65] text-[var(--paper-muted)]" style={SANS}>
                    {featured.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--paper-accent)]" style={SANS}>
                    Read guide
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/feat:translate-x-1" />
                  </span>
                </Link>
              )}

              {/* Rest */}
              {rest.length > 0 && (
                <>
                  <div className="paper-rise mt-14 mb-6 flex items-baseline gap-3 border-b border-[var(--paper-rule-soft)] pb-3" style={{ animationDelay: '240ms' }}>
                    <h3 className="text-[15px]" style={{ ...SERIF, fontWeight: 500 }}>More guides</h3>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--paper-faint)]" style={SANS}>
                      {rest.length} {rest.length === 1 ? 'article' : 'articles'}
                    </span>
                  </div>
                  <div className="paper-rise grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ animationDelay: '300ms' }}>
                    {rest.map(post => (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="group/card relative flex flex-col rounded-2xl border border-[var(--paper-rule)] bg-[var(--paper-2)] p-6 pl-7 transition-colors hover:border-[var(--paper-accent)]"
                      >
                        <span className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full" style={{ background: catColor(post.category) }} />
                        <Kicker post={post} />
                        <h3 className="mt-3 leading-snug" style={{ ...SERIF, fontSize: '20px', fontWeight: 500 }}>{post.title}</h3>
                        <p className="mt-2 flex-1 text-[14px] leading-[1.6] text-[var(--paper-muted)]" style={SANS}>{post.summary}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--paper-accent)]" style={SANS}>
                          Read guide
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-1" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <p className="paper-rise mt-14 text-[10px] text-[var(--paper-faint)]" style={{ ...SANS, animationDelay: '360ms' }}>
            Guides are informational, not legal advice · always confirm current rules with your county Department of Social Services
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

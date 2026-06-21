import Link from 'next/link'
import { Brain, GitBranch, Globe, Mail } from 'lucide-react'

const GITHUB_URL = 'https://github.com/UmarMuhammad18/AfterThought'

export function MarketingFooter() {
  return (
    <footer className="border-t border-glass-border px-4 py-12 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="flex max-w-sm flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Brain className="size-5" />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                AfterThought
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your AI-powered meeting memory. Record, transcribe, and organise every conversation
              automatically.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-foreground">Product</span>
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              How it works
            </Link>
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-foreground">Connect</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <GitBranch className="size-4" />
              GitHub
            </a>
            <a
              href="mailto:hello@afterthought.ai"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Mail className="size-4" />
              Contact
            </a>
            <div className="flex items-center gap-3 pt-1 text-muted-foreground">
              <a href="#" aria-label="Website" className="hover:text-foreground">
                <Globe className="size-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-glass-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <span>AfterThought</span>
          <span className="text-pretty text-center">Built for Hackathon 2026</span>
        </div>
      </div>
    </footer>
  )
}

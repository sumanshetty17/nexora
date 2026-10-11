import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, LineChart, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { MarketingFooter, MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat-panel";
import { Input, Label } from "@/components/ui/input";
import { getWidgetConfig, widgetChat } from "@/lib/server/chat";
import { DEMO_PUBLIC_ID } from "@/lib/server/demo-content";
import { captureLead } from "@/lib/server/leads";
import { previewSite } from "@/lib/server/preview";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function TryYourSite() {
  const [url, setUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    reply: string;
    pagesRead: number;
    sources: { title: string; excerpt: string }[];
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      setResult(await previewSite({ data: { url, question } }));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not read that site.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="try" className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-primary">Try it on your site</p>
          <h2 className="mt-2 font-display text-4xl tracking-tight">Ask a question your customers already ask.</h2>
          <p className="mt-4 text-muted leading-relaxed">
            Paste a public URL. Nexora reads a few pages and answers from that text only — no account,
            and it will not invent a policy that is not on the page.
          </p>
        </div>
        <form className="space-y-4 rounded-3xl border border-border bg-bg p-6" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="try-url">Website</Label>
            <Input
              id="try-url"
              type="url"
              required
              placeholder="https://yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="try-q">Customer question</Label>
            <Input
              id="try-q"
              required
              placeholder="Do you ship to Seattle?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Reading the site…" : "Answer from the site"}
          </Button>
          {result ? (
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-sm leading-relaxed">{result.reply}</p>
              <p className="mt-3 text-xs text-muted">Read {result.pagesRead} public page{result.pagesRead === 1 ? "" : "s"}.</p>
              {result.sources.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {result.sources.map((source) => (
                    <li key={source.title} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                      {source.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function Home() {
  const widget = useQuery({
    queryKey: ["widget", DEMO_PUBLIC_ID],
    queryFn: () => getWidgetConfig({ data: DEMO_PUBLIC_ID }),
  });

  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Customer assistant platform
            </p>
            <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
              An assistant that actually knows your business.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Train Nexora on your site, policies, and files. Drop a chat widget on the
              website. It answers customers — and shows you the questions that keep
              coming up, so you can fix the business, not just the inbox.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Create your assistant
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/demo">See it on a live site</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">Free while we launch. No card. Email assistant included.</p>
          </div>
          <div className="h-[540px] min-h-0">
            <ChatPanel
              name="Harbor & Oak"
              welcome="Welcome to Harbor & Oak — looking for a table, a finish, or a ship date?"
              suggestions={widget.data?.suggestions}
              onSend={(message, conversationId) =>
                widgetChat({ data: { publicId: DEMO_PUBLIC_ID, message, conversationId } })
              }
              onCaptureLead={({ conversationId, name, email, note }) =>
                captureLead({
                  data: { publicId: DEMO_PUBLIC_ID, conversationId, name, email, note },
                }).then(() => undefined)
              }
            />
          </div>
        </section>

        <TryYourSite />

        <section id="how" className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: "Study the business",
                body: "Paste your URL, FAQs, and policies. Nexora crawls public pages, chunks them, and indexes every fact for retrieval.",
              },
              {
                icon: MessageSquare,
                title: "Answer on the site",
                body: "One script tag. A calm widget that cites your knowledge, stays inside policy, and captures an email when it needs a human.",
              },
              {
                icon: LineChart,
                title: "See the pattern",
                body: "Every question is tagged. The dashboard shows what customers keep getting stuck on — shipping, returns, sizing — so you can change the offer.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-border bg-bg p-6">
                <item.icon className="size-5 text-primary" />
                <h2 className="mt-4 font-display text-2xl tracking-tight">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-primary">Insights</p>
            <h2 className="mt-2 font-display text-4xl tracking-tight">The questions are the product roadmap.</h2>
            <p className="mt-4 text-muted leading-relaxed">
              Nexora clusters live chat into topics, flags frustration, and lists the
              questions it could not resolve. When shipping is 40% of traffic, you
              don’t need another dashboard widget — you need a clearer shipping page.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">This week · Harbor & Oak</p>
            <ul className="mt-4 space-y-3">
              {[
                ["Shipping", "32 questions", "3 frustrated"],
                ["Custom orders", "14 questions", "clear"],
                ["Returns", "9 questions", "2 unresolved"],
                ["Care & finish", "7 questions", "clear"],
              ].map(([topic, vol, note]) => (
                <li key={topic} className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
                  <span className="font-medium">{topic}</span>
                  <span className="text-sm text-muted">
                    {vol} · {note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-border bg-sidebar text-sidebar-fg">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
            <div>
              <Mail className="size-5 text-sidebar-fg/70" />
              <h2 className="mt-4 font-display text-4xl tracking-tight">The same brain, on email.</h2>
              <p className="mt-4 text-sidebar-muted leading-relaxed">
                Paste a customer email. Nexora drafts a human reply from your knowledge
                base. Routine mail is handled. Legal threats, chargebacks, and anything
                sharp get escalated to you — with a reason, not a black box.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-wider text-sidebar-muted">Inbox</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl bg-sidebar px-4 py-3">
                  <p className="font-medium">Scratch on the North Chair</p>
                  <p className="text-sidebar-muted">Drafted · transit damage — repair offered</p>
                </div>
                <div className="rounded-2xl bg-sidebar px-4 py-3">
                  <p className="font-medium">I will dispute this</p>
                  <p className="text-warn">Escalated · chargeback language</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl tracking-tight">Install in one line.</h2>
          <p className="mt-3 max-w-xl text-muted">
            Copy the snippet from your dashboard. It opens Nexora in a frame on your
            site — your customers never leave the page.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl bg-sidebar p-5 text-sm text-sidebar-fg">
            <code>{`<script src="https://your-nexora-host/widget.js" data-nexora="nx_••••"></script>`}</code>
          </pre>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

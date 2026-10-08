import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat-panel";
import { getWidgetConfig, widgetChat } from "@/lib/server/chat";
import { DEMO_PUBLIC_ID } from "@/lib/server/demo-content";
import { captureLead } from "@/lib/server/leads";

export const Route = createFileRoute("/demo")({ component: DemoStore });

const pieces = [
  { name: "Tide Table", meta: "White oak · 72\" or 84\"", price: "$2,480" },
  { name: "North Chair", meta: "Maple seat · pair", price: "$640" },
  { name: "Loft Sideboard", meta: "Walnut · 60\"", price: "$3,150" },
  { name: "Harbor Desk", meta: "Oak · leather drawer", price: "$1,890" },
];

function DemoStore() {
  const widget = useQuery({
    queryKey: ["widget", DEMO_PUBLIC_ID],
    queryFn: () => getWidgetConfig({ data: DEMO_PUBLIC_ID }),
  });

  return (
    <div className="min-h-screen bg-[#f3efe6] text-[#1c1915]">
      <header className="border-b border-[#ddd4c4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <p className="font-display text-xl tracking-tight">Harbor & Oak</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#6d655a] sm:inline">Portland showroom</span>
            <Button asChild size="sm">
              <Link to="/login">Get this for my site</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm uppercase tracking-[0.2em] text-[#5d726b]">Studio furniture</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight">
          Tables meant to be lived on, not photographed once.
        </h1>
        <p className="mt-5 max-w-xl text-[#6d655a] leading-relaxed">
          Solid North American hardwood. Oil finishes you can repair. Ask the
          assistant in the corner about shipping to Seattle, custom spans, or a water ring.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pieces.map((p, i) => (
            <article key={p.name} className="rounded-3xl border border-[#ddd4c4] bg-[#faf7f0] p-4">
              <div
                className="mb-4 h-36 rounded-2xl"
                style={{
                  background: `linear-gradient(160deg, ${["#cbb79a", "#8a6a4b", "#5c4030", "#d8c3a5"][i]} 0%, #efe6d6 100%)`,
                }}
              />
              <h2 className="font-medium">{p.name}</h2>
              <p className="text-sm text-[#6d655a]">{p.meta}</p>
              <p className="mt-2 text-sm">{p.price}</p>
            </article>
          ))}
        </div>
        <p className="mt-10 text-sm text-[#6d655a]">
          This is a Nexora demo storefront. The chat is trained on Harbor & Oak’s
          real policies — try “white-glove to Seattle” or “return a custom table”.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#6d655a]">
          <BrandMark />
          <span>powered this assistant</span>
        </div>
      </main>
      <div className="fixed right-4 bottom-4 z-40 hidden h-[min(640px,78vh)] w-[min(380px,calc(100vw-2rem))] shadow-[var(--shadow-soft)] md:block">
        <ChatPanel
          compact
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
      <div className="px-4 pb-8 md:hidden">
        <div className="h-[520px]">
          <ChatPanel
            name="Harbor & Oak"
            welcome="Welcome to Harbor & Oak — looking for a table, a finish, or a ship date?"
            suggestions={widget.data?.suggestions}
            onSend={(message, conversationId) =>
              widgetChat({ data: { publicId: DEMO_PUBLIC_ID, message, conversationId } })
            }
          />
        </div>
      </div>
    </div>
  );
}

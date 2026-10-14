import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { getWidgetConfig, widgetChat } from "@/lib/server/chat";
import { captureLead } from "@/lib/server/leads";
import { previewSite } from "@/lib/server/preview";
import { decodePreviewPack, type PreviewPack } from "@/lib/preview-pack";

export const Route = createFileRoute("/w/$publicId")({
  component: WidgetPage,
  headers: () => ({
    "Content-Security-Policy": "frame-ancestors *",
  }),
});

function WidgetPage() {
  const { publicId } = Route.useParams();
  if (publicId === "preview") return <PreviewWidget />;
  return <SavedWidget publicId={publicId} />;
}

function PreviewWidget() {
  const [pack, setPack] = useState<PreviewPack | null | undefined>(undefined);
  const history = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => {
    setPack(decodePreviewPack(window.location.hash.replace(/^#/, "")));
  }, []);

  if (pack === undefined) {
    return <div className="grid h-screen place-items-center bg-surface text-sm text-muted">Loading assistant…</div>;
  }
  if (!pack) {
    return (
      <div className="grid h-screen place-items-center bg-surface px-6 text-center text-sm text-muted">
        This assistant is unavailable.
      </div>
    );
  }

  let host = "this site";
  try {
    host = new URL(pack.url).hostname.replace(/^www\./, "");
  } catch {
    /* keep fallback */
  }

  return (
    <div className="h-screen bg-surface">
      <ChatPanel
        compact
        name={host}
        welcome={`Ask anything a customer would ask ${host}. Answers stay inside the pages Nexora already read.`}
        suggestions={[]}
        onSend={async (message) => {
          const result = await previewSite({
            data: {
              url: pack.url,
              question: message,
              history: history.current,
              context: pack.context,
              proof: pack.proof,
              pagesRead: pack.pagesRead,
            },
          });
          history.current = [
            ...history.current,
            { role: "user" as const, content: message },
            { role: "assistant" as const, content: result.reply },
          ].slice(-6);
          return {
            conversationId: "preview",
            reply: result.reply,
            topic: null,
            sentiment: null,
            needsHuman: false,
            sources: result.sources,
          };
        }}
      />
    </div>
  );
}

function SavedWidget({ publicId }: { publicId: string }) {
  const q = useQuery({
    queryKey: ["widget", publicId],
    queryFn: () => getWidgetConfig({ data: publicId }),
  });

  if (q.isLoading) {
    return <div className="grid h-screen place-items-center bg-surface text-sm text-muted">Loading assistant…</div>;
  }
  if (q.error || !q.data) {
    return (
      <div className="grid h-screen place-items-center bg-surface px-6 text-center text-sm text-muted">
        This assistant is unavailable.
      </div>
    );
  }

  const cfg = q.data;
  return (
    <div className="h-screen bg-surface">
      <ChatPanel
        compact
        name={cfg.name}
        welcome={cfg.welcomeMessage}
        brandColor={cfg.brandColor}
        suggestions={cfg.suggestions}
        onSend={(message, conversationId) =>
          widgetChat({ data: { publicId, message, conversationId } })
        }
        onCaptureLead={({ conversationId, name, email, note }) =>
          captureLead({ data: { publicId, conversationId, name, email, note } }).then(() => undefined)
        }
      />
    </div>
  );
}

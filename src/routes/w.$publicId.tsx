import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChatPanel } from "@/components/chat-panel";
import { getWidgetConfig, widgetChat } from "@/lib/server/chat";
import { captureLead } from "@/lib/server/leads";

export const Route = createFileRoute("/w/$publicId")({
  component: WidgetPage,
  headers: () => ({
    "Content-Security-Policy": "frame-ancestors *",
  }),
});

function WidgetPage() {
  const { publicId } = Route.useParams();
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

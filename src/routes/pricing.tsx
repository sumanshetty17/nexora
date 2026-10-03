import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({ component: Pricing });

const plans = [
  {
    name: "Starter",
    price: "Free now",
    blurb: "One site, enough to prove it on a real audience.",
    items: ["1 website assistant", "500 conversations / month", "50k characters of knowledge", "Insights dashboard"],
  },
  {
    name: "Growth",
    price: "Free now",
    blurb: "For teams running support on several properties.",
    items: ["3 websites", "5,000 conversations / month", "500k characters of knowledge", "Email assistant add-on"],
    featured: true,
  },
  {
    name: "Scale",
    price: "Free now",
    blurb: "High volume, email included, room for a catalog.",
    items: ["10 websites", "25,000 conversations / month", "2M characters of knowledge", "Email assistant included"],
  },
];

function Pricing() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Pricing</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Use everything while we launch.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Caps below are the intended commercial shape — conversations, sites, and
          knowledge size — plus email as an add-on. Right now every workspace is
          unlocked. We’ll turn billing on later without changing the product.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.featured
                  ? "rounded-[28px] bg-sidebar p-7 text-sidebar-fg"
                  : "rounded-[28px] border border-border bg-surface p-7"
              }
            >
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="mt-2 font-display text-3xl">{plan.price}</p>
              <p className={plan.featured ? "mt-2 text-sm text-sidebar-muted" : "mt-2 text-sm text-muted"}>
                {plan.blurb}
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full" variant={plan.featured ? "inverse" : "default"}>
                <Link to="/login">Start</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

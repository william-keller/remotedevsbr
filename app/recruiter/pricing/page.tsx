"use client";

import { useState } from "react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

export default function RecruiterPricing() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: "professional" | "enterprise") => {
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-recruiter-checkout", {
        body: { plan, return_url: window.location.origin + "/recruiter/dashboard" }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message);
      setLoading(null);
    }
  };

  return (
    <RecruiterLayout>
      <SEO 
        title="Planos para Recrutadores | RemoteDevs BR" 
        description="Conheça os planos de recrutamento para contratar desenvolvedores brasileiros remotamente."
        canonicalPath="/recruiter/pricing"
      />
      <div className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Pricing for Modern Teams</h1>
          <p className="text-lg text-muted-foreground">
            Get direct access to Brazil's top 5% of remote-ready software engineers. 
            No placement fees, no middlemen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Professional Plan */}
          <div className="border rounded-2xl p-8 bg-card flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Professional</h3>
              <div className="mt-2 text-muted-foreground">For growing teams</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold">R$ 199</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {["15 direct messages per month", "Full candidate profiles (unblurred)", "Advanced filtering (Stack, English level)", "Email notifications"].map((f, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full" 
              variant="outline"
              disabled={loading !== null}
              onClick={() => handleCheckout("professional")}
            >
              {loading === "professional" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Get Professional
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="border-2 border-emerald-500 rounded-2xl p-8 bg-card flex flex-col relative shadow-lg shadow-emerald-500/10">
            <div className="absolute top-0 right-8 -translate-y-1/2">
              <span className="bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                Most Popular
              </span>
            </div>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Enterprise</h3>
              <div className="mt-2 text-muted-foreground">For scaling organizations</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold">R$ 499</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Unlimited direct messages",
                "Full candidate profiles",
                "AI-powered matching algorithms",
                "Export candidates to ATS",
                "Dedicated account manager"
              ].map((f, i) => (
                <li key={i} className="flex gap-3 text-sm font-medium">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading !== null}
              onClick={() => handleCheckout("enterprise")}
            >
              {loading === "enterprise" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Get Enterprise
            </Button>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}

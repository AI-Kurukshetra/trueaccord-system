import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role client — bypasses RLS for system operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { payment_id, account_id } = session.metadata ?? {};

    if (!payment_id || !account_id) {
      console.error("[webhook] missing metadata", session.metadata);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Mark payment as completed
    await supabase
      .from("payments")
      .update({
        status: "completed",
        stripe_payment_intent_id: typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      })
      .eq("id", payment_id);

    // Get payment amount to reduce balance
    const { data: payment } = await supabase
      .from("payments")
      .select("amount")
      .eq("id", payment_id)
      .single();

    if (payment) {
      // Get current balance
      const { data: account } = await supabase
        .from("accounts")
        .select("current_balance")
        .eq("id", account_id)
        .single();

      if (account) {
        const newBalance = Math.max(0, Number(account.current_balance) - Number(payment.amount));
        await supabase
          .from("accounts")
          .update({
            current_balance: newBalance,
            status: newBalance <= 0 ? "settled" : "active",
          })
          .eq("id", account_id);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { payment_id } = session.metadata ?? {};
    if (payment_id) {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment_id);
    }
  }

  return NextResponse.json({ received: true });
}

// Note: App Router route handlers receive raw body natively via req.text() — no body-parser config needed.

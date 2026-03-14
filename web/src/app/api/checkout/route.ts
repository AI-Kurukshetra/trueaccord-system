import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, amount, debtorId, accountNumber } = body as {
      accountId: string;
      amount: number;
      debtorId: string;
      accountNumber: string | null;
    };

    if (!accountId || !amount || !debtorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Create a pending payment record first
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        account_id: accountId,
        debtor_id: debtorId,
        amount,
        status: "pending",
        method: "stripe",
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Debt Payment${accountNumber ? ` — Account ${accountNumber}` : ""}`,
              description: `Payment for account ${accountId}`,
            },
          },
        },
      ],
      metadata: {
        payment_id: payment.id,
        account_id: accountId,
        debtor_id: debtorId,
      },
      success_url: `${baseUrl}/debtor/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/debtor/pay/cancel?account_id=${accountId}`,
    });

    // Store session ID on payment record
    await supabase
      .from("payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", payment.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

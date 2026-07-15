import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Mercado Pago passes parameters either in query string or in POST body
    const queryId = url.searchParams.get("id") || url.searchParams.get("data.id");
    const queryTopic = url.searchParams.get("topic") || url.searchParams.get("type");

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body might be empty or not JSON
    }

    const resourceId = queryId || body.data?.id || body.id;
    // Map topics/types: "preapproval" (subscription), "payment" etc.
    const resourceType = queryTopic || body.type || (body.action && body.action.startsWith("payment.") ? "payment" : undefined) || (body.action && body.action.startsWith("preapproval.") ? "preapproval" : undefined);

    console.log(`[MERCADO PAGO WEBHOOK] Received event. ID: ${resourceId}, Type: ${resourceType}`);

    if (!resourceId || !resourceType) {
      return NextResponse.json({ error: "Missing resource ID or type" }, { status: 200 });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      console.error("[MERCADO PAGO WEBHOOK] ERROR: MERCADOPAGO_ACCESS_TOKEN is not configured in environment variables.");
      return NextResponse.json({ error: "Mercado Pago token not configured" }, { status: 200 });
    }

    // Fetch resource details from Mercado Pago API
    let fetchUrl = "";
    if (resourceType === "preapproval" || resourceType === "subscription") {
      fetchUrl = `https://api.mercadopago.com/preapproval/${resourceId}`;
    } else if (resourceType === "payment") {
      fetchUrl = `https://api.mercadopago.com/v1/payments/${resourceId}`;
    } else {
      console.log(`[MERCADO PAGO WEBHOOK] Unhandled resource type: ${resourceType}`);
      return NextResponse.json({ message: "Unhandled resource type" }, { status: 200 });
    }

    const mpResponse = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!mpResponse.ok) {
      console.error(`[MERCADO PAGO WEBHOOK] Failed to fetch resource from Mercado Pago. Status: ${mpResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch resource details" }, { status: 200 });
    }

    const resource = await mpResponse.json();

    let payerEmail = "";
    let externalReference = "";
    let status = "";
    let amount = 0;
    let reason = "";

    if (resourceType === "preapproval" || resourceType === "subscription") {
      payerEmail = resource.payer_email || "";
      externalReference = resource.external_reference || "";
      status = resource.status || ""; // pending, authorized, paused, cancelled
      amount = resource.auto_recurring?.transaction_amount || 0;
      reason = resource.reason || "";
    } else {
      payerEmail = resource.payer?.email || "";
      externalReference = resource.external_reference || "";
      status = resource.status || ""; // pending, approved, in_process, rejected, cancelled
      amount = resource.transaction_amount || 0;
      reason = resource.description || "";
    }

    console.log(`[MERCADO PAGO WEBHOOK] Resource Details:
      - Payer Email: ${payerEmail}
      - External Ref: ${externalReference}
      - Status: ${status}
      - Amount: ${amount}
      - Reason: ${reason}
    `);

    // Check if subscription or payment is approved/authorized
    const isSuccess = 
      (resourceType === "payment" && status === "approved") ||
      ((resourceType === "preapproval" || resourceType === "subscription") && (status === "authorized" || status === "active"));

    if (!isSuccess) {
      console.log(`[MERCADO PAGO WEBHOOK] Event status is not successful: ${status}. Skipping activation.`);
      return NextResponse.json({ message: "Status not successful, skipped" }, { status: 200 });
    }

    // 1. Find the Tenant/Loja
    let tenant = null;
    if (externalReference) {
      tenant = await prisma.tenant.findUnique({
        where: { id: externalReference },
      });
    }

    if (!tenant && payerEmail) {
      // Search for tenant where admin employee has the matching email
      const employee = await prisma.employee.findFirst({
        where: { email: payerEmail, isAdmin: true },
        include: { tenant: true },
      });
      if (employee) {
        tenant = employee.tenant;
      }
    }

    if (!tenant) {
      console.warn(`[MERCADO PAGO WEBHOOK] WARNING: Could not find Tenant for payment. Payer: ${payerEmail}, ExternalRef: ${externalReference}. Admin must activate manually.`);
      return NextResponse.json({ 
        received: true, 
        mapped: false, 
        message: "Tenant not found. Manual activation required." 
      }, { status: 200 });
    }

    // 2. Find the database Plan matching the price or description
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    const reasonLower = reason.toLowerCase();
    
    let matchedPlan = plans.find((p) => reasonLower.includes(p.name.toLowerCase()));
    
    if (!matchedPlan) {
      // Try mapping by price (Starter=73 or 99, Profissional=149 or 179, Escala=299 or 359)
      matchedPlan = plans.find((p) => Math.abs(p.price - amount) < 2.0);
    }

    if (!matchedPlan) {
      // Search matching standard names in reason text
      if (reasonLower.includes("starter")) {
        matchedPlan = plans.find((p) => p.name.toLowerCase() === "starter");
      } else if (reasonLower.includes("profissional") || reasonLower.includes("pro")) {
        matchedPlan = plans.find((p) => p.name.toLowerCase() === "profissional");
      } else if (reasonLower.includes("escala")) {
        matchedPlan = plans.find((p) => p.name.toLowerCase() === "escala");
      }
    }

    if (!matchedPlan) {
      console.warn(`[MERCADO PAGO WEBHOOK] WARNING: Found Tenant (${tenant.name}) but could not match payment amount/reason to a Plan. Amount: R$ ${amount}, Reason: ${reason}. Admin must activate plan manually.`);
      return NextResponse.json({ 
        received: true, 
        mapped: false, 
        message: "Plan not found. Manual activation required." 
      }, { status: 200 });
    }

    // 3. Activate the plan and set tenant active
    console.log(`[MERCADO PAGO WEBHOOK] Activating Plan "${matchedPlan.name}" for Tenant "${tenant.name}" (${tenant.id}).`);

    // Cancel any previous active plans
    await prisma.tenantPlan.updateMany({
      where: { tenantId: tenant.id, status: "ACTIVE" },
      data: { status: "CANCELLED", endDate: new Date() },
    });

    // Create the new active tenant plan
    await prisma.tenantPlan.create({
      data: {
        tenantId: tenant.id,
        planId: matchedPlan.id,
        status: "ACTIVE",
        startDate: new Date(),
      },
    });

    // Mark tenant as active and assign features
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        isActive: true,
        features: matchedPlan.features,
      },
    });

    console.log(`[MERCADO PAGO WEBHOOK] Success: Tenant "${tenant.name}" successfully activated on Plan "${matchedPlan.name}"!`);
    return NextResponse.json({ 
      received: true, 
      mapped: true, 
      message: `Activated plan ${matchedPlan.name} for tenant ${tenant.name}` 
    }, { status: 200 });

  } catch (error) {
    console.error("[MERCADO PAGO WEBHOOK] Unexpected error processing webhook:", error);
    // Return 200 to Mercado Pago to stop retrying but log the error
    return NextResponse.json({ error: "Internal server error" }, { status: 200 });
  }
}

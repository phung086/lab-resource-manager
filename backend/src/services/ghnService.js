/**
 * Giao Hàng Nhanh (GHN Express) Logistics Integration Service
 * Standards per GHN API v2 Documentation
 */

import { prisma } from "../db.js";

const GHN_API_BASE = "https://dev-online-gateway.ghn.vn/shiip/public-api/v2";

/**
 * Create a GHN shipping order for equipment transport
 */
export async function createGhnShipment({
  bookingId,
  resourceId,
  userId,
  recipientName,
  recipientPhone,
  recipientAddress,
  senderAddress = "Phòng Thí Nghiệm Trung Tâm, Tòa nhà A, Cơ sở chính"
}) {
  const ghnToken = process.env.GHN_TOKEN;
  const ghnShopId = process.env.GHN_SHOP_ID;

  let resource = null;
  if (resourceId) {
    try {
      resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    } catch (_e) {}
  }
  const resourceName = resource?.name || "Thiết bị phòng lab";

  if (!ghnToken) {
    // Sandbox / Mock Mode
    const trackingCode = `GHN_MOCK_${Date.now().toString().slice(-6)}`;
    const expectedDelivery = new Date(Date.now() + 2 * 86_400_000);

    let shipment = {
      id: "mock-shipment-id",
      trackingCode,
      provider: "ghn",
      status: "picking",
      fee: 30000,
      recipientName,
      recipientPhone,
      recipientAddress,
      expectedDelivery
    };

    try {
      shipment = await prisma.shipmentOrder.create({
        data: {
          bookingId,
          resourceId,
          userId,
          trackingCode,
          provider: "ghn",
          status: "picking",
          fee: 30000,
          senderAddress,
          recipientName,
          recipientPhone,
          recipientAddress,
          expectedDelivery,
          rawResponse: { mode: "sandbox_mock", message: "Mock GHN Order (Set GHN_TOKEN in .env for production API)" }
        }
      });
    } catch (_e) {}

    return {
      success: true,
      provider: "ghn_mock",
      trackingCode,
      fee: 30000,
      expectedDelivery,
      shipment
    };
  }

  // Real GHN API Call
  const response = await fetch(`${GHN_API_BASE}/shipping-order/create`, {
    method: "POST",
    headers: {
      "Token": ghnToken,
      "ShopId": ghnShopId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      payment_type_id: 2,
      note: `Giao nhận thiết bị phòng lab: ${resourceName}`,
      required_note: "KHONGCHOXEMHANG",
      to_name: recipientName,
      to_phone: recipientPhone,
      to_address: recipientAddress,
      weight: 1500,
      length: 30,
      width: 20,
      height: 20,
      service_type_id: 2, // Standard delivery
      items: [
        {
          name: resourceName,
          quantity: 1
        }
      ]
    })
  });

  const body = await response.json();
  if (body.code !== 200) {
    throw new Error(`GHN API Error: ${body.message || JSON.stringify(body)}`);
  }

  const trackingCode = body.data.order_code;
  const expectedDelivery = new Date(body.data.expected_delivery_time);

  const shipment = await prisma.shipmentOrder.create({
    data: {
      bookingId,
      resourceId,
      userId,
      trackingCode,
      provider: "ghn",
      status: "picking",
      fee: body.data.total_fee || 0,
      senderAddress,
      recipientName,
      recipientPhone,
      recipientAddress,
      expectedDelivery,
      rawResponse: body.data
    }
  });

  return {
    success: true,
    provider: "ghn",
    trackingCode,
    fee: body.data.total_fee,
    expectedDelivery,
    shipment
  };
}

/**
 * Track shipment status by tracking code
 */
export async function trackGhnShipment(trackingCode) {
  const shipment = await prisma.shipmentOrder.findUnique({
    where: { trackingCode },
    include: {
      resource: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, fullName: true, email: true } }
    }
  });

  if (!shipment) return null;

  return {
    trackingCode: shipment.trackingCode,
    provider: shipment.provider,
    status: shipment.status,
    fee: shipment.fee,
    recipientName: shipment.recipientName,
    recipientAddress: shipment.recipientAddress,
    expectedDelivery: shipment.expectedDelivery,
    resource: shipment.resource,
    user: shipment.user
  };
}

export { createGhnShipment as createMockShipmentOrder };

import nodemailer from 'nodemailer';

// Helper to get transporter safely
const getTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Email] CRITICAL: SMTP credentials are not configured in environment variables.');
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function sendOrderConfirmation(email: string, order: any, user: any) {
  console.log(`[Email] Attempting to send order confirmation for ${order?.customOrderId || 'UNKNOWN_ORDER'} to ${email || 'UNKNOWN_EMAIL'}`);

  if (!email) {
    console.error('[Email] Cannot send order confirmation: Recipient email is missing.');
    return;
  }

  if (!order || !order.customOrderId) {
    console.error('[Email] Cannot send order confirmation: Order details are invalid or missing customOrderId.');
    return;
  }

  const productsList = order?.products || [];
  const productsHtml = productsList.map((p: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.name || 'Product'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.quantity || 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">₹${p.price || 0}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Order Confirmation - ${order.customOrderId}</h2>
        <p>Hi ${user?.name || 'Customer'}, your order has been placed successfully.</p>
        
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #fdb05e; background-color: white;">
          <p style="margin: 0;"><b>Payment Method:</b> ${order.paymentMethod || 'Online'}</p>
          <p style="margin: 10px 0 0 0;"><b>Delivery Address:</b> ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.zipCode || ''}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #fdb05e; color: #220901;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${productsHtml}
          </tbody>
          <tfoot>
            ${order.deliveryCharge > 0 ? `
            <tr>
              <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #666;">Delivery Charge</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #666;">₹${order.deliveryCharge}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: right;">Final Total</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d00000;">₹${order.totalAmount || 0}</td>
            </tr>
          </tfoot>
        </table>
        <p style="margin-top: 20px; font-weight: bold; color: #d00000;">📦 Estimated Delivery: 3-5 business days</p>
        <p style="margin-top: 10px;">We will notify you once your order ships.</p>
      </div>
    </div>
  `;
  try {
    const transporter = getTransporter();
    
    // Optional: verify connection configuration
    try {
      await transporter.verify();
      console.log('[Email] SMTP connection verified successfully.');
    } catch (verifyError) {
      console.error('[Email] SMTP connection verification failed:', verifyError);
      // We don't throw here, sometimes verify fails but sendMail works (e.g. some strict firewalls)
    }

    const info = await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER || 'noreply@andhraspiceco.com'}>`,
      to: email,
      subject: `Your Andhra Spice Co. Order is Confirmed - ${order.customOrderId}`,
      html,
    });
    console.log(`[Email] Successfully sent order confirmation for ${order.customOrderId}. Message ID: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send order confirmation for ${order.customOrderId}:`, error.message);
    if (error.response) {
      console.error(`[Email] SMTP Response:`, error.response);
    }
    // Rethrow to allow caller to handle/log 
    throw error;
  }
}

export async function sendShippingUpdate(email: string, order: any, user: any) {
  console.log(`[Email] Attempting to send shipping update for ${order?.customOrderId || 'UNKNOWN'} to ${email || 'UNKNOWN'}`);
  
  if (!email || !order || !order.customOrderId) {
    console.error('[Email] Cannot send shipping update: Missing required inputs.');
    return;
  }

  let trackingLink = '';
  if (order.courierType === 'DTDC') {
    trackingLink = `https://www.dtdc.in/tracking/default.aspx?type=0&strCnno=${order.trackingId}`;
  } else if (order.courierType === 'India Post') {
    trackingLink = `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?articleNumber=${order.trackingId}`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Your Order Has Shipped!</h2>
        <p>Hi ${user?.name || 'Customer'}, your order <b>${order.customOrderId}</b> has been shipped via <b>${order.courierType || 'our courier partner'}</b>.</p>
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #d00000; background-color: white;">
          <p style="margin: 0;"><b>Courier Name:</b> ${order.courierType}</p>
          <p style="margin: 5px 0 0 0;"><b>Tracking ID:</b> ${order.trackingId || 'N/A'}</p>
          <p style="margin: 10px 0 0 0;"><b>Estimated Delivery:</b> 3-5 days via ${order.courierType || 'our courier partner'}</p>
        </div>
        ${trackingLink ? `
          <div style="text-align: center; margin-top: 30px;">
            <a href="${trackingLink}" style="padding: 12px 24px; background-color: #dc2f02; color: white; text-decoration: none; font-weight: bold; border-radius: 4px;">Track Package</a>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER || 'noreply@andhraspiceco.com'}>`,
      to: email,
      subject: `Your Andhra Spice Co. Order Has Shipped - ${order.customOrderId}`,
      html,
    });
    console.log(`[Email] Successfully sent shipping update for ${order.customOrderId}. Message ID: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send shipping update for ${order.customOrderId}:`, error.message);
  }
}

export async function sendDeliveredEmail(email: string, order: any, user: any) {
  console.log(`[Email] Attempting to send delivery confirmation for ${order?.customOrderId || 'UNKNOWN'} to ${email || 'UNKNOWN'}`);

  if (!email || !order || !order.customOrderId) {
    console.error('[Email] Cannot send delivery confirmation: Missing required inputs.');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Order Delivered! 🎉</h2>
        <p>Hi ${user?.name || 'Customer'},</p>
        <p>Your order <b>${order.customOrderId}</b> has been successfully delivered.</p>
        <p>We hope you enjoy your authentic spices! Thank you for shopping with Andhra Spice Co.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://andhra-spice-co.vercel.app/products" style="padding: 12px 24px; background-color: #dc2f02; color: white; text-decoration: none; font-weight: bold; border-radius: 4px;">Order Again</a>
        </div>
      </div>
    </div>
  `;
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER || 'noreply@andhraspiceco.com'}>`,
      to: email,
      subject: `Your Andhra Spice Co. Order was Delivered - ${order.customOrderId}`,
      html,
    });
    console.log(`[Email] Successfully sent delivery confirmation for ${order.customOrderId}. Message ID: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send delivery confirmation for ${order.customOrderId}:`, error.message);
  }
}

export async function sendCancellationEmail(email: string, order: any, user: any) {
  console.log(`[Email] Attempting to send cancellation email for ${order?.customOrderId || 'UNKNOWN'} to ${email || 'UNKNOWN'}`);

  if (!email || !order || !order.customOrderId) {
    console.error('[Email] Cannot send cancellation email: Missing required inputs.');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Order Cancelled</h2>
        <p>Hi ${user?.name || 'Customer'},</p>
        <p>We're writing to confirm that your order <b>${order.customOrderId}</b> has been officially cancelled.</p>
        ${order.cancellationReason ? `<p><b>Reason:</b> ${order.cancellationReason}</p>` : ''}
        <p>Your items have been restored to our inventory. ${order.paymentStatus === 'Success' || order.paymentStatus === 'Refunded' ? 'If you paid online via Cashfree, your refund will be processed back to your original payment method within 5-7 business days.' : 'No charges were fully applied for this order.'}</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://andhra-spice-co.vercel.app/products" style="padding: 12px 24px; background-color: #dc2f02; color: white; text-decoration: none; font-weight: bold; border-radius: 4px;">Explore Other Spices</a>
        </div>
      </div>
    </div>
  `;
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER || 'noreply@andhraspiceco.com'}>`,
      to: email,
      subject: `Your Andhra Spice Co. Order was Cancelled - ${order.customOrderId}`,
      html,
    });
    console.log(`[Email] Successfully sent cancellation email for ${order.customOrderId}. Message ID: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send cancellation email for ${order.customOrderId}:`, error.message);
  }
}


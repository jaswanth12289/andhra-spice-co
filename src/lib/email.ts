import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOrderConfirmation(email: string, order: any, user: any) {
  const productsHtml = order.products.map((p: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${p.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">₹${p.price}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Order Confirmation - ${order.customOrderId}</h2>
        <p>Hi ${user.name}, your order has been placed successfully.</p>
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
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d00000;">₹${order.totalAmount}</td>
            </tr>
          </tfoot>
        </table>
        <p style="margin-top: 20px;">We will notify you once it ships.</p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Order Confirmation - ${order.customOrderId}`,
      html,
    });
  } catch (error) {
    console.error("Email send error:", error);
  }
}

export async function sendShippingUpdate(email: string, order: any, user: any) {
  let trackingLink = '';
  if (order.courierType === 'DTDC') {
    trackingLink = `https://www.dtdc.in/tracking?awb=${order.trackingId}`;
  } else if (order.courierType === 'India Post') {
    trackingLink = `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Your Order is Shipped!</h2>
        <p>Hi ${user.name}, your order <b>${order.customOrderId}</b> has been shipped via <b>${order.courierType}</b>.</p>
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #d00000; background-color: white;">
          <p style="margin: 0;"><b>Tracking ID:</b> ${order.trackingId}</p>
          <p style="margin: 10px 0 0 0;"><b>Estimated Delivery:</b> 3-5 days via ${order.courierType}</p>
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
    await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your Tracking Update - ${order.customOrderId}`,
      html,
    });
  } catch (error) {
    console.error("Email send error:", error);
  }
}

export async function sendCancellationEmail(email: string, order: any, user: any) {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #220901; max-width: 600px; margin: auto;">
      <div style="background-color: #dc2f02; padding: 20px; text-align: center; color: white;">
        <h1>Andhra Spice Co.</h1>
      </div>
      <div style="padding: 20px; background-color: #fff8f0;">
        <h2>Order Cancelled</h2>
        <p>Hi ${user?.name || 'Customer'},</p>
        <p>We're writing to confirm that your order <b>${order.customOrderId}</b> has been officially cancelled.</p>
        <p>Your items have been restored to our inventory. If you paid online via Cashfree, your refund will be processed back to your original payment method within 5-7 business days.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://andhra-spice-co.vercel.app/products" style="padding: 12px 24px; background-color: #dc2f02; color: white; text-decoration: none; font-weight: bold; border-radius: 4px;">Explore Other Spices</a>
        </div>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: `"Andhra Spice Co." <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Order Cancelled - ${order.customOrderId}`,
      html,
    });
  } catch (error) {
    console.error("Email send error:", error);
  }
}

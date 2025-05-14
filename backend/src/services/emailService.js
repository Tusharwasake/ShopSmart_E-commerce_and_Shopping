import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // "port"
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOtpEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `your reset password otp: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, message: "Error sending email" };
  }
};

// Add these new functions for order-related emails

export const sendOrderConfirmationEmail = async (email, orderDetails) => {
  try {
    // Simple text version for now - you can enhance this later
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Order Confirmation #${orderDetails.orderNumber}`,
      text: `
Thank you for your order!

Order Number: ${orderDetails.orderNumber}
Total Amount: $${orderDetails.total.toFixed(2)}

Order Items:
${orderDetails.items
  .map(
    (item) =>
      `- ${item.name} (Qty: ${item.quantity}) - $${(
        item.price * item.quantity
      ).toFixed(2)}`
  )
  .join("\n")}

Thank you for shopping with us!
            `,
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Order confirmation email sent successfully",
    };
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      success: false,
      message: "Error sending order confirmation email",
    };
  }
};

export const sendOrderStatusUpdateEmail = async (email, updateDetails) => {
  try {
    // Determine the message based on status
    let statusMessage = `Your order #${updateDetails.orderNumber} has been updated to: ${updateDetails.status}`;

    if (updateDetails.status === "shipped" && updateDetails.trackingNumber) {
      statusMessage += `\nTracking Number: ${updateDetails.trackingNumber}`;
      if (updateDetails.carrier) {
        statusMessage += `\nCarrier: ${updateDetails.carrier}`;
      }
    } else if (updateDetails.status === "cancelled" && updateDetails.note) {
      statusMessage += `\nReason: ${updateDetails.note}`;
    } else if (
      updateDetails.status === "refunded" &&
      updateDetails.refundAmount
    ) {
      statusMessage += `\nRefund Amount: $${updateDetails.refundAmount.toFixed(
        2
      )}`;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Order Status Update: #${updateDetails.orderNumber}`,
      text: `
Hello,

${statusMessage}

Thank you for shopping with us!
            `,
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Order status update email sent successfully",
    };
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      success: false,
      message: "Error sending order status update email",
    };
  }
};

export const sendEmail = async (email, subject, text) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: text,
      };
  
      await transporter.sendMail(mailOptions);
      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, message: "Error sending email" };
    }
  };
  
export default {
  sendOtpEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendEmail
};

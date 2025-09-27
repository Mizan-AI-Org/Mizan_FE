import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'email' | 'inventory_alert' | 'staff_reminder';
  recipient: string;
  subject: string;
  message: string;
  data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("Resend API key not configured");
    }

    const { type, recipient, subject, message, data }: NotificationRequest = await req.json();

    let emailContent = '';
    
    switch (type) {
      case 'inventory_alert':
        emailContent = `
          <h2>🚨 Inventory Alert</h2>
          <p>${message}</p>
          ${data?.items ? `
            <h3>Low Stock Items:</h3>
            <ul>
              ${data.items.map((item: any) => `<li>${item.name}: ${item.quantity} remaining</li>`).join('')}
            </ul>
          ` : ''}
          <p>Please restock these items as soon as possible.</p>
        `;
        break;
      
      case 'staff_reminder':
        emailContent = `
          <h2>📅 Staff Reminder</h2>
          <p>${message}</p>
          ${data?.shift ? `
            <p><strong>Shift Details:</strong></p>
            <ul>
              <li>Date: ${data.shift.date}</li>
              <li>Time: ${data.shift.start_time} - ${data.shift.end_time}</li>
              <li>Role: ${data.shift.role}</li>
            </ul>
          ` : ''}
        `;
        break;
      
      default:
        emailContent = `
          <h2>Restaurant Notification</h2>
          <p>${message}</p>
        `;
    }

    // Use Resend API directly with fetch
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Mizan Restaurant <onboarding@resend.dev>",
        to: [recipient],
        subject: subject,
        html: emailContent,
      }),
    });

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
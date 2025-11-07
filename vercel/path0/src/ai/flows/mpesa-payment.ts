
'use server';

/**
 * @fileOverview A Genkit flow for handling M-Pesa STK push payments.
 *
 * - processMpesaPayment - A function that initiates an STK push request.
 * - MpesaPaymentInput - The input type for the processMpesaPayment function.
 * - MpesaPaymentOutput - The return type for the processMpesaPayment function.
 */

import { ai } from '@/ai/genkit-instance';
import { z } from 'genkit';
import axios from 'axios';
import { googleAI } from '@genkit-ai/googleai';

const MpesaPaymentInputSchema = z.object({
  userId: z.string().describe("The UID of the user making the payment."),
  phoneNumber: z.string().describe("The user's 10-digit phone number (e.g., 07xxxxxxxx)."),
  amount: z.number().describe("The amount to be charged."),
  courseId: z.string().describe("The ID of the course being purchased."),
});
export type MpesaPaymentInput = z.infer<typeof MpesaPaymentInputSchema>;

const MpesaPaymentOutputSchema = z.object({
  success: z.boolean().describe("Whether the STK push was initiated successfully."),
  message: z.string().describe("A message indicating the status of the request."),
  checkoutRequestId: z.string().optional().describe("The CheckoutRequestID from M-Pesa, used to query the transaction status."),
});
export type MpesaPaymentOutput = z.infer<typeof MpesaPaymentOutputSchema>;

function getTimestamp() {
  const now = new Date();
  return (
    now.getFullYear().toString() +
    ("0" + (now.getMonth() + 1)).slice(-2) +
    ("0" + now.getDate()).slice(-2) +
    ("0" + now.getHours()).slice(-2) +
    ("0" + now.getMinutes()).slice(-2) +
    ("0" + now.getSeconds()).slice(-2)
  );
}


async function getMpesaAccessToken(): Promise<string> {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
        throw new Error("M-Pesa consumer key or secret is not configured in environment variables.");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    try {
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Failed to get M-Pesa access token:", error);
        throw new Error("Could not authenticate with M-Pesa.");
    }
}


export async function processMpesaPayment(
  input: MpesaPaymentInput
): Promise<MpesaPaymentOutput> {
  return mpesaPaymentFlow(input);
}

const mpesaPaymentFlow = ai.defineFlow(
  {
    name: 'mpesaPaymentFlow',
    inputSchema: MpesaPaymentInputSchema,
    outputSchema: MpesaPaymentOutputSchema,
  },
  async ({ userId, phoneNumber, amount, courseId }) => {
    
    const shortCode = process.env.MPESA_TILL_NUMBER;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (!shortCode || !passkey || !callbackUrl) {
        return {
            success: false,
            message: 'M-Pesa Till Number, Passkey, or Callback URL is not configured in environment variables.'
        }
    }

    const timestamp = getTimestamp();
    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
    
    // Format phone number to Safaricom's required format (254...)
    const formattedPhoneNumber = `254${phoneNumber.slice(-9)}`;

    try {
        const accessToken = await getMpesaAccessToken();

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerBuyGoodsOnline",
            Amount: amount,
            PartyA: formattedPhoneNumber,
            PartyB: shortCode,
            PhoneNumber: formattedPhoneNumber,
            CallBackURL: `${callbackUrl}?courseId=${courseId}&userId=${userId}`,
            AccountReference: "MandaNetwork",
            TransactionDesc: `Payment for ${courseId}`
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const { ResponseCode, ResponseDescription, CheckoutRequestID } = response.data;
        
        if (ResponseCode === "0") {
             return {
                success: true,
                message: ResponseDescription,
                checkoutRequestId: CheckoutRequestID
            };
        } else {
             return {
                success: false,
                message: ResponseDescription
            };
        }

    } catch (error: any) {
        console.error("M-Pesa STK Push error:", error.response ? error.response.data : error.message);
         return {
            success: false,
            message: "Failed to initiate M-Pesa payment. Please try again."
        };
    }
  }
);

    
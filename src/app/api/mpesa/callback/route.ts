
import { enrollUserInCourse } from '@/lib/firebase-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    console.log("M-Pesa callback received");
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    if (!userId || !courseId) {
        console.error("Missing userId or courseId in callback URL");
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 400 });
    }

    try {
        const body = await req.json();
        console.log("Callback body:", JSON.stringify(body, null, 2));

        const stkCallback = body.Body.stkCallback;
        const resultCode = stkCallback.ResultCode;
        const checkoutRequestId = stkCallback.CheckoutRequestID;

        if (resultCode === 0) {
            console.log(`Payment successful for CheckoutRequestID: ${checkoutRequestId}`);

            const metadata = stkCallback.CallbackMetadata.Item;
            const amount = metadata.find((i: any) => i.Name === 'Amount').Value;
            const mpesaReceiptNumber = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
            const phoneNumber = metadata.find((i: any) => i.Name === 'PhoneNumber').Value;
            
            // Enroll the user in the course
            await enrollUserInCourse(userId, courseId, 'mpesa');
            
            console.log(`User ${userId} enrolled in course ${courseId}. M-Pesa receipt: ${mpesaReceiptNumber}`);

        } else {
            console.log(`Payment failed for CheckoutRequestID: ${checkoutRequestId}. Result Code: ${resultCode}, Reason: ${stkCallback.ResultDesc}`);
            // Optionally, update your database to reflect the failed payment
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    } catch (error) {
        console.error("Error processing M-Pesa callback:", error);
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 500 });
    }
}

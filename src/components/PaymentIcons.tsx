

'use client';

import { Icon } from "@iconify/react";
import { Coins } from "lucide-react";

export default function PaymentIcons() {
  return (
    <div className="flex items-center justify-center gap-6 py-4 flex-wrap">
      <Icon icon="simple-icons:mpesa" className="h-8 w-auto text-green-600" />
      <Icon icon="logos:paypal" className="h-7 w-auto" />
      <Icon icon="logos:stripe" className="h-10 w-auto" />
      <Icon icon="logos:mastercard" className="h-8 w-auto" />
      <Icon icon="logos:visa" className="h-8 w-auto" />
      <Coins className="h-8 w-8 text-yellow-500" />
    </div>
  );
}



'use client';

import { Icon } from "@iconify/react";


export default function PaymentIcons() {
  return (
    <div className="flex items-center justify-center gap-8 py-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Icon icon="simple-icons:mpesa" className="h-7 w-auto text-green-600" />
        <span className="text-sm font-medium">M-Pesa</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon icon="simple-icons:paystack" className="h-7 w-auto" />
        <span className="text-sm font-medium">Paystack</span>
      </div>
    </div>
  );
}

'use client';

import { Icon } from '@iconify/react';

export default function PaymentIcons() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <Icon icon="simple-icons:paystack" className="h-8 w-8" aria-hidden="true" />
      <span className="text-sm font-semibold">Paystack</span>
      <span className="text-xs text-muted-foreground">— sole payment provider</span>
    </div>
  );
}

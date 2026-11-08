import { redirect } from 'next/navigation';

export default function LegacyLegalRoute() {
  redirect('/legal/terms');
}

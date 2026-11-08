import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const policies = {
  terms: {
    title: 'Terms and agreements',
    intro: 'These terms govern access to Varban Academy, including its website, learning products, community features and related services.',
    sections: [
      ['1. Who we are and scope', 'Varban Academy is an education and skills-development platform. References to “we”, “us” and “our” mean the operator of Varban Academy. The service is offered through an entity registered in Seychelles. The operator’s full legal name, company number and registered office should be confirmed in the formal corporate disclosure before these terms are relied upon.'],
      ['2. Acceptance and eligibility', 'By creating an account or using the platform, you agree to these terms and the linked privacy notices. You must provide accurate information, be legally capable of entering a binding agreement and meet any age requirement shown for the relevant service. If you use the service for an organisation, you confirm that you are authorised to bind that organisation.'],
      ['3. Educational purpose and risk', 'Courses, articles, demonstrations, simulations and market commentary are provided for general educational and informational purposes. They are not personal financial, investment, legal, tax or other professional advice, and are not an offer, solicitation or recommendation to buy or sell any financial instrument. Markets involve risk; examples and simulated results do not predict future outcomes. You are responsible for independent decisions and for obtaining advice appropriate to your circumstances.'],
      ['4. Accounts and security', 'You are responsible for keeping credentials confidential, using a unique password, maintaining accurate account details and promptly reporting suspected compromise. Do not share accounts, impersonate another person, bypass access controls or allow unauthorised access. We may suspend access where reasonably necessary to protect users, the platform or legal rights.'],
      ['5. Courses, fees and payments', 'Course descriptions, eligibility, access periods, fees, taxes, payment methods and refund terms will be shown at checkout or in the applicable offer. A purchase is complete only when confirmed by the platform or payment provider. Third-party payment providers process payment information under their own terms. Any cancellation or refund rights that cannot lawfully be excluded remain unaffected.'],
      ['6. Acceptable use', 'You must not misuse the platform, upload unlawful or harmful material, infringe intellectual property, harass others, distribute malware, scrape or disrupt services, manipulate assessments or use the platform to provide unauthorised financial services. We may remove content or restrict accounts where justified.'],
      ['7. Intellectual property and user content', 'The platform, course materials, branding, software and original content are owned by or licensed to the operator and protected by applicable law. We grant you a limited, personal, non-transferable licence to access purchased or otherwise authorised learning materials for their intended purpose. You retain rights in content you submit, while granting us the limited licence needed to host, display, moderate and operate that content. Do not redistribute paid course materials without permission.'],
      ['8. Third-party services', 'The platform may link to or integrate third-party services. We do not control their availability, security or terms. Your use of those services is governed by their own agreements and privacy notices.'],
      ['9. Availability and changes', 'We may update, suspend or discontinue features for maintenance, security, legal compliance or product changes. We will take reasonable steps to communicate material changes where appropriate. We do not guarantee uninterrupted or error-free availability.'],
      ['10. Disclaimers and liability', 'To the extent permitted by law, the platform is provided on an “as available” basis and implied warranties are excluded. Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for fraud or deliberate misconduct. Subject to that limit, we are not liable for indirect or consequential loss, lost profits, loss of opportunity or loss of data arising from use of the platform.'],
      ['11. Suspension and termination', 'You may stop using the service at any time and request account deletion. We may suspend or terminate access for material breach, security threats, unlawful activity or where required by law. Provisions that by their nature should continue, including intellectual property, liability, dispute and record-retention provisions, will survive termination.'],
      ['12. Governing law and disputes', 'These terms are intended to be governed by the laws of Seychelles, subject to mandatory consumer protection rules and any non-excludable rights applicable where you live. Disputes should first be raised through our contact channel so the parties can attempt a good-faith resolution. Any court or forum clause must be reviewed against the operator’s actual Seychelles registration and applicable law before publication.'],
      ['13. Contact and updates', 'For questions about these terms, use the contact page. We may revise these terms from time to time and will update the effective date when material changes are made.']
    ]
  },
  privacy: {
    title: 'Privacy notice',
    intro: 'This notice explains what personal information Varban Academy handles, why it is used, who may receive it and the choices available to you.',
    sections: [
      ['1. Information we may collect', 'Depending on how you use the service, we may process account identifiers and contact details; profile and organisation information; course enrolments, progress, assessments and certificates; messages and support requests; transaction references and billing status; user-submitted files and content; device, browser, log, diagnostic and approximate location data; and cookie or similar technology preferences. We aim to collect only information relevant to the service.'],
      ['2. How information is collected', 'Information may come directly from you, from your use of the platform, from an organisation that enrols you, or from service providers that support authentication, hosting, analytics, communications and payments. We do not ask you to submit sensitive information unless it is necessary for a clearly explained purpose.'],
      ['3. Purposes and lawful grounds', 'We use information to create and secure accounts, deliver courses, track learning progress, issue certificates, process purchases, provide support, communicate service updates, prevent abuse, maintain records, improve reliability and meet legal obligations. Depending on the context, the relevant ground may be performance of a contract, consent, legitimate interests balanced against your rights, or compliance with a legal obligation. Where we rely on consent, you may withdraw it prospectively.'],
      ['4. Sharing and service providers', 'We may share limited information with hosting, database, authentication, analytics, email, customer-support and payment providers; with an organisation managing your learning account; with professional advisers; or with authorities where required by law or necessary to protect rights and safety. Providers are expected to process information under appropriate contractual and security safeguards. We do not sell personal information.'],
      ['5. International transfers', 'Our service providers or infrastructure may process information in countries other than Seychelles or your country of residence. Where required, we use appropriate safeguards and assess transfer risks in line with applicable data-protection requirements.'],
      ['6. Retention', 'We keep personal information only for as long as reasonably needed for the purposes described, including account operation, learning records, dispute handling, security, financial recordkeeping and legal compliance. Retention periods depend on the type of information and the applicable legal requirements. We then delete, aggregate or anonymise it where practicable.'],
      ['7. Your choices and rights', 'Subject to applicable law, you may request access, correction, deletion, restriction or portability of personal information, object to certain processing, withdraw consent and complain to a competent supervisory authority. We may need to verify your identity and may retain limited records where lawfully required.'],
      ['8. Children', 'The platform is not intended for children below the age permitted for the relevant service. Where a course is offered to minors, additional guardian consent and safeguards may apply. Contact us if you believe a child has provided personal information without appropriate authorisation.'],
      ['9. Cookies and analytics', 'Essential technologies support login, security and core functions. Optional analytics or preference technologies should be used according to the consent controls presented on the platform and your browser settings. Blocking essential technologies may affect service functionality.'],
      ['10. Contact and complaints', 'Use our contact page for privacy requests or questions. You may also contact the competent data-protection authority where applicable.']
    ]
  },
  'data-use': {
    title: 'How we use your data',
    intro: 'A plain-language explanation of how information supports learning, account operations and platform safety.',
    sections: [
      ['Account and identity', 'We use your name, email address, authentication identifiers and profile details to create your account, sign you in, protect access and communicate essential account notices.'],
      ['Learning delivery', 'We use enrolments, lesson activity, assessment responses and completion records to deliver courses, save progress, support instructors, assess learning and issue certificates where applicable.'],
      ['Payments and records', 'We use order references, selected product, amount, payment status and limited billing details to confirm purchases, manage access, respond to payment queries and meet accounting obligations. Payment card credentials are handled by the payment provider rather than stored by the Academy unless a specific secure payment integration expressly states otherwise.'],
      ['Support and communications', 'We use messages and support history to answer requests, troubleshoot problems and send important service or policy updates. Marketing messages are sent only where permitted and include an available opt-out.'],
      ['Security and reliability', 'Technical logs, device details and usage events help detect suspicious sign-ins, investigate incidents, prevent spam and abuse, diagnose errors and improve service performance.'],
      ['Personalisation and analytics', 'Where enabled and permitted, we may use course preferences and aggregated usage information to recommend relevant learning materials and understand which features are useful. We seek to avoid using identifiable data for unrelated purposes.'],
      ['Your controls', 'You can review profile information in account settings, change communication preferences where available, manage cookie choices and submit privacy or deletion requests through the contact page. Some records may need to be retained for legal, security or contractual reasons.']
    ]
  },
  'data-safety': {
    title: 'Data safety and security',
    intro: 'We use administrative, technical and organisational measures designed to protect information. No online service can promise absolute security.',
    sections: [
      ['Access controls', 'Access to personal information should be limited to authorised personnel and service providers who need it for legitimate work. Administrative access is protected through authentication and role-based permissions where supported.'],
      ['Transmission and storage', 'We use encrypted connections (HTTPS/TLS) for supported web traffic and rely on infrastructure providers’ security controls for hosted data. Encryption at rest, backup coverage and regional data locations depend on the configuration of each provider and service.'],
      ['Application safeguards', 'We apply input validation, access checks, security rules, dependency updates, logging and testing to reduce common risks. Security controls are reviewed as the platform evolves.'],
      ['Payment safety', 'Payments are processed through supported payment providers. Never send passwords, one-time codes or full card details through support messages. Check the provider’s secure checkout before entering payment details.'],
      ['Incident response', 'If we identify a suspected personal-data incident, we investigate, contain and remediate it, preserve relevant evidence and notify affected people or competent authorities where required by applicable law.'],
      ['Your role', 'Use a strong unique password, keep devices updated, sign out on shared devices, avoid suspicious links and report unexpected account activity promptly.'],
      ['Limitations', 'Internet transmission and electronic storage are not perfectly secure. We cannot guarantee that information will never be accessed, altered or lost despite reasonable safeguards.'],
      ['Reporting a concern', 'If you believe your account or information has been compromised, contact us promptly through the contact page and include the relevant account email and a description of the concern. Do not include your password or verification codes.']
    ]
  },
  legal: {
    title: 'Legal information',
    intro: 'Important information about the Varban Academy operator, the nature of our services and the limits of our educational offering.',
    sections: [
      ['Operator and jurisdiction', 'Varban Academy has advised that its operating business is registered in Seychelles. The precise registered legal name, company registration number, registered office and any applicable licence or regulatory authorisation must be confirmed against official corporate and regulator records and displayed here before this notice is treated as a complete statutory disclosure.'],
      ['Regulatory status', 'Varban Academy provides education and learning resources. A company registration is not itself a regulatory licence. Nothing on this website should be read as a claim that the Academy is authorised to provide brokerage, investment advice, portfolio management, payment services or any other regulated financial activity. If a specific regulated service is offered, the responsible licensed entity, regulator, licence number, permitted activities and jurisdictional restrictions must be disclosed separately and accurately.'],
      ['No financial advice', 'Market-related material is educational only. It does not take account of your objectives, financial situation or needs. Trading and investing may result in losses, including loss of capital. You should seek independent professional advice before making financial decisions.'],
      ['Intellectual property', 'The Varban Academy name, visual identity, course materials and platform content are protected by applicable intellectual-property laws. Unauthorised copying, resale, public distribution or modification is prohibited except where permitted by law or written permission.'],
      ['Complaints', 'Please raise complaints through our contact page with a clear description of the issue and the outcome you are seeking. We will review and respond within a reasonable period. Any statutory complaint rights remain unaffected.'],
      ['Corporate disclosure', 'Before production publication, complete and verify the registered entity name, Seychelles company number, registered address, official contact details and regulator/licence details (if any). Do not rely on this page as a substitute for legal advice or official registration evidence.']
    ]
  }
} as const;

type PolicySlug = keyof typeof policies;

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug as PolicySlug];
  return policy ? { title: policy.title, description: policy.intro } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies[slug as PolicySlug];
  if (!policy) notFound();

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8"><Link href="/" className="text-lg font-bold tracking-tight">Varban Academy</Link></div>
      </div>
      <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Varban Academy · Legal centre</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{policy.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">{policy.intro}</p>
        <p className="mt-5 text-xs text-neutral-500">Effective date: 8 November 2026 · Review date: 8 November 2027</p>
        <div className="mt-12 space-y-10">
          {policy.sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-semibold tracking-tight">{heading}</h2><p className="mt-3 text-[15px] leading-7 text-neutral-700">{body}</p></section>)}
        </div>
        <div className="mt-14 border-t border-neutral-200 pt-8 text-sm text-neutral-600">Questions or requests? Visit our <Link href="/contact" className="font-semibold text-neutral-950 underline underline-offset-4">contact page</Link> or review the <Link href="/account-deletion" className="font-semibold text-neutral-950 underline underline-offset-4">account deletion process</Link>.</div>
      </article>
      <footer className="border-t border-neutral-200"><div className="mx-auto flex max-w-7xl flex-wrap gap-5 px-5 py-7 text-sm text-neutral-600 sm:px-8"><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/data-use">Data use</Link><Link href="/legal/data-safety">Data safety</Link><Link href="/legal/legal">Legal information</Link><Link href="/account-deletion">Account deletion</Link></div></footer>
    </main>
  );
}

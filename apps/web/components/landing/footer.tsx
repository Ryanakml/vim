import { FooterLinksSection } from "./footer-link-section";
import { NewsletterSubscriptionSection } from "./newslatter";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6">
        <NewsletterSubscriptionSection />
        <FooterLinksSection />
        <div className="border-t py-6 text-center text-sm text-muted-foreground">
          © 2026 Chatify. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

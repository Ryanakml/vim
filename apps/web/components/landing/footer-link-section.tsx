const productsLinks = [
  "Chat Agent",
  "Email Marketing Agent",
  "Voice Agent",
  "WhatsApp Agent",
];

const generalLinks = [
  "Pricing",
  "About Us",
  "Contact Us",
  "Blog",
  "FAQ",
  "Terms & Conditions",
  "Privacy Policy",
];

export function FooterLinksSection() {
  return (
    <div className="grid gap-10 py-10 md:grid-cols-3">
      <nav aria-label="Products" className="space-y-3">
        <h3 className="text-sm font-semibold">Products</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {productsLinks.map((item) => (
            <li key={item}>
              <a href="#" className="hover:text-foreground">
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="General" className="space-y-3">
        <h3 className="text-sm font-semibold">General</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {generalLinks.map((item) => (
            <li key={item}>
              <a href="#" className="hover:text-foreground">
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <address className="space-y-2 not-italic text-sm text-muted-foreground">
        <h3 className="text-sm font-semibold text-foreground">Contact</h3>
        <p>
          Email: <a href="mailto:business@itsbot.ai">business@itsbot.ai</a>
        </p>
        <p>
          Phone: <a href="tel:+19789138334">+1 978 913 8334</a>
        </p>
        <p>Punjab, India</p>
      </address>
    </div>
  );
}

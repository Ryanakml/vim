export function NewsletterSubscriptionSection() {
  return (
    <section className="border-b py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Subscribe to receive the latest updates, tips, and exclusive offers.
        </p>

        <form className="flex w-full max-w-md gap-2">
          <input
            type="email"
            placeholder="Enter your email"
            className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

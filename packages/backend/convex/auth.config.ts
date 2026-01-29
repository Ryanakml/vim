export default {
  providers: [
    {
      // Kita ambil dari env var yang kita set di dashboard Convex tadi
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};

import Link from "next/link"; // Import Link
import { Button } from "@workspace/ui/components/button";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">TODO: LANDING PAGE</h1>
        <Link href="/dashboard/overview" passHref>
          <Button size="sm">GoIn</Button>
        </Link>
      </div>
    </div>
  );
}

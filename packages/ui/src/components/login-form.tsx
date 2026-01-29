import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </Field>
        <Field>
          <Button type="submit">Login</Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>

        <Field>
          <div className="grid grid-cols-2 gap-3">
            {/* GitHub */}
            <Button
              variant="outline"
              type="button"
              className="flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 98 96"
                className="h-5 w-5 shrink-0"
                fill="currentColor"
              >
                <path d="M49 0C21.9 0 0 22.3 0 49.8c0 22 14.2 40.6 33.9 47.2 2.5.5 3.4-1.1 3.4-2.4 0-1.2-.1-5.2-.1-9.4-13.8 3-16.7-6-16.7-6-2.3-5.9-5.7-7.5-5.7-7.5-4.7-3.3.4-3.2.4-3.2 5.2.4 7.9 5.4 7.9 5.4 4.6 8 12.1 5.7 15 4.3.5-3.4 1.8-5.7 3.3-7-11-1.3-22.6-5.6-22.6-25 0-5.5 1.9-9.9 5.1-13.4-.5-1.3-2.2-6.5.5-13.5 0 0 4.1-1.3 13.5 5.1 3.9-1.1 8.1-1.7 12.3-1.7s8.4.6 12.3 1.7c9.4-6.4 13.5-5.1 13.5-5.1 2.7 7 .9 12.2.5 13.5 3.2 3.5 5.1 7.9 5.1 13.4 0 19.4-11.6 23.7-22.7 25 1.8 1.6 3.4 4.7 3.4 9.4 0 6.8-.1 12.2-.1 13.9 0 1.3.9 2.9 3.4 2.4C83.8 90.4 98 71.8 98 49.8 98 22.3 76.1 0 49 0z" />
              </svg>
              GitHub
            </Button>

            {/* Google */}
            <Button
              variant="outline"
              type="button"
              className="flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="h-5 w-5"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.04 1.53 7.43 2.8l5.45-5.45C33.64 3.6 29.28 1.5 24 1.5 14.73 1.5 6.9 6.86 3.19 14.62l6.66 5.17C11.45 14.09 17.2 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.59-.14-3.11-.4-4.5H24v8.51h12.7c-.55 2.97-2.18 5.48-4.63 7.17l7.15 5.55C43.92 36.82 46.5 31.2 46.5 24.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M9.85 28.79a14.5 14.5 0 0 1 0-9.18L3.19 14.62a23.99 23.99 0 0 0 0 18.76l6.66-4.59z"
                />
                <path
                  fill="#34A853"
                  d="M24 46.5c6.48 0 11.92-2.13 15.9-5.77l-7.15-5.55c-1.99 1.34-4.54 2.13-8.75 2.13-6.8 0-12.55-4.59-14.15-10.79l-6.66 4.59C6.9 41.14 14.73 46.5 24 46.5z"
                />
              </svg>
              Google
            </Button>
          </div>

          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import Image from "next/image";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Alert } from "@workspace/ui/components/alert";

export default function SignupPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  // Registration Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle registration form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      // Create sign-up account
      await signUp.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        emailAddress: formData.email,
        password: formData.password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      // Switch to OTP form
      setShowOTPForm(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setLoading(true);

    try {
      // Verify email address with OTP code
      const result = await signUp.attemptEmailAddressVerification({
        code: otp,
      });

      if (result.status === "complete") {
        // Create session and redirect to dashboard
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard/overview");
      } else {
        setError("OTP verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  // OAuth Sign Up (Google & GitHub)
  const handleOAuthSignUp = async (provider: "google" | "github") => {
    if (!isLoaded) return;

    setLoading(true);
    setError(null);

    try {
      await signUp.authenticateWithRedirect({
        strategy: provider === "google" ? "oauth_google" : "oauth_github",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard/overview",
        continueSignUpUrl: "/onboarding",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || `${provider} sign up failed`);
      setLoading(false);
    }
  };

  // Go back to registration form
  const handleBackToRegister = () => {
    setShowOTPForm(false);
    setOtp("");
    setError(null);
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Chatify
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {/* Registration Form */}
            {!showOTPForm ? (
              <form
                className="flex flex-col gap-6"
                onSubmit={handleRegisterSubmit}
              >
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Fill in the form below to create your account
                    </p>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive" className="text-sm">
                      {error}
                    </Alert>
                  )}

                  {/* First Name */}
                  <Field>
                    <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstName: e.target.value,
                        })
                      }
                      disabled={loading}
                      required
                    />
                  </Field>

                  {/* Last Name */}
                  <Field>
                    <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastName: e.target.value,
                        })
                      }
                      disabled={loading}
                      required
                    />
                  </Field>

                  {/* Email */}
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          email: e.target.value,
                        })
                      }
                      disabled={loading}
                      required
                    />
                    <FieldDescription>
                      We&apos;ll use this to contact you. We will not share your
                      email with anyone else.
                    </FieldDescription>
                  </Field>

                  {/* Password */}
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        })
                      }
                      disabled={loading}
                      required
                    />
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                  </Field>

                  {/* Confirm Password */}
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      disabled={loading}
                      required
                    />
                    <FieldDescription>
                      Please confirm your password.
                    </FieldDescription>
                  </Field>

                  {/* Submit Button */}
                  <Field>
                    <Button type="submit" disabled={loading || !isLoaded}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </Field>

                  <FieldSeparator>Or continue with</FieldSeparator>

                  {/* OAuth Buttons */}
                  <Field>
                    <div className="grid grid-cols-2 gap-3">
                      {/* GitHub */}
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => handleOAuthSignUp("github")}
                        disabled={loading || !isLoaded}
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
                        onClick={() => handleOAuthSignUp("google")}
                        disabled={loading || !isLoaded}
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
                      Already have an account?{" "}
                      <a
                        href="/signin"
                        className="underline underline-offset-4"
                      >
                        Sign in
                      </a>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            ) : (
              /* OTP Verification Form */
              <form className="flex flex-col gap-6" onSubmit={handleOTPSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Verify your email</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Enter the verification code sent to{" "}
                      <strong>{formData.email}</strong>
                    </p>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive" className="text-sm">
                      {error}
                    </Alert>
                  )}

                  {/* OTP Code Input */}
                  <Field>
                    <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={6}
                      disabled={loading}
                      required
                    />
                    <FieldDescription>
                      Check your email for the 6-digit code
                    </FieldDescription>
                  </Field>

                  {/* Verify Button */}
                  <Field>
                    <Button
                      type="submit"
                      disabled={loading || !isLoaded || otp.length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify Email"}
                    </Button>
                  </Field>

                  {/* Back Button */}
                  <Field>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToRegister}
                      disabled={loading}
                    >
                      Back to Registration
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          width={800}
          height={600}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}

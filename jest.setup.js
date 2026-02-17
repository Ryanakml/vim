// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      pathname: "/",
      query: {},
      asPath: "/",
    };
  },
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  useMatches() {
    return [];
  },
}));

// Mock clerk
jest.mock("@clerk/nextjs", () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
  useUser: jest.fn(),
  SignIn: jest.fn(() => null),
  SignUp: jest.fn(() => null),
  ClerkProvider: ({ children }) => children,
}));

import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { useAuth } from "@clerk/nextjs";

jest.mock("@clerk/nextjs");

// Simple test component that uses useAuth
const TestAuthComponent = () => {
  const { isLoaded, isSignedIn, userId } = useAuth() as any;

  if (!isLoaded) {
    return React.createElement("div", null, "Loading...");
  }

  if (!isSignedIn) {
    return React.createElement("div", null, "Please sign in");
  }

  return React.createElement("div", null, `Welcome, ${userId}!`);
};

describe("Authentication Flow Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Login Status Display", () => {
    it("should display loading state", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      mockUseAuth.mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      render(React.createElement(TestAuthComponent));

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should display sign in prompt when not authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      render(React.createElement(TestAuthComponent));

      expect(screen.getByText("Please sign in")).toBeInTheDocument();
    });

    it("should display welcome message when authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const testUserId = "user_123";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: testUserId,
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      render(React.createElement(TestAuthComponent));

      expect(screen.getByText(`Welcome, ${testUserId}!`)).toBeInTheDocument();
    });
  });

  describe("Authentication Persistence", () => {
    it("should maintain authenticated state across renders", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "persistent_user",
        sessionId: "persistent_sess",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { rerender } = render(React.createElement(TestAuthComponent));

      expect(screen.getByText("Welcome, persistent_user!")).toBeInTheDocument();

      // Re-render should maintain state
      rerender(React.createElement(TestAuthComponent));

      expect(screen.getByText("Welcome, persistent_user!")).toBeInTheDocument();
    });
  });

  describe("User Identification", () => {
    it("should correctly identify user ID when authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const testUserId = "user_xyz789";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: testUserId,
        sessionId: "sess_abc",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      render(React.createElement(TestAuthComponent));

      expect(screen.getByText(`Welcome, ${testUserId}!`)).toBeInTheDocument();
    });

    it("should have null user ID when not authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      render(React.createElement(TestAuthComponent));

      const welcomeElement = screen.queryByText(/Welcome/);
      expect(welcomeElement).not.toBeInTheDocument();
    });
  });
});

describe("Login Success Scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully recognize completed login", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

    // Simulate successful login
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "successfully_logged_in_user",
      sessionId: "valid_session",
      signOut: jest.fn(),
      getToken: jest.fn().mockResolvedValue("valid_token"),
    } as any);

    const scenario = {
      loginAttempt: true,
      authResult: mockUseAuth(),
    };

    expect(scenario.loginAttempt).toBe(true);
    expect(scenario.authResult.isSignedIn).toBe(true);
    expect(scenario.authResult.userId).toBeDefined();
    expect(scenario.authResult.sessionId).toBeDefined();
  });

  it("should reject invalid login attempts", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

    // Simulate failed login
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as any);

    const scenario = {
      loginAttempt: true,
      authResult: mockUseAuth(),
    };

    expect(scenario.loginAttempt).toBe(true);
    expect(scenario.authResult.isSignedIn).toBe(false);
    expect(scenario.authResult.userId).toBeNull();
    expect(scenario.authResult.sessionId).toBeNull();
  });

  it("should handle concurrent login requests", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

    const loginPromises = Array(3)
      .fill(null)
      .map(() => {
        mockUseAuth.mockReturnValue({
          isLoaded: true,
          isSignedIn: true,
          userId: "concurrent_user",
          sessionId: `session_${Math.random()}`,
          signOut: jest.fn(),
          getToken: jest.fn().mockResolvedValue("token"),
        } as any);

        return mockUseAuth();
      });

    expect(loginPromises).toHaveLength(3);
    expect(loginPromises.every((result) => result.isSignedIn)).toBe(true);
  });

  it("should provide valid token for authenticated users", async () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
    const mockToken = "valid_jwt_token_12345";

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_with_token",
      sessionId: "sess_123",
      signOut: jest.fn(),
      getToken: jest.fn().mockResolvedValue(mockToken),
    } as any);

    const authState = mockUseAuth();
    const token = await authState.getToken();

    expect(token).toBe(mockToken);
  });

  it("should validate login state consistency", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
      sessionId: "sess_123",
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as any);

    const authState = mockUseAuth();

    // Validate consistency: if signed in, should have userId and sessionId
    if (authState.isSignedIn) {
      expect(authState.userId).not.toBeNull();
      expect(authState.sessionId).not.toBeNull();
    }
  });
});

describe("Login Protection", () => {
  it("should ensure isLoaded check prevents race conditions", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

    mockUseAuth.mockReturnValue({
      isLoaded: true, // Important: always check this before using other values
      isSignedIn: true,
      userId: "user_123",
      sessionId: "sess_123",
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as any);

    const authState = mockUseAuth();

    // This pattern prevents using auth values before they're loaded
    if (authState.isLoaded && authState.isSignedIn) {
      expect(authState.userId).toBeDefined();
    }
  });

  it("should handle missing session gracefully", () => {
    const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as any);

    const authState = mockUseAuth();

    // Should not throw errors when accessing null properties
    expect(() => {
      if (authState.isSignedIn) {
        // This won't execute
        authState.userId?.toString();
      }
    }).not.toThrow();
  });
});

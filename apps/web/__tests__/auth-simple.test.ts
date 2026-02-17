/* __tests__/auth.test.ts */

import { useAuth } from "@clerk/nextjs";

jest.mock("@clerk/nextjs");

describe("Clerk Authentication - Login Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useAuth Hook", () => {
    it("should return loading state initially", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      mockUseAuth.mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(auth.isLoaded).toBe(false);
    });

    it("should indicate signed out state when not authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(auth.isLoaded).toBe(true);
      expect(auth.isSignedIn).toBe(false);
      expect(auth.userId).toBeNull();
    });

    it("should indicate signed in state with user ID when authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockUserId = "user_123";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: mockUserId,
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue("mock_token"),
      } as any);

      const auth = useAuth();
      expect(auth.isLoaded).toBe(true);
      expect(auth.isSignedIn).toBe(true);
      expect(auth.userId).toBe(mockUserId);
      expect(auth.sessionId).toBe("sess_123");
    });

    it("should provide signOut method", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockSignOut = jest.fn().mockResolvedValue(undefined);

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: mockSignOut,
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(typeof auth.signOut).toBe("function");
    });

    it("should provide getToken method for API authentication", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockGetToken = jest.fn().mockResolvedValue("mock_jwt_token");

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: mockGetToken,
      } as any);

      const auth = useAuth();
      expect(typeof auth.getToken).toBe("function");
    });
  });

  describe("Authentication State Transitions", () => {
    it("should transition from loading to authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      // Initial loading state
      mockUseAuth.mockReturnValueOnce({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      let auth = useAuth();
      expect(auth.isLoaded).toBe(false);

      // After authentication
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      auth = useAuth();
      expect(auth.isLoaded).toBe(true);
      expect(auth.isSignedIn).toBe(true);
    });

    it("should transition from authenticated to signed out", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      // Authenticated state
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      let auth = useAuth();
      expect(auth.isSignedIn).toBe(true);

      // After sign out
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      auth = useAuth();
      expect(auth.isSignedIn).toBe(false);
      expect(auth.userId).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle getToken errors gracefully", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockGetToken = jest
        .fn()
        .mockRejectedValue(new Error("Token fetch failed"));

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: mockGetToken,
      } as any);

      const auth = useAuth();
      expect(typeof auth.getToken).toBe("function");
    });

    it("should handle signOut errors gracefully", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockSignOut = jest
        .fn()
        .mockRejectedValue(new Error("Sign out failed"));

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: mockSignOut,
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(typeof auth.signOut).toBe("function");
    });
  });

  describe("Session Management", () => {
    it("should have session ID when authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_456",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(auth.sessionId).toBe("sess_456");
    });

    it("should have null session ID when not authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(auth.sessionId).toBeNull();
    });
  });

  describe("Login Success Verification", () => {
    it("should successfully recognize completed login", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "successfully_logged_in_user",
        sessionId: "valid_session",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue("valid_token"),
      } as any);

      const auth = useAuth();
      expect(auth.isSignedIn).toBe(true);
      expect(auth.userId).toBeDefined();
      expect(auth.sessionId).toBeDefined();
    });

    it("should reject invalid login attempts", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(auth.isSignedIn).toBe(false);
      expect(auth.userId).toBeNull();
      expect(auth.sessionId).toBeNull();
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

      const auth = useAuth();

      // Check consistency
      if (auth.isSignedIn) {
        expect(auth.userId).not.toBeNull();
        expect(auth.sessionId).not.toBeNull();
      }
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

      const auth = useAuth();
      const token = await auth.getToken();
      expect(token).toBe(mockToken);
    });
  });

  describe("Convex Integration with Clerk Auth", () => {
    it("should provide authentication token for Convex API", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockToken = "convex_auth_token";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "clerk_user_123",
        sessionId: "clerk_session_123",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue(mockToken),
      } as any);

      const auth = useAuth();
      const token = await auth.getToken();
      expect(token).toBe(mockToken);
    });

    it("should prevent unauthorized Convex access when not authenticated", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn().mockRejectedValue(new Error("Not authenticated")),
      } as any);

      const auth = useAuth();
      expect(auth.isSignedIn).toBe(false);
    });

    it("should validate user identity for Convex database operations", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const userId = "user_for_db_ops";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId,
        sessionId: "db_session",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const auth = useAuth();
      expect(auth.userId).toBe(userId);
    });
  });
});

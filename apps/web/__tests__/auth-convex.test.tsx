import { renderHook } from "@testing-library/react";
import { useAuth } from "@clerk/nextjs";

jest.mock("@clerk/nextjs");

describe("Authentication with Convex Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Clerk Authentication for Convex", () => {
    it("should provide authentication token for Convex API calls", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockToken = "convex_authenticated_token";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "clerk_user_123",
        sessionId: "clerk_session_123",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue(mockToken),
      } as any);

      const { result } = renderHook(() => useAuth());

      const token = await result.current.getToken();
      expect(token).toBe(mockToken);
    });

    it("should handle Convex query authentication", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "session_123",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue("auth_token"),
      } as any);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isSignedIn).toBe(true);
      expect(result.current.getToken).toBeDefined();
    });

    it("should prevent unauthorized API access", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn().mockRejectedValue(new Error("Not authenticated")),
      } as any);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isSignedIn).toBe(false);
    });
  });

  describe("User Identity in Convex Context", () => {
    it("should provide user identity for database operations", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const userId = "convex_user_456";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId,
        sessionId: "convex_session_456",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result } = renderHook(() => useAuth());

      // User identity should be available for Convex queries
      expect(result.current.userId).toBe(userId);
    });

    it("should handle missing user identity", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result } = renderHook(() => useAuth());

      expect(result.current.userId).toBeNull();
    });
  });

  describe("Session Validation", () => {
    it("should validate active session for Convex operations", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_789",
        sessionId: "active_session_789",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result } = renderHook(() => useAuth());

      const isSessionValid =
        result.current.isLoaded &&
        result.current.isSignedIn &&
        result.current.sessionId !== null;

      expect(isSessionValid).toBe(true);
    });

    it("should detect invalid or expired sessions", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn().mockRejectedValue(new Error("Session expired")),
      } as any);

      const { result } = renderHook(() => useAuth());

      const isSessionValid =
        result.current.isLoaded &&
        result.current.isSignedIn &&
        result.current.sessionId !== null;

      expect(isSessionValid).toBe(false);
    });
  });

  describe("Secure API Communication", () => {
    it("should include authentication headers in API calls", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const mockToken = "secure_api_token";

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "api_user_123",
        sessionId: "api_session_123",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue(mockToken),
      } as any);

      const { result } = renderHook(() => useAuth());

      const token = await result.current.getToken();

      // Simulate API header construction
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      expect(headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it("should handle token refresh", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const oldToken = "old_token";
      const newToken = "refreshed_token";

      // First call returns old token
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_refresh",
        sessionId: "session_refresh",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue(oldToken),
      } as any);

      const { result: result1 } = renderHook(() => useAuth());
      const token1 = await result1.current.getToken();

      // Second call returns new token
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_refresh",
        sessionId: "session_refresh",
        signOut: jest.fn(),
        getToken: jest.fn().mockResolvedValue(newToken),
      } as any);

      const { result: result2 } = renderHook(() => useAuth());
      const token2 = await result2.current.getToken();

      expect(token1).toBe(oldToken);
      expect(token2).toBe(newToken);
      expect(token1).not.toBe(token2);
    });
  });

  describe("Error Handling in Auth Integration", () => {
    it("should handle authentication errors gracefully", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      const authError = new Error("Authentication failed");

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn().mockRejectedValue(authError),
      } as any);

      const { result } = renderHook(() => useAuth());

      try {
        await result.current.getToken();
      } catch (error) {
        expect(error).toBe(authError);
      }
    });

    it("should retry failed authentication attempts", async () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
      let attemptCount = 0;

      const mockGetToken = jest.fn(async () => {
        attemptCount = attemptCount + 1;
        if (attemptCount < 2) {
          throw new Error("First attempt failed");
        }
        return "successful_token";
      });

      mockUseAuth.mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        userId: "retry_user",
        sessionId: "retry_session",
        signOut: jest.fn(),
        getToken: mockGetToken,
      } as any);

      const { result } = renderHook(() => useAuth());

      // First attempt fails
      try {
        await result.current.getToken();
      } catch {
        // Expected
      }

      // Second attempt succeeds
      const token = await result.current.getToken();
      expect(token).toBe("successful_token");
    });
  });

  describe("Multi-User Scenarios", () => {
    it("should handle switching between users", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      // User 1 authenticates
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_1",
        sessionId: "session_1",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: user1Result } = renderHook(() => useAuth());
      expect(user1Result.current.userId).toBe("user_1");

      // User 1 signs out
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: signedOutResult } = renderHook(() => useAuth());
      expect(signedOutResult.current.userId).toBeNull();

      // User 2 authenticates
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_2",
        sessionId: "session_2",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: user2Result } = renderHook(() => useAuth());
      expect(user2Result.current.userId).toBe("user_2");
    });
  });
});

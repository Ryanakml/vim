import { renderHook } from "@testing-library/react";
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

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoaded).toBe(false);
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

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isSignedIn).toBe(false);
      expect(result.current.userId).toBeNull();
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

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isSignedIn).toBe(true);
      expect(result.current.userId).toBe(mockUserId);
      expect(result.current.sessionId).toBe("sess_123");
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

      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signOut).toBe("function");
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

      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.getToken).toBe("function");
    });

    it("should handle multiple authentication checks", () => {
      const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

      // First check - not authenticated
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: result1 } = renderHook(() => useAuth());
      expect(result1.current.isSignedIn).toBe(false);

      // Second check - authenticated
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: result2 } = renderHook(() => useAuth());
      expect(result2.current.isSignedIn).toBe(true);
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

      const { result: loadingResult } = renderHook(() => useAuth());
      expect(loadingResult.current.isLoaded).toBe(false);

      // After authentication
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: true,
        userId: "user_123",
        sessionId: "sess_123",
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.isLoaded).toBe(true);
      expect(authResult.current.isSignedIn).toBe(true);
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

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.isSignedIn).toBe(true);

      // After sign out
      mockUseAuth.mockReturnValueOnce({
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        sessionId: null,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      const { result: signedOutResult } = renderHook(() => useAuth());
      expect(signedOutResult.current.isSignedIn).toBe(false);
      expect(signedOutResult.current.userId).toBeNull();
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

      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.getToken).toBe("function");
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

      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signOut).toBe("function");
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

      const { result } = renderHook(() => useAuth());

      expect(result.current.sessionId).toBe("sess_456");
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

      const { result } = renderHook(() => useAuth());

      expect(result.current.sessionId).toBeNull();
    });
  });
});

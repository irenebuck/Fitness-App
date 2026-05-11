/**
 * LoginScreen Tests
 *
 * WHAT WE TEST:
 *  1. Render — does the screen display all its parts on load?
 *  2. friendlyError — does each Firebase error code map to the right message?
 *  3. handleLogin — validation, trimming, loading state
 *  4. handleSignup — all validation paths, success, cancel cleanup
 *  5. handleForgotPassword — validation, success, cancel cleanup
 *  6. Snapshot — baseline for visual regressions
 *
 * HOW MOCKING WORKS HERE:
 *  - We mock useAuth so login/signup/resetPassword are jest.fn() we control.
 *    This lets us make them succeed, fail, or hang on demand — no real Firebase needed.
 *  - We spy on Alert.alert so we can assert which alerts fire without actually
 *    showing a native popup during tests.
 *  - We mock react-native-safe-area-context because it requires native modules
 *    that don't exist in a Node test environment.
 *  - We mock the theme to avoid missing asset issues; tests don't care about colors.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../screens/LoginScreen';

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockResetPassword = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    resetPassword: mockResetPassword,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

jest.mock('../theme', () => ({
  COLORS: {
    primary: '#007AFF',
    white: '#FFFFFF',
    background: '#F2F2F7',
    textPrimary: '#1C1C1E',
    textSecondary: '#6C6C70',
    border: '#C6C6C8',
  },
  SPACING: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 },
  SIZES: { xsmall: 10, small: 12, medium: 14, large: 16, xlarge: 20, xxxlarge: 32 },
  RADIUS: { sm: 8, md: 12, lg: 20 },
  SHADOW: { small: {}, medium: {} },
}));

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Replace real Alert.alert with a spy so we can assert on it
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. RENDER TESTS ────────────────────────────────────────────────────────
  //
  // WHY: Before testing behavior, confirm the screen actually renders its key
  // pieces. If a component crashes on mount, every downstream test would fail
  // with a confusing error. These catch "screen is broken at load" instantly.

  describe('Rendering', () => {
    it('renders the app title and subtitle', () => {
      const { getByText } = render(<LoginScreen />);

      expect(getByText("Let's Go!")).toBeTruthy();
      expect(getByText('Community Fitness Challenges')).toBeTruthy();
    });

    it('renders email input, password input, and Log In button', () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      expect(getByPlaceholderText('your@email.com')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByText('Log In')).toBeTruthy();
    });

    it('renders Create Account and Forgot Password links', () => {
      const { getByText } = render(<LoginScreen />);

      expect(getByText('Create Account')).toBeTruthy();
      expect(getByText('Forgot Password')).toBeTruthy();
    });

    it('signup modal is hidden on initial render', () => {
      const { queryByText } = render(<LoginScreen />);

      // "Create Account" modal title is only visible when modal is open
      expect(queryByPlaceholderText('Your name')).toBeNull();
    });
  });

  // ── 2. UNIT TESTS: friendlyError (tested indirectly) ──────────────────────
  //
  // WHY: friendlyError() is a pure mapping function — error code in, human
  // message out. It lives inside the component so we can't import it directly.
  // We test it indirectly: make mockLogin throw an error with a known code,
  // then assert the correct message reaches Alert.alert.
  //
  // test.each lets us run the same test logic against every error code without
  // copy-pasting. If you add a new code to friendlyError, just add a row here.

  describe('friendlyError — Firebase error code mapping', () => {
    const errorCases = [
      {
        code: 'auth/user-not-found',
        expected: 'No account found with that email.',
      },
      {
        code: 'auth/wrong-password',
        expected: 'Incorrect password. Try again.',
      },
      {
        code: 'auth/invalid-email',
        expected: 'Please enter a valid email address.',
      },
      {
        code: 'auth/too-many-requests',
        expected: 'Too many attempts. Please try again later.',
      },
      {
        code: 'auth/anything-else',
        expected: 'Something went wrong. Please try again.',
      },
    ];

    test.each(errorCases)(
      'maps "$code" → "$expected"',
      async ({ code, expected }) => {
        // Make login() throw with this Firebase error code
        mockLogin.mockRejectedValueOnce({ code });

        const { getByPlaceholderText, getByText } = render(<LoginScreen />);

        // Fill in valid credentials so validation doesn't block us
        fireEvent.changeText(getByPlaceholderText('your@email.com'), 'user@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Log In'));

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith('Login Failed', expected);
        });
      }
    );
  });

  // ── 3. INTEGRATION TESTS: handleLogin ─────────────────────────────────────
  //
  // WHY: handleLogin has multiple guard clauses (empty fields) and an async
  // flow (spinner → Firebase call → result). Integration tests verify the
  // full chain: user action → state change → Firebase call → UI response.

  describe('handleLogin', () => {
    it('shows an error alert when both fields are empty', () => {
      const { getByText } = render(<LoginScreen />);

      fireEvent.press(getByText('Log In'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter your email and password.'
      );
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows an error alert when only password is filled', () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      fireEvent.press(getByText('Log In'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter your email and password.'
      );
    });

    it('calls login() with trimmed email and exact password', async () => {
      // WHY trim test: users often accidentally add a trailing space; the app
      // should strip it rather than sending it to Firebase.
      mockLogin.mockResolvedValueOnce();

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      fireEvent.changeText(
        getByPlaceholderText('your@email.com'),
        '  user@test.com  '  // deliberately padded
      );
      fireEvent.changeText(getByPlaceholderText('Password'), 'myPassword!');
      fireEvent.press(getByText('Log In'));

      await waitFor(() => {
        // Email should be trimmed; password should be passed as-is
        expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'myPassword!');
      });
    });

    it('prevents double-submission while login is in progress', async () => {
      // Make login() hang forever to simulate a slow network
      mockLogin.mockReturnValue(new Promise(() => {}));

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('your@email.com'), 'user@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

      // Press twice rapidly
      fireEvent.press(getByText('Log In'));
      fireEvent.press(getByText('Log In'));

      await waitFor(() => {
        // login() should only have been called once — button is disabled after first press
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ── 4. INTEGRATION TESTS: handleSignup ────────────────────────────────────
  //
  // WHY: The signup flow has 3 validation rules (all fields filled, passwords
  // match, password length) before calling Firebase. Each rule gets its own
  // test so we know exactly which check failed if a test breaks.

  describe('handleSignup modal', () => {
    // Helper: open the modal before each test in this block
    function openSignup(utils) {
      fireEvent.press(utils.getByText('Create Account'));
    }

    it('opens the signup modal when Create Account link is pressed', () => {
      const utils = render(<LoginScreen />);
      openSignup(utils);

      expect(utils.getByPlaceholderText('Your name')).toBeTruthy();
      expect(utils.getByText('Create Account')).toBeTruthy();
    });

    it('shows alert when any field is left empty', () => {
      const utils = render(<LoginScreen />);
      openSignup(utils);

      // Press Create Account button inside the modal (no fields filled)
      // getAllByText because 'Create Account' appears as link AND modal button
      fireEvent.press(utils.getAllByText('Create Account')[1]);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields.');
    });

    it('shows alert when passwords do not match', () => {
      const utils = render(<LoginScreen />);
      openSignup(utils);

      fireEvent.changeText(utils.getByPlaceholderText('Your name'), 'Jane Doe');
      fireEvent.changeText(
        utils.getByPlaceholderText('your@email.com'),
        'jane@test.com'
      );
      fireEvent.changeText(utils.getByPlaceholderText('Min. 6 characters'), 'password123');
      fireEvent.changeText(utils.getByPlaceholderText('Confirm password'), 'different456');

      fireEvent.press(utils.getAllByText('Create Account')[1]);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match.');
    });

    it('shows alert when password is fewer than 6 characters', () => {
      const utils = render(<LoginScreen />);
      openSignup(utils);

      fireEvent.changeText(utils.getByPlaceholderText('Your name'), 'Jane Doe');
      fireEvent.changeText(
        utils.getByPlaceholderText('your@email.com'),
        'jane@test.com'
      );
      fireEvent.changeText(utils.getByPlaceholderText('Min. 6 characters'), 'abc');
      fireEvent.changeText(utils.getByPlaceholderText('Confirm password'), 'abc');

      fireEvent.press(utils.getAllByText('Create Account')[1]);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Password must be at least 6 characters.'
      );
    });

    it('calls signup() with trimmed name and email on valid input', async () => {
      mockSignup.mockResolvedValueOnce();
      const utils = render(<LoginScreen />);
      openSignup(utils);

      fireEvent.changeText(utils.getByPlaceholderText('Your name'), '  Jane Doe  ');
      fireEvent.changeText(
        utils.getByPlaceholderText('your@email.com'),
        '  jane@test.com  '
      );
      fireEvent.changeText(utils.getByPlaceholderText('Min. 6 characters'), 'securePass1');
      fireEvent.changeText(utils.getByPlaceholderText('Confirm password'), 'securePass1');

      fireEvent.press(utils.getAllByText('Create Account')[1]);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          'Jane Doe',        // name trimmed
          'jane@test.com',   // email trimmed
          'securePass1'      // password unchanged
        );
      });
    });

    it('clears all fields when Cancel is pressed, so re-opening is blank', () => {
      const utils = render(<LoginScreen />);
      openSignup(utils);

      // Type something in the name field
      fireEvent.changeText(utils.getByPlaceholderText('Your name'), 'Partial Input');

      // Cancel the modal
      fireEvent.press(utils.getByText('Cancel'));

      // Reopen and confirm the field was cleared
      openSignup(utils);
      expect(utils.getByPlaceholderText('Your name').props.value).toBe('');
    });
  });

  // ── 5. INTEGRATION TESTS: handleForgotPassword ────────────────────────────
  //
  // WHY: The reset flow is simpler but still has validation and async state.
  // We also check that a successful reset clears the email field on cancel,
  // so subsequent opens start fresh.

  describe('handleForgotPassword modal', () => {
    function openForgot(utils) {
      fireEvent.press(utils.getByText('Forgot Password'));
    }

    it('opens the forgot password modal', () => {
      const utils = render(<LoginScreen />);
      openForgot(utils);

      expect(utils.getByText('Reset Password')).toBeTruthy();
      expect(utils.getByText('Send Reset Email')).toBeTruthy();
    });

    it('shows alert when the email field is empty', () => {
      const utils = render(<LoginScreen />);
      openForgot(utils);

      fireEvent.press(utils.getByText('Send Reset Email'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter your email address.'
      );
    });

    it('calls resetPassword() and shows success alert on valid email', async () => {
      mockResetPassword.mockResolvedValueOnce();
      const utils = render(<LoginScreen />);
      openForgot(utils);

      // The forgot modal has its own email input (separate from the login card)
      // We get all email inputs and use the last one (inside the modal)
      const emailInputs = utils.getAllByPlaceholderText('your@email.com');
      fireEvent.changeText(emailInputs[emailInputs.length - 1], 'user@test.com');

      fireEvent.press(utils.getByText('Send Reset Email'));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('user@test.com');
        expect(Alert.alert).toHaveBeenCalledWith('Email Sent', expect.any(String));
      });
    });

    it('clears the email field when Cancel is pressed', () => {
      const utils = render(<LoginScreen />);
      openForgot(utils);

      const emailInputs = utils.getAllByPlaceholderText('your@email.com');
      fireEvent.changeText(emailInputs[emailInputs.length - 1], 'user@test.com');

      fireEvent.press(utils.getByText('Cancel'));

      // Reopen and verify field is empty
      openForgot(utils);
      const newEmailInputs = utils.getAllByPlaceholderText('your@email.com');
      expect(newEmailInputs[newEmailInputs.length - 1].props.value).toBe('');
    });
  });

  // ── 6. SNAPSHOT TEST ──────────────────────────────────────────────────────
  //
  // WHY: Snapshots capture the full rendered output. If someone accidentally
  // removes a field, changes the button text, or breaks the layout, the
  // snapshot diff will catch it immediately. The first run auto-creates the
  // snapshot file; every future run compares against it.
  // To intentionally update the snapshot: npx jest --updateSnapshot

  describe('Snapshot', () => {
    it('matches the initial login screen snapshot', () => {
      const { toJSON } = render(<LoginScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
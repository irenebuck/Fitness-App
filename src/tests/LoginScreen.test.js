/*
UNIT TESTS
Lines 1 - 202

The LoginScreen.js is a React Native component — a JavaScript function that
returns the visual UI for the login screen (the email input, password input,
buttons, modals, etc). The logic cannot be imported to this file; component
logic is tested separately.
The logic below is identical to what runs inside the LoginScreen.js screen,
we are testing it in isolation away from all the React Native visual code
and without rendering.
*/

// Mirrors the validation block inside handleLogin on lines 50-53 of LoginScreen.js
function validateLogin(email, password) {
  if (!email?.trim() || !password?.trim()) {
    return 'Please enter your email and password.';
  }
  return null; // null means no error found
}

// Tests for validateLogin — checks that the login form catches empty or whitespace-only fields before attempting a Firebase login call
describe('validateLogin', () => {
  test('returns error when both fields are empty', () => {
    expect(validateLogin('', ''))
      .toBe('Please enter your email and password.');
  });

  test('returns error when email is empty', () => {
    expect(validateLogin('', 'password123'))
      .toBe('Please enter your email and password.');
  });

  test('returns error when password is empty', () => {
    expect(validateLogin('user@test.com', ''))
      .toBe('Please enter your email and password.');
  });

  test('returns error when fields are only spaces', () => {
    expect(validateLogin('   ', '   '))
      .toBe('Please enter your email and password.');
  });

  test('returns error when email is null', () => {
    expect(validateLogin(null, 'password123'))
      .toBe('Please enter your email and password.');
  });

  test('returns error when password is null', () => {
    expect(validateLogin('user@test.com', null))
      .toBe('Please enter your email and password.');
  });

  // Happy path test - proves good inputs get through
  test('returns null when both fields are filled', () => {
    expect(validateLogin('user@test.com', 'password123'))
      .toBeNull();
  });
});

// Mirrors the validation block inside handleSignup on lines 71-94 of LoginScreen.js
function validateSignup(signupname, signupemail, signuppassword, signupconfirm) {
  if (!signupname?.trim() || !signupemail?.trim() || !signuppassword || !signupconfirm) {
    return 'Please fill in all fields.';
  }
  if (signuppassword !== signupconfirm) {
    return 'Passwords do not match.';
  }
  if (signuppassword.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

// Tests for validateSignup — checks that the signup form enforces all required fields, matching passwords, and the minimum password length before calling Firebase
describe('validateSignup', () => {
  test('returns error when all fields are empty', () => {
    expect(validateSignup('', '', '', ''))
      .toBe('Please fill in all fields.');
  });

  test('returns error when name is missing', () => {
    expect(validateSignup('', 'user@test.com', 'password123', 'password123'))
      .toBe('Please fill in all fields.');
  });

  test('returns error when email is missing', () => {
    expect(validateSignup('Jane', '', 'password123', 'password123'))
      .toBe('Please fill in all fields.');
  });

  test('returns error when passwords do not match', () => {
    expect(validateSignup('Jane', 'user@test.com', 'password123', 'different'))
      .toBe('Passwords do not match.');
  });

  test('returns error when password is shorter than 6 characters', () => {
    expect(validateSignup('Jane', 'user@test.com', 'abc', 'abc'))
      .toBe('Password must be at least 6 characters.');
  });

  test('returns error when all fields are null', () => {
    expect(validateSignup(null, null, null, null))
      .toBe('Please fill in all fields.');
  });

  test('returns error when email is null', () => {
    expect(validateSignup('Jane', null, 'password123', 'password123'))
      .toBe('Please fill in all fields.');
  });

  test('returns error when password is null', () => {
    expect(validateSignup('Jane', 'user@test.com', null, null))
      .toBe('Please fill in all fields.');
  });

  test('returns null when all fields are valid', () => {
    expect(validateSignup('Jane', 'user@test.com', 'password123', 'password123'))
      .toBeNull();
  });
});

// Mirrors the validation block inside handleForgotPassword on lines 111-117 of LoginScreen.js
function validateForgotPassword(email) {
  if (!email?.trim()) {
    return 'Please enter your email address.';
  }
  return null;
}

// Tests for validateForgotPassword — checks that the reset password form requires an email address before sending a Firebase reset email
describe('validateForgotPassword', () => {
  test('returns error when email is empty', () => {
    expect(validateForgotPassword(''))
      .toBe('Please enter your email address.');
  });

  test('returns error when email is only spaces', () => {
    expect(validateForgotPassword('   '))
      .toBe('Please enter your email address.');
  });

  test('returns error when email is null', () => {
    expect(validateForgotPassword(null))
      .toBe('Please enter your email address.');
  });

  test('returns null when email is provided', () => {
    expect(validateForgotPassword('user@test.com'))
      .toBeNull();
  });
});

// friendlyError tests matching the error codes returned by Firebase Authentication in lines 140-155 of LoginScreen.js
function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
        return 'Password or Email Incorrect. Please Try Again';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Tests for friendlyError — verifies that every Firebase error code maps to the correct human-readable message shown to the user via Alert
describe('friendlyError', () => {
  test('invalid credential', () => {
    expect(friendlyError('auth/invalid-credential'))
      .toBe('Password or Email Incorrect. Please Try Again');
  });

  test('email already in use', () => {
    expect(friendlyError('auth/email-already-in-use'))
      .toBe('An account with this email already exists.');
  });

  test('invalid email', () => {
    expect(friendlyError('auth/invalid-email'))
      .toBe('Please enter a valid email address.');
  });

  test('weak password', () => {
    expect(friendlyError('auth/weak-password'))
      .toBe('Password must be at least 6 characters.');
  });

  test('too many requests', () => {
    expect(friendlyError('auth/too-many-requests'))
      .toBe('Too many attempts. Please try again later.');
  });

  test('unknown error code returns fallback message', () => {
    expect(friendlyError('auth/something-unknown'))
      .toBe('Something went wrong. Please try again.');
  });
});

/* 
COMPONENT TESTS
Lines 211 - 380

Render the LoginScreen.js component and simulate user interactions to verify that the 
correct functions are called and the correct alerts are shown.
*/
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../screens/LoginScreen';

// ─── MOCKS & SPIES ─────────────────────────────────────────────────────────────
// Fake version of useAuth that just gives us mock functions we can check if they were called
const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockResetPassword = jest.fn();

// Mocks the AuthContext to return our fake useAuth with mock functions
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    resetPassword: mockResetPassword,
  }),
}));

// SafeAreaView needs real device hardware to calculate screen boundaries.
// In tests there is no device, so we replace it with a fragment (<>...</>)
// which just renders whatever is inside it — satisfying React's one-return rule
// without adding any visible element or requiring hardware.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }) => (
    <>{children}</>
  ),
}));

// Spy on alert so we can check if it was called without a real popup appearing
jest.spyOn(Alert, 'alert');

// ─── SETUP ───────────────────────────────────────────────────────────────────

// Clear all mock history before each test so tests don't bleed into each other
beforeEach(() => {
  jest.clearAllMocks();
});

// ─── TESTS ───────────────────────────────────────────────────────────────────

test('renders the logo section', () => {
  const { getByText } = render(<LoginScreen />);
  // Check that key elements are on screen in Logo rendering, lines 167, 169-170
  expect(getByText('💪')).toBeTruthy();                         
  expect(getByText("Let's Go!")).toBeTruthy();                  
  expect(getByText('Community Fitness Challenges')).toBeTruthy();
});

test('renders the login form', () => {
  const { getByPlaceholderText, getByText } = render(<LoginScreen />);

  // Checks elements are on the screen in Login Card rendering
  expect(getByText('Sign In')).toBeTruthy();                      // line 175
  expect(getByText('Email')).toBeTruthy();                        // line 177
  expect(getByPlaceholderText('your@email.com')).toBeTruthy();    // line 180
  expect(getByText('Password')).toBeTruthy();                     // line 192
  expect(getByPlaceholderText('Password')).toBeTruthy();          // line 195 
  expect(getByText('Log In')).toBeTruthy();                       // line 216  
  expect(getByText('Create Account')).toBeTruthy();               // line 222 
  expect(getByText('Forgot Password')).toBeTruthy();              // line 225 
});

test('renders all fields in the create account modal', () => {
  const { getByText, getByPlaceholderText, getAllByText, getAllByPlaceholderText } = render(<LoginScreen />);

  // Open the modal
  fireEvent.press(getByText('Create Account'));                   // line 222

  // Check all modal contents, lines 236-300
  expect(getByText('Full Name')).toBeTruthy();                    // line 238
  expect(getByPlaceholderText('Your name')).toBeTruthy();         // line 241
  // 'Email' and 'your@email.com' also exist on the login form behind the modal
  // so we use getAllBy instead of getBy to handle multiple matches
  expect(getAllByText('Email').length).toBeGreaterThan(0);
  expect(getAllByPlaceholderText('your@email.com').length).toBeGreaterThan(0);
  expect(getAllByText('Password').length).toBeGreaterThan(0);
  expect(getByPlaceholderText('Min. 6 characters')).toBeTruthy();  // line 261
  expect(getByText('Confirm Password')).toBeTruthy();              // line 267
  expect(getByPlaceholderText('Confirm password')).toBeTruthy();   // line 270
  expect(getByText('Cancel')).toBeTruthy();                        // line 300
});

test('renders all fields in the forgot password modal', () => {
  const { getByText, getAllByText, getAllByPlaceholderText } = render(<LoginScreen />);

  // Open the modal
  fireEvent.press(getByText('Forgot Password'));                    // line 225

  // Check all modal contents
  expect(getByText('Reset Password')).toBeTruthy();                 // line 311
  expect(getByText('Enter your email and we will send you instructions to reset your password.')).toBeTruthy(); 
  // 'Email' and 'your@email.com' also exist on the login form behind the modal
  expect(getAllByText('Email').length).toBeGreaterThan(0);          // line 315
  expect(getAllByPlaceholderText('your@email.com').length).toBeGreaterThan(0);
  expect(getByText('Send Reset Email')).toBeTruthy();               // line 334
  expect(getByText('Cancel')).toBeTruthy();                         // line 344
});

test('shows an error when logging in with empty fields', () => {
  const { getByText } = render(<LoginScreen />);

  // Simulates a finger tap on the Log In button, nothing is typed in the fields, line 216
  fireEvent.press(getByText('Log In'));

  // Alert.alert should have been called with these two args/message, lines 50-53
  expect(Alert.alert).toHaveBeenCalledWith(
    'Error',
    'Please enter your email and password.'
  );
});

test('calls login() with email and password when form is filled', async () => {
  mockLogin.mockResolvedValueOnce(); // Simulate a successful login (no error thrown)

  const { getByPlaceholderText, getByText } = render(<LoginScreen />);

  // Type into the email field,  line 180
  fireEvent.changeText(getByPlaceholderText('your@email.com'), 'user@test.com');
  // Type into the password field, line 195
  fireEvent.changeText(getByPlaceholderText('Password'), 'mypassword');
  // Tap Log In, line 216
  fireEvent.press(getByText('Log In'));

  // login() is async, so we wait for it to be called
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'mypassword');
  });
});

test('opens the signup modal when Create Account is tapped', () => {
  const { getByText, getAllByText, getByPlaceholderText } = render(<LoginScreen />);

  fireEvent.press(getByText('Create Account'));

  // After tapping, the modal title should now be visible, line 236, 241
  expect(getAllByText('Create Account')[1]).toBeTruthy();
  expect(getByPlaceholderText('Your name')).toBeTruthy();
});

test('opens the forgot password modal when Forgot Password is tapped', () => {
  const { getByText, getByPlaceholderText } = render(<LoginScreen />);

  fireEvent.press(getByText('Forgot Password'));

  // After tapping, the modal title should now be visible, line 312, 328
  expect(getByText('Reset Password')).toBeTruthy();
  expect(getByText('Send Reset Email')).toBeTruthy();
});

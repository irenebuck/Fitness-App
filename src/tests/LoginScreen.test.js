/*
UNIT TESTS FOR LOGINSCREEN.JS

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
  if (!email.trim() || !password.trim()) {
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

  // Happy path test - proves good inputs get through
  test('returns null when both fields are filled', () => {
    expect(validateLogin('user@test.com', 'password123'))
      .toBeNull();
  });
});

// Mirrors the validation block inside handleSignup on lines 67-78 of LoginScreen.js
function validateSignup(signupname, signupemail, signuppassword, signupconfirm) {
  if (!signupname.trim() || !signupemail.trim() || !signuppassword || !signupconfirm) {
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

  test('returns null when all fields are valid', () => {
    expect(validateSignup('Jane', 'user@test.com', 'password123', 'password123'))
      .toBeNull();
  });
});

// Mirrors the validation block inside handleForgotPassword on lines 90-93 of LoginScreen.js
function validateForgotPassword(email) {
  if (!email.trim()) {
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

  test('returns null when email is provided', () => {
    expect(validateForgotPassword('user@test.com'))
      .toBeNull();
  });
});

// friendlyError tests matching the error codes returned by Firebase Authentication in lines 108-124 of LoginScreen.js
function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
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
  test('user not found', () => {
    expect(friendlyError('auth/user-not-found'))
      .toBe('No account found with that email.');
  });

  test('wrong password', () => {
    expect(friendlyError('auth/wrong-password'))
      .toBe('Incorrect password. Please try again.');
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
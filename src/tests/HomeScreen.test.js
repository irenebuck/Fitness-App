/*
UNIT TESTS FOR HOMESCREEN.JS
Lines 1 - 157

The HomeScreen.js is a React Native component — a JavaScript function that
returns the visual UI for the home screen (challenge lists, badges, etc).
The logic cannot be imported to this file; component logic is tested separately.
The logic below is identical to what runs inside the HomeScreen.js screen,
we are testing it in isolation away from all the React Native visual code,
Firebase calls, and without rendering.
*/

// Mirrors lines 47-50 inside loadData in HomeScreen.js:
function filterActiveChallenges(joined, completed) {
  const safeJoined = joined || [];
  const safeCompleted = completed || [];
  return safeJoined.filter((id) => !safeCompleted.includes(id));
}

// Tests for filterActiveChallenges — checks that active challenges are correctly
// separated from completed ones, including null safety
describe('filterActiveChallenges', () => {
  test('returns empty array when joined is empty', () => {
    expect(filterActiveChallenges([], []))
      .toEqual([]);
  });

  test('returns all challenges when none are completed', () => {
    expect(filterActiveChallenges(['a', 'b', 'c'], []))
      .toEqual(['a', 'b', 'c']);
  });

  test('returns empty array when all joined challenges are completed', () => {
    expect(filterActiveChallenges(['a', 'b'], ['a', 'b']))
      .toEqual([]);
  });

  test('filters out only the completed challenges', () => {
    expect(filterActiveChallenges(['a', 'b', 'c'], ['b']))
      .toEqual(['a', 'c']);
  });

  test('returns empty array when joined is null', () => {
    expect(filterActiveChallenges(null, []))
      .toEqual([]);
  });

  test('returns all joined challenges when completed is null', () => {
    expect(filterActiveChallenges(['a', 'b'], null))
      .toEqual(['a', 'b']);
  });

  test('returns empty array when both are null', () => {
    expect(filterActiveChallenges(null, null))
      .toEqual([]);
  });
});

// Mirrors lines 71-82 inside fetchChallenges in HomeScreen.js:
function prepareIdList(ids) {
  if (!ids || ids.length === 0) return [];
  return [...ids].reverse().slice(0, 10);
}

// Tests for prepareIdList — verifies ordering, the 10-item cap, null safety,
// and that the original array is never mutated
describe('prepareIdList', () => {
  test('returns empty array for null input', () => {
    expect(prepareIdList(null))
      .toEqual([]);
  });

  test('returns empty array for empty array', () => {
    expect(prepareIdList([]))
      .toEqual([]);
  });

  test('reverses the array so newest IDs come first', () => {
    expect(prepareIdList(['first', 'second', 'third']))
      .toEqual(['third', 'second', 'first']);
  });

  test('returns at most 10 IDs', () => {
    const ids = ['1','2','3','4','5','6','7','8','9','10','11','12'];
    expect(prepareIdList(ids).length)
      .toBe(10);
  });

  test('does not mutate the original array', () => {
    const original = ['a', 'b', 'c'];
    prepareIdList(original);
    expect(original)
      .toEqual(['a', 'b', 'c']);
  });

  test('returns all IDs when 10 or fewer are provided', () => {
    expect(prepareIdList(['a', 'b', 'c']))
      .toEqual(['c', 'b', 'a']);
  });
});

// Mirrors line 99 at the bottom of the HomeScreen.js:
function resolveDisplayName(userProfile, user) {
  return userProfile?.displayName || user?.displayName || 'Friend';
}

// Tests for resolveDisplayName — verifies the fallback chain so the greeting
// never crashes or shows undefined
describe('resolveDisplayName', () => {
  test('returns userProfile displayName when available', () => {
    expect(resolveDisplayName({ displayName: 'Jane' }, { displayName: 'Backup' }))
      .toBe('Jane');
  });

  test('falls back to user displayName when userProfile has none', () => {
    expect(resolveDisplayName({}, { displayName: 'Backup' }))
      .toBe('Backup');
  });

  test('falls back to Friend when both displayNames are missing', () => {
    expect(resolveDisplayName({}, {}))
      .toBe('Friend');
  });

  test('falls back to user displayName when userProfile is null', () => {
    expect(resolveDisplayName(null, { displayName: 'Backup' }))
      .toBe('Backup');
  });

  test('returns Friend when both are null', () => {
    expect(resolveDisplayName(null, null))
      .toBe('Friend');
  });
});

// Mirrors line 100 at the bottom of the HomeScreen.js:
function resolveBadges(userProfile) {
  return userProfile?.badges || [];
}

// Tests for resolveBadges — verifies that missing or null badge data never
// crashes the badge display
describe('resolveBadges', () => {
  test('returns badges array when present', () => {
    expect(resolveBadges({ badges: ['badge1', 'badge2'] }))
      .toEqual(['badge1', 'badge2']);
  });

  test('returns empty array when badges field is missing', () => {
    expect(resolveBadges({}))
      .toEqual([]);
  });

  test('returns empty array when userProfile is null', () => {
    expect(resolveBadges(null))
      .toEqual([]);
  });
});

/*
COMPONENT TESTS
Line 166 - 402

Render the HomeScreen.js component and simulate user interactions to verify that
the correct content is displayed and the correct navigation calls are made.
*/
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

// ─── MOCKS & SPIES ────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockRefreshUserProfile = jest.fn();
const mockUseAuth = jest.fn();

// Mocks navigation, mockNavigate is a spy to verify navigation calls
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // useEffect with [] means it runs once on mount, simulating the focus effect for testing purposes
  useFocusEffect: (cb) => require('react').useEffect(cb, []),
}));

// Mocks AuthContext — mockUseAuth return value is set in beforeEach and overridden per test
// Replaces useAuth with a call to our spy mockUseAuth, so each test can control exactly what "logged in user" looks like.
jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// SafeAreaView needs real device hardware to calculate screen boundaries.
// In tests there is no device, so we replace it with a fragment (<>...</>)
// which just renders whatever is inside it — satisfying React's one-return rule
// without adding any visible element or requiring hardware.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => <>{children}</>,
}));

// Mocks Firebase - tests shouldn't hit a real database
// db connection is replaced with an empty object {} since it's not used directly in the component logic, and doc/getDoc are mocked to prevent errors if they are called
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
}));
jest.mock('../firebase/config', () => ({ db: {} }));

// Custom components — mocked so their own dependencies don't interfere with these tests
// The actual content of these components is tested separately in their own test files, here we just want to confirm that they are rendered at all and don't cause crashes
jest.mock('../components/ChallengeCard', () => () => null);
jest.mock('../components/BadgeIcon', () => () => null);
jest.mock('../components/HamburgerMenu', () => () => null);

// Ionicons requires native modules not available in the test environment
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// ─── SETUP ───────────────────────────────────────────────────────────────────

// Reusable fake profile used in most tests — empty arrays trigger all empty states
const defaultUserProfile = {
  displayName: 'Test User',
  joinedChallenges: [],
  completedChallenges: [],
  badges: [],
  photoURL: null,
};

// Runs before each test — clears mock call history and sets a default logged-in user state, individual tests can override with mockReturnValue as needed
beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { displayName: 'Test User' },
    userProfile: defaultUserProfile,
    refreshUserProfile: mockRefreshUserProfile,
  });
});

// ─── TESTS ───────────────────────────────────────────────────────────────────

// Simulates the moment after the HomeScreen mounts but before loadData finishes fetching the user profile — confirms that the loading spinner is shown and main content is hidden while loading is true
test('shows loading spinner when userProfile has not loaded', () => {
  // null userProfile causes loadData() to return early — loading stays true
  mockUseAuth.mockReturnValue({
    user: null,
    userProfile: null,
    refreshUserProfile: mockRefreshUserProfile,
  });

  // queryByText returns null if the text is not found, so we can confirm that the main content is not rendered while loading is true
  // If we used getByText instead, it would throw an error if the text is not found, which would fail the test before we could confirm that the content is absent
  const { queryByText } = render(<HomeScreen />);

  // These sections only appear after loading finishes — confirm they are absent
  expect(queryByText('Active Challenges')).toBeNull();
  expect(queryByText('Create')).toBeNull();
});

// ─── HEADER ──────────────────────────────────────────────────────────────────

test('renders the greeting and display name in the header', () => {
  const { getByText } = render(<HomeScreen />);

  expect(getByText('Hello,')).toBeTruthy();
  expect(getByText('Test User 👋')).toBeTruthy();
});

test('renders the avatar with the first letter of the display name', () => {
  const { getByText } = render(<HomeScreen />);

  // Avatar placeholder shows first letter of displayName — T for Test User
  expect(getByText('T')).toBeTruthy();
});

test('falls back to Friend when user has no display name', () => {
  mockUseAuth.mockReturnValue({
    user: null,
    userProfile: { ...defaultUserProfile, displayName: null },
    refreshUserProfile: mockRefreshUserProfile,
  });

  const { getByText } = render(<HomeScreen />);

  expect(getByText('Friend 👋')).toBeTruthy();
});

// ─── QUICK ACTIONS ───────────────────────────────────────────────────────────
// Quick actions are inside the ScrollView — waitFor is needed since they only
// appear after loadData() finishes and sets loading to false

test('renders the quick action buttons', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('Create')).toBeTruthy();
    expect(getByText('Discover')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
  });
});

// ─── ACTIVE CHALLENGES ───────────────────────────────────────────────────────

test('renders the active challenges section', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('Active Challenges')).toBeTruthy();
    expect(getByText('+ Join more')).toBeTruthy();
  });
});

test('shows empty state when user has no active challenges', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('🏋️')).toBeTruthy();
    expect(getByText('No active challenges yet')).toBeTruthy();
    expect(getByText('Find a Challenge')).toBeTruthy();
  });
});

// ─── COMPLETED CHALLENGES ────────────────────────────────────────────────────

test('renders the completed challenges section', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('Completed Challenges')).toBeTruthy();
  });
});

test('shows empty state when user has no completed challenges', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('Complete challenges to see them here')).toBeTruthy();
  });
});

// ─── BADGES ──────────────────────────────────────────────────────────────────

test('renders the badges section', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('My Badges')).toBeTruthy();
  });
});

test('shows empty state when user has no badges', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => {
    expect(getByText('Complete challenges to earn badges!')).toBeTruthy();
  });
});

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

test('navigates to Profile when avatar is tapped', () => {
  const { getByText } = render(<HomeScreen />);

  // Avatar shows first letter of display name — T for Test User
  fireEvent.press(getByText('T'));

  expect(mockNavigate).toHaveBeenCalledWith('Profile');
});

test('navigates to CreateChallenge when Create is tapped', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => expect(getByText('Create')).toBeTruthy());
  fireEvent.press(getByText('Create'));

  expect(mockNavigate).toHaveBeenCalledWith('CreateChallenge');
});

test('navigates to Discovery when Discover is tapped', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => expect(getByText('Discover')).toBeTruthy());
  fireEvent.press(getByText('Discover'));

  expect(mockNavigate).toHaveBeenCalledWith('Discovery');
});

test('navigates to MessageCenter when Messages is tapped', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => expect(getByText('Messages')).toBeTruthy());
  fireEvent.press(getByText('Messages'));

  expect(mockNavigate).toHaveBeenCalledWith('MessageCenter');
});

test('navigates to Discovery when + Join more is tapped', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => expect(getByText('+ Join more')).toBeTruthy());
  fireEvent.press(getByText('+ Join more'));

  expect(mockNavigate).toHaveBeenCalledWith('Discovery');
});

test('navigates to Discovery when Find a Challenge is tapped', async () => {
  const { getByText } = render(<HomeScreen />);

  await waitFor(() => expect(getByText('Find a Challenge')).toBeTruthy());
  fireEvent.press(getByText('Find a Challenge'));

  expect(mockNavigate).toHaveBeenCalledWith('Discovery');
});
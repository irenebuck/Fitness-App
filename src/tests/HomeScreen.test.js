/**
 * HomeScreen Tests
 *
 * WHAT WE TEST:
 *  1. Render — loading state, greeting fallbacks, section headers
 *  2. fetchChallenges logic — cap at 10, skip missing docs, separate active/completed
 *  3. Navigation — every quick-action and empty-state button goes to the right screen
 *  4. Badges — empty state vs. badge icons rendered
 *  5. Snapshot — baseline for visual regressions
 *
 * HOW MOCKING WORKS HERE:
 *  - useAuth is mocked with a mutable variable (mockUserProfile). Each test sets
 *    it to whatever state it needs before rendering.
 *  - useFocusEffect is mocked to call its callback immediately and synchronously.
 *    In the real app it fires when the screen comes into focus; in tests there
 *    is no navigation stack, so we simulate the "just focused" event on mount.
 *  - getDoc (Firebase) is a jest.fn() we control per test — no network needed.
 *  - Child components (ChallengeCard, BadgeIcon, HamburgerMenu) are mocked to
 *    render a minimal, testable UI so we can count instances and simulate presses.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // Call the effect callback immediately so loadData() runs during render
  useFocusEffect: (cb) => { cb(); },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock child components with something that's easy to query and interact with
jest.mock('../components/ChallengeCard', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockChallengeCard({ challenge, onPress }) {
    return (
      <TouchableOpacity
        testID={`challenge-card-${challenge.id}`}
        onPress={onPress}
      >
        <Text>{challenge.title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../components/BadgeIcon', () => {
  const { Text } = require('react-native');
  return function MockBadgeIcon({ type }) {
    return <Text testID={`badge-${type}`}>{type}</Text>;
  };
});

jest.mock('../components/HamburgerMenu', () => {
  return function MockHamburgerMenu() {
    return null;
  };
});

jest.mock('../theme', () => ({
  COLORS: {
    primary: '#007AFF',
    white: '#FFFFFF',
    background: '#F2F2F7',
    textPrimary: '#1C1C1E',
    textSecondary: '#6C6C70',
    border: '#C6C6C8',
    lightBlue: '#E8F4FD',
  },
  SPACING: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 },
  SIZES: { xsmall: 10, small: 12, medium: 14, large: 16, xlarge: 20, xxxlarge: 32 },
  RADIUS: { sm: 8, md: 12, lg: 20 },
  SHADOW: { small: {}, medium: {} },
}));

// ─── Firebase mocks ───────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, _collection, id) => ({ id })),
  getDoc: (...args) => mockGetDoc(...args),
}));

jest.mock('../firebase/config', () => ({ db: {} }));

// ─── Auth mock (mutable so each test can set the profile it needs) ────────────

const mockRefreshUserProfile = jest.fn();
let mockUserProfile = null;
let mockUser = { displayName: 'Test User' };

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    userProfile: mockUserProfile,
    refreshUserProfile: mockRefreshUserProfile,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Creates a fake successful Firestore document snapshot
function makeDoc(id, title = `Challenge ${id}`) {
  return {
    exists: () => true,
    id,
    data: () => ({ title, description: 'A test challenge' }),
  };
}

// Creates a fake "document not found" snapshot
function missingDoc() {
  return { exists: () => false };
}

// A profile with no challenges or badges — the baseline empty state
function emptyProfile(name = 'Jane') {
  return {
    displayName: name,
    joinedChallenges: [],
    completedChallenges: [],
    badges: [],
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { displayName: 'Test User' };
    mockUserProfile = null;
  });

  // ── 1. RENDER TESTS ────────────────────────────────────────────────────────
  //
  // WHY: These verify the two very different states the screen can be in:
  //   a) Loading — userProfile hasn't arrived from Firebase yet
  //   b) Loaded — profile is ready and content renders
  // A bug that makes loading never resolve, or renders the wrong name,
  // would be caught here before any behavior tests run.

  describe('Rendering', () => {
    it('shows a loading spinner while userProfile is null', () => {
      // userProfile is null → loadData() returns early → loading stays true
      const { UNSAFE_getByType } = render(<HomeScreen />);
      const { ActivityIndicator } = require('react-native');

      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('shows the greeting with displayName from userProfile', async () => {
      mockUserProfile = emptyProfile('Jane');
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => expect(getByText('Jane 👋')).toBeTruthy());
    });

    it('falls back to user.displayName when userProfile has no displayName', async () => {
      mockUserProfile = { ...emptyProfile(), displayName: undefined };
      mockUser = { displayName: 'Fallback Name' };

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => expect(getByText('Fallback Name 👋')).toBeTruthy());
    });

    it('falls back to "Friend" when neither profile nor user has a displayName', async () => {
      mockUserProfile = { ...emptyProfile(), displayName: undefined };
      mockUser = {};

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => expect(getByText('Friend 👋')).toBeTruthy());
    });

    it('renders the three quick action buttons after loading', async () => {
      mockUserProfile = emptyProfile();
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Create')).toBeTruthy();
        expect(getByText('Discover')).toBeTruthy();
        expect(getByText('Messages')).toBeTruthy();
      });
    });

    it('shows section headers for Active Challenges and Completed Challenges', async () => {
      mockUserProfile = emptyProfile();
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Active Challenges')).toBeTruthy();
        expect(getByText('Completed Challenges')).toBeTruthy();
        expect(getByText('My Badges')).toBeTruthy();
      });
    });
  });

  // ── 2. UNIT TESTS: fetchChallenges behavior ────────────────────────────────
  //
  // WHY: fetchChallenges() is the most logic-heavy part of this screen.
  // We can't import it directly (it's inside the component), so we test it
  // by setting up userProfile in specific ways and asserting what renders
  // or how many times getDoc was called.
  //
  // Tests here protect against:
  //   - N+1 Firebase queries (we have a hard cap of 10)
  //   - Crashes when a challenge document has been deleted
  //   - A completed challenge showing up as still-active
  //   - Newest challenges appearing first (reverse order)

  describe('fetchChallenges logic', () => {
    it('shows the empty-state card when user has no joined challenges', async () => {
      mockUserProfile = emptyProfile();
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('No active challenges yet')).toBeTruthy();
      });
      // getDoc should never have been called — no IDs to fetch
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('renders a ChallengeCard for each active challenge', async () => {
      mockUserProfile = {
        ...emptyProfile(),
        joinedChallenges: ['ch1', 'ch2'],
        completedChallenges: [],
      };
      mockGetDoc.mockResolvedValue(makeDoc('ch1'));

      const { getAllByTestId } = render(<HomeScreen />);

      await waitFor(() => {
        // Both ch1 and ch2 are active; each gets a card
        const cards = getAllByTestId(/^challenge-card-/);
        expect(cards.length).toBe(2);
      });
    });

    it('never calls getDoc more than 10 times even when user has 15+ challenges', async () => {
      // WHY: fetchChallenges slices the ID list to 10 before fetching.
      // This test ensures that slice is actually working, not silently removed.
      const ids = Array.from({ length: 15 }, (_, i) => `ch${i}`);
      mockUserProfile = {
        ...emptyProfile(),
        joinedChallenges: ids,
        completedChallenges: [],
      };
      mockGetDoc.mockResolvedValue(makeDoc('ch0'));

      render(<HomeScreen />);

      await waitFor(() => {
        // At most 10 active + at most 10 completed = 20 max, but active slice = 10
        expect(mockGetDoc.mock.calls.length).toBeLessThanOrEqual(10);
      });
    });

    it('silently skips a challenge whose Firestore document does not exist', async () => {
      // WHY: Docs can be deleted while a user still has the ID. The app should
      // not crash or show a broken card — it should just skip that ID.
      mockUserProfile = {
        ...emptyProfile(),
        joinedChallenges: ['ghost-id'],
        completedChallenges: [],
      };
      mockGetDoc.mockResolvedValueOnce(missingDoc());

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        // The ghost doc was skipped, so active list is empty
        expect(getByText('No active challenges yet')).toBeTruthy();
      });
    });

    it('separates active and completed challenges correctly', async () => {
      // ch1 is both joined and completed → should appear only in Completed section
      // ch2 is joined but not completed → should appear in Active section
      mockUserProfile = {
        ...emptyProfile(),
        joinedChallenges: ['ch1', 'ch2'],
        completedChallenges: ['ch1'],
      };
      mockGetDoc.mockResolvedValue(makeDoc('ch0')); // both docs will resolve

      render(<HomeScreen />);

      await waitFor(() => {
        // getDoc called exactly twice: once for ch2 (active), once for ch1 (completed)
        expect(mockGetDoc).toHaveBeenCalledTimes(2);
      });
    });

    it('fetches challenges in reverse order (newest first)', async () => {
      mockUserProfile = {
        ...emptyProfile(),
        joinedChallenges: ['oldest', 'middle', 'newest'],
        completedChallenges: [],
      };
      mockGetDoc.mockResolvedValue(makeDoc('newest'));

      render(<HomeScreen />);

      await waitFor(() => {
        // First getDoc call should be for 'newest' (array reversed before slice)
        const firstCallArg = mockGetDoc.mock.calls[0][0];
        expect(firstCallArg.id).toBe('newest');
      });
    });
  });

  // ── 3. INTEGRATION TESTS: Navigation ──────────────────────────────────────
  //
  // WHY: Every button on this screen navigates somewhere. If a screen name is
  // typo'd ('Discovry' instead of 'Discovery'), the test catches it before
  // a user does. We test both the quick-action buttons and the empty-state CTA.

  describe('Navigation', () => {
    beforeEach(() => {
      mockUserProfile = emptyProfile();
    });

    it('navigates to CreateChallenge when Create button is pressed', async () => {
      const { getByText } = render(<HomeScreen />);
      await waitFor(() => getByText('Create'));

      fireEvent.press(getByText('Create'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateChallenge');
    });

    it('navigates to Discovery when Discover button is pressed', async () => {
      const { getByText } = render(<HomeScreen />);
      await waitFor(() => getByText('Discover'));

      fireEvent.press(getByText('Discover'));

      expect(mockNavigate).toHaveBeenCalledWith('Discovery');
    });

    it('navigates to MessageCenter when Messages button is pressed', async () => {
      const { getByText } = render(<HomeScreen />);
      await waitFor(() => getByText('Messages'));

      fireEvent.press(getByText('Messages'));

      expect(mockNavigate).toHaveBeenCalledWith('MessageCenter');
    });

    it('navigates to Discovery when "Find a Challenge" CTA is pressed in empty state', async () => {
      const { getByText } = render(<HomeScreen />);
      await waitFor(() => getByText('Find a Challenge'));

      fireEvent.press(getByText('Find a Challenge'));

      expect(mockNavigate).toHaveBeenCalledWith('Discovery');
    });

    it('navigates to ActiveChallenge with the correct challengeId when a card is pressed', async () => {
      mockUserProfile = {
        ...emptyProfile(),
        joinedChallenges: ['ch42'],
        completedChallenges: [],
      };
      mockGetDoc.mockResolvedValueOnce(makeDoc('ch42'));

      const { getByTestId } = render(<HomeScreen />);
      await waitFor(() => getByTestId('challenge-card-ch42'));

      fireEvent.press(getByTestId('challenge-card-ch42'));

      expect(mockNavigate).toHaveBeenCalledWith('ActiveChallenge', {
        challengeId: 'ch42',
      });
    });
  });

  // ── 4. INTEGRATION TESTS: Badges section ──────────────────────────────────
  //
  // WHY: Badges are earned over time and purely display-only. We test both
  // the zero state (encouragement text) and the populated state (correct
  // number of BadgeIcon components rendered).

  describe('Badges section', () => {
    it('shows encouragement text when user has no badges', async () => {
      mockUserProfile = emptyProfile();
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Complete challenges to earn badges!')).toBeTruthy();
      });
    });

    it('renders one BadgeIcon per badge earned', async () => {
      mockUserProfile = {
        ...emptyProfile(),
        badges: ['first_challenge', 'streak_7', 'top_finisher'],
      };
      const { getByTestId } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('badge-first_challenge')).toBeTruthy();
        expect(getByTestId('badge-streak_7')).toBeTruthy();
        expect(getByTestId('badge-top_finisher')).toBeTruthy();
      });
    });
  });

  // ── 5. SNAPSHOT TEST ──────────────────────────────────────────────────────
  //
  // WHY: Same reasoning as LoginScreen — captures the fully-loaded empty state
  // as a baseline. Useful for catching accidental layout changes when refactoring.

  describe('Snapshot', () => {
    it('matches the empty-state snapshot after loading', async () => {
      mockUserProfile = emptyProfile('Jane');
      const { toJSON } = render(<HomeScreen />);

      // Wait for the async loadData() to complete before snapshotting
      await waitFor(() => {});

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
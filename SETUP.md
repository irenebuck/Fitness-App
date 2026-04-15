# Let's Go! - Setup Guide

## Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS or Android) for testing

## 1. Install Dependencies

```bash
npm install
```

## 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication** → Sign-in providers → Email/Password
   - **Firestore Database** → Start in production mode
   - **Storage** → Start in production mode

4. Register a **Web App** in your Firebase project:
   - Project Settings → General → Your apps → Add app → Web
   - Copy the `firebaseConfig` values

5. Edit `src/firebase/config.js` and replace placeholder values:
   ```js
   const firebaseConfig = {
     apiKey: 'your-actual-api-key',
     authDomain: 'your-project.firebaseapp.com',
     projectId: 'your-project-id',
     storageBucket: 'your-project.appspot.com',
     messagingSenderId: '123456789',
     appId: '1:123:web:abc123',
   };
   ```

6. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
   Or paste the rules from `firestore.rules` into the Firebase Console → Firestore → Rules tab.

7. Create Firestore indexes (required for Discovery screen):
   - Collection: `challenges`
   - Fields: `isPublic ASC`, `status ASC`, `participantCount DESC`
   - Fields: `isPublic ASC`, `status ASC`, `tags ASC`, `participantCount DESC`

   You can create these in Firebase Console → Firestore → Indexes, or the app will print index creation URLs in the console on first load.

## 3. Run the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with the **Expo Go** app on your phone

## Project Structure

```
src/
  firebase/config.js     # Firebase credentials (fill in yours)
  context/AuthContext.js # Auth state management
  navigation/            # App routing
  screens/               # All app screens
    LoginScreen.js        - Login/signup/forgot password
    HomeScreen.js         - Dashboard with active/completed challenges
    CreateChallengeScreen.js - Create a new fitness challenge
    DiscoveryScreen.js    - Browse/search challenges by tag
    ChallengeDetailScreen.js - Challenge info + join button
    ActiveChallengeScreen.js - Check-in, goal tracking, real-time chat
    CompletedChallengeScreen.js - Wall of Fame, badges, stats
    MessageCenterScreen.js - Inbox for chat replies
    ProfileScreen.js      - Avatar, name, privacy settings
  components/
    ChallengeCard.js      # Reusable challenge list item
    BadgeIcon.js          # Badge display component
    ChatMessage.js        # Chat message with reply support
    HamburgerMenu.js      # Navigation hamburger menu
  theme.js               # Colors, spacing, typography constants
```

## Firestore Data Model

### `users/{uid}`
```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "photoURL": "string | null",
  "joinedChallenges": ["challengeId"],
  "completedChallenges": ["challengeId"],
  "badges": ["completion", "beast", ...],
  "favorites": ["challengeId"],
  "completedGoals": { "challengeId": [0, 1, 2] },
  "allowReplies": true,
  "showOnline": true
}
```

### `challenges/{id}`
```json
{
  "title": "string",
  "type": "string",
  "typeEmoji": "string",
  "description": "string",
  "startDate": "MM/DD/YYYY",
  "endDate": "MM/DD/YYYY",
  "checkInGoal": 3,
  "tags": ["running", "outdoor"],
  "goals": ["Run 1 mile", "Run 3 miles"],
  "badgeId": "completion",
  "isPublic": true,
  "imageURL": "string | null",
  "creatorId": "string",
  "participants": ["uid1", "uid2"],
  "participantCount": 2,
  "checkIns": { "uid1": 5, "uid2": 3 },
  "wallOfFame": [{ "uid": "string", "name": "string" }],
  "status": "active | completed",
  "favoriteCount": 0
}
```

### `messages/{id}`
```json
{
  "challengeId": "string",
  "userId": "string",
  "userDisplayName": "string",
  "userPhotoURL": "string | null",
  "text": "string",
  "imageURL": "string | null",
  "timestamp": "Firestore Timestamp",
  "replies": [{ "id": "string", "userId": "string", "userDisplayName": "string", "text": "string", "timestamp": "ISO string" }]
}
```

## Team Member Responsibilities (from Project Plan)

| Member | Area |
|--------|------|
| Irene Buck | Authentication, Navigation & Home |
| Alon Greenberg | Challenge Creation & Check-In |
| Matthew Kho | Challenge Discovery & Join |
| Kevin Penate | Real-time Chat |

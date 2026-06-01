# Let's Go! Fitness App

A cross-platform mobile fitness challenge app built with React Native and Expo for the CS467 Capstone Project at Oregon State University. Users can create and join fitness challenges, track progress, message other participants, and earn badges upon completion. 

This app was built following the project specification outlined [here](https://eecs.engineering.oregonstate.edu/capstone/submission/pages/viewSingleProject.php?id=wCYyeJ68VbLa8w13). The [initial build](https://github.com/irenebuck/Fitness-App/commit/2594aa90585b16dfb4b262adb7be19cf28c33361) was scaffolded with the assistance of Claude Code by Anthropic on April 14, 2026.


## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React Native** | JavaScript framework for building iOS and Android apps from a single codebase |
| **Expo** | Toolchain that simplifies development, testing, and deployment without needing Xcode or Android Studio |
| **JavaScript (ES6+)** | Primary programming language used throughout the app |
| **React Navigation** | Handles all screen routing (stack-based — screens push and pop like browser history) |

### Backend & Database

| Technology | Purpose |
|---|---|
| **Firebase Authentication** | Manages user sign-up, login, and session handling |
| **Cloud Firestore** | NoSQL cloud database; stores users, challenges, messages, and badges as real-time document collections |
| **Firebase Storage** | Stores user-uploaded files such as profile photos |


## Prerequisites

Before running the app, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
  ```bash
  npm install -g expo-cli
  ```
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)), or an Android/iOS emulator. Android Studio is required to use the Android emulator on a Windows desktop. 

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/irenebuck/Fitness-App.git
cd Fitness-App
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Firebase
You will need your own Firebase project. To set one up:
1. Go to the [Firebase Console](https://console.firebase.google.com/) with a Google account and create a new project. Name it, and skip Gemini and Google Analytics.

2. Click **+ Add app** → select **</>** (Web). Name it, skip Firebase Hosting, and click **Register App**.

3. Select **Use npm**, copy the `firebaseConfig` object shown in the setup code, and click **Continue to Console**.

4. On the left side sidebar, hover over **Security** and click on **Authentication**. Enable **Email/Password** and save.

5. On the left sidebar menu, hover over **Databases & Storage**, and click on **Firestore**. Click **Create Database**, select Standard edition, `nam5` Location, start in test mode, and click **Create**. 

6. *(Optional)* On the left sidebar menu, hover over **Databases & Storage**, and click on **Storage** if you plan to use profile photo uploads. Note: the free Spark plan does not support image/video uploads — a billing profile is required to test that feature.

7. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
   Or paste the rules from `firestore.rules` into the Firebase Console → Firestore → Rules tab.

8. Create Firestore indexes (required for Discovery screen):
   - Collection: `challenges`
   - Fields: `isPublic ASC`, `status ASC`, `participantCount DESC`
   - Fields: `isPublic ASC`, `status ASC`, `tags ASC`, `participantCount DESC`

   You can create these in Firebase Console → Firestore → Indexes, or the app will print index creation URLs in the console on first load.

### 4. Create .env
Create a `.env` file in the project root by copying the provided example:
```bash
cp .env.example .env
```
Then open `.env` and fill in your Firebase values. Use the values from the `firebaseConfig` object you copied in step 3 above:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```
If you plan to push this project to GitHub, add your .env file to your .gitignore file:
```
# dotenv environment variable files
.env
.env.*
!.env.example
```

### 5. Run the app
```bash
npx expo start
```
A QR code and command list will appear in your terminal. You have many options, including:
| Option | Command |
|---|---|
| Web browser | Press `w` |
| Mobile device (Expo Go) | Scan the QR code |
| iOS simulator (Mac only) | Press `i` |
| Android emulator (requires Android Studio) | Press `a` — open a virtual device first | 

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
  "goals": ["Run 1 mile", "Run 3 miles", "Run 5 miles"],
  "badgeId": "completion",
  "isPublic": true,
  "imageURL": "string | null",
  "creatorId": "string",
  "creatorName": "string",
  "participants": ["uid1", "uid2"],
  "participantCount": 2,
  "checkIns": { "uid1": 5, "uid2": 3 },
  "wallOfFame": [{ "uid": "string", "name": "string" }],
  "status": "active | completed",
  "favoriteCount": 0,
  "createdAt": "ISO string"
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

## Screens

| Screen | Description |
|---|---|
| Login | Sign in or create an account |
| Home | Dashboard with your active challenges |
| Discovery | Browse and join public challenges |
| Create Challenge | Set up a new fitness challenge |
| Challenge Detail | View challenge info and join |
| Active Challenge | Track progress on a current challenge |
| Completed Challenge | View a summary after finishing |
| Message Center | Chat with challenge participants |
| Profile | View and edit your profile |

## Project Structure

```
Fitness-App/
├── assets/             # Reusable images and icons
├── src/
│   ├── components/     # Reusable cards, hamburger menu, etc.
│   ├── context/        # Firebase Auth and database user state
│   ├── navigation/     # Screen routing (AppNavigator)
│   ├── screens/        # One file per screen, see list above
│   ├── tests/          # Home and Login Screen tests
│   └── theme.js        # Shared colors and styles
├── app.json            # Expo app configuration
├── babel.config.js     # Babel configuration
├── firestore.rules     # Firestore security rules
└── package.json        # Dependencies and scripts
```

## Team

- [Alon Greenberg](https://github.com/A-Greenberg)
- [Kevin Penate](https://github.com/Ronniekev)
- [Irene Buck](https://github.com/irenebuck)
- [Matthew Kho](https://github.com/mk2256)

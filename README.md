# Let's Go! Fitness App

A cross-platform mobile fitness challenge app built with React Native and Expo for the CS467 Capstone Project at Oregon State University. Users can create and join fitness challenges, track progress, message other participants, and earn badges upon completion. 

This app was built following the project specification outlined [here](https://eecs.engineering.oregonstate.edu/capstone/submission/pages/viewSingleProject.php?id=wCYyeJ68VbLa8w13). The [initial build](https://github.com/irenebuck/Fitness-App/commit/2594aa90585b16dfb4b262adb7be19cf28c33361) was scaffolded with the assistance of Claude Code by Anthropic on April 14, 2026.



## Tech Stack

### Frontend
- **React Native** — JavaScript framework for building mobile apps that run on both iOS and Android from a single codebase
- **Expo** — toolchain built on top of React Native that simplifies development, testing, and deployment without needing Xcode or Android Studio
- **JavaScript (ES6+)** — primary programming language used throughout the app
- **React Navigation** — handles all screen routing and navigation (stack-based, so screens push and pop like a browser history)

### Backend & Database
- **Firebase Authentication** — manages user sign-up, login, and session handling securely out of the box
- **Cloud Firestore** — NoSQL cloud database from Firebase; stores all app data (users, challenges, messages, badges) as collections of documents in real time
- **Firebase Storage** — stores user-uploaded files such as profile photos

## Prerequisites

Before running the app, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
  ```
  npm install -g expo-cli
  ```
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)), or an Android/iOS emulator. Android Studio is required to use the Android emulator on a Windows desktop. 

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Fitness-App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

This app uses Firebase for authentication and data storage. You will need your own Firebase project.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Email/Password Authentication** under Authentication > Sign-in method
3. Create a **Firestore Database**
4. Enable **Storage** if you plan to use profile photo uploads
5. Go to Project Settings > Your apps > Web app and copy your config values

Create a `.env` file in the project root by copying the provided example:

```bash
cp .env.example .env
```

Then open `.env` and fill in your Firebase values:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```


### 4. Run the app

```bash
npm start
```

This opens the Expo Developer Tools in your browser. From there:

- Press **`a`** to open on an Android emulator (Android Studio required)
- Press **`i`** to open on an iOS simulator (Mac only)
- Scan the **QR code** with the Expo Go app on your phone to run on a real device

You can also run directly to a specific platform:

```bash
npm run android   # Android emulator (Android Studio required)
npm run ios       # iOS simulator (Mac only)
npm run web       # Browser
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
├── src/
│   ├── components/     # Reusable UI components (cards, chat, etc.)
│   ├── context/        # Auth and app-wide state (React Context)
│   ├── navigation/     # Screen routing (AppNavigator)
│   ├── screens/        # One file per screen
│   └── theme.js        # Shared colors and styles
├── .env.example        # Template for environment variables
├── app.json            # Expo app configuration
└── package.json        # Dependencies and scripts
```

## Team

[Alon Greenberg](https://github.com/A-Greenberg)

[Kevin Penate](https://github.com/Ronniekev)

[Irene Buck](https://github.com/irenebuck)

[Matthew Kho](https://github.com/mk2256)
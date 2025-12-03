
# MagicPixa - AI Image Generation Platform

MagicPixa is a modern web application that leverages the power of Google's Gemini AI to provide a suite of tools for image generation and enhancement. Users can transform product photos, design interiors, colourize vintage pictures, try on apparel virtually, and much more.

## ✨ Features

- **Magic Photo Studio**: Create professional, studio-quality product shots from simple photos.
- **Product Studio**: Automatically generate a complete, marketplace-ready product pack including hero shots, lifestyle mockups, and SEO-optimized text from just a product photo.
- **Magic Interior**: Redesign any room by uploading a photo and choosing a style.
- **Pixa Photo Restore**: Colourize and restore old black and white photos.
- **Magic Soul**: Combine two people into a single, hyper-realistic photo in a chosen theme.
- **Magic Apparel**: Virtually try on clothing on a person from a photo.
- **Magic Mockup**: Generate realistic mockups for your logos and designs on various products.
- **Pixa Caption Pro**: Instantly generate social media captions and hashtags for any image.
- **Firebase Authentication**: Secure sign-in with Google.
- **Credit System**: Pay-as-you-go credit system for using AI features, managed with Firestore.
- **Payment Gateway**: Integrated with Razorpay for purchasing credit packs.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS (via CDN)
- **AI**: Google Gemini API (`@google/genai`)
- **Backend & Auth**: Firebase (Authentication, Firestore)
- **Payment**: Razorpay

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- A Firebase project
- A Google Gemini API key
- A Razorpay account for payment processing

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/magicpixa.git
    cd magicpixa
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```

    Now, fill in the `.env` file with your credentials from Firebase, Google AI Studio, and Razorpay.

    ```env
    VITE_API_KEY="YOUR_GEMINI_API_KEY"
    VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
    VITE_FIREBASE_AUTH_DOMAIN="your-firebase-auth-domain"
    VITE_FIREBASE_API_KEY="your-firebase-web-api-key"
    VITE_FIREBASE_STORAGE_BUCKET="your-firebase-storage-bucket"
    VITE_FIREBASE_MESSAGING_SENDER_ID="your-firebase-messaging-sender-id"
    VITE_FIREBASE_APP_ID="your-firebase-app-id"
    VITE_RAZORPAY_KEY_ID="your-razorpay-key-id"
    ```
    
    **Important:** For Firebase authentication to work correctly, ensure you have added your development domain (e.g., `localhost`) and your production domain to the "Authorized domains" list in the Firebase Authentication settings.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

### Building for Production

To create a production build, run:
```bash
npm run build
```
This will generate a `dist` directory with the optimized, static assets for your application.

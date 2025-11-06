import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { Theme, Themes } from '../types';

interface ThemeGeneratorFormProps {
  user: any; // Firebase User object
  onThemeGenerated: (themeKey: string, theme: Theme) => void;
  onLoading: (isLoading: boolean) => void;
  // FIX: Add isLoading prop to receive loading state from parent
  isLoading: boolean;
  currentAnimation: string;
  currentColors: Theme['colors'];
}

// Helper to encode Uint8Array to base64 string
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert hex to RGB values (useful for prompt, though not used in app directly for generation)
const hexToRgbForPrompt = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
    : 'rgb(0,0,0)';
};

// Helper function to upload base64 image to Firebase Storage
async function uploadBase64ToFirebaseStorage(userId: string, base64Data: string, mimeType: string): Promise<string> {
  const storageRef = window.firebase.storage().ref().child(`banners/${userId}/banner_${Date.now()}.png`);
  await storageRef.putString(base64Data, 'base64', { contentType: mimeType });
  const downloadURL = await storageRef.getDownloadURL();
  return downloadURL;
}

export const ThemeGeneratorForm: React.FC<ThemeGeneratorFormProps> = ({ user, onThemeGenerated, onLoading, isLoading, currentAnimation, currentColors }) => {
  const [themeDescription, setThemeDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerateTheme = useCallback(async () => {
    if (!themeDescription.trim()) {
      setError("Please provide a description for your theme.");
      return;
    }
    if (!user) {
      setError("You must be logged in to generate a custom theme.");
      return;
    }

    onLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // --- Step 1: Generate Theme Definition (Colors, Fonts, Animation, Chart Colors) ---
      const themePrompt = `Generate a modern, free-form styled theme definition in JSON format based on the following description: "${themeDescription}". 
      The JSON should have the following structure:
      {
        "name": "Theme Name (short and descriptive)",
        "fonts": {
          "heading": "A strong, thematic Google Font name (e.g., 'Orbitron', 'Merriweather')",
          "sans": "A clean, readable Google Font name (e.g., 'Lato', 'Roboto')"
        },
        "colors": {
          "primary": "Hex color for main accents/buttons",
          "secondary": "Hex color for secondary accents/highlights",
          "accent": "Hex color for subtle highlights/borders",
          "bgLight": "Hex color for light background elements",
          "bgDark": "Hex color for dark background elements",
          "textBase": "Hex color for primary text",
          "textInverse": "Hex color for text on dark backgrounds",
          "border": "Hex color for borders"
        },
        "animation": "One of these Tailwind CSS animation classes: 'animate-fade-in', 'animate-subtle-pulse', 'animate-glow', 'animate-pop-in'",
        "chartColors": ["Hex color 1", "Hex color 2", "Hex color 3", "Hex color 4", "Hex color 5"],
        "background": "One of these background animation styles: 'starfield', 'matrix', 'cozy'. Choose the one that best fits the theme description."
      }
      Ensure all color values are valid 6-digit hex codes. The 'name' should be evocative of the theme.
      `;

      const themeResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: themePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Short and descriptive theme name' },
              fonts: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING, description: 'Google Font name for headings' },
                  sans: { type: Type.STRING, description: 'Google Font name for sans-serif text' },
                },
                required: ['heading', 'sans'],
              },
              colors: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING, description: 'Hex color' },
                  secondary: { type: Type.STRING, description: 'Hex color' },
                  accent: { type: Type.STRING, description: 'Hex color' },
                  bgLight: { type: Type.STRING, description: 'Hex color' },
                  bgDark: { type: Type.STRING, description: 'Hex color' },
                  textBase: { type: Type.STRING, description: 'Hex color' },
                  textInverse: { type: Type.STRING, description: 'Hex color' },
                  border: { type: Type.STRING, description: 'Hex color for borders' },
                },
                required: ['primary', 'secondary', 'accent', 'bgLight', 'bgDark', 'textBase', 'textInverse', 'border'],
              },
              animation: {
                type: Type.STRING,
                description: 'Tailwind CSS animation class',
                enum: ['animate-fade-in', 'animate-subtle-pulse', 'animate-glow', 'animate-pop-in'],
              },
              chartColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Array of 5 hex colors for charts',
                maxItems: 5,
                minItems: 5,
              },
              background: {
                type: Type.STRING,
                description: 'Background animation style',
                enum: ['starfield', 'matrix', 'cozy'],
              },
            },
            required: ['name', 'fonts', 'colors', 'animation', 'chartColors', 'background'],
          },
        },
      });

      let generatedTheme: Theme = JSON.parse(themeResponse.text.trim());

      // --- Step 2: Generate Banner Image ---
      const bannerPrompt = `A banner image for an event with the main theme of "${themeDescription}". The overall style should be modern and free-form.
      The banner should prominently feature the text "Meet at BoB" at the top center.
      The colors should loosely align with the generated theme's primary (${generatedTheme.colors.primary}), secondary (${generatedTheme.colors.secondary}), and background (${generatedTheme.colors.bgDark}) colors.
      `;
      
      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: bannerPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9',
        },
      });

      const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;

      // --- Step 3: Upload Banner to Firebase Storage ---
      const downloadUrl = await uploadBase64ToFirebaseStorage(user.uid, base64ImageBytes, 'image/png');

      // --- Step 4: Combine and Save to Firestore ---
      const finalTheme: Theme = {
        ...generatedTheme,
        banner: downloadUrl,
      };

      await window.firebase.firestore().collection('themes').doc(user.uid).set(finalTheme);

      onThemeGenerated('user-custom-theme', finalTheme);
      setSuccessMessage("Your custom theme has been generated and saved!");

    } catch (e: any) {
      console.error("Error generating theme:", e);
      setError(`Failed to generate theme: ${e.message || 'Unknown error'}. Please try again.`);
    } finally {
      onLoading(false);
    }
  }, [themeDescription, user, onLoading, onThemeGenerated]);

  return (
    <div className="space-y-4">
      <p className="text-text-base/80 text-center">
        Describe your ideal theme, and our AI will generate a unique look just for you!
      </p>
      <div>
        <label htmlFor="themeDescription" className="sr-only">Theme Description</label>
        <textarea
          id="themeDescription"
          name="themeDescription"
          value={themeDescription}
          onChange={(e) => setThemeDescription(e.target.value)}
          rows={3}
          className={`w-full p-3 rounded-md bg-bg-light text-text-base border border-border-color 
            focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
          placeholder="e.g., 'A cyberpunk neon city theme with dark blues and bright pinks, glitch effects.' or 'A cozy cabin in the woods with warm browns and greens.'"
          disabled={isLoading}
          aria-label="Describe your custom event theme"
        ></textarea>
        {error && <p className="text-primary text-xs mt-1" role="alert">{error}</p>}
      </div>
      <button
        onClick={handleGenerateTheme}
        className={`w-full p-3 rounded-md font-heading uppercase tracking-wider ${
          isLoading
            ? `bg-gray-500 text-gray-200 cursor-not-allowed ${currentAnimation}`
            : `bg-primary text-text-inverse hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80 ${currentAnimation}`
        } transition duration-300`}
        disabled={isLoading}
        aria-live="polite"
      >
        {isLoading ? "Generating Theme..." : "Generate My Theme"}
      </button>
      {successMessage && (
        <p className="text-secondary text-sm mt-4 text-center" role="status">{successMessage}</p>
      )}
      {isLoading && (
          <p className="text-text-base/70 text-sm mt-2 text-center animate-pulse">
            This might take a moment as we generate both the theme colors/fonts and a custom banner image...
          </p>
      )}
    </div>
  );
};
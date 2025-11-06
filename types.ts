export interface Event {
  name: string;
  location: string;
  banner?: string; // Banner is now optional as it comes from the theme
}

export interface Product {
  name: string;
  price: number;
}

export interface RegistrationForm {
  uid?: string; // User ID from Firestore document ID
  name: string;
  email: string;
  arrival_time: string; // ISO 8601 string for datetime-local input
  selectedProduct?: Product; 
}

export interface Theme {
  name: string;
  banner: string;
  fonts: {
    heading: string;
    sans: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bgLight: string;
    bgDark: string;
    textBase: string;
    textInverse: string;
    border: string;
  },
  animation: string;
  chartColors: string[];
  background: string;
}

export interface Themes {
  [key: string]: Theme;
}

export interface EventData {
  event: Event;
  products: Product[];
  dates: string[];
  start_time: string;
  end_time: string;
  registration: {
    [key:string]: string;
  };
  themes: Themes;
}
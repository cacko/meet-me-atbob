import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { EventData, Product, RegistrationForm, Themes, Theme } from './types';
import { EventBanner } from './components/EventBanner';
import { UserAuthAndProfile } from './components/UserAuthAndProfile';
import { RegistrationList } from './components/RegistrationList';
import { ProductPieChart } from './components/ProductPieChart';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeGeneratorForm } from './components/ThemeGeneratorForm';
import { StarfieldBackground } from './components/StarfieldBackground';

// Declare firebase on window object
declare global {
  interface Window {
    firebase: any;
  }
}

// Helper to convert hex to RGB values for CSS variables
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : '0 0 0';
};

const App: React.FC = () => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [registeredData, setRegisteredData] = useState<RegistrationForm | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationForm[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  
  const [eventThemes, setEventThemes] = useState<Themes | null>(null); // Themes from event.json
  const [userCustomTheme, setUserCustomTheme] = useState<Theme | null>(null); // User's generated theme
  const [currentThemeKey, setCurrentThemeKey] = useState<string>('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState<boolean>(false);


  // Initial fetch for event.json
  useEffect(() => {
    fetch('/event.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data: EventData) => {
        setEventData(data);
        if (data.themes) {
          setEventThemes(data.themes);
          // Set initial theme to the first one from event.json
          setCurrentThemeKey(Object.keys(data.themes)[0] || '');
        }
      })
      .catch(error => {
        console.error('Failed to fetch event.json:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Fetch user custom theme when user changes
  useEffect(() => {
    const fetchUserTheme = async () => {
      if (user) {
        try {
          const db = window.firebase.firestore();
          const themeDoc = await db.collection('users').doc(user.uid).collection('themes').doc('custom').get();
          if (themeDoc.exists) {
            setUserCustomTheme(themeDoc.data() as Theme);
            // If user has a custom theme, default to it
            setCurrentThemeKey('user-custom-theme'); 
          } else {
            setUserCustomTheme(null);
          }
        } catch (error) {
          console.error("Error fetching user custom theme:", error);
          setUserCustomTheme(null);
        }
      } else {
        setUserCustomTheme(null);
        // If user logs out, reset to a default event theme if available
        if (eventThemes) {
          setCurrentThemeKey(Object.keys(eventThemes)[0] || '');
        }
      }
    };
    fetchUserTheme();
  }, [user, eventThemes]);

  // Combine event themes and user custom theme for ThemeToggle
  const allAvailableThemes: Themes = useMemo(() => {
    const combinedThemes: Themes = { ...eventThemes };
    if (userCustomTheme) {
      combinedThemes['user-custom-theme'] = {
        ...userCustomTheme,
        name: 'User Defined' // Override name for display in toggle
      };
    }
    return combinedThemes;
  }, [eventThemes, userCustomTheme]);

  // Effect to apply theme changes
  useEffect(() => {
    let themeToApply: Theme | undefined;

    if (currentThemeKey === 'user-custom-theme' && userCustomTheme) {
      themeToApply = userCustomTheme;
    } else if (eventThemes && eventThemes[currentThemeKey]) {
      themeToApply = eventThemes[currentThemeKey];
    }

    if (!themeToApply) return;

    const root = document.documentElement;

    Object.entries(themeToApply.colors).forEach(([key, value]) => {
      // Map schema keys to CSS variable keys
      const cssKey = key === 'bgLight' ? 'bg-light' :
                     key === 'bgDark' ? 'bg-dark' :
                     key === 'textBase' ? 'text-base' :
                     key === 'textInverse' ? 'text-inverse' :
                     key === 'border' ? 'border-color' : key;
      root.style.setProperty(`--color-${cssKey}`, hexToRgb(value));
    });

    root.style.setProperty('--font-heading', themeToApply.fonts.heading);
    root.style.setProperty('--font-sans', themeToApply.fonts.sans);

    document.body.style.backgroundColor = 'transparent';
    document.body.style.color = themeToApply.colors.textBase;

  }, [currentThemeKey, eventThemes, userCustomTheme]);
  
  const availableTimes = useMemo(() => {
    if (!eventData?.start_time) return [];

    const times = [];
    const [startHour, startMinute] = eventData.start_time.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
        const h = String(currentTime.getHours()).padStart(2, '0');
        const m = String(currentTime.getMinutes()).padStart(2, '0');
        times.push(`${h}:${m}`);
        currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
    
    return times;
  }, [eventData]);


  // Firebase Auth State and Data Listener
  useEffect(() => {
    const auth = window.firebase.auth();
    let unsubscribeRegistrations: () => void = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser: any) => {
      setUser(currentUser);
      
      if (unsubscribeRegistrations) {
        unsubscribeRegistrations();
      }

      if (currentUser) {
        const db = window.firebase.firestore();
        
        const docRef = db.collection('registrations').doc(currentUser.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const data = docSnap.data() as RegistrationForm;
          setRegisteredData(data);
          setSelectedProduct(data.selectedProduct || null);
        } else {
          setRegisteredData(null);
          setSelectedProduct(null);
        }

        const registrationsRef = db.collection('registrations').orderBy('arrival_time', 'asc');
        unsubscribeRegistrations = registrationsRef.onSnapshot(snapshot => {
            const allRegsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    uid: doc.id,
                    name: data.name || 'Unknown Guest',
                    email: data.email || 'No email',
                    arrival_time: data.arrival_time || new Date().toISOString(),
                    selectedProduct: data.selectedProduct || undefined,
                } as RegistrationForm;
            });
            setAllRegistrations(allRegsData);
        }, err => {
            console.error("Failed to subscribe to registrations collection:", err);
        });

      } else {
        setRegisteredData(null);
        setSelectedProduct(null);
        setAllRegistrations([]);
      }
      setEditingProfile(false);
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeRegistrations) {
        unsubscribeRegistrations();
      }
    };
  }, []);

  const handleProductSelection = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);


  const handleRegistrationComplete = useCallback((data: RegistrationForm) => {
    setRegisteredData(data);
    setEditingProfile(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await window.firebase.auth().signOut();
      setUser(null);
      setRegisteredData(null);
      setSelectedProduct(null);
      console.log("User signed out.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  const handleCustomThemeGenerated = useCallback((themeKey: string, theme: Theme) => {
    setUserCustomTheme(theme);
    setCurrentThemeKey(themeKey);
  }, []);
  
  const currentTheme: Theme | undefined = useMemo(() => {
    if (currentThemeKey === 'user-custom-theme' && userCustomTheme) {
      return userCustomTheme;
    }
    return eventThemes?.[currentThemeKey];
  }, [currentThemeKey, eventThemes, userCustomTheme]);

  const userArrivalDate = registeredData?.arrival_time.split('T')[0];

  const registrationsForUserDate = useMemo(() => {
    if (!userArrivalDate) return [];
    return allRegistrations.filter(reg => reg.arrival_time.split('T')[0] === userArrivalDate);
  }, [allRegistrations, userArrivalDate]);

  const roundPrice = useMemo(() => {
    return registrationsForUserDate.reduce((sum, reg) => sum + (reg.selectedProduct?.price || 0), 0);
  }, [registrationsForUserDate]);

  if (loading || !eventData || !currentTheme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-200">
        <p className="text-3xl font-serif animate-pulse">Loading Event Details...</p>
      </div>
    );
  }

  return (
    <>
      {currentTheme?.background && <StarfieldBackground background={currentTheme.background} theme={currentTheme} />}
      <div className="min-h-screen flex flex-col items-center p-4 md:p-8 animate-fade-in transition-colors duration-500 relative z-10">
         {allAvailableThemes && (
              <ThemeToggle 
                  themes={allAvailableThemes} // Use all available themes
                  currentThemeKey={currentThemeKey}
                  onThemeChange={setCurrentThemeKey}
              />
          )}
        <div className="w-full max-w-4xl bg-bg-dark/80 backdrop-blur-sm rounded-lg shadow-lg p-6 md:p-8">

          <EventBanner event={{ ...eventData.event, banner: currentTheme.banner }} />

          {user ? (
            <div className="text-right mb-4">
              <span className="text-text-base mr-2">Welcome, <span className="text-primary font-semibold">{user.displayName || user.email}</span></span>
              <button
                onClick={handleSignOut}
                className="bg-primary text-text-inverse hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80
                           py-1 px-4 rounded-md font-heading text-sm transition duration-300"
              >
                Log Out
              </button>
            </div>
          ) : null}

          {!user || editingProfile || !registeredData ? (
            <>
              <section className="p-4 bg-bg-light/80 rounded-md">
                <h2 className="text-xl md:text-2xl font-heading text-primary mb-4 text-center">
                  {editingProfile ? 'Update Your Registration' : 'Register for the Event!'}
                </h2>
                <UserAuthAndProfile
                  onRegistrationComplete={handleRegistrationComplete}
                  selectedProduct={selectedProduct}
                  user={user}
                  initialRegisteredData={registeredData}
                  availableDates={eventData.dates}
                  availableTimes={availableTimes}
                  products={eventData.products}
                  onSelectProduct={handleProductSelection}
                  currentAnimation={currentTheme.animation}
                />
              </section>
            </>
          ) : (
            <section className="text-center p-8 bg-bg-light/40 rounded-lg shadow-md">
              <h2 className="text-3xl md:text-5xl font-heading text-secondary mb-4">Registration Confirmed!</h2>
              <p className="text-xl text-text-base mb-2">Welcome, <span className="text-primary font-semibold">{registeredData?.name || user.displayName}</span>!</p>
              <p className="text-lg text-text-base mb-2">A confirmation has been sent to: <span className="text-primary font-semibold">{registeredData?.email || user.email}</span></p>
              {registeredData?.arrival_time && (
                <p className="text-lg text-text-base">Your Arrival Time: <span className="text-primary font-semibold">{new Date(registeredData.arrival_time).toLocaleString()}</span></p>
              )}

              {registeredData?.selectedProduct && (
                <div className="mt-6 text-text-base">
                  <h3 className="text-xl font-heading text-secondary mb-3">Your Selected Drink:</h3>
                  <div className="list-disc list-inside text-left mx-auto max-w-sm space-y-1">
                      <p className="text-base text-center">
                        <span className="font-semibold">{registeredData.selectedProduct.name}</span> (£{registeredData.selectedProduct.price.toFixed(2)})
                      </p>
                  </div>
                </div>
              )}

              {roundPrice > 0 && (
                <div className="mt-6 text-text-base">
                  <h3 className="text-xl font-heading text-secondary mb-3">Estimated Round Cost</h3>
                  <p className="text-base text-center">
                    The estimated price for a round on your arrival date is: <span className="text-primary font-bold text-lg">£{roundPrice.toFixed(2)}</span>
                  </p>
                </div>
              )}

              <button
                onClick={() => setEditingProfile(true)}
                className={`mt-8 bg-secondary text-text-inverse hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80
                           py-2 px-6 rounded-md font-heading uppercase tracking-wider text-md transition duration-300 ${currentTheme.animation}`}
              >
                Edit Registration
              </button>

              {user && registeredData && (
                 <RegistrationList registrations={registrationsForUserDate} currentUserUid={user.uid} registrationDate={registeredData.arrival_time} />
              )}

              {registrationsForUserDate.length > 0 && <ProductPieChart registrations={registrationsForUserDate} theme={currentTheme} />}

              <p className="mt-6 text-text-base/70 text-sm">We look forward to seeing you!</p>
            </section>
          )}
          
          {/* New Theme Generation Section */}
          {user && registeredData && (
            <section className="mt-8 p-4 bg-bg-dark/70 backdrop-blur-sm rounded-lg shadow-lg">
              <h2 className="text-xl md:text-2xl font-heading text-primary mb-4 text-center">
                Generate Your Own Theme!
              </h2>
              <ThemeGeneratorForm
                user={user}
                onThemeGenerated={(themeKey, theme) => {
                  handleCustomThemeGenerated(themeKey, theme);
                  alert('Your custom theme has been generated and applied! You can select it from the theme toggle.');
                }}
                onLoading={setIsGeneratingTheme}
                // FIX: Pass the isGeneratingTheme state to the child component
                isLoading={isGeneratingTheme}
                currentAnimation={currentTheme.animation}
                currentColors={currentTheme.colors}
              />
            </section>
          )}

        </div>

        <footer className="mt-8 text-sm text-text-base text-opacity-70">
          &copy; {new Date().getFullYear()} BoB Events. All rights reserved.
        </footer>
      </div>
    </>
  );
};

export default App;
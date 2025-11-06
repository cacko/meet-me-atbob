import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { RegistrationForm as RegistrationFormType, Product } from '../types';
import { ProductDisplay } from './ProductDisplay';

interface UserAuthAndProfileProps {
  onRegistrationComplete: (data: RegistrationFormType) => void;
  selectedProduct: Product | null;
  user: any | null; // Firebase User object
  initialRegisteredData: RegistrationFormType | null;
  availableDates: string[];
  availableTimes: string[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  currentAnimation: string;
}

export const UserAuthAndProfile: React.FC<UserAuthAndProfileProps> = ({
  onRegistrationComplete,
  selectedProduct,
  user,
  initialRegisteredData,
  availableDates,
  availableTimes,
  products,
  onSelectProduct,
  currentAnimation,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    email: string; 
    arrival_date: string;
    arrival_time_of_day: string;
  }>({
    name: user?.displayName || '',
    email: user?.email || '',
    arrival_date: '',
    arrival_time_of_day: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // States for authentication UI
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [emailAuthInput, setEmailAuthInput] = useState<string>('');
  const [passwordAuthInput, setPasswordAuthInput] = useState<string>('');
  const [confirmPasswordAuthInput, setConfirmPasswordAuthInput] = useState<string>('');
  const [isEmailSignUpMode, setIsEmailSignUpMode] = useState<boolean>(false);

  const isEditing = useMemo(() => !!initialRegisteredData, [initialRegisteredData]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
    }
    if (initialRegisteredData) {
      const arrivalDateTime = new Date(initialRegisteredData.arrival_time);
      const arrivalDate = arrivalDateTime.toISOString().split('T')[0];
      const arrivalTime = `${String(arrivalDateTime.getHours()).padStart(2, '0')}:${String(arrivalDateTime.getMinutes()).padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        name: initialRegisteredData.name || user?.displayName || '',
        email: initialRegisteredData.email || user?.email || '',
        arrival_date: arrivalDate,
        arrival_time_of_day: arrivalTime,
      }));
    } else if (user && !initialRegisteredData) {
        // If user is logged in but no registration data, pre-fill with user name/email
        setFormData(prev => ({
            ...prev,
            name: user.displayName || '',
            email: user.email || '',
        }));
    }
  }, [user, initialRegisteredData]);


  const validate = useCallback(() => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!formData.email.trim()) {
      newErrors.email = "A valid email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address format.";
    }
    if (!formData.arrival_date) {
      newErrors.arrival_date = "Please select an arrival date.";
    }
    if (!formData.arrival_time_of_day) {
      newErrors.arrival_time_of_day = "Please select an arrival time.";
    } else if (formData.arrival_date) {
      const arrivalDateTimeString = `${formData.arrival_date}T${formData.arrival_time_of_day}:00`;
      const arrivalCombinedDateTime = new Date(arrivalDateTimeString);
      const currentTime = new Date();

      if (isNaN(arrivalCombinedDateTime.getTime())) {
        newErrors.arrival_time_of_day = "Invalid time format.";
      } else if (arrivalCombinedDateTime < currentTime) {
        newErrors.arrival_time_of_day = "Please select a future date and time.";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setSubmitError(null);
  }, [errors]);

  const handleEmailAuthInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSubmitError(null);
    if (name === 'emailAuth') setEmailAuthInput(value);
    else if (name === 'passwordAuth') setPasswordAuthInput(value);
    else if (name === 'confirmPasswordAuth') setConfirmPasswordAuthInput(value);
    // Clear auth-specific errors when input changes
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const getFirebaseAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please log in or use a different email.';
      case 'auth/invalid-email':
        return 'The email format is invalid. Please check and try again.';
      case 'auth/user-not-found':
        return 'No user found with that email. Have you registered yet?';
      case 'auth/wrong-password':
      case 'auth/invalid-credential': 
        return 'Incorrect password or email. Please double-check your input.';
      case 'auth/weak-password':
        return 'Your password is too weak. It must be at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Authentication method not enabled. Please contact support.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in window was closed. Please try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return `Authentication failed: ${errorCode}. Please try again.`;
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setSubmitError(null);
      setIsSubmitting(true);
      const provider = new window.firebase.auth.GoogleAuthProvider();
      await window.firebase.auth().signInWithPopup(provider);
    } catch (error: any) {
      console.error("Error during Google Sign-In:", error);
      let errorMessage = `Failed to sign in with Google: ${error.message || 'Unknown error'}`;
      if (error.code === 'auth/operation-not-supported-in-this-environment') {
          errorMessage = `Google Sign-In via popup is not supported in this sandboxed environment (e.g., AI Studio iframe). Please try running the application in a full browser tab for this feature to work correctly.`;
      } else if (error.code) {
          errorMessage = getFirebaseAuthErrorMessage(error.code);
      }
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleEmailSignUp = useCallback(async () => {
    setSubmitError(null);
    setErrors({});
    let hasAuthErrors = false;
    const newAuthErrors: { [key: string]: string } = {};

    if (!emailAuthInput) {
      newAuthErrors.emailAuth = "Email is required.";
      hasAuthErrors = true;
    } else if (!/\S+@\S+\.\S+/.test(emailAuthInput)) {
      newAuthErrors.emailAuth = "Invalid email format.";
      hasAuthErrors = true;
    }
    if (!passwordAuthInput || passwordAuthInput.length < 6) {
      newAuthErrors.passwordAuth = "Password (min 6 characters) required.";
      hasAuthErrors = true;
    }
    if (!confirmPasswordAuthInput || passwordAuthInput !== confirmPasswordAuthInput) {
      newAuthErrors.confirmPasswordAuth = "Passwords must match.";
      hasAuthErrors = true;
    }

    if (hasAuthErrors) {
      setErrors(newAuthErrors);
      setSubmitError("Please correct the errors to create an account.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userCredential = await window.firebase.auth().createUserWithEmailAndPassword(emailAuthInput, passwordAuthInput);
      await userCredential.user.updateProfile({
        displayName: formData.name || emailAuthInput.split('@')[0],
      });
    } catch (error: any) {
      console.error("Error during Email Sign-Up:", error);
      setSubmitError(getFirebaseAuthErrorMessage(error.code || 'unknown'));
    } finally {
      setIsSubmitting(false);
    }
  }, [emailAuthInput, passwordAuthInput, confirmPasswordAuthInput, formData.name]);

  const handleEmailSignIn = useCallback(async () => {
    setSubmitError(null);
    setErrors({});
    let hasAuthErrors = false;
    const newAuthErrors: { [key: string]: string } = {};

    if (!emailAuthInput) {
      newAuthErrors.emailAuth = "Email is required.";
      hasAuthErrors = true;
    }
    if (!passwordAuthInput) {
      newAuthErrors.passwordAuth = "Password is required.";
      hasAuthErrors = true;
    }

    if (hasAuthErrors) {
        setErrors(newAuthErrors);
        setSubmitError("Please provide both your email and password to log in.");
        return;
    }

    setIsSubmitting(true);
    try {
      await window.firebase.auth().signInWithEmailAndPassword(emailAuthInput, passwordAuthInput);
    } catch (error: any) {
      console.error("Error during Email Sign-In:", error);
      setSubmitError(getFirebaseAuthErrorMessage(error.code || 'unknown'));
    } finally {
      setIsSubmitting(false);
    }
  }, [emailAuthInput, passwordAuthInput]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!selectedProduct) {
      setSubmitError("Please select a drink to complete your registration.");
      return;
    }
    
    if (!validate()) {
      setSubmitError("Please review and correct the marked fields above.");
      return;
    }

    if (!user) {
        setSubmitError("Authentication required. Please log in or create an account.");
        return;
    }

    setIsSubmitting(true);

    try {
      if (user.displayName !== formData.name || !user.displayName) {
        await user.updateProfile({
          displayName: formData.name,
        });
      }

      const fullRegistrationData: RegistrationFormType = {
        name: formData.name,
        email: formData.email,
        arrival_time: `${formData.arrival_date}T${formData.arrival_time_of_day}:00`,
        selectedProduct,
      };

      const db = window.firebase.firestore();
      await db.collection('registrations').doc(user.uid).set(fullRegistrationData, { merge: true });

      console.log('Registration submitted successfully to Firestore:', fullRegistrationData);
      onRegistrationComplete(fullRegistrationData);
    } catch (error: any) {
      console.error('Error during registration/profile update:', error);
      setSubmitError(`Submission failed: ${error.message || 'Please verify your details and connection.'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedProduct, validate, user, onRegistrationComplete]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!user && (
        <div className="text-center mb-6">
          <p className="text-text-base/80 mb-6">Please sign in to register for the event.</p>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className={`w-full max-w-sm mx-auto bg-bg-light border border-primary text-primary hover:bg-primary hover:text-text-inverse focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80
                         py-3 px-6 rounded-md font-heading uppercase tracking-wider text-lg transition duration-300 flex items-center justify-center ${currentAnimation}`}
              disabled={isSubmitting}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="h-5 w-5 mr-3" />
              Sign In with Google
            </button>
            <button
              onClick={() => {
                setShowEmailForm(prev => !prev);
                setSubmitError(null);
                setErrors({});
                setEmailAuthInput('');
                setPasswordAuthInput('');
                setConfirmPasswordAuthInput('');
              }}
              type="button"
              className="w-full max-w-sm mx-auto bg-bg-light border border-text-base text-text-base hover:bg-text-base hover:text-bg-light focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80
                         py-3 px-6 rounded-md font-heading uppercase tracking-wider text-lg transition duration-300 flex items-center justify-center"
              disabled={isSubmitting}
              aria-expanded={showEmailForm}
              aria-controls="email-auth-form"
            >
              <span className="mr-3 text-xl" aria-hidden="true">📧</span>
              Sign In with Email
            </button>
          </div>

          {showEmailForm && (
            <div id="email-auth-form" className="space-y-4 p-4 mt-4 rounded-md bg-bg-light/50 animate-fade-in">
              <h3 className="text-xl font-heading text-primary mb-4">
                {isEmailSignUpMode ? 'Create an Account' : 'Log In'}
              </h3>
              <div>
                <label htmlFor="emailAuth" className="sr-only">Email</label>
                <input
                  type="email"
                  id="emailAuth"
                  name="emailAuth"
                  value={emailAuthInput}
                  onChange={handleEmailAuthInputChange}
                  className={`w-full p-3 rounded-md bg-bg-light text-text-base border
                    ${errors.emailAuth ? 'border-primary' : 'border-border-color'} focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
                  placeholder="Email Address"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.emailAuth}
                  aria-describedby={errors.emailAuth ? "email-auth-error" : undefined}
                />
                {errors.emailAuth && <p id="email-auth-error" className="text-primary text-xs mt-1" role="alert">{errors.emailAuth}</p>}
              </div>
              <div>
                <label htmlFor="passwordAuth" className="sr-only">Password</label>
                <input
                  type="password"
                  id="passwordAuth"
                  name="passwordAuth"
                  value={passwordAuthInput}
                  onChange={handleEmailAuthInputChange}
                  className={`w-full p-3 rounded-md bg-bg-light text-text-base border
                    ${errors.passwordAuth ? 'border-primary' : 'border-border-color'} focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
                  placeholder="Password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.passwordAuth}
                  aria-describedby={errors.passwordAuth ? "password-auth-error" : undefined}
                />
                {errors.passwordAuth && <p id="password-auth-error" className="text-primary text-xs mt-1" role="alert">{errors.passwordAuth}</p>}
              </div>
              {isEmailSignUpMode && (
                <div>
                  <label htmlFor="confirmPasswordAuth" className="sr-only">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPasswordAuth"
                    name="confirmPasswordAuth"
                    value={confirmPasswordAuthInput}
                    onChange={handleEmailAuthInputChange}
                    className={`w-full p-3 rounded-md bg-bg-light text-text-base border
                      ${errors.confirmPasswordAuth ? 'border-primary' : 'border-border-color'} focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
                    placeholder="Confirm Password"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.confirmPasswordAuth}
                    aria-describedby={errors.confirmPasswordAuth ? "confirm-password-auth-error" : undefined}
                  />
                  {errors.confirmPasswordAuth && <p id="confirm-password-auth-error" className="text-primary text-xs mt-1" role="alert">{errors.confirmPasswordAuth}</p>}
                </div>
              )}

              {isEmailSignUpMode ? (
                <button
                  onClick={handleEmailSignUp}
                  type="button"
                  className="w-full bg-secondary text-text-inverse hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80
                             py-3 px-8 rounded-md font-heading uppercase tracking-wider text-lg transition duration-300"
                  disabled={isSubmitting}
                >
                  Create Account
                </button>
              ) : (
                <button
                  onClick={handleEmailSignIn}
                  type="button"
                  className="w-full bg-primary text-text-inverse hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80
                             py-3 px-8 rounded-md font-heading uppercase tracking-wider text-lg transition duration-300"
                  disabled={isSubmitting}
                >
                  Log In
                </button>
              )}

              <button
                type="button" 
                onClick={() => setIsEmailSignUpMode(prev => !prev)}
                className="text-secondary text-sm hover:underline mt-4 block mx-auto"
                disabled={isSubmitting}
              >
                {isEmailSignUpMode ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
              </button>
            </div>
          )}

          {submitError && (
            <p className="text-primary text-sm mt-4 text-center" role="alert">{submitError}</p>
          )}
        </div>
      )}

      {user && (
        <>
          <div>
            <label htmlFor="name" className="block text-text-base/80 text-sm font-heading mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-3 rounded-md bg-bg-light text-text-base border
                ${
                errors.name ? 'border-primary' : 'border-border-color'
              } focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
              placeholder="e.g., John Smith"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && <p id="name-error" className="text-primary text-xs mt-1" role="alert">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-text-base/80 text-sm font-heading mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              className={`w-full p-3 rounded-md bg-bg-light/50 text-text-base/70 border border-border-color/30 cursor-not-allowed`}
              disabled 
              aria-label="Email (Read-only from authentication)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="arrival_date" className="block text-text-base/80 text-sm font-heading mb-2">
                Arrival Date
              </label>
              <select
                id="arrival_date"
                name="arrival_date"
                value={formData.arrival_date}
                onChange={handleChange}
                className={`w-full p-3 rounded-md bg-bg-light text-text-base border
                  ${
                  errors.arrival_date ? 'border-primary' : 'border-border-color'
                } focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
                disabled={isSubmitting}
                aria-invalid={!!errors.arrival_date}
                aria-describedby={errors.arrival_date ? "arrival-date-error" : undefined}
              >
                <option value="" disabled>Select a date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</option>
                ))}
              </select>
              {errors.arrival_date && <p id="arrival-date-error" className="text-primary text-xs mt-1" role="alert">{errors.arrival_date}</p>}
            </div>

            <div>
              <label htmlFor="arrival_time_of_day" className="block text-text-base/80 text-sm font-heading mb-2">
                ETA (Estimated Time of Arrival)
              </label>
              <select
                id="arrival_time_of_day"
                name="arrival_time_of_day"
                value={formData.arrival_time_of_day}
                onChange={handleChange}
                className={`w-full p-3 rounded-md bg-bg-light text-text-base border
                  ${
                  errors.arrival_time_of_day ? 'border-primary' : 'border-border-color'
                } focus:outline-none focus:ring-2 focus:ring-secondary transition duration-200`}
                disabled={isSubmitting}
                aria-invalid={!!errors.arrival_time_of_day}
                aria-describedby={errors.arrival_time_of_day ? "arrival-time-error" : undefined}
              >
                <option value="" disabled>Select a time</option>
                {availableTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {errors.arrival_time_of_day && <p id="arrival-time-error" className="text-primary text-xs mt-1" role="alert">{errors.arrival_time_of_day}</p>}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-text-base/80 text-sm font-heading mb-2">
                Select Your Drink
            </label>
             <ProductDisplay
                products={products}
                onSelectProduct={onSelectProduct}
                selectedProduct={selectedProduct}
              />
          </div>

          {submitError && (
            <p className="text-primary text-sm mt-2 text-center" role="alert">{submitError}</p>
          )}

          <button
            type="submit"
            className={`w-full p-3 mt-6 rounded-md font-heading uppercase tracking-wider ${
              isSubmitting
                ? 'bg-gray-400 text-gray-800 cursor-not-allowed'
                : 'bg-primary text-text-inverse hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent active:bg-opacity-80'
            } transition duration-300`}
            disabled={isSubmitting}
            aria-live="polite"
          >
            {isSubmitting ? 'Submitting...' : (isEditing ? 'Update Registration' : 'Confirm Registration')}
          </button>
        </>
      )}
    </form>
  );
};
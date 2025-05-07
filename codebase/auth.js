/**
 * Authentication JavaScript
 * Handles user authentication with Firebase
 */

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const forgotPasswordLink = document.querySelector('.forgot-link');

  // Forgot Password functionality
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotPasswordModal();
    });
  }

  // Email/Password Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        showLoading('Logging in...');
        await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Show success message
        hideLoading();
        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: 'Welcome back!',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Redirect to main page after successful login
          window.location.href = 'index.html';
        });
      } catch (error) {
        hideLoading();
        handleAuthError(error);
      }
    });
  }
  
  // Email/Password Sign Up
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm-password').value;
      
      // Validate passwords match
      if (password !== confirmPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Password Mismatch',
          text: 'Passwords do not match. Please try again.',
          confirmButtonColor: '#5046e4'
        });
        return;
      }
      
      try {
        showLoading('Creating your account...');
        // Create user with email and password
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Create user document in Firestore
        await createUserDocument(userCredential.user);
        
        // Show success message
        hideLoading();
        Swal.fire({
          icon: 'success',
          title: 'Account Created',
          text: 'Your account has been created successfully!',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Redirect to main page after successful signup
          window.location.href = 'index.html';
        });
      } catch (error) {
        hideLoading();
        handleAuthError(error);
      }
    });
  }
});

// Sign out functionality
function signOut() {
  firebase.auth().signOut()
    .then(() => {
      window.location.href = 'auth.html';
    })
    .catch((error) => {
      console.error('Sign out error:', error);
    });
}

async function createUserDocument(user, additionalData = {}) {
  if (!user) return;
  
  // Create a reference to the user document
  const userRef = firebase.firestore().collection('users').doc(user.uid);
  
  try {
    // Check if the user document already exists
    const snapshot = await userRef.get();
    
    // If it doesn't exist, create it
    if (!snapshot.exists) {
      const createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      await userRef.set({
        uid: user.uid,
        email: user.email || null,
        createdAt,
        ...additionalData
      });
    }
  } catch (error) {
    console.error('Error creating user document:', error);
  }
}

function handleAuthError(error) {
  console.error('Authentication error:', error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  
  let errorMessage = 'An error occurred during authentication. Please try again.';
  let showSignupSuggestion = false;
  
  // Customize error messages based on error code
  switch (error.code) {
    case 'auth/email-already-in-use':
      errorMessage = 'This email is already associated with an account.';
      break;
    case 'auth/invalid-email':
      errorMessage = 'Invalid email address format.';
      break;
    case 'auth/user-not-found':
      errorMessage = 'Account not found with this email.';
      showSignupSuggestion = true;
      break;
    case 'auth/wrong-password':
      errorMessage = 'Invalid password for this account.';
      break;
    case 'auth/weak-password':
      errorMessage = 'Password is too weak. Use at least 6 characters.';
      break;
    case 'auth/operation-not-allowed':
      errorMessage = 'This sign-in method is not enabled for this project. Please contact the administrator.';
      break;
    case 'auth/network-request-failed':
      errorMessage = 'Network error. Please check your internet connection and try again.';
      break;
    case 'auth/internal-error':
      errorMessage = 'Internal authentication error. Please try again later.';
      break;
  }
  
  if (showSignupSuggestion) {
    Swal.fire({
      icon: 'warning',
      title: 'Account Not Found',
      text: errorMessage,
      confirmButtonColor: '#5046e4',
      showCancelButton: true,
      confirmButtonText: 'Create Account',
      cancelButtonText: 'Try Again',
      footer: '<a href="#" onclick="window.location.reload()">Refresh the page</a>'
    }).then((result) => {
      if (result.isConfirmed) {
        // Switch to signup tab
        const signupTab = document.getElementById('signup-tab');
        if (signupTab) {
          signupTab.click();
          
          // Pre-fill the email if available
          const loginEmail = document.getElementById('login-email').value;
          const signupEmail = document.getElementById('signup-email');
          if (loginEmail && signupEmail) {
            signupEmail.value = loginEmail;
          }
        }
      }
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Authentication Error',
      text: errorMessage,
      confirmButtonColor: '#5046e4',
      footer: '<a href="#" onclick="window.location.reload()">Refresh the page</a>'
    });
  }
}

function showLoading(message = 'Loading...') {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
}

function hideLoading() {
  Swal.close();
}

/**
 * Shows the forgot password modal for password reset
 */
function showForgotPasswordModal() {
  Swal.fire({
    title: 'Reset Password',
    html: `
      <p class="mb-3">Enter your email address and we'll send you a link to reset your password.</p>
      <div class="input-group mb-3">
        <input type="email" id="reset-email" class="swal2-input" placeholder="Enter your email">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Reset Password',
    confirmButtonColor: '#5046e4',
    cancelButtonText: 'Cancel',
    showLoaderOnConfirm: true,
    preConfirm: () => {
      const email = document.getElementById('reset-email').value;
      if (!email) {
        Swal.showValidationMessage('Please enter your email address');
        return false;
      }
      
      return firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
          return true;
        })
        .catch((error) => {
          console.error('Password reset error:', error);
          Swal.showValidationMessage(
            `Password reset failed: ${error.message}`
          );
          return false;
        });
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'success',
        title: 'Reset Email Sent',
        text: 'Please check your email for instructions to reset your password.',
        confirmButtonColor: '#5046e4'
      });
    }
  });
}

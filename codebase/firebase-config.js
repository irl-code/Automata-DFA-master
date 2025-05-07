/**
 * Firebase Configuration
 * This file contains Firebase initialization setup
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbe5JYU3F5Ly4CNTLq8Uy-Yqh-Sdiof44",
  authDomain: "productscan-a6a82.firebaseapp.com",
  projectId: "productscan-a6a82",
  storageBucket: "productscan-a6a82.appspot.com",
  messagingSenderId: "129256558908",
  appId: "1:129256558908:web:1edbb5cf7dd53aa8cece39"
};

// Initialize Firebase with error handling
try {
  console.log('Attempting to initialize Firebase...');
  
  // Initialize Firebase
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase already initialized');
  }
  
  // Log success
  console.log('Firebase auth available:', !!firebase.auth);
  console.log('Firebase firestore available:', !!firebase.firestore);
  
  // Enable persistence for offline capabilities
  firebase.firestore().enablePersistence()
    .then(() => {
      console.log('Firestore persistence enabled');
    })
    .catch((err) => {
      console.warn('Firestore persistence error:', err.code);
    });
    
} catch (error) {
  console.error('Error initializing Firebase:', error);
  console.error('Error details:', error.message);
  
  // Show user-friendly error
  setTimeout(() => {
    Swal.fire({
      icon: 'error',
      title: 'Firebase Connection Error',
      text: 'Could not connect to Firebase. Please check your internet connection and try again.',
      footer: '<a href="#" onclick="window.location.reload()">Refresh the page</a>'
    });
  }, 1000);
}

// Auth and Firestore references
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Listen for auth state changes
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      console.log('User logged in:', user.uid);
      // Store user data in session storage for access across pages
      sessionStorage.setItem('user', JSON.stringify({
        uid: user.uid,
        email: user.email
      }));
    } else {
      // User is signed out
      console.log('User logged out');
      sessionStorage.removeItem('user');
      
      // If not on auth page, redirect to auth page
      if (!window.location.pathname.includes('auth.html')) {
        window.location.href = 'auth.html';
      }
    }
  });
});

/**
 * Get current user data from session storage
 * @returns {Object|null} User data or null if not logged in
 */
function getCurrentUser() {
  const userData = sessionStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

/**
 * Save DFA to Firestore
 * @param {Object} dfaData - The DFA configuration data
 * @returns {Promise<string>} - Returns the document ID
 */
async function saveDFAToFirebase(dfaData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const dfaRef = await db.collection('dfas').add({
      userId: user.uid,
      createdBy: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...dfaData
    });
    
    return dfaRef.id;
  } catch (error) {
    console.error('Error saving DFA:', error);
    throw error;
  }
}

/**
 * Get user's saved DFAs
 * @returns {Promise<Array>} - Array of DFA objects
 */
async function getUserDFAs() {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.error('No authenticated user found when trying to get saved DFAs');
      throw new Error('User not authenticated');
    }
    
    console.log('Fetching DFAs for user:', user.uid);
    
    // Try simpler query first that doesn't need an index
    let snapshot;
    try {
      snapshot = await db.collection('dfas')
        .where('userId', '==', user.uid)
        .get();
    } catch (indexError) {
      console.warn('Error with indexed query:', indexError);
      // If the error is about missing indexes, try a simpler query
      if (indexError.code === 'failed-precondition') {
        snapshot = await db.collection('dfas')
          .where('userId', '==', user.uid)
          .get();
      } else {
        throw indexError; // Re-throw if it's not an index error
      }
    }
    
    console.log('DFA query completed, found documents:', snapshot.size);
    
    // Sort manually since we might not be able to use the orderBy in Firestore
    const docs = snapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure createdAt exists to avoid rendering errors
      if (!data.createdAt) {
        data.createdAt = firebase.firestore.Timestamp.now();
      }
      
      return {
        id: doc.id,
        ...data
      };
    });
    
    // Sort by createdAt manually if timestamps exist
    docs.sort((a, b) => {
      // Handle cases where timestamps might be missing
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      
      // Convert timestamps to milliseconds for comparison
      const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : 
                   (a.createdAt.seconds ? a.createdAt.seconds * 1000 : 0);
      const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : 
                   (b.createdAt.seconds ? b.createdAt.seconds * 1000 : 0);
      
      // Sort descending (newest first)
      return bTime - aTime;
    });
    
    return docs;
  } catch (error) {
    console.error('Error fetching user DFAs:', error);
    // Make the error more user-friendly with guidance on creating indexes
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      const indexError = new Error('The query requires an index. Please create it using the Firebase console.');
      indexError.indexNeeded = true;
      indexError.originalError = error;
      throw indexError;
    }
    throw error;
  }
}

/**
 * Delete a DFA from Firestore
 * @param {string} dfaId - The DFA document ID
 * @returns {Promise<void>}
 */
async function deleteDFA(dfaId) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // First verify the DFA belongs to the user
    const dfaDoc = await db.collection('dfas').doc(dfaId).get();
    
    if (!dfaDoc.exists) {
      throw new Error('DFA not found');
    }
    
    if (dfaDoc.data().userId !== user.uid) {
      throw new Error('Unauthorized: This DFA belongs to another user');
    }
    
    await db.collection('dfas').doc(dfaId).delete();
  } catch (error) {
    console.error('Error deleting DFA:', error);
    throw error;
  }
}
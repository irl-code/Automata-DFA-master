/**
 * DFA Simulator - Main JavaScript
 * Handles the creation, validation and simulation of Deterministic Finite Automatons
 */

// Firebase Authentication Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in
      console.log('User is signed in:', user.email);
      showLoggedInUI(user);
    } else {
      // User is not signed in, redirect to auth.html
      console.log('No user is signed in, redirecting to login page');
      window.location.href = 'auth.html';
    }
  });
  
  // Setup sign-out button
  const signOutButton = document.getElementById('sign-out-button');
  if (signOutButton) {
    signOutButton.addEventListener('click', function() {
      firebase.auth().signOut().then(() => {
        console.log('User signed out successfully');
      }).catch((error) => {
        console.error('Sign out error:', error);
      });
    });
  }
});

// Show UI elements for logged in users
function showLoggedInUI(user) {
  const userDisplay = document.getElementById('user-display');
  const signOutButton = document.getElementById('sign-out-button');
  const saveDfaContainer = document.querySelector('.save-dfa-container');
  const myDfasContainer = document.querySelector('.my-dfas-container');
  
  if (userDisplay) {
    userDisplay.innerHTML = `<span class="badge bg-success me-2"><i class="fas fa-user me-1"></i> ${user.email}</span>`;
  }
  
  if (signOutButton) {
    signOutButton.classList.remove('d-none');
  }
  
  if (saveDfaContainer) {
    saveDfaContainer.classList.remove('d-none');
  }
  
  if (myDfasContainer) {
    myDfasContainer.classList.remove('d-none');
    loadSavedDFAs();
  }
  
  // Set up save DFA functionality
  const openSaveDfaModalButton = document.getElementById('open-save-dfa-modal');
  const saveDfaButton = document.getElementById('save-dfa-btn');
  
  if (openSaveDfaModalButton) {
    openSaveDfaModalButton.addEventListener('click', function() {
      const saveDfaModal = new bootstrap.Modal(document.getElementById('saveDFAModal'));
      saveDfaModal.show();
    });
  }
  
  if (saveDfaButton) {
    saveDfaButton.addEventListener('click', function() {
      saveDFA();
    });
  }
}

// Load user's saved DFAs
function loadSavedDFAs() {
  const savedDfasList = document.getElementById('saved-dfas-list');
  if (!savedDfasList) return;
  
  savedDfasList.innerHTML = `
    <p class="text-center text-muted">
      <i class="fas fa-spinner fa-spin mb-3"></i><br />
      Loading your saved DFAs...
    </p>
  `;
  
  // Make sure current user is available
  const user = getCurrentUser();
  if (!user) {
    console.error('No authenticated user found when loading DFAs UI');
    savedDfasList.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        You need to be logged in to view your saved DFAs.
      </div>
    `;
    return;
  }
  
  // Log that we're trying to load DFAs
  console.log('Loading saved DFAs for user:', user.email);
  
  // Use the getUserDFAs function to fetch saved DFAs from Firebase
  getUserDFAs()
    .then(dfas => {
      console.log('Successfully retrieved DFAs:', dfas.length);
      
      if (dfas.length === 0) {
        savedDfasList.innerHTML = `
          <div class="text-center p-4">
            <i class="fas fa-lightbulb fa-2x mb-3 text-warning"></i>
            <h5>No DFAs Yet</h5>
            <p class="text-muted mb-3">You haven't saved any DFAs yet.</p>
            <p><button class="btn btn-sm btn-primary" id="create-first-dfa">
              <i class="fas fa-plus-circle me-1"></i> Create Your First DFA
            </button></p>
          </div>
        `;
        
        // Add event listener to the create button
        const createButton = document.getElementById('create-first-dfa');
        if (createButton) {
          createButton.addEventListener('click', () => {
            console.log('Create first DFA button clicked');
            
            // Find any DFA creation form elements - try different selectors
            const dfaBuilderSection = document.querySelector('.dfa-builder-section') || 
                                     document.querySelector('#dfa-builder') ||
                                     document.querySelector('#transition-table-form');
                                     
            // If we found a DFA builder section, scroll to it
            if (dfaBuilderSection) {
              console.log('Found DFA builder section, scrolling to it');
              dfaBuilderSection.scrollIntoView({ behavior: 'smooth' });
            } else {
              // Otherwise focus on the state input field if it exists
              console.log('No DFA builder section found, focusing on state input');
              const stateInput = document.getElementById('state-set');
              if (stateInput) {
                stateInput.focus();
                // Scroll to the section containing this input
                stateInput.scrollIntoView({ behavior: 'smooth' });
              } else {
                // If all else fails, scroll to the bottom of the page where the form likely is
                console.log('No state input found, scrolling to bottom of page');
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }
            
            // Highlight the state-set input field to draw attention
            const stateSetInput = document.getElementById('state-set');
            if (stateSetInput) {
              stateSetInput.classList.add('highlight-input');
              setTimeout(() => {
                stateSetInput.classList.remove('highlight-input');
              }, 2000);
            }
            
            // Show a tooltip to guide the user
            Swal.fire({
              icon: 'info',
              title: 'Create a New DFA',
              text: 'Enter your states and alphabet, then click "Generate Transition Table" to begin creating your DFA.',
              confirmButtonColor: '#3498db',
              timer: 5000,
              timerProgressBar: true
            });
          });
        }
        return;
      }
      
      let html = '';
      dfas.forEach(dfa => {
        // Format the date or use a default value
        let dateStr = 'Unknown date';
        try {
          if (dfa.createdAt && typeof dfa.createdAt.toDate === 'function') {
            dateStr = new Date(dfa.createdAt.toDate()).toLocaleDateString();
          } else if (dfa.updatedAt) {
            dateStr = new Date(dfa.updatedAt).toLocaleDateString();
          }
        } catch (e) {
          console.warn('Error formatting date for DFA:', e);
        }
        
        html += `
          <div class="saved-dfa-item">
            <h5>${dfa.name || 'Unnamed DFA'}</h5>
            <p class="small text-muted mb-1">
              ${dateStr}
            </p>
            <div class="saved-dfa-actions">
              <button class="btn btn-sm btn-primary load-dfa" data-dfa-id="${dfa.id}">
                <i class="fas fa-upload me-1"></i> Load
              </button>
              <button class="btn btn-sm btn-outline-danger delete-dfa" data-dfa-id="${dfa.id}">
                <i class="fas fa-trash me-1"></i> Delete
              </button>
            </div>
          </div>
        `;
      });
      
      savedDfasList.innerHTML = html;
      
      // Add event listeners for load and delete buttons
      document.querySelectorAll('.load-dfa').forEach(button => {
        button.addEventListener('click', function() {
          const dfaId = this.getAttribute('data-dfa-id');
          loadDFA(dfaId);
        });
      });
      
      document.querySelectorAll('.delete-dfa').forEach(button => {
        button.addEventListener('click', function() {
          const dfaId = this.getAttribute('data-dfa-id');
          confirmDeleteDFA(dfaId);
        });
      });
    })
    .catch(error => {
      console.error('Error loading DFAs:', error);
      savedDfasList.innerHTML = `
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center p-4">
            <i class="fas fa-sync fa-2x mb-3 text-primary"></i>
            <h5>Unable to Load DFAs</h5>
            <p class="text-muted mb-3">We couldn't load your saved DFAs at this moment.</p>
            <p class="small text-danger mb-3">Error: ${error.message}</p>
            <button class="btn btn-outline-primary btn-sm retry-load-dfas">
              <i class="fas fa-redo me-1"></i> Try Again
            </button>
          </div>
        </div>
      `;
      
      // Add event listener to the retry button
      const retryButton = document.querySelector('.retry-load-dfas');
      if (retryButton) {
        retryButton.addEventListener('click', loadSavedDFAs);
      }
    });
}

// Save current DFA to Firebase
function saveDFA() {
  // Get data from form
  const dfaName = document.getElementById('dfa-name').value.trim();
  const dfaDescription = document.getElementById('dfa-description').value.trim();
  
  if (!dfaName) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Name',
      text: 'Please enter a name for your DFA.',
      confirmButtonColor: '#3498db'
    });
    return;
  }
  
  try {
    // Check if the transition table was generated first
    const tableGenerated = document.getElementById('transition-table-generated').value === 'true';
    if (!tableGenerated) {
      Swal.fire({
        icon: 'warning',
        title: 'Transition Table Required',
        text: 'Please generate the transition table first by defining states and alphabet, then clicking the "Generate Transition Table" button.',
        confirmButtonColor: '#3498db'
      });
      return;
    }
    
    // Collect DFA data
    const states = document.getElementById('state-set').value.split(',').map(s => s.trim()).filter(Boolean);
    const alphabet = document.getElementById('alphabet-set').value.split(',').map(a => a.trim()).filter(Boolean);
    const initialState = document.getElementById('initial-state').value.trim();
    const acceptStates = document.getElementById('accept-states').value.split(',').map(f => f.trim()).filter(Boolean);
    
    // Validate required fields
    if (states.length === 0) {
      throw new Error('Please define states (Q) for your DFA');
    }
    
    if (alphabet.length === 0) {
      throw new Error('Please define input alphabet (Σ) for your DFA');
    }
    
    if (!initialState) {
      throw new Error('Please specify an initial state (q₀)');
    }
    
    if (acceptStates.length === 0) {
      throw new Error('Please specify at least one accepting state (F)');
    }
    
    // Check if transitions are defined
    const transitionCells = document.querySelectorAll('.transition-cell');
    if (transitionCells.length === 0) {
      throw new Error('Please generate the transition table first');
    }
    
    // Check if all transition cells are filled
    let allTransitionsFilled = true;
    let emptyCellCount = 0;
    
    transitionCells.forEach(cell => {
      if (!cell.value.trim()) {
        allTransitionsFilled = false;
        emptyCellCount++;
      }
    });
    
    if (!allTransitionsFilled) {
      throw new Error(`Please fill in all transitions (${emptyCellCount} cells are empty)`);
    }
    
    // Collect transition table
    const transitionTable = {};
    states.forEach(state => {
      transitionTable[state] = {};
    });
    
    transitionCells.forEach(cell => {
      const fromState = cell.getAttribute('data-from');
      const input = cell.getAttribute('data-input');
      const toState = cell.value.trim();
      
      if (!transitionTable[fromState]) {
        transitionTable[fromState] = {};
      }
      
      transitionTable[fromState][input] = toState;
    });
    
    // Optionally save test strings
    const inputString = document.getElementById('input-string').value.trim();
    const testStrings = inputString ? [inputString] : [];
    
    // Prepare DFA data
    const dfaData = {
      name: dfaName,
      description: dfaDescription || '',
      states: states,
      alphabet: alphabet,
      initialState: initialState,
      acceptStates: acceptStates,
      transitionTable: transitionTable,
      testStrings: testStrings,
      updatedAt: new Date()
    };
    
    console.log('Attempting to save DFA with data:', dfaData);
    
    // Show loading
    Swal.fire({
      title: 'Saving DFA...',
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false
    });
    
    // Direct call to Firebase instead of using the helper function which may be undefined
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Save directly to Firebase
    firebase.firestore().collection('dfas').add({
      userId: user.uid,
      createdBy: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...dfaData
    })
    .then((docRef) => {
      console.log('DFA saved successfully with ID:', docRef.id);
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('saveDFAModal'));
      if (modal) modal.hide();
      
      // Show success
      Swal.fire({
        icon: 'success',
        title: 'DFA Saved',
        text: 'Your DFA has been saved successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Reload saved DFAs
      setTimeout(() => loadSavedDFAs(), 500);
    })
    .catch(error => {
      console.error('Firebase error saving DFA:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: `Failed to save your DFA: ${error.message}`,
        confirmButtonColor: '#3498db'
      });
    });
    
  } catch (error) {
    console.error('Error preparing DFA data:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Cannot Save DFA',
      text: error.message,
      confirmButtonColor: '#3498db'
    });
  }
}

// Confirm DFA deletion
function confirmDeleteDFA(dfaId) {
  Swal.fire({
    title: 'Delete DFA?',
    text: "This action cannot be undone!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!'
  }).then((result) => {
    if (result.isConfirmed) {
      deleteDFA(dfaId)
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Your DFA has been deleted.',
            timer: 2000,
            showConfirmButton: false
          });
          
          loadSavedDFAs();
        })
        .catch(error => {
          console.error('Error deleting DFA:', error);
          
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: 'Failed to delete the DFA. Please try again.',
            confirmButtonColor: '#3498db'
          });
        });
    }
  });
}

// Load DFA from Firebase
function loadDFA(dfaId) {
  // Show loading
  Swal.fire({
    title: 'Loading DFA...',
    didOpen: () => {
      Swal.showLoading();
    },
    allowOutsideClick: false,
    showConfirmButton: false
  });
  
  // Get DFA document from Firestore
  firebase.firestore().collection('dfas').doc(dfaId).get()
    .then(doc => {
      if (!doc.exists) {
        throw new Error('DFA not found');
      }
      
      const data = doc.data();
      
      // Populate form with DFA data
      document.getElementById('state-set').value = data.states.join(', ');
      document.getElementById('alphabet-set').value = data.alphabet.join(', ');
      document.getElementById('initial-state').value = data.initialState;
      document.getElementById('accept-states').value = data.acceptStates.join(', ');
      
      // Generate transition table
      document.getElementById('generate-table').click();
      
      // Wait for table to be generated
      setTimeout(() => {
        // Fill in transitions
        const transitionCells = document.querySelectorAll('.transition-cell');
        transitionCells.forEach(cell => {
          const fromState = cell.getAttribute('data-from');
          const input = cell.getAttribute('data-input');
          
          if (data.transitionTable[fromState] && data.transitionTable[fromState][input]) {
            cell.value = data.transitionTable[fromState][input];
          }
        });
        
        // Close loading
        Swal.fire({
          icon: 'success',
          title: 'DFA Loaded',
          text: `"${data.name}" has been loaded successfully.`,
          timer: 2000,
          showConfirmButton: false
        });
      }, 500);
    })
    .catch(error => {
      console.error('Error loading DFA:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Load Failed',
        text: 'Failed to load the DFA. Please try again.',
        confirmButtonColor: '#3498db'
      });
    });
}

// Generate transition table UI based on states and alphabet input
document.getElementById('generate-table').addEventListener('click', function() {
    const stateSet = document.getElementById('state-set').value.trim();
    const alphabetSet = document.getElementById('alphabet-set').value.trim();
    
    if (!stateSet || !alphabetSet) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please enter both states and input alphabet symbols.',
            confirmButtonColor: '#3498db'
        });
        return;
    }
    
    const states = stateSet.split(',').map(s => s.trim());
    const alphabet = alphabetSet.split(',').map(a => a.trim());
    
    // Create transition table
    const tableContainer = document.getElementById('transition-table-container');
    const tableWrapper = document.getElementById('transition-table-wrapper');
    
    // Create the HTML for the table
    let tableHTML = '<table class="transition-matrix">';
    
    // Header row with alphabet symbols
    tableHTML += '<thead><tr><th></th>';
    alphabet.forEach(symbol => {
        tableHTML += `<th><span class="badge-input">${symbol}</span></th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Create a row for each state
    states.forEach(state => {
        tableHTML += `<tr><td class="state-label"><span class="badge-state">${state}</span></td>`;
        
        // Create an input cell for each alphabet symbol
        alphabet.forEach(symbol => {
            tableHTML += `<td><input type="text" class="transition-cell" 
                           data-from="${state}" data-input="${symbol}" 
                           placeholder="next state" list="states-list" required></td>`;
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    
    // Add datalist for state suggestions
    tableHTML += '<datalist id="states-list">';
    states.forEach(state => {
        tableHTML += `<option value="${state}">`;
    });
    tableHTML += '</datalist>';
    
    // Set the HTML and show the table
    tableWrapper.innerHTML = tableHTML;
    tableContainer.classList.remove('d-none');
    
    // Copy state and alphabet values to hidden fields for form validation
    document.getElementById('initial-state').value = states[0];
    document.getElementById('accept-states').value = states[states.length - 1];
    
    // Update hidden field to indicate table is generated
    document.getElementById('transition-table-generated').value = 'true';
});

// Handle form submission
document.getElementById('transition-table-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Check if table was generated
    const tableGenerated = document.getElementById('transition-table-generated').value === 'true';
    if (!tableGenerated) {
        Swal.fire({
            icon: 'warning',
            title: 'Transition Table Missing',
            text: 'Please generate the transition table first by clicking the "Generate Transition Table" button.',
            confirmButtonColor: '#3498db'
        });
        return;
    }
    
    // Get data from visual builder
    const states = document.getElementById('state-set').value.split(',').map(s => s.trim());
    const inputs = document.getElementById('alphabet-set').value.split(',').map(i => i.trim());
    const initialState = document.getElementById('initial-state').value.trim();
    const finalStates = document.getElementById('accept-states').value.split(',').map(f => f.trim());
    const inputString = document.getElementById('input-string').value.trim();
    
    // Collect transition data from the visual table
    const transitionsRaw = [];
    const transitionCells = document.querySelectorAll('.transition-cell');
    let allCellsFilled = true;
    
    transitionCells.forEach(cell => {
        const fromState = cell.getAttribute('data-from');
        const input = cell.getAttribute('data-input');
        const toState = cell.value.trim();
        
        if (!toState) {
            allCellsFilled = false;
            // Highlight empty cell
            cell.classList.add('is-invalid');
        } else {
            cell.classList.remove('is-invalid');
            transitionsRaw.push(`${fromState},${input}=${toState}`);
        }
    });
    
    // Validate all transition cells are filled
    if (!allCellsFilled) {
        Swal.fire({
            icon: 'error',
            title: 'Incomplete Transition Table',
            text: 'Please fill in all transition cells in the table. Each state must have a defined transition for each input symbol.',
            confirmButtonColor: '#3498db'
        });
        return;
    }

    // Show loading indicator
    document.getElementById('result').innerHTML = `
        <div class="text-center p-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Processing DFA...</p>
        </div>
    `;
    
    // Process transitions after a short delay to show loading effect
    setTimeout(() => {
        processTransitions(states, inputs, transitionsRaw, initialState, finalStates, inputString);
    }, 400);
});

/**
 * Process the transition table and simulate the DFA
 */
function processTransitions(states, inputs, transitionsRaw, initialState, finalStates, inputString) {
    var transitionTable = {};
    transitionsRaw.forEach(transition => {
        if (!transition) return; // Skip empty transitions
        var [from, to] = transition.split('=');
        var [state, input] = from.split(',');
        state = state.trim();
        input = input.trim();
        to = to.trim();
        
        if (!transitionTable[state]) {
            transitionTable[state] = {};
        }
        
        transitionTable[state][input] = to;
    });
    
    // Check for invalid entries
    const validationResult = validateTransitions(states, inputs, transitionTable, initialState, finalStates);
    if (!validationResult.isValid) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Transition Table',
            text: 'Please ensure all states and inputs are valid and properly formatted.',
            confirmButtonColor: '#3498db'
        });
        
        // Show error message in result area too
        document.getElementById('result').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Error:</strong> Invalid transition table configuration.
                <ul class="mb-0 mt-2">
                    ${validationResult.errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
        return;
    }
    
    // Trace the execution path
    var executionPath = traceExecutionPath(transitionTable, initialState, inputString);
    var isAccepted = finalStates.includes(executionPath[executionPath.length - 1].state);
    
    // Display results
    displayTransitionTable(transitionTable, inputs, states);
    displayExecutionPath(executionPath, isAccepted);
    
    // Show SweetAlert notification
    Swal.fire({
        icon: isAccepted ? 'success' : 'error',
        title: isAccepted ? 'String Accepted' : 'String Rejected',
        text: isAccepted ? 
            `The input string "${inputString}" is accepted by the DFA.` : 
            `The input string "${inputString}" is rejected by the DFA.`,
        confirmButtonColor: '#3498db'
    });
}

/**
 * Validate transition table
 * @returns {Object} Object with isValid boolean and error message if invalid
 */
function validateTransitions(states, inputs, table, initialState, finalStates) {
    // Object to hold validation results and specific error messages
    const validationResult = {
        isValid: true,
        errors: []
    };
    
    // Check if initial state exists in states list
    if (!states.includes(initialState)) {
        validationResult.isValid = false;
        validationResult.errors.push(`Initial state "${initialState}" is not defined in states list`);
    }
    
    // Check if all final states are valid
    for (let finalState of finalStates) {
        if (!states.includes(finalState)) {
            validationResult.isValid = false;
            validationResult.errors.push(`Accepting state "${finalState}" is not defined in states list`);
        }
    }
    
    // Check all transitions
    for (let state in table) {
        // Check if the "from" state exists
        if (!states.includes(state)) {
            validationResult.isValid = false;
            validationResult.errors.push(`State "${state}" in transition table is not defined in states list`);
        }
        
        // Check transitions for each input
        for (let input in table[state]) {
            // Check if input is valid
            if (!inputs.includes(input)) {
                validationResult.isValid = false;
                validationResult.errors.push(`Input "${input}" for state "${state}" is not defined in alphabet list`);
            }
            
            const toState = table[state][input];
            // Check if destination state is valid
            if (!states.includes(toState)) {
                validationResult.isValid = false;
                validationResult.errors.push(`Transition from "${state}" on input "${input}" goes to undefined state "${toState}"`);
            }
        }
        
        // Check if all inputs have transitions defined
        for (let input of inputs) {
            if (!table[state] || table[state][input] === undefined) {
                validationResult.isValid = false;
                validationResult.errors.push(`Missing transition for state "${state}" on input "${input}"`);
            }
        }
    }
    
    // Make sure all states have transitions defined
    for (let state of states) {
        if (!table[state]) {
            validationResult.isValid = false;
            validationResult.errors.push(`No transitions defined for state "${state}"`);
        }
    }
    
    return validationResult;
}

/**
 * Display transition table in the results area
 */
function displayTransitionTable(table, inputs, states) {
    var resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    
    // Create transition table card
    var tableCard = document.createElement('div');
    tableCard.className = 'mb-4';
    
    // Add transition table heading
    var tableHeading = document.createElement('h5');
    tableHeading.className = 'mb-3';
    tableHeading.innerHTML = '<i class="fas fa-table me-2"></i> Transition Table';
    tableCard.appendChild(tableHeading);
    
    // Create table
    var tableHtml = '<div class="table-responsive"><table class="table table-bordered table-hover">';
    
    // Table header
    tableHtml += '<thead><tr class="table-dark"><th>State</th>';
    inputs.forEach(input => {
        tableHtml += `<th>δ(q,${input})</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    // Table body - ensure all states are displayed even if they don't have transitions
    states.forEach(state => {
        tableHtml += `<tr><td><strong>${state}</strong></td>`;
        
        inputs.forEach(input => {
            const nextState = table[state] && table[state][input] ? table[state][input] : '—';
            tableHtml += `<td>${nextState}</td>`;
        });
        
        tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table></div>';
    tableCard.innerHTML += tableHtml;
    resultDiv.appendChild(tableCard);
}

/**
 * Trace execution path of the input string in the DFA
 */
function traceExecutionPath(table, initialState, inputString) {
    let path = [{
        step: 0,
        input: 'Start',
        state: initialState,
        description: 'Initial state'
    }];
    
    let currentState = initialState;
    
    for (let i = 0; i < inputString.length; i++) {
        const char = inputString[i];
        
        if (!table[currentState] || !table[currentState][char]) {
            // No valid transition exists
            path.push({
                step: i + 1,
                input: char,
                state: 'Error',
                description: 'No valid transition'
            });
            break;
        }
        
        currentState = table[currentState][char];
        path.push({
            step: i + 1,
            input: char,
            state: currentState,
            description: `Transition on input '${char}'`
        });
    }
    
    return path;
}

/**
 * Display execution path in the results area
 */
function displayExecutionPath(path, isAccepted) {
    var resultDiv = document.getElementById('result');
    
    // Create execution path card
    var pathCard = document.createElement('div');
    pathCard.className = 'mb-4';
    
    // Add execution path heading
    var pathHeading = document.createElement('h5');
    pathHeading.className = 'mb-3';
    pathHeading.innerHTML = '<i class="fas fa-route me-2"></i> Execution Path';
    pathCard.appendChild(pathHeading);
    
    // Create table for execution path
    var pathHtml = '<div class="table-responsive"><table class="table table-sm table-bordered">';
    pathHtml += '<thead><tr class="table-dark"><th>Step</th><th>Input</th><th>State</th><th>Description</th></tr></thead><tbody>';
    
    path.forEach(step => {
        let rowClass = '';
        if (step.step === 0) {
            rowClass = 'table-primary';
        } else if (step.state === 'Error') {
            rowClass = 'table-danger';
        } else if (step.step === path.length - 1) {
            rowClass = isAccepted ? 'table-success' : 'table-warning';
        }
        
        pathHtml += `<tr class="${rowClass}">
            <td>${step.step}</td>
            <td>${step.input}</td>
            <td><strong>${step.state}</strong></td>
            <td>${step.description}</td>
        </tr>`;
    });
    
    pathHtml += '</tbody></table></div>';
    pathCard.innerHTML += pathHtml;
    resultDiv.appendChild(pathCard);
    
    // Add result badge
    var resultBadge = document.createElement('div');
    resultBadge.className = isAccepted ? 
        'alert alert-success d-flex align-items-center' : 
        'alert alert-danger d-flex align-items-center';
    
    resultBadge.innerHTML = `
        <i class="${isAccepted ? 'fas fa-check-circle' : 'fas fa-times-circle'} me-2"></i>
        <div>
            <strong>Result:</strong> String is ${isAccepted ? 'accepted' : 'rejected'} by the DFA.
        </div>
    `;
    
    resultDiv.appendChild(resultBadge);
}
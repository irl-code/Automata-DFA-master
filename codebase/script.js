/**
 * DFA Simulator - Main JavaScript
 * Handles the creation, validation and simulation of Deterministic Finite Automatons
 */

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
    if (!validateTransitions(states, inputs, transitionTable, initialState, finalStates)) {
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
                    <li>Ensure all states are declared</li>
                    <li>Check that all inputs are valid</li>
                    <li>Verify initial and final states exist in states list</li>
                    <li>Make sure all transitions point to valid states</li>
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
 */
function validateTransitions(states, inputs, table, initialState, finalStates) {
    if (!states.includes(initialState)) {
        return false;
    }
    for (let finalState of finalStates) {
        if (!states.includes(finalState)) {
            return false;
        }
    }
    for (let state in table) {
        if (!states.includes(state)) {
            return false;
        }
        for (let input in table[state]) {
            if (!inputs.includes(input) || !states.includes(table[state][input])) {
                return false;
            }
        }
    }
    return true;
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
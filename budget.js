let budget = 2100000; // Start with bonus included
let bonusApplied = false;
let budgetHistory = [];

function getBudget() {
    return budget;
}

function updateBudget(amount, description = 'Budget Update') {
    const newBudget = budget + amount;
    if (newBudget < 0) {
        return false; // Not enough funds
    }
    
    // Record transaction
    const transaction = {
        amount: amount,
        timestamp: new Date().toISOString(),
        description: description,
        newBudget: newBudget,
        oldBudget: budget
    };
    budgetHistory.push(transaction);
    
    // Update budget
    budget = newBudget;
    updateBudgetDisplays();
    return true;
}

function updateBudgetDisplays() {
    // Update budget on main page
    const mainBudget = document.getElementById('budgetAmount');
    if (mainBudget) {
        mainBudget.textContent = budget.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    }
    
    // Update all budget displays
    const budgetDisplays = document.querySelectorAll('.budget-info span');
    budgetDisplays.forEach(display => {
        display.textContent = budget.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    });
    
    // Update budget history
    updateBudgetHistory();
}

function updateBudgetHistory() {
    const historyElement = document.getElementById('budgetHistory');
    if (historyElement) {
        const historyHtml = budgetHistory.map((trans, index) => `
            <div class="budget-history-item ${trans.amount < 0 ? 'text-danger' : 'text-success'}">
                <span class="transaction-amount">${trans.amount.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</span>
                <span class="transaction-description">${trans.description}</span>
                <span class="transaction-time">${new Date(trans.timestamp).toLocaleTimeString()}</span>
            </div>
        `).join('');
        historyElement.innerHTML = historyHtml;
    }
}

function applyBonus() {
    if (!bonusApplied) {
        const bonusAmount = 2000000;
        updateBudget(bonusAmount, 'One-time Bonus');
        bonusApplied = true;
        
        // Show bonus message
        const message = document.createElement('div');
        message.className = 'alert alert-success';
        message.innerHTML = `
            <strong>Special Bonus!</strong> You've received a one-time bonus of $2,000,000!
            <p class="small">This bonus can only be received once per session.</p>
        `;
        document.body.appendChild(message);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            message.remove();
        }, 5000);
    }
}

// Expose budget functions to other pages
window.budget = {
    getBudget,
    updateBudget
};

// Listen for budget updates from other pages
window.addEventListener('message', (event) => {
    if (event.data.type === 'budgetUpdate') {
        budget = event.data.data;
        updateBudgetDisplays();
    }
});

// Initialize budget display
document.addEventListener('DOMContentLoaded', () => {
    updateBudgetDisplays();
    applyBonus(); // Apply bonus on page load
});

// Add budget history section to DOM
document.addEventListener('DOMContentLoaded', () => {
    const budgetHistory = document.createElement('div');
    budgetHistory.id = 'budgetHistory';
    budgetHistory.className = 'budget-history';
    budgetHistory.innerHTML = `
        <h4>Budget History</h4>
        <div class="budget-history-items"></div>
    `;
    document.body.appendChild(budgetHistory);
});

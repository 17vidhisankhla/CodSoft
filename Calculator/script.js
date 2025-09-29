(function() {
	'use strict';

	/**
	 * Calculator state
	 */
	const state = {
		currentInput: '0',
		storedValue: null,
		pendingOperator: null,
		justEvaluated: false,
		history: ''
	};

	const outputEl = document.getElementById('output');
	const historyEl = document.getElementById('history');
	const keysEl = document.querySelector('.keys');

	// Utilities
	const isFiniteNumber = (v) => Number.isFinite(v) && !Number.isNaN(v);
	const clampDisplay = (str) => {
		if (str.length <= 18) return str;
		// Switch to exponential for very long values
		const num = Number(str);
		if (!Number.isFinite(num)) return 'Error';
		return num.toExponential(10).replace(/\+?0*(?=\d)/, '');
	};

	function updateDisplay() {
		outputEl.textContent = clampDisplay(state.currentInput);
		historyEl.textContent = state.history;
	}

	function clearAll() {
		state.currentInput = '0';
		state.storedValue = null;
		state.pendingOperator = null;
		state.justEvaluated = false;
		state.history = '';
		updateDisplay();
	}

	function clearEntry() {
		state.currentInput = '0';
		state.justEvaluated = false;
		updateDisplay();
	}

	function backspace() {
		if (state.justEvaluated) return; // no-op right after equals
		if (state.currentInput.length <= 1) {
			state.currentInput = '0';
		} else {
			state.currentInput = state.currentInput.slice(0, -1);
		}
		updateDisplay();
	}

	function inputDigit(d) {
		if (state.justEvaluated) {
			state.currentInput = String(d);
			state.justEvaluated = false;
			state.history = '';
			return updateDisplay();
		}
		if (state.currentInput === '0') {
			state.currentInput = String(d);
		} else {
			state.currentInput += String(d);
		}
		updateDisplay();
	}

	function inputDecimal() {
		if (state.justEvaluated) {
			state.currentInput = '0.';
			state.justEvaluated = false;
			state.history = '';
			return updateDisplay();
		}
		if (!state.currentInput.includes('.')) {
			state.currentInput += '.';
			updateDisplay();
		}
	}

	function toggleSign() {
		if (state.currentInput === '0') return;
		if (state.currentInput.startsWith('-')) {
			state.currentInput = state.currentInput.slice(1);
		} else {
			state.currentInput = '-' + state.currentInput;
		}
		updateDisplay();
	}

	function toNumber(str) {
		const n = Number(str);
		return Number.isFinite(n) ? n : NaN;
	}

	// Safe operations with rounding to minimize floating errors
	function roundSmart(n) {
		return Math.round(n * 1e12) / 1e12; // 12 dp
	}

	function compute(a, b, operator) {
		switch (operator) {
			case 'add': return roundSmart(a + b);
			case 'subtract': return roundSmart(a - b);
			case 'multiply': return roundSmart(a * b);
			case 'divide': return b === 0 ? NaN : roundSmart(a / b);
			default: return b;
		}
	}

	function setOperator(op) {
		const inputNumber = toNumber(state.currentInput);
		if (!isFiniteNumber(inputNumber)) {
			state.currentInput = 'Error';
			state.storedValue = null;
			state.pendingOperator = null;
			state.history = '';
			state.justEvaluated = true;
			return updateDisplay();
		}

		if (state.storedValue === null || state.justEvaluated) {
			state.storedValue = inputNumber;
		} else if (state.pendingOperator) {
			state.storedValue = compute(state.storedValue, inputNumber, state.pendingOperator);
		}

		state.pendingOperator = op;
		state.currentInput = '0';
		state.justEvaluated = false;
		state.history = `${clampDisplay(String(state.storedValue))} ${symbolFor(op)}`;
		updateDisplay();
	}

	function symbolFor(op) {
		switch (op) {
			case 'add': return '+';
			case 'subtract': return '−';
			case 'multiply': return '×';
			case 'divide': return '÷';
			default: return '';
		}
	}

	function percent() {
		const n = toNumber(state.currentInput);
		if (!isFiniteNumber(n)) return;
		// If an operator and stored value exist, percent is relative to stored
		if (state.storedValue !== null && state.pendingOperator) {
			state.currentInput = String(roundSmart(state.storedValue * n / 100));
		} else {
			state.currentInput = String(roundSmart(n / 100));
		}
		updateDisplay();
	}

	function equals() {
		const inputNumber = toNumber(state.currentInput);
		if (state.pendingOperator === null) {
			state.history = '';
			state.justEvaluated = true;
			return updateDisplay();
		}
		const result = compute(state.storedValue ?? 0, inputNumber, state.pendingOperator);
		state.history = `${clampDisplay(String(state.storedValue))} ${symbolFor(state.pendingOperator)} ${clampDisplay(String(inputNumber))} =`;
		state.currentInput = isFiniteNumber(result) ? String(result) : 'Error';
		state.storedValue = null;
		state.pendingOperator = null;
		state.justEvaluated = true;
		updateDisplay();
	}

	// Event handlers
	keysEl.addEventListener('click', (e) => {
		const btn = e.target.closest('button.key');
		if (!btn) return;
		const { digit, action, operator } = btn.dataset;

		if (digit !== undefined) return inputDigit(digit);
		if (action === 'decimal') return inputDecimal();
		if (action === 'negate') return toggleSign();
		if (action === 'percent') return percent();
		if (action === 'backspace') return backspace();
		if (action === 'all-clear') return clearAll();
		if (action === 'clear-entry') return clearEntry();
		if (action === 'equals') return equals();
		if (operator) return setOperator(operator);
	});

	// Keyboard support
	document.addEventListener('keydown', (e) => {
		const key = e.key;
		if (/^\d$/.test(key)) return inputDigit(key);
		if (key === '.') return inputDecimal();
		if (key === '+' ) return setOperator('add');
		if (key === '-' ) return setOperator('subtract');
		if (key === '*' ) return setOperator('multiply');
		if (key === '/' ) return setOperator('divide');
		if (key === '%' ) return percent();
		if (key === '=' || key === 'Enter') return equals();
		if (key === 'Backspace') return backspace();
		if (key === 'Delete') return clearEntry();
		if (key.toLowerCase() === 'c' || key === 'Escape') return clearAll();
	});

	// Initialize
	updateDisplay();
})(); 
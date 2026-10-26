const menuButton = document.querySelector('#menuButton');
const modeMenu = document.querySelector('#modeMenu');
const modeTitle = document.querySelector('#modeTitle');
const modeLabel = document.querySelector('#modeLabel');
const footerText = document.querySelector('#footerText');
const modePanels = {
  basic: document.querySelector('#basicPanel'),
  units: document.querySelector('#unitsPanel'),
  currency: document.querySelector('#currencyPanel')
};

const modeDetails = {
  basic: ['Calculator', 'THE EVERYDAY ONE', 'a tiny tool for big brain moments'],
  units: ['Unit converter', 'SAME THING, DIFFERENT UNITS', 'from here to over there'],
  currency: ['Money converter', 'EXCHANGE RATE TIME', 'rates change, so this one checks online']
};

function setMode(mode) {
  Object.entries(modePanels).forEach(([name, panel]) => {
    panel.hidden = name !== mode;
  });
  [modeTitle.textContent, modeLabel.textContent, footerText.textContent] = modeDetails[mode];
  modeMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  if (mode === 'currency') updateCurrency();
}

menuButton.addEventListener('click', () => {
  const willOpen = modeMenu.hidden;
  modeMenu.hidden = !willOpen;
  menuButton.setAttribute('aria-expanded', String(willOpen));
});

modeMenu.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mode]');
  if (button) setMode(button.dataset.mode);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.menu-wrap')) {
    modeMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    modeMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

const screenValue = document.querySelector('#screenValue');
const expression = document.querySelector('#expression');
let currentInput = '0';
let storedValue = null;
let pendingOperator = null;
let replaceInput = false;

function formatNumber(number) {
  if (!Number.isFinite(number)) return 'Error';
  const rounded = Number(number.toPrecision(11));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function updateBasicDisplay() {
  screenValue.textContent = currentInput;
}

function calculate(left, right, operator) {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '*') return left * right;
  if (operator === '/') return right === 0 ? NaN : left / right;
  return right ** left;
}

function enterDigit(digit) {
  if (currentInput === 'Error' || replaceInput) {
    currentInput = digit;
    replaceInput = false;
  } else if (currentInput === '0') {
    currentInput = digit;
  } else if (currentInput.replace('-', '').length < 15) {
    currentInput += digit;
  }
  updateBasicDisplay();
}

function chooseOperator(operator) {
  const value = Number(currentInput);
  if (pendingOperator && !replaceInput) {
    storedValue = calculate(storedValue, value, pendingOperator);
    currentInput = formatNumber(storedValue);
    updateBasicDisplay();
  } else {
    storedValue = value;
  }
  pendingOperator = operator;
  expression.textContent = `${currentInput} ${operator === '*' ? '×' : operator === '/' ? '÷' : operator}`;
  replaceInput = true;
}

function runBasicAction(action) {
  if (action === 'clear') {
    currentInput = '0';
    storedValue = null;
    pendingOperator = null;
    expression.innerHTML = '&nbsp;';
    replaceInput = false;
  } else if (action === 'decimal' && !currentInput.includes('.')) {
    currentInput = replaceInput ? '0.' : `${currentInput}.`;
    replaceInput = false;
  } else if (action === 'sign' && currentInput !== '0') {
    currentInput = currentInput.startsWith('-') ? currentInput.slice(1) : `-${currentInput}`;
  } else if (action === 'percent' && currentInput !== 'Error') {
    currentInput = formatNumber(Number(currentInput) / 100);
  } else if (action === 'equals' && pendingOperator) {
    const result = calculate(storedValue, Number(currentInput), pendingOperator);
    expression.textContent = `${storedValue} ${pendingOperator} ${currentInput} =`;
    currentInput = formatNumber(result);
    storedValue = null;
    pendingOperator = null;
    replaceInput = true;
  }
  updateBasicDisplay();
}

document.querySelector('#keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.digit !== undefined) enterDigit(button.dataset.digit);
  if (button.dataset.operator) chooseOperator(button.dataset.operator);
  if (button.dataset.action) runBasicAction(button.dataset.action);
});

document.addEventListener('keydown', (event) => {
  if (!modePanels.basic.hidden && /^[0-9]$/.test(event.key)) enterDigit(event.key);
  if (!modePanels.basic.hidden && ['+', '-', '*', '/'].includes(event.key)) chooseOperator(event.key);
  if (!modePanels.basic.hidden && event.key === 'Enter') runBasicAction('equals');
  if (!modePanels.basic.hidden && event.key === '.') runBasicAction('decimal');
  if (!modePanels.basic.hidden && event.key === 'Escape') runBasicAction('clear');
});

const unitOptions = {
  length: [
    ['m', 'Meters'], ['km', 'Kilometers'], ['cm', 'Centimeters'], ['mm', 'Millimeters'], ['mi', 'Miles'], ['ft', 'Feet'], ['in', 'Inches']
  ],
  weight: [
    ['kg', 'Kilograms'], ['g', 'Grams'], ['lb', 'Pounds'], ['oz', 'Ounces']
  ],
  temperature: [
    ['c', 'Celsius'], ['f', 'Fahrenheit'], ['k', 'Kelvin']
  ]
};

const unitFactors = {
  m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254,
  kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125
};

const unitCategory = document.querySelector('#unitCategory');
const unitFrom = document.querySelector('#unitFrom');
const unitTo = document.querySelector('#unitTo');
const unitAmount = document.querySelector('#unitAmount');
const unitResult = document.querySelector('#unitResult');
const unitCaption = document.querySelector('#unitCaption');

function fillUnitOptions() {
  const options = unitOptions[unitCategory.value];
  [unitFrom, unitTo].forEach((select) => {
    select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
  });
  unitFrom.value = options[0][0];
  unitTo.value = options[1][0];
  updateUnitResult();
}

function convertTemperature(value, from, to) {
  const celsius = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15;
  return to === 'c' ? celsius : to === 'f' ? celsius * 9 / 5 + 32 : celsius + 273.15;
}

function updateUnitResult() {
  const amount = Number(unitAmount.value);
  if (!Number.isFinite(amount)) {
    unitResult.textContent = '—';
    unitCaption.textContent = 'Enter a number to see the conversion.';
    return;
  }
  const result = unitCategory.value === 'temperature'
    ? convertTemperature(amount, unitFrom.value, unitTo.value)
    : amount * unitFactors[unitFrom.value] / unitFactors[unitTo.value];
  const formatted = formatNumber(result);
  unitResult.textContent = formatted;
  unitCaption.textContent = `${formatNumber(amount)} ${unitFrom.selectedOptions[0].text} = ${formatted} ${unitTo.selectedOptions[0].text}`;
}

unitCategory.addEventListener('change', fillUnitOptions);
unitFrom.addEventListener('change', updateUnitResult);
unitTo.addEventListener('change', updateUnitResult);
unitAmount.addEventListener('input', updateUnitResult);
document.querySelector('#swapUnits').addEventListener('click', () => {
  [unitFrom.value, unitTo.value] = [unitTo.value, unitFrom.value];
  updateUnitResult();
});

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'PKR', 'NZD', 'SGD', 'SEK', 'NOK', 'MXN', 'BRL', 'ZAR'];
const fallbackCurrencyRates = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, CAD: 1.36, AUD: 1.53, CHF: 0.88,
  CNY: 7.2, INR: 83, PKR: 278, NZD: 1.65, SGD: 1.34, SEK: 10.5, NOK: 10.6,
  MXN: 17, BRL: 5, ZAR: 18.4
};
const currencyFrom = document.querySelector('#currencyFrom');
const currencyTo = document.querySelector('#currencyTo');
const currencyAmount = document.querySelector('#currencyAmount');
const currencyResult = document.querySelector('#currencyResult');
const currencyCaption = document.querySelector('#currencyCaption');
let currencyRequest = 0;

[currencyFrom, currencyTo].forEach((select) => {
  select.replaceChildren(...currencies.map((code) => new Option(code, code)));
});
currencyFrom.value = 'USD';
currencyTo.value = 'EUR';

async function updateCurrency() {
  const requestId = ++currencyRequest;
  const amount = Number(currencyAmount.value);
  const from = currencyFrom.value;
  const to = currencyTo.value;
  if (!Number.isFinite(amount) || amount < 0) {
    currencyResult.textContent = 'Enter a valid amount.';
    return;
  }
  if (from === to) {
    currencyResult.textContent = `${formatNumber(amount)} ${to}`;
    currencyCaption.textContent = 'Same currency, same amount.';
    return;
  }
  currencyResult.textContent = 'Checking the latest rate…';
  currencyCaption.textContent = 'Rates provided by Frankfurter. Internet connection required.';
  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Rate service unavailable');
    const data = await response.json();
    if (requestId !== currencyRequest) return;
    const rate = data.rates?.[to];
    if (typeof rate !== 'number') throw new Error('Rate not found');
    currencyResult.textContent = `${formatNumber(amount * rate)} ${to}`;
    currencyCaption.textContent = `1 ${from} = ${formatNumber(rate)} ${to} · rate date ${data.date}`;
  } catch {
    if (requestId !== currencyRequest) return;
    const estimate = amount * fallbackCurrencyRates[to] / fallbackCurrencyRates[from];
    currencyResult.textContent = `${formatNumber(estimate)} ${to}`;
    currencyCaption.textContent = 'Offline estimate, not a live rate. Check current rates before exchanging money.';
  }
}

currencyAmount.addEventListener('input', updateCurrency);
currencyFrom.addEventListener('change', updateCurrency);
currencyTo.addEventListener('change', updateCurrency);
document.querySelector('#swapCurrency').addEventListener('click', () => {
  [currencyFrom.value, currencyTo.value] = [currencyTo.value, currencyFrom.value];
  updateCurrency();
});

fillUnitOptions();
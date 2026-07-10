// ======== Elements ========
const bankSelector = document.getElementById('bankSelector');
const bankLogo = document.getElementById('bankLogo');
const bankNameEl = document.getElementById('bankName');
const accInput = document.getElementById('accountNumber');
const detectBar = document.getElementById('detectBar');
const detectIcon = document.getElementById('detectIcon');
const detectSpin = document.getElementById('detectSpinner');
const detectText = document.getElementById('detectText');
const nextBtn = document.getElementById('nextBtn');

let verified = { ok: false, accountName: '', accountNumber: '', bankName: BANK.name || '', bankUrl: BANK.url || '' };

// ======== Navigation to bank list ========
bankSelector.addEventListener('click', () => {
  window.location.href = 'bn-list.php';
});

// Show selected bank (if any)
if (BANK.name) {
  bankNameEl.textContent = BANK.name;
  bankNameEl.style.color = 'var(--text-color)';
  if (BANK.url) {
    bankLogo.src = BANK.url;
    bankLogo.style.display = 'block';
  }
}

// ======== Tabs ========
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    const which = this.dataset.tab;
    document.getElementById('list-recent').style.display = (which === 'recents') ? 'block' : 'none';
    document.getElementById('list-favorite').style.display = (which === 'favorites') ? 'block' : 'none';
  });
});

// Beneficiary click -> localStorage -> next.php
function attachBeneficiaryClicks() {
  document.querySelectorAll('.b-item').forEach(item => {
    item.addEventListener('click', () => {
      const payload = {
        accountnumber: item.dataset.accountnumber,
        bankname: item.dataset.bankname,
        accountname: item.dataset.accountname,
        url: item.dataset.url
      };
      localStorage.setItem('transfer.selected', JSON.stringify(payload));
      window.location.href = 'next.php';
    });
  });
}
attachBeneficiaryClicks();

// ======== Account number input (digits only, max 10) ========
accInput.addEventListener('input', () => {
  accInput.value = accInput.value.replace(/\D/g, '').slice(0, 10);
  resetVerificationUI();
  if (accInput.value.length === 10 && BANK.code) {
    startVerification(accInput.value, BANK.code);
  }
});

// ======== Verification flow ========
function resetVerificationUI() {
  verified.ok = false;
  nextBtn.style.opacity = '.5';
  nextBtn.style.pointerEvents = 'none';
  nextBtn.style.cursor = 'not-allowed';
  detectBar.style.display = 'none';
  detectSpin.style.display = 'none';
  detectIcon.style.display = 'none';
  detectText.textContent = 'Account Name';
  detectText.style.color = 'var(--accent-color)';
}

function startVerification(accountNumber, bankCode) {
  detectBar.style.display = 'flex';
  detectSpin.style.display = 'block';
  detectIcon.style.display = 'none';
  detectText.textContent = 'Searching...';
  detectText.style.color = 'var(--accent-color)';
  
  const form = new FormData();
  form.append('account_number', accountNumber);
  form.append('bank_code', bankCode);
  
  fetch('verify_account.php', { method: 'POST', body: form })
    .then(r => r.text())
    .then(txt => {
      detectSpin.style.display = 'none';
      
      const lower = txt.toLowerCase();
      const isError = lower.includes('error') || lower.includes('invalid') || lower.includes('not') && lower.includes('found');
      
      if (!isError && txt.trim().length >= 3) {
        // success
        detectIcon.src = 'images/toban/good.png';
        detectIcon.style.display = 'block';
        detectText.textContent = txt.trim();
        detectText.style.color = 'var(--accent-color)';
        
        verified.ok = true;
        verified.accountName = txt.trim();
        verified.accountNumber = accountNumber;
        verified.bankName = BANK.name || verified.bankName;
        verified.bankUrl = BANK.url || verified.bankUrl;
        
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
        nextBtn.style.cursor = 'pointer';
      } else {
        // failure
        detectIcon.src = 'images/toban/bd.png';
        detectIcon.style.display = 'block';
        detectText.textContent = 'Invalid account name, check again';
        detectText.style.color = '#d32f2f';
        
        verified.ok = false;
        nextBtn.style.opacity = '.5';
        nextBtn.style.pointerEvents = 'none';
        nextBtn.style.cursor = 'not-allowed';
      }
    })
    .catch(() => {
      detectSpin.style.display = 'none';
      detectIcon.src = 'images/toban/bd.png';
      detectIcon.style.display = 'block';
      detectText.textContent = 'Network error, try again';
      detectText.style.color = '#d32f2f';
    });
}

// NEXT -> localStorage -> next.php
nextBtn.addEventListener('click', () => {
  if (!verified.ok) return;
  const payload = {
    accountnumber: verified.accountNumber,
    bankname: verified.bankName,
    accountname: verified.accountName,
    url: verified.bankUrl
  };
  localStorage.setItem('transfer.selected', JSON.stringify(payload));
  window.location.href = 'next.php';
});

// Optional: back button
document.querySelector('.back-btn')?.addEventListener('click', () => history.back());
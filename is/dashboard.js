// =================== Tier Image Loader ===================
function loadTierImage() {
    const tier = localStorage.getItem('tier');
    const tierImage = document.getElementById('tier-image');

    if (tier) {
        switch (tier) {
            case 'tier1': tierImage.src = "images/dashboard/tier1.png"; break;
            case 'tier2': tierImage.src = "images/dashboard/tier2.png"; break;
            case 'tier3': tierImage.src = "images/dashboard/tier3.png"; break;
            default: tierImage.src = "images/dashboard/tier3.png";
        }
    } else {
        localStorage.setItem('tier', 'tier3');
        tierImage.src = "images/dashboard/tier3.png";
    }
}

// =================== Helpers ===================
function formatAmount(amount) {
    return new Intl.NumberFormat('en-NG',{minimumFractionDigits:2, maximumFractionDigits:2})
        .format(parseFloat(amount || 0));
}

function getStatusClass(status) {
    switch(status) {
        case "success": return "status-success";
        case "pending": return "status-pending";
        case "failed": return "status-failed";
        case "reversed": return "status-reversed";
        default: return "status-success";
    }
}

function getStatusText(status) {
    switch(status) {
        case "success": return "Successful";
        case "pending": return "Pending";
        case "failed": return "Failed";
        case "reversed": return "Reversed";
        default: return "Successful";
    }
}

// =================== Popup Menu ===================
function showPopupMenu(options, transaction) {
    const menu = document.getElementById("popupMenu");
    menu.innerHTML = "";

    options.forEach(opt => {
        const btn = document.createElement("div");
        btn.textContent = opt;
        btn.style.padding = "12px 16px";
        btn.style.cursor = "pointer";
        btn.style.userSelect = "none";
        btn.style.color = "var(--text-color)";
        btn.onmouseenter = () => btn.style.background = "var(--action-bg)";
        btn.onmouseleave = () => btn.style.background = "transparent";
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.add("hidden");
            updateStatus(transaction, opt.toLowerCase());
        };
        menu.appendChild(btn);
    });

    menu.classList.remove("hidden");

    const closeOnOutside = (e) => {
        if (!menu.contains(e.target)) {
            menu.classList.add("hidden");
            document.removeEventListener("click", closeOnOutside);
        }
    };
    setTimeout(() => document.addEventListener("click", closeOnOutside), 0);
}

function updateStatus(transaction, newStatus) {
    fetch("transaction-history.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id: transaction.id, status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            location.reload();
        } else {
            alert("Failed to update status");
        }
    })
    .catch(err => {
        console.error(err);
        alert("Error updating status");
    });
}

// =================== Subscription Dialog ===================
function showSubscriptionDialog() {
    document.getElementById("subscriptionDialog").classList.add("active");
}
function dismissDialog() {
    document.getElementById("subscriptionDialog").classList.remove("active");
}
function upgradeAccount() {
    window.location.href = "plan.php";
}

// =================== Transaction Card ===================
function generateTransactionCard(data) {
    const card = document.createElement("div");
    card.className = "lv-transaction-card";

    const img = document.createElement("img");
    const info = document.createElement("div"); info.className = "transaction-info";
    const top = document.createElement("div"); top.className = "transaction-top";
    const bottom = document.createElement("div"); bottom.className = "transaction-bottom";

    const nameSpan = document.createElement("span"); nameSpan.className = "accountname";
    const amountSpan = document.createElement("span"); amountSpan.className = "amount";
    const dateSpan = document.createElement("span"); dateSpan.className = "date";
    const statusSpan = document.createElement("span"); statusSpan.className = "status";

    const statusVal = (data.status && String(data.status).trim() !== "") ? String(data.status).toLowerCase() : "success";
    const isIncoming = data.type === "received" || data.category === "bonus" || data.category === "owealth";

    // Build UI per category
    if (data.category === "money") {
        if (data.type === "sent") {
            img.src = "images/history/out.png";
            nameSpan.textContent = "Transfer to " + (data.accountname || "");
            amountSpan.textContent = "-₦" + formatAmount(data.amount);
            amountSpan.classList.add("negative");
        } else {
            img.src = "images/history/in.png";
            nameSpan.textContent = "Transfer from " + (data.accountname || "");
            amountSpan.textContent = "+₦" + formatAmount(data.amount);
            amountSpan.classList.add("positive");
        }
    } else if (data.category === "airtime") {
        img.src = "images/history/airtime.png";
        nameSpan.textContent = "Airtime";
        amountSpan.textContent = "-₦" + formatAmount(data.amount);
        amountSpan.classList.add("negative");
    } else if (data.category === "data") {
        img.src = "images/history/data.png";
        nameSpan.textContent = "Mobile data";
        amountSpan.textContent = "-₦" + formatAmount(data.amount);
        amountSpan.classList.add("negative");
    } else if (data.category === "fee") {
        img.src = "images/history/out.png";
        nameSpan.textContent = "Electronic Money Transfer Levy";
        amountSpan.textContent = "-₦50.00";
        amountSpan.classList.add("negative");
    } else if (data.category === "owealth") {
        img.src = "images/history/owealth.png";
        nameSpan.textContent = "Owealth Interest Earned";
        amountSpan.textContent = "+₦" + formatAmount(data.amount);
        amountSpan.classList.add("positive");
    } else if (data.category === "bonus") {
        img.src = "images/history/data.png";
        nameSpan.textContent = data.type === "data" ? "Bonus from Data Purchase" : "Bonus from Airtime Purchase";
        const cbText = (data.cb && String(data.cb).includes(".")) ? data.cb : (data.cb ? data.cb + ".00" : "0.00");
        amountSpan.textContent = "+₦" + cbText;
        amountSpan.classList.add("positive");
    } else if (data.category && data.category.toLowerCase().includes("deposit")) {
        img.src = "images/history/deposit.png";
        nameSpan.textContent = "Auto-save to Owealth Balance";
        amountSpan.textContent = "₦" + formatAmount(data.amount);
        amountSpan.classList.add("negative");
    } else {
        img.src = "images/history/out.png";
        nameSpan.textContent = data.accountname || "Transaction";
        amountSpan.textContent = "₦" + formatAmount(data.amount || "0");
        amountSpan.classList.add(isIncoming ? "positive" : "negative");
    }

    dateSpan.textContent = data.date1 || data.date || "";
    statusSpan.textContent = getStatusText(statusVal);
    statusSpan.className = "status " + getStatusClass(statusVal);

    top.appendChild(nameSpan);
    top.appendChild(amountSpan);
    bottom.appendChild(dateSpan);
    bottom.appendChild(statusSpan);
    info.appendChild(top);
    info.appendChild(bottom);
    card.appendChild(img);
    card.appendChild(info);

    // Click to navigate
    let longPressActive = false;
    card.addEventListener('click', function () {
        if (longPressActive) { longPressActive = false; return; }
        if (!hasSubscription) { showSubscriptionDialog(); return; }

        const pid = data.product_id || data.productId || data.id || null;
        if (!pid) return;

        const category = (data.category || "").toLowerCase();
        const type = (data.type || "").toLowerCase();
        const bankname = (data.bankname || "").toLowerCase();
        let targetUrl = null;

        if (category === "money" && (type === "sent" || type === "received") && bankname === "opay") {
            targetUrl = "opy-receipt.php?product_id=" + encodeURIComponent(pid);
        } else if (category === "money") {
            if (type === "received" && bankname !== "opay") {
                targetUrl = "from-bnk-receipt.php?product_id=" + encodeURIComponent(pid);
            } else {
                targetUrl = "bnk_receipt.php?product_id=" + encodeURIComponent(pid);
            }
        } else if (category === "airtime") {
            targetUrl = "airtime-receipt.php?product_id=" + encodeURIComponent(pid);
        } else if (category === "data") {
            targetUrl = "data-receipt.php?product_id=" + encodeURIComponent(pid);
        } else {
            if (bankname === "opay") {
                targetUrl = "opy-receipt.php?product_id=" + encodeURIComponent(pid);
            } else if (bankname) {
                targetUrl = "bnk_receipt.php?product_id=" + encodeURIComponent(pid);
            }
        }
        if (targetUrl) window.location.href = targetUrl;
    });

    // Long-press on status
    let pressTimer;
    const pressDuration = 700;
    const startPress = (e) => {
        e.stopPropagation();
        clearTimeout(pressTimer);
        pressTimer = setTimeout(() => {
            longPressActive = true;
            const category = (data.category || "").toLowerCase();
            const type = (data.type || "").toLowerCase();
            const bankname = (data.bankname || "").toLowerCase();
            let options = [];
            if (category === "money" && type === "sent") {
                options = (bankname === "opay") ? ["Success", "Failed", "Reversed"] : ["Success", "Failed", "Pending"];
            } else if (category === "money" && type === "received") {
                options = (bankname === "opay") ? ["Success", "Failed", "Reversed"] : ["Success", "Failed", "Reversed"];
            } else if (category === "airtime" || category === "data") {
                options = ["Success", "Failed", "Reversed"];
            }
            if (options.length) showPopupMenu(options, data);
        }, pressDuration);
    };
    const cancelPress = () => clearTimeout(pressTimer);

    statusSpan.addEventListener("mousedown", startPress);
    statusSpan.addEventListener("mouseup", cancelPress);
    statusSpan.addEventListener("mouseleave", cancelPress);
    statusSpan.addEventListener("touchstart", startPress, { passive: true });
    statusSpan.addEventListener("touchend", cancelPress);
    statusSpan.addEventListener("click", (e) => {
        if (longPressActive) {
            e.preventDefault(); e.stopPropagation(); longPressActive = false;
        }
    });

    return card;
}

// =================== Generate Transactions ===================
function generateAllTransactionCards() {
    const list = document.getElementById("listSection");
    list.innerHTML = "";
    // Use transactionData directly (already limited to 2 by PHP, including any fees)
    if (transactionData.length === 0) {
        list.innerHTML = '<div class="empty-transactions">No recent transactions</div>';
        return;
    }
    transactionData.forEach(tx => list.appendChild(generateTransactionCard(tx)));
}

// =================== DOM Ready ===================
document.addEventListener('DOMContentLoaded', function () {
    loadTierImage();

    // Lottie animation
    const animationContainer = document.getElementById('lottie-container');
    const animation = lottie.loadAnimation({
        container: animationContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'json/contact.json'
    });
    animation.addEventListener('data_failed', function () {
        console.error('Failed to load animation');
        animationContainer.innerHTML = '<img src="images/dashboard/contact-fallback.png" alt="Contact Support" style="width:100%; height:100%; object-fit:contain;">';
    });

    generateAllTransactionCards();

    // Email alert sync
    if (localStorage.getItem('is_alert') === 'true' && !emailAlert) {
        localStorage.setItem('is_alert', 'false');
    }

    // Restrict free users
    if (!hasSubscription) {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => e.preventDefault());
        document.addEventListener('keydown', function (e) {
            if (e.key === 'PrintScreen') e.preventDefault();
            if (e.altKey && e.key === 'PrintScreen') e.preventDefault();
            if (e.key === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) e.preventDefault();
            if ((e.key === '3' || e.key === '4') && e.shiftKey && (e.metaKey || e.ctrlKey)) e.preventDefault();
        });
    }
});

// =================== Nav & Carousel ===================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
    });
});

const carousel = document.querySelector('.carousel');
const dots = document.querySelectorAll('.dot');
let currentIndex = 0;
const totalItems = 3;

function updateCarousel() {
    carousel.style.transform = `translateX(-${currentIndex * 33.333}%)`;
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });
}
setInterval(() => { currentIndex = (currentIndex + 1) % totalItems; updateCarousel(); }, 3000);
dots.forEach(dot => dot.addEventListener('click', function() {
    currentIndex = parseInt(this.getAttribute('data-index'));
    updateCarousel();
}));

// =================== Theme Change ===================
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', e => {
    console.log('System theme changed to:', e.matches ? 'dark' : 'light');
});

// =================== Play Sound ===================
function checkSchedule() {
    fetch("schedule_file.php")
    .then(res => res.json())
    .then(data => {
        if (data.status === "ok") {
            const audio = new Audio("sound/success.mp3");
            audio.play().catch(err => console.warn("Sound play blocked:", err));
        }
    })
    .catch(err => console.error("Error checking schedule:", err));
}
setInterval(checkSchedule, 5000);
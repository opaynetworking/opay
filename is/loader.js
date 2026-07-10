        document.addEventListener("DOMContentLoaded", () => {
          // Check if we're on an iOS device and preload image if needed
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            const img = new Image();
            img.src = "images/toban/loading.png";
          }
          
          const tx = JSON.parse(localStorage.getItem("transfer.tx.pending") || "{}");
          if (!tx.accountnumber || !tx.amount) {
            console.error("⚠️ No transaction data found", tx);
            return;
          }
          
          document.getElementById("f_accountname").value = tx.accountname || "";
          document.getElementById("f_bankname").value = tx.bankname || "";
          document.getElementById("f_accountnumber").value = tx.accountnumber || "";
          document.getElementById("f_url").value = tx.url || "";
          document.getElementById("f_amount").value = tx.amount || 0;
          document.getElementById("f_narration").value = tx.remark || "";
          
          // Clear old storage so it won't resubmit on refresh
          localStorage.removeItem("transfer.tx.pending");
          
          // Small delay to ensure loading animation is visible before form submission
          setTimeout(() => {
            document.getElementById("txForm").submit();
          }, 100);
        });
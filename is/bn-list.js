async function fetchBanks() {
  try {
    let res = await fetch("bn.php");
    let banks = await res.json();
    
    const listView = document.querySelector(".list-view");
    listView.innerHTML = ""; // clear
    
    banks.forEach(bank => {
      let li = document.createElement("li");
      li.className = "linear4";
      li.innerHTML = `
                <div class="circle-image-view">
                    <img src="${bank.url}" alt="${bank.name}">
                </div>
                <div class="list-item-text">${bank.name}</div>
            `;
      
      li.addEventListener("click", () => {
        // create hidden form and submit POST to to-bn.php
        let form = document.createElement("form");
        form.method = "POST";
        form.action = "to-bn.php";
        
        ["name", "url", "code"].forEach(field => {
          let input = document.createElement("input");
          input.type = "hidden";
          input.name = field;
          input.value = bank[field];
          form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
      });
      
      listView.appendChild(li);
    });
    
    // Add search filter
    const searchInput = document.querySelector(".edit-text");
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase();
      document.querySelectorAll(".list-view li").forEach(li => {
        const name = li.textContent.toLowerCase();
        li.style.display = name.includes(q) ? "flex" : "none";
      });
    });
    
  } catch (err) {
    console.error("Error fetching banks", err);
  }
}

// Call on page load
fetchBanks();
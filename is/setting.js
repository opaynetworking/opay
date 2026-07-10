function showToast(msg) {
      const toast=document.getElementById("toast");
      toast.textContent=msg;
      toast.className="show";
      setTimeout(()=>{toast.className=toast.className.replace("show","");},3000);
    }

    document.querySelectorAll(".settings-item, .sign-out").forEach(item=>{
      item.addEventListener("click",function(){
        const action=this.dataset.action;

        if(action==="change-account"){showToast("Click on account number or name to edit");window.location.href="profile.php";}
        else if(action==="reset-history"){if(confirm("Are you sure?")){fetch("settings_action.php?action=reset-history").then(r=>r.json()).then(d=>showToast(d.message));}}
        else if(action==="join-channel"){fetch("settings_action.php?action=join-channel").then(r=>r.json()).then(d=>{if(d.url)window.location.href=d.url;else showToast("Not available");});}
        else if(action==="upgrade-account"){fetch("settings_action.php?action=upgrade-account").then(r=>r.json()).then(d=>{if(d.redirect)window.location.href=d.redirect;else showToast(d.message);});}
        else if(action==="logout"){fetch("settings_action.php?action=logout").then(()=>window.location.href="login.php");}
        else {showToast("Not available");}
      });
    });
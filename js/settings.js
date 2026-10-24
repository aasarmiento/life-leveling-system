// =====================================================================
// SETTINGS PAGE (settings.js)
// ---------------------------------------------------------------------
// Lets a signed-in player change their display name, avatar and password.
// Everything goes through the server (PUT /api/me), which checks it again
// with lib/validate.js, so the rules here only exist to give quick, clear
// messages before anything is sent.
//
// Without a server (the GitHub Pages demo) accounts only live in the browser,
// so the page shows a short note instead of the forms.
//
// Uses from nav.js:  window.questifyApi (talks to the server)
//                    window.questifyToast (the small message at the bottom right)
// =====================================================================
(function () {
  const PLAYER_KEY = "questify.player"; // same key nav.js keeps the player in
  const NAME_MAX = 40;
  const PASSWORD_MIN = 8;
  const PASSWORD_MAX = 200;

  const $ = (id) => document.getElementById(id);
  const api = window.questifyApi;
  const toast = (opts) => window.questifyToast && window.questifyToast(opts);

  const playerForm = $("playerForm");
  const passwordForm = $("passwordForm");
  const nameInput = $("stName");
  const emailInput = $("stEmail");
  const avatarInputs = [...playerForm.querySelectorAll('input[name="avatar"]')];

  let player = null; // what the server has right now: { name, email, avatar }

  // ---------- small helpers ----------
  function setError(input, message) {
    const box = $(input.getAttribute("aria-describedby"));
    if (!box || !box.classList.contains("st-err")) return;
    box.textContent = message || "";
    box.hidden = !message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function setAlert(form, message) {
    const box = form.querySelector(".st-alert");
    box.textContent = message || "";
    box.hidden = !message;
  }

  function clearErrors(form) {
    form.querySelectorAll("input").forEach((input) => {
      if (input.hasAttribute("aria-describedby")) setError(input, null);
    });
    setAlert(form, null);
  }

  // Disable the button while a request is on its way (no double submits)
  function busy(button, on, label) {
    button.disabled = on;
    button.dataset.label = button.dataset.label || button.textContent.trim();
    button.textContent = on ? label : button.dataset.label;
  }

  const avatarSrc = (avatar) =>
    `../assets/avatars/avatar-${avatar === "gold" ? "gold" : "lime"}-slime-256.png`;

  const selectedAvatar = () => {
    const picked = avatarInputs.find((input) => input.checked);
    return picked ? picked.value : null;
  };

  // The session ended while the page was open: go to Sign in, then come back here
  function sessionEnded() {
    location.replace("signin.html?next=settings&session=ended");
  }

  const SERVER_DOWN =
    "Couldn't reach the server. Check your connection and try again.";

  // ---------- keep the rest of the page in step ----------
  // nav.js keeps the player in localStorage and paints the header from it.
  function savePlayer(p) {
    try {
      localStorage.setItem(
        PLAYER_KEY,
        JSON.stringify({ name: p.name, email: p.email, avatar: p.avatar }),
      );
    } catch (err) {
      /* storage blocked: the header just shows the new name after a reload */
    }
  }

  function paintHeader(p) {
    document.querySelectorAll("[data-acct-name]").forEach((el) => {
      el.textContent = p.name.split(" ")[0];
    });
    document.querySelectorAll(".acct-name").forEach((el) => {
      el.textContent = p.name;
    });
    document.querySelectorAll(".pc-avatar img").forEach((img) => {
      img.src = avatarSrc(p.avatar);
    });
  }

  function fillForm(p) {
    player = p;
    nameInput.value = p.name;
    emailInput.value = p.email;
    avatarInputs.forEach((input) => {
      input.checked = input.value === p.avatar;
    });
  }

  // ---------- name + avatar ----------
  playerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(playerForm);

    const name = nameInput.value.trim();
    const avatar = selectedAvatar();
    if (!name) {
      setError(nameInput, "Enter a display name.");
      nameInput.focus();
      return;
    }
    if (name.length > NAME_MAX) {
      setError(nameInput, `Use ${NAME_MAX} characters or fewer.`);
      nameInput.focus();
      return;
    }
    if (!avatar) {
      setAlert(playerForm, "Pick one of the avatars.");
      return;
    }
    if (name === player.name && avatar === player.avatar) {
      toast({
        tone: "info",
        title: "Nothing to save",
        text: "Your name and avatar are already up to date.",
      });
      return;
    }

    const button = $("playerSave");
    busy(button, true, "Saving…");
    const res = await api("me", { method: "PUT", body: { name, avatar } });
    busy(button, false);

    if (!res) return setAlert(playerForm, SERVER_DOWN);
    if (res.status === 401) return sessionEnded();
    if (!res.ok) {
      const message =
        (res.data && res.data.error) ||
        "Something went wrong. Please try again.";
      if (res.data && res.data.field === "name") {
        setError(nameInput, message);
        nameInput.focus();
      } else setAlert(playerForm, message);
      return;
    }

    fillForm(res.data.player);
    savePlayer(res.data.player);
    paintHeader(res.data.player);
    toast({
      tone: "ok",
      title: "Saved",
      text: "Your player was updated.",
    });
  });

  [nameInput, ...avatarInputs].forEach((input) =>
    input.addEventListener("input", () => clearErrors(playerForm)),
  );

  // ---------- password ----------
  const current = $("stCurrent");
  const next = $("stNew");
  const confirm = $("stConfirm");

  passwordForm.querySelectorAll(".st-show").forEach((btn) => {
    const input = $(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      btn.textContent = reveal ? "Hide" : "Show";
      btn.setAttribute("aria-pressed", String(reveal));
    });
  });

  function resetPasswordForm() {
    [current, next, confirm].forEach((input) => {
      input.value = "";
      input.type = "password";
    });
    passwordForm.querySelectorAll(".st-show").forEach((btn) => {
      btn.textContent = "Show";
      btn.setAttribute("aria-pressed", "false");
    });
  }

  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(passwordForm);

    // First box with a problem gets the focus
    let first = null;
    const check = (input, message) => {
      if (!message) return;
      setError(input, message);
      first = first || input;
    };
    check(current, current.value ? null : "Enter your current password.");
    check(
      next,
      next.value.length < PASSWORD_MIN
        ? `Use at least ${PASSWORD_MIN} characters.`
        : next.value.length > PASSWORD_MAX
          ? `Use ${PASSWORD_MAX} characters or fewer.`
          : next.value === current.value
            ? "Choose a password that is different from the current one."
            : null,
    );
    check(
      confirm,
      !confirm.value
        ? "Type your new password again."
        : confirm.value !== next.value
          ? "Passwords don't match."
          : null,
    );
    if (first) {
      first.focus();
      return;
    }

    const button = $("passwordSave");
    busy(button, true, "Changing…");
    const res = await api("me", {
      method: "PUT",
      body: { currentPassword: current.value, newPassword: next.value },
    });
    busy(button, false);

    if (!res) return setAlert(passwordForm, SERVER_DOWN);
    if (res.status === 401) return sessionEnded();
    if (!res.ok) {
      const message =
        (res.data && res.data.error) ||
        "Something went wrong. Please try again.";
      const input = { currentPassword: current, newPassword: next }[
        res.data && res.data.field
      ];
      if (input) {
        setError(input, message);
        input.focus();
        if (res.status === 400 && input === current) current.select();
      } else setAlert(passwordForm, message);
      return;
    }

    resetPasswordForm();
    toast({
      tone: "ok",
      title: "Password changed",
      text: "Your other devices were signed out.",
    });
  });

  [current, next, confirm].forEach((input) =>
    input.addEventListener("input", () => {
      setError(input, null);
      setAlert(passwordForm, null);
    }),
  );

  // ---------- start ----------
  // Ask the server who is signed in. No answer = no server (demo mode).
  async function start() {
    const res = api ? await api("me") : null;
    if (!res) {
      $("stDemo").hidden = false;
      return;
    }
    if (!res.ok) return; // 401: nav.js already sends the player to Sign in
    fillForm(res.data.player);
    playerForm.hidden = false;
    passwordForm.hidden = false;
  }
  start();
})();

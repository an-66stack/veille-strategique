(() => {
  "use strict";

  const STARTING_BALANCE = 1000;
  const BONUS_SPINS = 5;
  const SPIN_DURATION = 900;
  const SYMBOLS = [
    { icon: "🍒", name: "Cerises", multiplier: 3, weight: 28 },
    { icon: "🍋", name: "Citrons", multiplier: 4, weight: 24 },
    { icon: "🔔", name: "Cloches", multiplier: 6, weight: 18 },
    { icon: "⭐", name: "Étoiles", multiplier: 10, weight: 14 },
    { icon: "💎", name: "Diamants", multiplier: 20, weight: 10 },
    { icon: "🌌", name: "Scatter", multiplier: 0, weight: 6 }
  ];

  const balanceElement = document.querySelector("#balance");
  const reelsFrame = document.querySelector("#reels-frame");
  const reels = [0, 1, 2].map((index) => document.querySelector(`#reel-${index}`));
  const message = document.querySelector("#message");
  const betSelect = document.querySelector("#bet-select");
  const spinButton = document.querySelector("#spin-button");
  const resetButton = document.querySelector("#reset-button");
  const bonusOverlay = document.querySelector("#bonus-overlay");
  const bonusButton = document.querySelector("#bonus-button");
  const bonusMeter = document.querySelector("#bonus-meter");
  const bonusResult = document.querySelector("#bonus-result");

  let balance = STARTING_BALANCE;
  let isSpinning = false;
  let bonusSpins = 0;
  let bonusDialogOpen = false;
  let returnFocusTo = spinButton;

  function formatCredits(amount) {
    return new Intl.NumberFormat("fr-FR").format(amount);
  }

  function renderBalance() {
    balanceElement.textContent = formatCredits(balance);
  }

  function setMessage(text, kind) {
    message.textContent = text;
    message.classList.toggle("is-win", kind === "win");
    message.classList.toggle("is-error", kind === "error");
  }

  function randomSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let target = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
      target -= symbol.weight;
      if (target < 0) return symbol;
    }
    return SYMBOLS[0];
  }

  function setReels(result) {
    result.forEach((symbol, index) => {
      reels[index].textContent = symbol.icon;
      reels[index].setAttribute("aria-label", `Rouleau ${index + 1} : ${symbol.name}`);
    });
  }

  function updateControls() {
    const canBet = balance >= Number(betSelect.value);
    spinButton.disabled = isSpinning || bonusDialogOpen || (!bonusSpins && !canBet);
    betSelect.disabled = isSpinning || bonusSpins > 0 || bonusDialogOpen;
    resetButton.disabled = isSpinning;

    if (bonusSpins > 0 && !bonusDialogOpen) {
      spinButton.innerHTML = `<span aria-hidden="true">↻</span> BONUS · ${bonusSpins} RESTANT${bonusSpins > 1 ? "S" : ""}`;
    } else {
      spinButton.innerHTML = '<span aria-hidden="true">↻</span> TOURNER';
    }
  }

  function showBonusDialog() {
    bonusDialogOpen = true;
    returnFocusTo = spinButton;
    bonusMeter.textContent = `${BONUS_SPINS} tours gratuits`;
    bonusResult.textContent = "";
    bonusOverlay.hidden = false;
    bonusButton.focus();
    updateControls();
  }

  function closeBonusDialog() {
    bonusDialogOpen = false;
    bonusOverlay.hidden = true;
    updateControls();
    returnFocusTo.focus();
  }

  function playBonus() {
    bonusSpins = BONUS_SPINS;
    closeBonusDialog();
    setMessage("Bonus activé : 5 tours gratuits, gains doublés !");
  }

  function spin() {
    if (isSpinning || bonusDialogOpen) return;
    const isFreeSpin = bonusSpins > 0;
    const bet = Number(betSelect.value);

    if (!isFreeSpin && balance < bet) {
      setMessage("Solde insuffisant pour cette mise. Réinitialisez votre solde fictif.", "error");
      updateControls();
      return;
    }

    if (!isFreeSpin) {
      balance -= bet;
      renderBalance();
    } else {
      bonusSpins -= 1;
    }

    isSpinning = true;
    reelsFrame.classList.remove("is-win");
    reelsFrame.classList.add("is-spinning");
    setMessage(isFreeSpin ? "Tour bonus en cours…" : "Les rouleaux tournent…");
    updateControls();

    const result = Array.from({ length: 3 }, randomSymbol);
    window.setTimeout(() => finishSpin(result, bet, isFreeSpin), SPIN_DURATION);
  }

  function finishSpin(result, bet, isFreeSpin) {
    setReels(result);
    reelsFrame.classList.remove("is-spinning");
    isSpinning = false;

    const allScatter = result.every((symbol) => symbol.name === "Scatter");
    const lineWin = result.every((symbol) => symbol.name === result[0].name) && !allScatter;
    let payout = 0;

    if (lineWin) {
      payout = bet * result[0].multiplier * (isFreeSpin ? 2 : 1);
      balance += payout;
      renderBalance();
      reelsFrame.classList.add("is-win");
      setMessage(`Trois ${result[0].name.toLowerCase()} ! Vous gagnez ${formatCredits(payout)} crédits fictifs${isFreeSpin ? " (gain doublé)" : ""}.`, "win");
    } else if (allScatter) {
      setMessage("Trois Scatter ! Le portail bonus est débloqué.", "win");
    } else {
      setMessage(isFreeSpin ? "Pas de gain sur ce tour bonus." : "Pas de gain cette fois. À vous de rejouer !");
    }

    if (isFreeSpin) {
      bonusMeter.textContent = bonusSpins > 0
        ? `${bonusSpins} tour${bonusSpins > 1 ? "s" : ""} bonus restant${bonusSpins > 1 ? "s" : ""}`
        : "Bonus terminé";
      bonusResult.textContent = payout > 0
        ? `+${formatCredits(payout)} crédits fictifs`
        : "Aucun gain sur ce tour";
      if (bonusSpins === 0) {
        setMessage(payout > 0
          ? `Bonus terminé ! ${formatCredits(payout)} crédits fictifs gagnés sur le dernier tour.`
          : "Bonus terminé ! Vous pouvez choisir une mise et rejouer.");
      }
    }

    updateControls();
    if (allScatter) {
      showBonusDialog();
    } else if (balance < Number(betSelect.value) && bonusSpins === 0) {
      setMessage("Solde insuffisant pour cette mise. Réinitialisez votre solde fictif.", "error");
      updateControls();
    }
  }

  function resetBalance() {
    if (isSpinning) return;
    balance = STARTING_BALANCE;
    bonusSpins = 0;
    renderBalance();
    bonusMeter.textContent = `${BONUS_SPINS} tours gratuits`;
    bonusResult.textContent = "";
    reelsFrame.classList.remove("is-win");
    setMessage("Solde fictif réinitialisé à 1 000 crédits.");
    updateControls();
  }

  function trapDialogFocus(event) {
    if (!bonusDialogOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      bonusButton.focus();
    }
  }

  spinButton.addEventListener("click", spin);
  betSelect.addEventListener("change", updateControls);
  resetButton.addEventListener("click", resetBalance);
  bonusButton.addEventListener("click", playBonus);
  document.addEventListener("keydown", trapDialogFocus);

  renderBalance();
  updateControls();
})();

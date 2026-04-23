const defaults = {
  referEnabled: false,
  categories: ["All", "Saving account", "Demat Account", "Credit card", "Other"],
  offers: [
    {
      id: crypto.randomUUID(),
      title: "Research 360",
      category: "Other",
      cashback: 150,
      active: true,
      image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=1200&auto=format&fit=crop",
      destinationUrl: "https://example.com/original-offer",
      steps: [
        "Register in app using valid details.",
        "Complete KYC and required task.",
        "Claim cashback after verification."
      ],
      terms: [
        "One cashback per user/device/UPI.",
        "Fake or duplicate entries will be rejected.",
        "Payout after merchant confirmation."
      ],
      formFields: ["Name", "Email", "Mobile number", "UPI ID"]
    },
    {
      id: crypto.randomUUID(),
      title: "Axis Savings Blast",
      category: "Saving account",
      cashback: 400,
      active: true,
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop",
      destinationUrl: "https://example.com/saving",
      steps: ["Open account", "Fund with min balance", "Complete first transaction"],
      terms: ["Indian users only", "PAN required"],
      formFields: ["Name", "Email", "Mobile number", "UPI ID"]
    }
  ]
};

function getData() {
  const existing = localStorage.getItem("earningHubData");
  if (!existing) {
    localStorage.setItem("earningHubData", JSON.stringify(defaults));
    return structuredClone(defaults);
  }
  return JSON.parse(existing);
}

const state = getData();
let activeCategory = "All";

function renderCategories() {
  const wrap = document.getElementById("categories");
  wrap.innerHTML = "";
  state.categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.className = `cat-btn ${activeCategory === category ? "active" : ""}`;
    btn.textContent = category;
    btn.onclick = () => {
      activeCategory = category;
      renderCategories();
      renderOffers();
    };
    wrap.appendChild(btn);
  });
}

function renderOffers() {
  const wrap = document.getElementById("offerList");
  wrap.innerHTML = "";
  const offers = state.offers.filter((offer) => offer.active).filter((offer) => activeCategory === "All" || offer.category === activeCategory);

  if (offers.length === 0) {
    wrap.innerHTML = `<div class="offer-card"><h3>No offers available</h3><p class="small">Admin can activate offers from panel.</p></div>`;
    return;
  }

  offers.forEach((offer) => {
    const card = document.createElement("article");
    card.className = "offer-card";
    card.innerHTML = `
      <img src="${offer.image}" alt="${offer.title}" />
      <h3>${offer.title}</h3>
      <div class="badge-row">
        <span class="cashback">₹${offer.cashback} Cashback</span>
        <span class="small">${offer.category}</span>
      </div>
      <p class="small">Fast approval • Premium support • Secure payout</p>
      <button class="btn">Apply Offer</button>
    `;
    card.querySelector(".btn").onclick = () => openOffer(offer);
    wrap.appendChild(card);
  });
}

function openOffer(offer) {
  const modal = document.getElementById("offerDialog");
  const detail = document.getElementById("offerDetail");
  detail.innerHTML = `
    <div class="detail-wrap">
      <img src="${offer.image}" alt="${offer.title}" style="width:100%;border-radius:14px;border:1px solid var(--border);max-height:220px;object-fit:cover;" />
      <h2>${offer.title}</h2>
      <p class="cashback">Cashback Unlocked: ₹${offer.cashback}</p>
      <div class="steps">
        <h4>Easy Steps to Claim</h4>
        <ol>${offer.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
      <div class="terms">
        <h4>Terms & Conditions</h4>
        <ul>${offer.terms.map((s) => `<li>${s}</li>`).join("")}</ul>
      </div>
      <div class="steps">
        <h4>Apply for this offer</h4>
        <form id="applyForm">
          <div class="form-grid">
            ${offer.formFields
              .map(
                (field) => `<div class="field"><label>${field}</label><input required name="${field}" placeholder="Enter ${field}" /></div>`
              )
              .join("")}
          </div>
          <button class="btn" type="submit">Submit & Continue</button>
        </form>
      </div>
      ${state.referEnabled ? '<p class="small">Referral code available at checkout.</p>' : ""}
    </div>
  `;

  detail.querySelector("#applyForm").onsubmit = (e) => {
    e.preventDefault();
    window.open(offer.destinationUrl, "_blank", "noopener");
    alert("Details submitted successfully. Redirecting to original offer.");
  };

  modal.showModal();
}

renderCategories();
renderOffers();

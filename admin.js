const base = {
  referEnabled: false,
  categories: ["All", "Saving account", "Demat Account", "Credit card", "Other"],
  offers: []
};

const defaultFields = ["Name", "Email", "Mobile number", "UPI ID"];

const saved = JSON.parse(localStorage.getItem("earningHubData") || "null") || base;
if (!saved.categories) saved.categories = base.categories;
if (!saved.offers) saved.offers = [];

let selectedId = saved.offers[0]?.id || null;
let editingFields = defaultFields.slice();

const offerMiniList = document.getElementById("offerMiniList");
const offerForm = document.getElementById("offerForm");
const fieldChips = document.getElementById("fieldChips");
const referToggle = document.getElementById("referToggle");
const deleteBtn = document.getElementById("deleteBtn");

referToggle.checked = !!saved.referEnabled;
referToggle.onchange = () => {
  saved.referEnabled = referToggle.checked;
  persist();
};

function persist() {
  localStorage.setItem("earningHubData", JSON.stringify(saved));
}

function normalizeOffer(offer) {
  return {
    ...offer,
    formFields: [...new Set([...(offer.formFields || []), ...defaultFields])]
  };
}

saved.offers = saved.offers.map(normalizeOffer);
persist();

function renderMiniList() {
  offerMiniList.innerHTML = "";
  if (!saved.offers.length) {
    offerMiniList.innerHTML = '<p class="muted">No offers yet. Add your first premium offer.</p>';
    return;
  }
  saved.offers.forEach((offer) => {
    const div = document.createElement("div");
    div.className = `offer-mini ${offer.id === selectedId ? "active" : ""}`;
    div.innerHTML = `<strong>${offer.title}</strong><br/><span class="muted">${offer.active ? "Active" : "Inactive"} • ₹${offer.cashback}</span>`;
    div.onclick = () => {
      selectedId = offer.id;
      loadOffer(offer.id);
    };
    offerMiniList.appendChild(div);
  });
}

function renderFields() {
  fieldChips.innerHTML = "";
  editingFields.forEach((field, i) => {
    const chip = document.createElement("span");
    chip.className = "field-chip";
    const lock = defaultFields.includes(field);
    chip.innerHTML = `${field} ${lock ? "🔒" : `<button type=\"button\" data-i=\"${i}\">✕</button>`}`;
    if (!lock) {
      chip.querySelector("button").onclick = () => {
        editingFields.splice(i, 1);
        renderFields();
      };
    }
    fieldChips.appendChild(chip);
  });
}

function loadOffer(id) {
  const offer = saved.offers.find((o) => o.id === id);
  if (!offer) return;
  selectedId = id;
  offerForm.title.value = offer.title;
  offerForm.cashback.value = offer.cashback;
  offerForm.category.value = offer.category;
  offerForm.image.value = offer.image;
  offerForm.destinationUrl.value = offer.destinationUrl;
  offerForm.steps.value = (offer.steps || []).join("\n");
  offerForm.terms.value = (offer.terms || []).join("\n");
  offerForm.active.checked = !!offer.active;
  editingFields = [...new Set([...(offer.formFields || []), ...defaultFields])];
  renderFields();
  renderMiniList();
}

function clearFormForNew() {
  selectedId = null;
  offerForm.reset();
  offerForm.active.checked = true;
  editingFields = defaultFields.slice();
  renderFields();
  renderMiniList();
}

document.getElementById("newOfferBtn").onclick = clearFormForNew;
document.getElementById("addFieldBtn").onclick = () => {
  const input = document.getElementById("newFieldInput");
  const value = input.value.trim();
  if (!value || editingFields.includes(value)) return;
  editingFields.push(value);
  input.value = "";
  renderFields();
};

offerForm.onsubmit = (e) => {
  e.preventDefault();
  const record = {
    id: selectedId || crypto.randomUUID(),
    title: offerForm.title.value.trim(),
    cashback: Number(offerForm.cashback.value),
    category: offerForm.category.value,
    image: offerForm.image.value.trim(),
    destinationUrl: offerForm.destinationUrl.value.trim(),
    steps: offerForm.steps.value.split("\n").map((s) => s.trim()).filter(Boolean),
    terms: offerForm.terms.value.split("\n").map((s) => s.trim()).filter(Boolean),
    active: offerForm.active.checked,
    formFields: editingFields
  };

  const index = saved.offers.findIndex((o) => o.id === record.id);
  if (index >= 0) saved.offers[index] = record;
  else saved.offers.unshift(record);

  selectedId = record.id;
  persist();
  renderMiniList();
  loadOffer(record.id);
  alert("Offer saved.");
};

deleteBtn.onclick = () => {
  if (!selectedId) return;
  saved.offers = saved.offers.filter((o) => o.id !== selectedId);
  persist();
  clearFormForNew();
};

renderMiniList();
if (selectedId) loadOffer(selectedId);
else clearFormForNew();

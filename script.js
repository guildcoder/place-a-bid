const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSeyHGovAvqCszajtXfqdgOGNya0qTfxzhNTxMnsr5b03x6tJA/formResponse";

// Map local form → Google Form entry IDs
const ENTRY_MAP = {
  saleLot: "entry.1393425854",
  name: "entry.2014194198",
  biddingNumber: "entry.938652901",
  bidAmount: "entry.849028228"
};

// Sheets
const SHEET_MAIN = "https://docs.google.com/spreadsheets/d/1tvE1IDZKQLje2K64Et0nQy0jTlOcnLOPma6Ys_ZWciI/gviz/tq?";
const SHEET_IMAGES = "https://docs.google.com/spreadsheets/d/1EaTRt0dHGiomAyBbyLAHiUj0ZlmS_Ht81RzX2mN_7KA/gviz/tq?";

// Cached sale lot → image map
let lotImages = {};

// Load dropdown and images
async function loadSaleLots() {
  const saleLotSelect = document.getElementById("saleLot");

  // Load lots from main sheet
  let query = encodeURIComponent("select A");
  let url = `${SHEET_MAIN}sheet=Website%20Sale%20Lots&tq=${query}`;
  let data = await fetch(url).then(res => res.text());
  let json = JSON.parse(data.substr(47).slice(0, -2));

  json.table.rows.forEach(row => {
    let option = document.createElement("option");
    option.value = row.c[0].v;
    option.textContent = row.c[0].v;
    saleLotSelect.appendChild(option);
  });

  // Load lot images from secondary sheet
  let queryImg = encodeURIComponent("select A,B");
  let urlImg = `${SHEET_IMAGES}sheet=Website%20Sale%20Lots&tq=${queryImg}`;
  let dataImg = await fetch(urlImg).then(res => res.text());
  let jsonImg = JSON.parse(dataImg.substr(47).slice(0, -2));

  jsonImg.table.rows.forEach(row => {
    let lot = row.c[0]?.v;
    let imgUrl = row.c[1]?.v;
    if (lot && imgUrl) {
      lotImages[lot] = imgUrl;
    }
  });
}

document.getElementById("saleLot").addEventListener("change", e => {
  const lot = e.target.value;
  const imgBox = document.getElementById("saleLotImage");
  const imgTag = document.getElementById("saleLotImgTag");

  if (lot && lotImages[lot]) {
    imgTag.src = lotImages[lot];
    imgBox.style.display = "block";
  } else {
    imgTag.src = "";
    imgBox.style.display = "none";
  }
});

async function handleSubmit(e) {
  e.preventDefault();

  const saleLot = document.getElementById("saleLot").value;
  const name = document.getElementById("name").value;
  const biddingNumber = document.getElementById("biddingNumber").value;
  const bidAmount = parseInt(document.getElementById("bidAmount").value);

  // TODO: validation logic as you already had

  // Build FormData
  const formData = new FormData();
  formData.append(ENTRY_MAP.saleLot, saleLot);
  formData.append(ENTRY_MAP.name, name);
  formData.append(ENTRY_MAP.biddingNumber, biddingNumber);
  formData.append(ENTRY_MAP.bidAmount, bidAmount);

  // Submit
  fetch(GOOGLE_FORM_ACTION, {
    method: "POST",
    body: formData,
    mode: "no-cors"
  });

  document.getElementById("formMessage").textContent = "✅ Bid submitted successfully!";
}

document.getElementById("bidForm").addEventListener("submit", handleSubmit);

// Init
loadSaleLots();

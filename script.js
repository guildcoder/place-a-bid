<script>
const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSeyHGovAvqCszajtXfqdgOGNya0qTfxzhNTxMnsr5b03x6tJA/formResponse";
const ENTRY_MAP = {
  saleLot: "entry.1393425854",
  name: "entry.2014194198",
  biddingNumber: "entry.938652901",
  bidAmount: "entry.849028228"
};

// Sheets
const SHEET_MAIN = "https://docs.google.com/spreadsheets/d/1tvE1IDZKQLje2K64Et0nQy0jTlOcnLOPma6Ys_ZWciI/gviz/tq?";
const SHEET_IMAGES = "https://docs.google.com/spreadsheets/d/1EaTRt0dHGiomAyBbyLAHiUj0ZlmS_Ht81RzX2mN_7KA/gviz/tq?";

let lotImages = {};
let currentBidMap = {};

// Load Google Charts (needed for visualization API)
google.charts.load('current', { packages: ['corechart'] });

// Wait for DOM + Charts to load
google.charts.setOnLoadCallback(() => {
  document.addEventListener("DOMContentLoaded", initForm);
});

async function initForm() {
  const saleLotSelect = document.getElementById("saleLot");
  const bidInput = document.getElementById("bidAmount");
  const bidPrompt = document.getElementById("bidPrompt");

  // Load sale lots & images & current bids
  await loadSaleLots();

  // Populate sale lot dropdown
  populateSaleLotDropdown(saleLotSelect);

  // Event listener for selection change
  saleLotSelect.addEventListener("change", e => {
    const lot = e.target.value;

    // Update image
    const imgBox = document.getElementById("saleLotImage");
    const imgTag = document.getElementById("saleLotImgTag");
    if (lot && lotImages[lot]) {
      imgTag.src = lotImages[lot];
      imgBox.style.display = "block";
    } else {
      imgTag.src = "";
      imgBox.style.display = "none";
    }

    updateBidField(lot);
  });

  // Form submission
  document.getElementById("bidForm").addEventListener("submit", handleSubmit);
}

// Parse GViz JSON response
function parseGvizResponse(responseText) {
  const start = responseText.indexOf("{");
  const end = responseText.lastIndexOf("}");
  return JSON.parse(responseText.substring(start, end + 1));
}

// Query Google Sheet via GViz API
async function querySheet(sheetName, query) {
  return new Promise(resolve => {
    const q = new google.visualization.Query(`${SHEET_MAIN}sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`);
    q.send(resp => {
      if (resp.isError()) {
        console.error(resp.getMessage());
        resolve([]);
      } else {
        const table = resp.getDataTable();
        const data = [];
        for (let r = 0; r < table.getNumberOfRows(); r++) {
          const row = [];
          for (let c = 0; c < table.getNumberOfColumns(); c++) {
            row.push(table.getValue(r, c));
          }
          data.push(row);
        }
        resolve(data);
      }
    });
  });
}

// Load sale lots, images, and current bids
async function loadSaleLots() {
  // Load images from secondary sheet
  let dataImg = await fetch(`${SHEET_IMAGES}sheet=Website%20Sale%20Lots&tq=select%20A,B`)
    .then(res => res.text());
  let jsonImg = parseGvizResponse(dataImg);

  if (jsonImg.table && jsonImg.table.rows) {
    jsonImg.table.rows.forEach(r => {
      const lot = r.c[0]?.v;
      const url = r.c[1]?.v;
      if (lot && url) lotImages[lot] = url;
    });
  }

  // Preload current bids from Bid Board tab
  let bidData = await querySheet("Bid Board", "select A,B where B is not null");
  bidData.forEach(row => {
    currentBidMap[row[0]] = parseInt(row[1]);
  });
}

// Populate sale lot dropdown (skip header)
async function populateSaleLotDropdown(selectEl) {
  let lots = await querySheet("Lot Listings", "select A where A is not null");
  // Skip first row (header)
  lots.slice(1).forEach(r => {
    let opt = document.createElement("option");
    opt.value = r[0];
    opt.textContent = r[0];
    selectEl.appendChild(opt);
  });
}

// Update bid input dynamically
function updateBidField(lot) {
  const bidInput = document.getElementById("bidAmount");
  const bidPrompt = document.getElementById("bidPrompt");

  const currentBid = currentBidMap[lot] || 0;
  if (currentBid < 400) {
    bidInput.value = 400;
    bidPrompt.textContent = "You are placing the opening bid. Minimum starting bid is $400.";
  } else {
    bidInput.value = currentBid + 100;
    bidPrompt.textContent = `Current bid: $${currentBid}. Next valid bid: $${currentBid + 100}.`;
  }
}

// Form submission handler
async function handleSubmit(e) {
  e.preventDefault();
  const saleLot = document.getElementById("saleLot").value;
  const name = document.getElementById("name").value.trim();
  const biddingNumber = document.getElementById("biddingNumber").value.trim();
  const bidAmount = parseInt(document.getElementById("bidAmount").value);

  // Validate name & bidding number
  const bidders = await querySheet("Bidding Number", `select A,D where A='${name}'`);
  if(!bidders.length || bidders[0][1] != biddingNumber){
    document.getElementById("formMessage").textContent = "❌ Name and Bidding Number do not match.";
    return;
  }

  // Validate bid
  if(bidAmount < 400 || bidAmount % 100 !== 0){
    document.getElementById("formMessage").textContent = "❌ Bid must be $400 minimum and in $100 increments.";
    return;
  }

  // Submit to Google Form
  const formData = new FormData();
  formData.append(ENTRY_MAP.saleLot, saleLot);
  formData.append(ENTRY_MAP.name, name);
  formData.append(ENTRY_MAP.biddingNumber, biddingNumber);
  formData.append(ENTRY_MAP.bidAmount, bidAmount);

  fetch(GOOGLE_FORM_ACTION, { method: "POST", body: formData, mode: "no-cors" });

  document.getElementById("formMessage").textContent = "✅ Bid submitted successfully!";
  document.getElementById("bidForm").reset();
  document.getElementById("saleLotImage").style.display = "none";
}

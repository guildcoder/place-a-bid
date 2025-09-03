const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSeyHGovAvqCszajtXfqdgOGNya0qTfxzhNTxMnsr5b03x6tJA/formResponse";
const ENTRY_MAP = {
  saleLot: "entry.1393425854",
  name: "entry.2014194198",
  biddingNumber: "entry.938652901",
  bidAmount: "entry.849028228"
};

const SHEET_MAIN = "https://docs.google.com/spreadsheets/d/1tvE1IDZKQLje2K64Et0nQy0jTlOcnLOPma6Ys_ZWciI/gviz/tq?";
const SHEET_IMAGES = "https://docs.google.com/spreadsheets/d/1EaTRt0dHGiomAyBbyLAHiUj0ZlmS_Ht81RzX2mN_7KA/gviz/tq?";

let lotImages = {};
let currentBidMap = {}; // Cache current bids per lot

google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initForm);

// Helper to query sheets
async function querySheet(sheetName, query) {
  return new Promise(resolve => {
    const q = new google.visualization.Query(SHEET_MAIN + "sheet=" + encodeURIComponent(sheetName) + "&tq=" + encodeURIComponent(query));
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

async function loadSaleLots() {
  const saleLotSelect = document.getElementById("saleLot");

  // Load lots for dropdown
  let lots = await querySheet("Website Sale Lots", "select A where A is not null");
  lots.forEach(r => {
    let opt = document.createElement("option");
    opt.value = r[0];
    opt.textContent = r[0];
    saleLotSelect.appendChild(opt);
  });

  // Load images from second spreadsheet
  let dataImg = await fetch(SHEET_IMAGES + "sheet=Website%20Sale%20Lots&tq=" + encodeURIComponent("select A,B"))
    .then(res => res.text());
  let jsonImg = JSON.parse(dataImg.substr(47).slice(0,-2));
  jsonImg.table.rows.forEach(r => {
    let lot = r.c[0]?.v;
    let url = r.c[1]?.v;
    if(lot && url) lotImages[lot] = url;
  });

  // Preload current bids for all lots
  let bidData = await querySheet("Bid Board", "select A,B where B is not null");
  bidData.forEach(row => {
    currentBidMap[row[0]] = parseInt(row[1]);
  });
}

// Update bid field dynamically when sale lot changes
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

document.getElementById("saleLot").addEventListener("change", e => {
  const lot = e.target.value;

  // Show image if available
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

document.getElementById("bidForm").addEventListener("submit", handleSubmit);

loadSaleLots();

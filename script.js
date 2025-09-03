// Google Sheet (Visualization API endpoint)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1tvE1IDZKQLje2K64Et0nQy0jTlOcnLOPma6Ys_ZWciI/gviz/tq?sheet=";

// Google Form endpoint
const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSeyHGovAvqCszajtXfqdgOGNya0qTfxzhNTxMnsr5b03x6tJA/formResponse";

// Entry IDs map
const ENTRY_MAP = {
  saleLot: "entry.1393425854",
  name: "entry.2014194198",
  biddingNumber: "entry.938652901",
  bidAmount: "entry.849028228"
};

// Load Visualization API
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initForm);

// Query helper
async function querySheet(sheetName, query) {
  return new Promise(resolve => {
    const q = new google.visualization.Query(SHEET_URL + sheetName + "&tq=" + encodeURIComponent(query));
    q.send(response => {
      if (response.isError()) {
        console.error("Error: " + response.getMessage());
        resolve([]);
      } else {
        const table = response.getDataTable();
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

async function initForm() {
  // Load Sale Lots from Website Sale Lots!A:A
  const lots = await querySheet("Website Sale Lots", "select A where A is not null");
  const select = document.getElementById("saleLot");
  lots.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r[0];
    opt.textContent = r[0];
    select.appendChild(opt);
  });

  // Event listeners
  document.getElementById("saleLot").addEventListener("change", handleLotChange);
  document.getElementById("bidForm").addEventListener("submit", handleSubmit);
}

async function handleLotChange(e) {
  const lot = e.target.value;
  const bidData = await querySheet("Bid Board", `select A,B where A='${lot}'`);
  const currentBid = bidData.length ? parseInt(bidData[0][1]) : null;

  const bidInput = document.getElementById("bidAmount");
  const bidPrompt = document.getElementById("bidPrompt");

  if (!currentBid || currentBid < 400) {
    bidInput.value = 400;
    bidPrompt.textContent = "You are placing the opening bid. Minimum starting bid is $400.";
  } else {
    bidInput.value = currentBid + 100;
    bidPrompt.textContent = `Current bid: $${currentBid}. Next valid bid is $${currentBid + 100}.`;
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const saleLot = document.getElementById("saleLot").value;
  const name = document.getElementById("name").value.trim();
  const biddingNumber = document.getElementById("biddingNumber").value.trim();
  const bidAmount = parseInt(document.getElementById("bidAmount").value);

  // Validate name & bidding number
  const bidders = await querySheet("Bidding Number", `select A,D where A='${name}'`);
  if (!bidders.length || bidders[0][1] != biddingNumber) {
    document.getElementById("formMessage").textContent = "❌ Name and Bidding Number do not match.";
    return;
  }

  // Validate bid rules
  if (bidAmount < 400 || bidAmount % 100 !== 0) {
    document.getElementById("formMessage").textContent = "❌ Bid must be $400 minimum and in $100 increments.";
    return;
  }

  // Submit to hidden Google Form
  const formData = new FormData();
  formData.append(ENTRY_MAP.saleLot, saleLot);
  formData.append(ENTRY_MAP.name, name);
  formData.append(ENTRY_MAP.biddingNumber, biddingNumber);
  formData.append(ENTRY_MAP.bidAmount, bidAmount);

  fetch(GOOGLE_FORM_ACTION, {
    method: "POST",
    body: formData,
    mode: "no-cors" // required
  });

  document.getElementById("formMessage").textContent = "✅ Bid submitted successfully!";
  document.getElementById("bidForm").reset();
}

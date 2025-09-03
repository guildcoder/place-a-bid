const SHEET_URL = "https://docs.google.com/spreadsheets/d/1EaTRt0dHGiomAyBbyLAHiUj0ZlmS_Ht81RzX2mN_7KA/gviz/tq?sheet=";

// Run after Google Charts loads
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initForm);

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

  // Hook listeners
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
  const lot = document.getElementById("saleLot").value;
  const name = document.getElementById("name").value;
  const biddingNumber = document.getElementById("biddingNumber").value;
  const bidAmount = parseInt(document.getElementById("bidAmount").value);

  // Validate name & bidding number
  const bidders = await querySheet("Bidding Number", `select A,D where A='${name}'`);
  if (!bidders.length || bidders[0][1] != biddingNumber) {
    document.getElementById("formMessage").textContent = "❌ Name and Bidding Number do not match.";
    return;
  }

  if (bidAmount < 400 || bidAmount % 100 !== 0) {
    document.getElementById("formMessage").textContent = "❌ Bid must be $400 minimum and in $100 increments.";
    return;
  }

  // ⚠️ Visualization API cannot write directly.
  // You’ll need a Google Apps Script web app or linked Google Form for submission.
  // Here’s where we’d POST the bid row into "Placed Bids GIT".
  console.log("Would submit:", [lot, name, biddingNumber, bidAmount]);

  document.getElementById("formMessage").textContent = "✅ Bid submitted (simulation).";
}

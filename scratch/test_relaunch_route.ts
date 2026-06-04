async function run() {
  console.log("Triggering Relaunch API for campaign 1866952438159889...");
  
  const response = await fetch("http://localhost:3000/api/campaigns/relaunch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      campaignId: "1866952438159889"
    })
  });
  
  const data = await response.json();
  console.log("API Response:", JSON.stringify(data, null, 2));
}

run();

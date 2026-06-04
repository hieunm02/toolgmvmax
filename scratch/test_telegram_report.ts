async function run() {
  console.log("Triggering Telegram Report API locally...");
  
  const response = await fetch("http://localhost:3000/api/reports/telegram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });
  
  const data = await response.json();
  console.log("API Response:", JSON.stringify(data, null, 2));
}

run();

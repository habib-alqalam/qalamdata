const apiBaseInput = document.getElementById("apiBase");
const healthOut = document.getElementById("healthOut");
const analyzeOut = document.getElementById("analyzeOut");

function apiBase() {
  return apiBaseInput.value.trim().replace(/\/$/, "");
}

document.getElementById("checkHealth").addEventListener("click", async () => {
  healthOut.textContent = "Loading...";
  try {
    const res = await fetch(`${apiBase()}/health`);
    const data = await res.json();
    healthOut.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    healthOut.textContent = `Error: ${error.message}`;
  }
});

document.getElementById("analyzeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  analyzeOut.textContent = "Analyzing...";

  const payload = {
    parcel_id: document.getElementById("parcel_id").value,
    is_registered: document.getElementById("is_registered").checked,
    is_free_hold: document.getElementById("is_free_hold").checked,
    building_density: Number(document.getElementById("building_density").value),
    transit_access_score: Number(document.getElementById("transit_access_score").value),
    estimated_demand_index: Number(document.getElementById("estimated_demand_index").value),
  };

  try {
    const res = await fetch(`${apiBase()}/api/analyze-parcel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    analyzeOut.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    analyzeOut.textContent = `Error: ${error.message}`;
  }
});

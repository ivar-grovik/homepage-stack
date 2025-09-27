import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

app.get("/line2", async (req, res) => {
  const query = {
    query: `{
      stopPlace(id: "NSR:StopPlace:62104") {
        estimatedCalls(timeRange: 7200, numberOfDepartures: 10) {
          expectedDepartureTime
          serviceJourney { line { publicCode } }
        }
      }
    }`,
  };

  const r = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": "gethomepage-dashboard",
    },
    body: JSON.stringify(query),
  });

  const data = await r.json();

  // Filter only Line 2 and take the first two departures
  const calls = data.data.stopPlace.estimatedCalls
    .filter(c => c.serviceJourney.line.publicCode === "2")
    .slice(0, 2)
    .map(c => {
      const date = new Date(c.expectedDepartureTime);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return { time: `${hours}:${minutes}` };
    });

  res.json({ departures: calls });
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}/line2`);
});

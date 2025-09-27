import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

app.get("/line2", async (req, res) => {
  const query = {
    query: `{
      stopPlace(id: "NSR:StopPlace:62104") {
        name
        estimatedCalls(timeRange: 7200, numberOfDepartures: 10) {
          expectedDepartureTime
          destinationDisplay { frontText }
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

  // Keep only Line 2
  const calls = data.data.stopPlace.estimatedCalls.filter(
    (c) => c.serviceJourney.line.publicCode === "2"
  );

  res.json({
    stop: data.data.stopPlace.name,
    departures: calls.slice(0, 2),
  });
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}/line2`);
});
